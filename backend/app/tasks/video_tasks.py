# app/tasks/video_tasks.py
from celery import Task
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
import torch

from app.tasks.celery_app import celery_app
from app.models import Video, VideoPipelineConfig, PipelineJob
from app.models.enums import JobStatus
from app.services.job_service import JobService
from app.pipeline.orchestrator import run_full_pipeline

# Auto-detect and log device for Celery worker
cuda_available = torch.cuda.is_available()
if cuda_available:
    print(f"🔍 Celery Worker: ✅ CUDA detected - using GPU", flush=True)
    print(f"🔍 GPU: {torch.cuda.get_device_name(0)}", flush=True)
    print(f"🔍 GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f}GB", flush=True)
else:
    print(f"🔍 Celery Worker: ⚠️ CUDA not detected - using CPU", flush=True)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://ai_video:ai_video@db:5432/ai_video")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class PipelineTask(Task):
    _db = None
    
    @property
    def db(self):
        if self._db is None:
            self._db = SessionLocal()
        return self._db
    
    def after_return(self, status, retval, task_id, args, kwargs, einfo):
        if self._db is not None:
            self._db.close()
            self._db = None


@celery_app.task(bind=True, base=PipelineTask, name="process_video_pipeline", 
                 max_retries=3, soft_time_limit=7200, time_limit=7800)
def process_video_pipeline(self, video_id: int, user_id: int):
    """Process a video through the full pipeline with auto device detection"""
    db = self.db
    
    try:
        # Log device status
        cuda_available = torch.cuda.is_available()
        print(f"🚀 Starting pipeline for video {video_id} using {'GPU' if cuda_available else 'CPU'}", flush=True)
        
        # Update task state
        self.update_state(
            state="STARTED", 
            meta={
                "video_id": video_id, 
                "status": "initializing",
                "device": "GPU" if cuda_available else "CPU"
            }
        )
        
        # Create job
        job_service = JobService(db)
        config = db.query(VideoPipelineConfig).filter(
            VideoPipelineConfig.video_id == video_id
        ).first()
        
        if not config:
            raise ValueError(f"No pipeline config found for video {video_id}")
        
        job = job_service.create_job(
            video_id=video_id,
            triggered_by=user_id,
            config={
                "target_language": config.target_language if config else "vi",
                "source_language": config.source_language if config else "en",
                "celery_task_id": self.request.id,
                "device": "GPU" if cuda_available else "CPU"
            }
        )
        
        print(f"✅ Job created: {job.id} for video {video_id}", flush=True)
        
        # Update task state with job_id
        self.update_state(
            state="PROCESSING",
            meta={
                "job_id": str(job.id),
                "video_id": video_id,
                "current_step": "starting",
                "progress": 0,
                "device": "GPU" if cuda_available else "CPU"
            }
        )
        
        # Run the pipeline with progress updates
        def progress_callback(step: str, progress: int):
            """Callback to update task state during pipeline execution"""
            self.update_state(
                state="PROCESSING",
                meta={
                    "job_id": str(job.id),
                    "video_id": video_id,
                    "current_step": step,
                    "progress": progress,
                    "device": "GPU" if cuda_available else "CPU"
                }
            )
        
        # Run the pipeline
        result = run_full_pipeline(
            job.id, 
            video_id, 
            user_id, 
            db,
            progress_callback=progress_callback
        )
        
        print(f"✅ Pipeline completed for video {video_id}", flush=True)
        
        return {
            "status": "completed",
            "job_id": str(job.id),
            "video_id": video_id,
            "message": "Video processing completed successfully",
            "device": "GPU" if cuda_available else "CPU",
            "result": result
        }
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Pipeline failed for video {video_id}: {error_msg}", flush=True)
        
        # Mark job as failed
        try:
            job_service = JobService(db)
            job = db.query(PipelineJob).filter(
                PipelineJob.video_id == video_id
            ).order_by(PipelineJob.created_at.desc()).first()
            if job:
                job_service.update_job_status(job.id, JobStatus.FAILED, error_message=error_msg)
                print(f"✅ Job {job.id} marked as failed", flush=True)
        except Exception as db_error:
            print(f"⚠️ Could not update job status: {db_error}", flush=True)
        
        # Retry on specific errors
        if self.request.retries < self.max_retries:
            print(f"🔄 Retrying task (attempt {self.request.retries + 1}/{self.max_retries})...", flush=True)
            raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))
        
        # If all retries failed, raise the exception
        raise
        
    finally:
        db.close()
        print(f"🏁 Pipeline task for video {video_id} finished", flush=True)


@celery_app.task(name="check_task_status")
def check_task_status(task_id: str):
    """Check the status of a Celery task"""
    from celery.result import AsyncResult
    from app.tasks.celery_app import celery_app
    
    try:
        task = AsyncResult(task_id, app=celery_app)
        
        # Get device info if available
        info = task.info if task.ready() else None
        device_info = info.get("device", "Unknown") if info else "Unknown"
        
        return {
            "task_id": task_id,
            "state": task.state,
            "info": info,
            "ready": task.ready(),
            "successful": task.successful() if task.ready() else None,
            "failed": task.failed() if task.ready() else None,
            "device": device_info,
            "traceback": task.traceback if task.failed() and task.ready() else None
        }
    except Exception as e:
        return {
            "task_id": task_id,
            "state": "ERROR",
            "error": str(e)
        }


@celery_app.task(name="get_celery_worker_info")
def get_celery_worker_info():
    """Get information about the celery worker environment"""
    import platform
    import sys
    import torch
    
    cuda_available = torch.cuda.is_available()
    
    info = {
        "python_version": sys.version,
        "platform": platform.platform(),
        "cuda_available": cuda_available,
        "device": "GPU" if cuda_available else "CPU",
        "torch_version": torch.__version__,
    }
    
    if cuda_available:
        info.update({
            "gpu_count": torch.cuda.device_count(),
            "gpu_name": torch.cuda.get_device_name(0),
            "gpu_memory": f"{torch.cuda.get_device_properties(0).total_memory / 1e9:.1f}GB",
            "cuda_version": torch.version.cuda,
        })
    else:
        info.update({
            "cpu_count": os.cpu_count(),
            "cpu_cores": os.cpu_count(),
        })
    
    return info


@celery_app.task(name="clear_task_queue")
def clear_task_queue():
    """Clear all pending Celery tasks (for maintenance)"""
    from celery.result import AsyncResult
    from app.tasks.celery_app import celery_app
    
    # Get all active tasks
    i = celery_app.control.inspect()
    active = i.active()
    scheduled = i.scheduled()
    reserved = i.reserved()
    
    result = {
        "active": active,
        "scheduled": scheduled,
        "reserved": reserved,
        "cleared": []
    }
    
    # Revoke all active tasks
    if active:
        for worker, tasks in active.items():
            for task in tasks:
                task_id = task.get("id")
                if task_id:
                    AsyncResult(task_id, app=celery_app).revoke(terminate=True)
                    result["cleared"].append({
                        "task_id": task_id,
                        "worker": worker,
                        "name": task.get("name")
                    })
    
    return result
# app/tasks/video_tasks.py - Standardized Celery Tasks (No SQLAlchemy)
import os
import logging
import uuid
from typing import Optional, Dict, Any
import torch
try:
    from celery import Task
except ImportError:
    class Task:
        pass

from app.tasks.celery_app import celery_app
from app.models import Video, VideoPipelineConfig, PipelineJob
from app.models.enums import JobStatus
from app.services.job_service import JobService
from app.pipeline.orchestrator import run_full_pipeline
from app.core.database import DatabaseSession, desc

logger = logging.getLogger("app.tasks.video_tasks")

# Auto-detect and log device for Celery worker
cuda_available = torch.cuda.is_available()
if cuda_available:
    logger.info("Celery Worker: CUDA detected - using GPU (%s, Memory: %.1fGB)",
                torch.cuda.get_device_name(0),
                torch.cuda.get_device_properties(0).total_memory / 1e9)
else:
    logger.info("Celery Worker: CUDA not detected - using CPU")


class PipelineTask(Task):
    _db = None
    
    @property
    def db(self) -> DatabaseSession:
        if self._db is None:
            self._db = DatabaseSession()
        return self._db
    
    def after_return(self, status, retval, task_id, args, kwargs, einfo):
        if self._db is not None:
            self._db.close()
            self._db = None


@celery_app.task(bind=True, base=PipelineTask, name="process_video_pipeline", 
                 max_retries=3, soft_time_limit=7200, time_limit=7800)
def process_video_pipeline(self, video_id: int, user_id: int, job_id: Optional[str] = None):
    """Process a video through the full pipeline with auto device detection"""
    db = self.db
    
    try:
        cuda_available = torch.cuda.is_available()
        print(f"🚀 Starting pipeline for video {video_id} using {'GPU' if cuda_available else 'CPU'}", flush=True)
        
        self.update_state(
            state="STARTED", 
            meta={
                "video_id": video_id, 
                "status": "initializing",
                "device": "GPU" if cuda_available else "CPU"
            }
        )
        
        job_service = JobService(db)
        config = db.query(VideoPipelineConfig).filter(
            VideoPipelineConfig.video_id == video_id
        ).first()
        
        if not config:
            raise ValueError(f"No pipeline config found for video {video_id}")
        
        target_lang = config.target_language if config and getattr(config, "target_language", None) else "vi"
        source_lang = config.source_language if config and getattr(config, "source_language", None) else "en"

        job = None
        if job_id:
            try:
                job_uuid = uuid.UUID(job_id) if isinstance(job_id, str) else job_id
                job = job_service.get_job(job_uuid)
            except Exception as e:
                print(f"⚠️ Could not load job {job_id}: {e}", flush=True)

        if not job:
            job = job_service.create_job(
                video_id=video_id,
                triggered_by=user_id,
                config={
                    "target_language": target_lang,
                    "source_language": source_lang,
                    "celery_task_id": self.request.id,
                    "device": "GPU" if cuda_available else "CPU"
                }
            )
            print(f"✅ Job created: {job.id} for video {video_id}", flush=True)
        else:
            job_config = job.config_json or {}
            if isinstance(job_config, str):
                import json
                try:
                    job_config = json.loads(job_config)
                except Exception:
                    job_config = {}
            job_config["celery_task_id"] = self.request.id
            job_config["device"] = "GPU" if cuda_available else "CPU"
            job.config_json = job_config
            job.status = JobStatus.PROCESSING.value
            db.commit()
            print(f"✅ Reusing existing Job: {job.id} for video {video_id}", flush=True)
        
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
        
        result = run_full_pipeline(
            job.id, 
            video_id, 
            user_id, 
            db
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
        
        try:
            job_service = JobService(db)
            job = db.query(PipelineJob).filter(
                PipelineJob.video_id == video_id
            ).order_by(desc(PipelineJob.created_at)).first()
            if job:
                job_service.update_job_status(job.id, JobStatus.FAILED, error_message=error_msg)
                print(f"✅ Job {job.id} marked as failed", flush=True)
        except Exception as db_error:
            print(f"⚠️ Could not update job status: {db_error}", flush=True)
        
        if self.request.retries < self.max_retries:
            print(f"🔄 Retrying task (attempt {self.request.retries + 1}/{self.max_retries})...", flush=True)
            raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))
        
        raise
        
    finally:
        print(f"🏁 Pipeline task for video {video_id} finished", flush=True)


@celery_app.task(name="check_task_status")
def check_task_status(task_id: str):
    """Check the status of a Celery task"""
    from celery.result import AsyncResult
    from app.tasks.celery_app import celery_app
    
    try:
        task = AsyncResult(task_id, app=celery_app)
        info = task.info if task.ready() else None
        device_info = info.get("device", "Unknown") if info and isinstance(info, dict) else "Unknown"
        
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
    
    i = celery_app.control.inspect()
    active = i.active() if i else None
    scheduled = i.scheduled() if i else None
    reserved = i.reserved() if i else None
    
    result = {
        "active": active,
        "scheduled": scheduled,
        "reserved": reserved,
        "cleared": []
    }
    
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
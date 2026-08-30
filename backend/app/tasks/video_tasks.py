# app/tasks/video_tasks.py
from celery import Task
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

from app.tasks.celery_app import celery_app
from app.models import Video, VideoPipelineConfig, PipelineJob
from app.models.enums import JobStatus
from app.services.job_service import JobService
from app.pipeline.orchestrator import run_full_pipeline

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


@celery_app.task(bind=True, base=PipelineTask, name="process_video_pipeline")
def process_video_pipeline(self, video_id: int, user_id: int):
    """Process a video through the full pipeline"""
    db = self.db
    
    try:
        # Update task state
        self.update_state(state="STARTED", meta={"video_id": video_id, "status": "initializing"})
        
        # Create job
        job_service = JobService(db)
        config = db.query(VideoPipelineConfig).filter(VideoPipelineConfig.video_id == video_id).first()
        
        job = job_service.create_job(
            video_id=video_id,
            triggered_by=user_id,
            config={
                "target_language": config.target_language if config else "vi",
                "celery_task_id": self.request.id
            }
        )
        
        # Update task state with job_id
        self.update_state(
            state="PROCESSING",
            meta={
                "job_id": str(job.id),
                "video_id": video_id,
                "current_step": "starting",
                "progress": 0
            }
        )
        
        # Run the pipeline
        run_full_pipeline(job.id, video_id, user_id, db)
        
        return {
            "status": "completed",
            "job_id": str(job.id),
            "video_id": video_id,
            "message": "Video processing completed successfully"
        }
        
    except Exception as e:
        # Mark job as failed
        try:
            job_service = JobService(db)
            job = db.query(PipelineJob).filter(PipelineJob.video_id == video_id).order_by(PipelineJob.created_at.desc()).first()
            if job:
                job_service.update_job_status(job.id, JobStatus.FAILED, error_message=str(e))
        except:
            pass
        raise
    finally:
        db.close()


@celery_app.task(name="check_task_status")
def check_task_status(task_id: str):
    """Check the status of a Celery task"""
    from celery.result import AsyncResult
    from app.tasks.celery_app import celery_app
    
    task = AsyncResult(task_id, app=celery_app)
    return {
        "task_id": task_id,
        "state": task.state,
        "info": task.info if task.ready() else None,
        "ready": task.ready(),
        "successful": task.successful() if task.ready() else None,
        "failed": task.failed() if task.ready() else None,
    }
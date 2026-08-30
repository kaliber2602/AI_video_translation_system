# app/services/job_service.py
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models import Video, PipelineJob, PipelineTaskLog, VideoPipelineConfig
from app.models.enums import JobStatus, JobStep, VideoStatus


class JobService:
    def __init__(self, db: Session):
        self.db = db

    def create_job(
        self,
        video_id: int,
        triggered_by: int,
        config: Optional[Dict] = None
    ) -> PipelineJob:
        """Create a new pipeline job"""
        job = PipelineJob(
            id=uuid.uuid4(),
            video_id=video_id,
            triggered_by=triggered_by,
            status=JobStatus.QUEUED.value,
            progress=0,
            config_json=config or {},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        
        # Update video status
        video = self.db.query(Video).filter(Video.id == video_id).first()
        if video:
            video.status = VideoStatus.PROCESSING.value
            video.current_step = JobStep.QUEUED.value
            self.db.commit()
        
        return job

    def update_job_status(
        self,
        job_id: uuid.UUID,
        status: JobStatus,
        progress: Optional[int] = None,
        current_step: Optional[JobStep] = None,
        error_message: Optional[str] = None,
        finished_at: Optional[datetime] = None
    ) -> PipelineJob:
        """Update job status and progress"""
        job = self.db.query(PipelineJob).filter(PipelineJob.id == job_id).first()
        if not job:
            raise ValueError(f"Job {job_id} not found")
        
        job.status = status.value
        job.updated_at = datetime.utcnow()
        
        if progress is not None:
            job.progress = progress
        
        if current_step is not None:
            job.current_step = current_step.value
            
        if error_message is not None:
            job.error_message = error_message
            
        if finished_at is not None:
            job.finished_at = finished_at
        elif status in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]:
            job.finished_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(job)
        
        # Update video status
        video = self.db.query(Video).filter(Video.id == job.video_id).first()
        if video:
            if status == JobStatus.COMPLETED:
                video.status = VideoStatus.COMPLETED.value
                video.progress = 100
            elif status == JobStatus.FAILED:
                video.status = VideoStatus.FAILED.value
                video.error_message = error_message
            elif status == JobStatus.PROCESSING and current_step:
                video.current_step = current_step.value
                video.progress = progress or 0
            
            self.db.commit()
        
        return job

    def log_task(
        self,
        job_id: uuid.UUID,
        step_name: str,
        status: str = "running",
        log_output: Optional[str] = None,
        error_trace: Optional[str] = None,
        duration_ms: Optional[int] = None
    ) -> PipelineTaskLog:
        """Log a task step in the pipeline"""
        task_log = PipelineTaskLog(
            job_id=job_id,
            step_name=step_name,
            status=status,
            log_output=log_output,
            error_trace=error_trace,
            duration_ms=duration_ms,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        self.db.add(task_log)
        self.db.commit()
        self.db.refresh(task_log)
        return task_log

    def get_job(self, job_id: uuid.UUID) -> Optional[PipelineJob]:
        """Get job by ID"""
        return self.db.query(PipelineJob).filter(PipelineJob.id == job_id).first()

    def get_job_by_video(self, video_id: int) -> Optional[PipelineJob]:
        """Get latest job for a video"""
        return (self.db.query(PipelineJob)
                .filter(PipelineJob.video_id == video_id)
                .order_by(desc(PipelineJob.created_at))
                .first())

    def get_job_status(self, job_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        """Get detailed job status for frontend"""
        job = self.get_job(job_id)
        if not job:
            return None
        
        tasks = (self.db.query(PipelineTaskLog)
                 .filter(PipelineTaskLog.job_id == job_id)
                 .order_by(PipelineTaskLog.created_at)
                 .all())
        
        return {
            "job_id": str(job.id),
            "video_id": job.video_id,
            "status": job.status,
            "progress": job.progress,
            "current_step": job.current_step,
            "error_message": job.error_message,
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "finished_at": job.finished_at.isoformat() if job.finished_at else None,
            "created_at": job.created_at.isoformat(),
            "tasks": [
                {
                    "step": task.step_name,
                    "status": task.status,
                    "duration_ms": task.duration_ms,
                    "log_output": task.log_output[-500:] if task.log_output else None,
                    "created_at": task.created_at.isoformat()
                }
                for task in tasks
            ],
            "config": job.config_json,
            "celery_task_id": job.config_json.get("celery_task_id") if job.config_json else None
        }
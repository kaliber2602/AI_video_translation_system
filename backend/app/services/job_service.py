# app/services/job_service.py - Standardized PostgreSQL job service (No SQLAlchemy)
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, Union

from app.core.database import DatabaseSession, desc, RowRecord
from app.models import Video, PipelineJob, PipelineTaskLog, VideoPipelineConfig
from app.models.enums import JobStatus, JobStep, VideoStatus


class JobService:
    def __init__(self, db: Optional[DatabaseSession] = None):
        self._owns_db = db is None
        self.db = db if db is not None else DatabaseSession()

    def create_job(
        self,
        video_id: int,
        triggered_by: int,
        config: Optional[Dict] = None,
        step: Optional[str] = None
    ) -> RowRecord:
        """Create a new pipeline job (supports full pipeline or single step)"""
        cfg = config or {}
        if step and "mode" not in cfg:
            cfg["mode"] = "single_step"
            cfg["step"] = step

        job = PipelineJob(
            id=str(uuid.uuid4()),
            video_id=video_id,
            triggered_by=triggered_by,
            status=JobStatus.QUEUED.value,
            progress=0,
            current_step=step or JobStep.QUEUED.value,
            config_json=cfg,
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
            video.current_step = step or JobStep.QUEUED.value
            self.db.commit()
        
        return job

    def update_job_status(
        self,
        job_id: Union[uuid.UUID, str],
        status: JobStatus,
        progress: Optional[int] = None,
        current_step: Optional[JobStep] = None,
        error_message: Optional[str] = None,
        finished_at: Optional[datetime] = None,
        is_full_pipeline: bool = True
    ) -> RowRecord:
        """Update job status and progress with step-level isolation"""
        job_id_str = str(job_id)
        job = self.db.query(PipelineJob).filter(PipelineJob.id == job_id_str).first()
        if not job:
            raise ValueError(f"Job {job_id} not found")
        
        job.status = status.value
        job.updated_at = datetime.utcnow()
        
        if progress is not None:
            job.progress = progress
        
        if current_step is not None:
            job.current_step = current_step.value if hasattr(current_step, "value") else str(current_step)
            
        if error_message is not None:
            job.error_message = error_message
            
        if finished_at is not None:
            job.finished_at = finished_at
        elif status in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]:
            job.finished_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(job)
        
        # Update video status with single-step protection
        video = self.db.query(Video).filter(Video.id == job.video_id).first()
        if video:
            config = job.config_json or {}
            if isinstance(config, str):
                import json
                try:
                    config = json.loads(config)
                except Exception:
                    config = {}
            is_single_step = not is_full_pipeline or config.get("mode") == "single_step"

            if status == JobStatus.COMPLETED:
                if is_single_step:
                    if current_step:
                        video.current_step = current_step.value if hasattr(current_step, "value") else str(current_step)
                    if progress is not None:
                        video.progress = max(int(video.progress or 0), progress)
                    video.status = VideoStatus.PROCESSING.value
                else:
                    video.status = VideoStatus.COMPLETED.value
                    video.progress = 100
                    video.current_step = "completed"
            elif status == JobStatus.FAILED:
                video.status = VideoStatus.FAILED.value
                video.error_message = error_message
            elif status == JobStatus.PROCESSING and current_step:
                video.current_step = current_step.value if hasattr(current_step, "value") else str(current_step)
                video.progress = max(int(video.progress or 0), progress or 0)
                video.status = VideoStatus.PROCESSING.value
            
            self.db.commit()
        
        return job

    def log_task(
        self,
        job_id: Union[uuid.UUID, str],
        step_name: str,
        status: str = "running",
        log_output: Optional[str] = None,
        error_trace: Optional[str] = None,
        duration_ms: Optional[int] = None
    ) -> RowRecord:
        """Log a task step in the pipeline"""
        task_log = PipelineTaskLog(
            job_id=str(job_id),
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

    def get_job(self, job_id: Union[uuid.UUID, str]) -> Optional[RowRecord]:
        """Get job by ID"""
        return self.db.query(PipelineJob).filter(PipelineJob.id == str(job_id)).first()

    def get_job_by_video(self, video_id: int) -> Optional[RowRecord]:
        """Get latest job for a video"""
        return (self.db.query(PipelineJob)
                .filter(PipelineJob.video_id == video_id)
                .order_by(desc(PipelineJob.created_at))
                .first())

    def get_job_status(self, job_id: Union[uuid.UUID, str]) -> Optional[Dict[str, Any]]:
        """Get detailed job status for frontend"""
        job = self.get_job(str(job_id))
        if not job:
            return None
        
        tasks = (self.db.query(PipelineTaskLog)
                 .filter(PipelineTaskLog.job_id == str(job_id))
                 .order_by(PipelineTaskLog.created_at)
                 .all())
        
        config = job.config_json or {}
        if isinstance(config, str):
            import json
            try:
                config = json.loads(config)
            except Exception:
                config = {}

        return {
            "job_id": str(job.id),
            "video_id": job.video_id,
            "status": job.status,
            "progress": job.progress,
            "current_step": job.current_step,
            "error_message": job.error_message,
            "started_at": job.started_at.isoformat() if getattr(job, "started_at", None) else None,
            "finished_at": job.finished_at.isoformat() if getattr(job, "finished_at", None) else None,
            "created_at": job.created_at.isoformat() if getattr(job, "created_at", None) else None,
            "tasks": [
                {
                    "step": task.step_name,
                    "status": task.status,
                    "duration_ms": task.duration_ms,
                    "log_output": task.log_output[-500:] if task.log_output else None,
                    "created_at": task.created_at.isoformat() if getattr(task, "created_at", None) else None
                }
                for task in tasks
            ],
            "config": config,
            "celery_task_id": config.get("celery_task_id") if isinstance(config, dict) else None
        }
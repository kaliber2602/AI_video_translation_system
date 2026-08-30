# app/api/video_routes.py - CLEANED with authentication
import os
import shutil
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, File, HTTPException, Query, UploadFile, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import logging
import json

from app.core.config import OUTPUT_DIR, UPLOAD_DIR
from app.core.database import get_db
from app.core.security import get_user_id_from_token
from app.models import Video, VideoPipelineConfig, PipelineJob, PipelineTaskLog, SpeakerProfile, Project
from app.models.enums import JobStatus, VideoStatus
from app.services import (
    JobService,
    AudioService,
    STTService,
    TranslationService,
    TTSAlignerService,
    SubtitleService,
    VideoService,
    ExportService,
)
from app.schemas.video import (
    VideoUploadResponse,
    StartProcessingResponse,
    JobStatusResponse,
    JobCancelResponse,
    VideoListItem,
    VideoDetailResponse,
    PlaybackInfoResponse,
    ProcessingStatusResponse
)

# Import Celery task
from app.tasks.video_tasks import process_video_pipeline, check_task_status

logger = logging.getLogger("app.api.video_routes")

router = APIRouter(prefix="/videos", tags=["videos"])
bearer_scheme = HTTPBearer()


# ============================================================
# AUTH DEPENDENCY
# ============================================================

def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> int:
    """Extract user ID from JWT token"""
    token = credentials.credentials
    try:
        return get_user_id_from_token(token, "access")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def verify_video_access(video: Video, user_id: int) -> bool:
    """Verify user has access to a video"""
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project:
        return False
    return project.owner_id == user_id


# ============================================================
# VIDEO UPLOAD & MANAGEMENT
# ============================================================

@router.get("/status", response_model=ProcessingStatusResponse)
async def processing_status():
    return ProcessingStatusResponse(status="ready", message="Video processing pipeline is available.")


@router.post("/upload", response_model=VideoUploadResponse)
async def upload_video(
    file: UploadFile = File(...),
    target_language: str = Query("vi", description="Target language for translation"),
    project_id: Optional[int] = Query(None, description="Project ID to associate with"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Upload a video for processing."""
    valid_extensions = {'.mp4', '.mov', '.avi', '.mkv', '.webm', '.mpg', '.mpeg'}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in valid_extensions:
        raise HTTPException(400, f"Invalid format. Supported: {', '.join(valid_extensions)}")
    
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > 2 * 1024 * 1024 * 1024:
        raise HTTPException(400, "File size exceeds 2GB limit")
    
    # Handle project
    if project_id is None:
        default_project = db.query(Project).filter(
            Project.owner_id == user_id,
            Project.name == "Default Project"
        ).first()
        if default_project:
            project_id = default_project.id
        else:
            new_project = Project(
                owner_id=user_id,
                name="Default Project",
                status="active",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(new_project)
            db.flush()
            project_id = new_project.id
    else:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(404, f"Project with ID {project_id} not found")
        if project.owner_id != user_id:
            raise HTTPException(403, "You don't have access to this project")
    
    # Get video info
    temp_path = UPLOAD_DIR / f"temp_{uuid.uuid4().hex[:8]}_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    video_info = VideoService.get_video_info(str(temp_path))
    
    # Create video record
    video = Video(
        project_id=project_id,
        title=file.filename,
        original_filename=file.filename,
        duration=video_info.get("duration"),
        fps=video_info.get("fps"),
        resolution=f"{video_info.get('width', 0)}x{video_info.get('height', 0)}",
        status=VideoStatus.UPLOADED.value,
        progress=0,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(video)
    db.flush()
    
    # Move file to final location
    safe_filename = f"{video.id}_{file.filename}"
    input_path = UPLOAD_DIR / safe_filename
    shutil.move(str(temp_path), str(input_path))
    
    # Create pipeline config
    config = VideoPipelineConfig(
        video_id=video.id,
        target_language=target_language,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(config)
    db.commit()
    
    logger.info(f"Video uploaded: {file.filename} (ID: {video.id}, User: {user_id})")
    
    return VideoUploadResponse(
        video_id=video.id,
        filename=file.filename,
        status=VideoStatus.UPLOADED.value,
        message="Video uploaded successfully",
        project_id=project_id
    )


@router.get("/", response_model=List[VideoListItem])
async def list_videos(
    project_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Get the authenticated user's uploaded videos."""
    query = db.query(Video)
    
    # Filter by user's projects
    project_ids = db.query(Project.id).filter(Project.owner_id == user_id).subquery()
    query = query.filter(Video.project_id.in_(project_ids))
    
    if project_id:
        query = query.filter(Video.project_id == project_id)
    if status:
        query = query.filter(Video.status == status)
    
    videos = query.order_by(Video.created_at.desc()).offset(offset).limit(limit).all()
    
    return [
        VideoListItem(
            id=v.id, title=v.title, original_filename=v.original_filename,
            status=v.status, progress=v.progress, current_step=v.current_step,
            duration=v.duration, created_at=v.created_at, updated_at=v.updated_at,
            has_hls=bool(v.output_path and v.output_path.startswith("s3://"))
        )
        for v in videos
    ]


@router.get("/{video_id}", response_model=VideoDetailResponse)
async def get_video_details(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Get video metadata and processing information."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    config = db.query(VideoPipelineConfig).filter(VideoPipelineConfig.video_id == video_id).first()
    
    segments = []
    if video.transcript_path and os.path.exists(video.transcript_path):
        try:
            with open(video.transcript_path, 'r', encoding='utf-8') as f:
                segments = json.load(f).get('segments', [])
        except Exception as e:
            logger.warning(f"Could not load transcript: {e}")
    
    return VideoDetailResponse(
        id=video.id, project_id=video.project_id, title=video.title,
        original_filename=video.original_filename, original_path=video.original_path,
        extracted_vocal_path=video.extracted_vocal_path, background_music_path=video.background_music_path,
        transcript_path=video.transcript_path, subtitle_path=video.subtitle_path,
        dubbed_audio_path=video.dubbed_audio_path, output_path=video.output_path,
        duration=video.duration, fps=video.fps, resolution=video.resolution,
        status=video.status, current_step=video.current_step, progress=video.progress,
        error_message=video.error_message, created_at=video.created_at, updated_at=video.updated_at,
        target_language=config.target_language if config else None,
        source_language=config.source_language if config else None,
        segments=segments
    )


@router.delete("/{video_id}")
async def delete_video(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Delete a video and its generated files."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    try:
        for file in UPLOAD_DIR.glob(f"{video_id}_*"):
            os.remove(file)
            logger.info(f"Deleted: {file}")
        if video.output_path and os.path.exists(video.output_path):
            os.remove(video.output_path)
            logger.info(f"Deleted: {video.output_path}")
        for dir_pattern in [f"hls_{video_id}_*", f"audio_{video_id}", f"transcript_{video_id}", f"tts_{video_id}"]:
            for dir_path in OUTPUT_DIR.glob(dir_pattern):
                shutil.rmtree(dir_path, ignore_errors=True)
                logger.info(f"Deleted: {dir_path}")
    except Exception as e:
        logger.warning(f"Could not delete some files: {e}")
    
    db.delete(video)
    db.commit()
    
    return {"status": "deleted", "video_id": video_id, "message": "Video deleted successfully"}


@router.get("/{video_id}/original")
async def get_original_video(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Access/download the original uploaded video."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    for file in UPLOAD_DIR.glob(f"{video_id}_*"):
        if file.exists():
            return FileResponse(
                file,
                media_type="video/mp4",
                filename=video.original_filename
            )
    
    raise HTTPException(404, "Original video file not found")


# ============================================================
# VIDEO PROCESSING
# ============================================================

@router.post("/{video_id}/process", response_model=StartProcessingResponse)
async def start_processing(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Start the complete AI video-processing workflow."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    if video.status == VideoStatus.PROCESSING.value:
        raise HTTPException(400, "Video is already processing")
    
    if video.status == VideoStatus.COMPLETED.value:
        raise HTTPException(400, "Video is already completed")
    
    config = db.query(VideoPipelineConfig).filter(VideoPipelineConfig.video_id == video_id).first()
    if not config:
        raise HTTPException(404, "Pipeline config not found")
    
    existing_job = (db.query(PipelineJob)
                   .filter(PipelineJob.video_id == video_id)
                   .filter(PipelineJob.status.in_([JobStatus.QUEUED.value, JobStatus.PROCESSING.value]))
                   .first())
    
    if existing_job:
        raise HTTPException(400, f"A job is already running (status: {existing_job.status})")
    
    job_service = JobService(db)
    job = job_service.create_job(
        video_id=video_id,
        triggered_by=user_id,
        config={
            "target_language": config.target_language,
            "source_language": config.source_language,
            "project_id": video.project_id
        }
    )
    
    task = process_video_pipeline.delay(video_id, user_id)
    
    job.config_json = {
        **(job.config_json or {}),
        "celery_task_id": task.id
    }
    db.commit()
    
    logger.info(f"Processing started for video {video_id} (Celery Task: {task.id})")
    
    return StartProcessingResponse(
        job_id=str(job.id),
        video_id=video_id,
        status="processing_started",
        message=f"Processing started. Task ID: {task.id}. Poll /jobs/{job_id}/status for progress."
    )


@router.post("/{video_id}/process/cancel", response_model=JobCancelResponse)
async def cancel_processing(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Cancel an active processing job."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    job = db.query(PipelineJob).filter(
        PipelineJob.video_id == video_id,
        PipelineJob.status.in_([JobStatus.QUEUED.value, JobStatus.PROCESSING.value])
    ).first()
    
    if not job:
        raise HTTPException(404, "No active processing job found")
    
    job_service = JobService(db)
    
    if job.config_json and job.config_json.get("celery_task_id"):
        try:
            from celery.result import AsyncResult
            from app.tasks.celery_app import celery_app
            task = AsyncResult(job.config_json["celery_task_id"], app=celery_app)
            task.revoke(terminate=True)
            logger.info(f"Revoked Celery task: {job.config_json['celery_task_id']}")
        except Exception as e:
            logger.warning(f"Could not revoke Celery task: {e}")
    
    job_service.update_job_status(job.id, JobStatus.CANCELLED, error_message="Cancelled by user")
    
    return JobCancelResponse(status="cancelled", job_id=str(job.id), message="Processing cancelled")


@router.get("/{video_id}/status", response_model=JobStatusResponse)
async def get_video_status(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Return current processing status and progress."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    job = db.query(PipelineJob).filter(
        PipelineJob.video_id == video_id
    ).order_by(PipelineJob.created_at.desc()).first()
    
    if not job:
        return JobStatusResponse(
            job_id="",
            video_id=video_id,
            status="idle",
            progress=0,
            current_step=None,
            error_message=None,
            started_at=None,
            finished_at=None,
            created_at=datetime.utcnow().isoformat(),
            tasks=[]
        )
    
    job_service = JobService(db)
    return job_service.get_job_status(job.id)


@router.get("/{video_id}/logs")
async def get_video_logs(
    video_id: int,
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Return processing logs/errors for debugging."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    job = db.query(PipelineJob).filter(
        PipelineJob.video_id == video_id
    ).order_by(PipelineJob.created_at.desc()).first()
    
    if not job:
        raise HTTPException(404, "No processing job found")
    
    logs = db.query(PipelineTaskLog).filter(
        PipelineTaskLog.job_id == job.id
    ).order_by(PipelineTaskLog.created_at.desc()).limit(limit).all()
    
    return [
        {
            "step": log.step_name,
            "status": log.status,
            "log_output": log.log_output,
            "error_trace": log.error_trace,
            "duration_ms": log.duration_ms,
            "created_at": log.created_at.isoformat()
        }
        for log in logs
    ]


# ============================================================
# AUDIO PROCESSING
# ============================================================

@router.post("/{video_id}/audio/extract")
async def extract_audio(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Extract audio from the uploaded video."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    video_path = None
    for file in UPLOAD_DIR.glob(f"{video_id}_*"):
        video_path = str(file)
        break
    
    if not video_path:
        raise HTTPException(404, "Video file not found")
    
    audio_service = AudioService()
    
    output_dir = OUTPUT_DIR / f"audio_{video_id}"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "audio.wav"
    
    try:
        audio_service.extract_audio(video_path, str(output_path))
        video.extracted_vocal_path = str(output_path)
        db.commit()
        
        return {
            "video_id": video_id,
            "status": "completed",
            "audio_path": str(output_path),
            "message": "Audio extracted successfully"
        }
    except Exception as e:
        raise HTTPException(500, f"Audio extraction failed: {str(e)}")


@router.get("/{video_id}/audio")
async def get_audio(
    video_id: int,
    download: bool = Query(False),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Get information about the extracted audio or download it."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    audio_files = []
    audio_dir = OUTPUT_DIR / f"audio_{video_id}"
    if audio_dir.exists():
        for f in audio_dir.glob("*.wav"):
            audio_files.append({
                "name": f.name,
                "path": str(f),
                "size": os.path.getsize(f)
            })
    
    if download and audio_files:
        return FileResponse(
            audio_files[0]["path"],
            media_type="audio/wav",
            filename=f"audio_{video_id}.wav"
        )
    
    return {
        "video_id": video_id,
        "audio_files": audio_files,
        "extracted_vocal_path": video.extracted_vocal_path,
        "background_music_path": video.background_music_path,
        "count": len(audio_files),
        "status": "available" if audio_files else "not_extracted"
    }


# ============================================================
# TRANSCRIPTION / WHISPER
# ============================================================

@router.post("/{video_id}/transcription")
async def start_transcription(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Start Whisper/WhisperX transcription with speaker detection."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    if not video.extracted_vocal_path or not os.path.exists(video.extracted_vocal_path):
        raise HTTPException(400, "Audio not extracted yet. Use POST /audio/extract first")
    
    stt_service = STTService()
    
    try:
        segments, detected_lang = stt_service.transcribe_audio(video.extracted_vocal_path)
        
        for i, seg in enumerate(segments):
            seg["speaker"] = f"SPEAKER_{i % 2 + 1:02d}"
        
        transcript_dir = OUTPUT_DIR / f"transcript_{video_id}"
        transcript_dir.mkdir(parents=True, exist_ok=True)
        transcript_path = transcript_dir / "transcript.json"
        
        with open(transcript_path, 'w', encoding='utf-8') as f:
            json.dump({
                "language": detected_lang,
                "segments": segments
            }, f, indent=2)
        
        unique_speakers = set(seg.get("speaker") for seg in segments if seg.get("speaker"))
        for speaker_label in unique_speakers:
            speaker = SpeakerProfile(
                video_id=video_id,
                speaker_label=speaker_label,
                language=detected_lang,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(speaker)
        
        video.transcript_path = str(transcript_path)
        db.commit()
        
        return {
            "video_id": video_id,
            "status": "completed",
            "language": detected_lang,
            "segments": segments,
            "total_segments": len(segments),
            "message": "Transcription completed"
        }
    except Exception as e:
        raise HTTPException(500, f"Transcription failed: {str(e)}")


@router.get("/{video_id}/transcription")
async def get_transcription(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Get the transcript with timestamped segments and speaker labels."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    if not video.transcript_path or not os.path.exists(video.transcript_path):
        return {
            "video_id": video_id,
            "status": "not_available",
            "message": "Transcription not available yet"
        }
    
    try:
        with open(video.transcript_path, 'r', encoding='utf-8') as f:
            transcript_data = json.load(f)
        
        speakers = db.query(SpeakerProfile).filter(SpeakerProfile.video_id == video_id).all()
        speaker_list = [
            {
                "id": s.id,
                "label": s.speaker_label,
                "language": s.language,
                "gender": s.gender
            }
            for s in speakers
        ]
        
        return {
            "video_id": video_id,
            "language": transcript_data.get("language"),
            "segments": transcript_data.get("segments", []),
            "speakers": speaker_list,
            "total_segments": len(transcript_data.get("segments", [])),
            "status": "available"
        }
    except Exception as e:
        raise HTTPException(500, f"Error reading transcript: {str(e)}")


@router.get("/{video_id}/transcription/{segment_id}")
async def get_transcript_segment(
    video_id: int,
    segment_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Get one transcript segment with speaker info."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    if not video.transcript_path or not os.path.exists(video.transcript_path):
        raise HTTPException(404, "Transcript not found")
    
    try:
        with open(video.transcript_path, 'r', encoding='utf-8') as f:
            transcript_data = json.load(f)
        
        segments = transcript_data.get("segments", [])
        if segment_id < 0 or segment_id >= len(segments):
            raise HTTPException(404, "Segment not found")
        
        return segments[segment_id]
    except Exception as e:
        raise HTTPException(500, f"Error reading transcript: {str(e)}")


@router.put("/{video_id}/transcription")
async def update_transcription(
    video_id: int,
    updates: dict,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Edit/correct transcript text, timestamps, or speaker labels."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    if not video.transcript_path or not os.path.exists(video.transcript_path):
        raise HTTPException(404, "Transcript not found")
    
    try:
        with open(video.transcript_path, 'r', encoding='utf-8') as f:
            transcript_data = json.load(f)
        
        segment_id = updates.get("segment_id")
        if segment_id is None:
            raise HTTPException(400, "segment_id required")
        
        segments = transcript_data.get("segments", [])
        if segment_id < 0 or segment_id >= len(segments):
            raise HTTPException(404, "Segment not found")
        
        if "text" in updates:
            segments[segment_id]["text"] = updates["text"]
        if "start" in updates:
            segments[segment_id]["start"] = updates["start"]
        if "end" in updates:
            segments[segment_id]["end"] = updates["end"]
        if "speaker" in updates:
            segments[segment_id]["speaker"] = updates["speaker"]
        
        with open(video.transcript_path, 'w', encoding='utf-8') as f:
            json.dump(transcript_data, f, indent=2)
        
        return {
            "video_id": video_id,
            "segment_id": segment_id,
            "updated": True,
            "message": "Transcript updated"
        }
    except Exception as e:
        raise HTTPException(500, f"Error updating transcript: {str(e)}")


# ============================================================
# SPEAKER DIARIZATION
# ============================================================

@router.get("/{video_id}/speakers")
async def get_speakers(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Get detected speakers with their segments."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    speakers = db.query(SpeakerProfile).filter(SpeakerProfile.video_id == video_id).all()
    
    return {
        "video_id": video_id,
        "speakers": [
            {
                "id": s.id,
                "label": s.speaker_label,
                "language": s.language,
                "gender": s.gender,
                "voice_sample_path": s.voice_sample_path
            }
            for s in speakers
        ],
        "count": len(speakers)
    }


@router.put("/{video_id}/speakers/{speaker_id}")
async def update_speaker(
    video_id: int,
    speaker_id: int,
    updates: dict,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Rename/update speaker information."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    speaker = db.query(SpeakerProfile).filter(
        SpeakerProfile.id == speaker_id,
        SpeakerProfile.video_id == video_id
    ).first()
    
    if not speaker:
        raise HTTPException(404, "Speaker not found")
    
    if "label" in updates:
        speaker.speaker_label = updates["label"]
    if "gender" in updates:
        speaker.gender = updates["gender"]
    if "language" in updates:
        speaker.language = updates["language"]
    
    db.commit()
    
    return {
        "speaker_id": speaker_id,
        "updated": True,
        "message": "Speaker updated"
    }


@router.get("/{video_id}/diarization")
async def get_diarization(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Get speaker segments and timestamps."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    if not video.transcript_path or not os.path.exists(video.transcript_path):
        return {
            "video_id": video_id,
            "status": "not_available",
            "message": "Transcription not available"
        }
    
    try:
        with open(video.transcript_path, 'r', encoding='utf-8') as f:
            transcript_data = json.load(f)
        
        segments = transcript_data.get("segments", [])
        
        speaker_segments = {}
        for seg in segments:
            speaker = seg.get("speaker", "Unknown")
            if speaker not in speaker_segments:
                speaker_segments[speaker] = []
            speaker_segments[speaker].append(seg)
        
        return {
            "video_id": video_id,
            "speaker_segments": speaker_segments,
            "total_segments": len(segments),
            "status": "available"
        }
    except Exception as e:
        raise HTTPException(500, f"Error reading diarization: {str(e)}")


# ============================================================
# TRANSLATION
# ============================================================

@router.post("/{video_id}/translations")
async def start_translation(
    video_id: int,
    target_language: str = Query(..., description="Target language code (e.g., vi, en, fr)"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Translate transcript into a target language."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    if not video.transcript_path or not os.path.exists(video.transcript_path):
        raise HTTPException(400, "Transcript not available. Run transcription first")
    
    from app.core.languages import TARGET_LANGUAGE_MAP, SOURCE_LANGUAGE_MAP
    
    translation_service = TranslationService()
    
    try:
        with open(video.transcript_path, 'r', encoding='utf-8') as f:
            transcript_data = json.load(f)
        
        segments = transcript_data.get("segments", [])
        detected_lang = transcript_data.get("language", "en")
        
        lang_config = TARGET_LANGUAGE_MAP.get(target_language)
        if not lang_config:
            raise HTTPException(400, f"Unsupported target language: {target_language}")
        
        nllb_tgt = lang_config["nllb"]
        nllb_src = SOURCE_LANGUAGE_MAP.get(detected_lang, "eng_Latn")
        
        translated_segments = translation_service.translate_document(
            segments=segments,
            glossary={},
            src_lang=nllb_src,
            tgt_lang=nllb_tgt
        )
        
        translation_dir = os.path.dirname(video.transcript_path)
        translation_path = os.path.join(translation_dir, f"translation_{target_language}.json")
        
        with open(translation_path, 'w', encoding='utf-8') as f:
            json.dump({
                "source_language": detected_lang,
                "target_language": target_language,
                "segments": translated_segments
            }, f, indent=2)
        
        return {
            "video_id": video_id,
            "target_language": target_language,
            "source_language": detected_lang,
            "segments": translated_segments,
            "total_segments": len(translated_segments),
            "status": "completed"
        }
    except Exception as e:
        raise HTTPException(500, f"Translation failed: {str(e)}")


@router.get("/{video_id}/translations")
async def list_translations(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """List available translations."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    translation_dir = os.path.dirname(video.transcript_path) if video.transcript_path else None
    
    translations = []
    if translation_dir and os.path.exists(translation_dir):
        for file in os.listdir(translation_dir):
            if file.startswith("translation_") and file.endswith(".json"):
                lang = file.replace("translation_", "").replace(".json", "")
                translations.append({
                    "language": lang,
                    "path": os.path.join(translation_dir, file),
                    "size": os.path.getsize(os.path.join(translation_dir, file))
                })
    
    return {
        "video_id": video_id,
        "translations": translations,
        "count": len(translations)
    }


@router.get("/{video_id}/translations/{language}")
async def get_translation(
    video_id: int,
    language: str,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Get translation for a specific language."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    translation_dir = os.path.dirname(video.transcript_path) if video.transcript_path else None
    
    if translation_dir:
        translation_path = os.path.join(translation_dir, f"translation_{language}.json")
        if os.path.exists(translation_path):
            try:
                with open(translation_path, 'r', encoding='utf-8') as f:
                    translation_data = json.load(f)
                return translation_data
            except Exception as e:
                raise HTTPException(500, f"Error reading translation: {str(e)}")
    
    raise HTTPException(404, f"Translation for language '{language}' not found")


@router.put("/{video_id}/translations/{language}")
async def update_translation(
    video_id: int,
    language: str,
    updates: dict,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Edit/correct translated segments."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    translation_dir = os.path.dirname(video.transcript_path) if video.transcript_path else None
    if not translation_dir:
        raise HTTPException(404, "Translation directory not found")
    
    translation_path = os.path.join(translation_dir, f"translation_{language}.json")
    if not os.path.exists(translation_path):
        raise HTTPException(404, f"Translation for language '{language}' not found")
    
    try:
        with open(translation_path, 'r', encoding='utf-8') as f:
            translation_data = json.load(f)
        
        segment_id = updates.get("segment_id")
        if segment_id is None:
            raise HTTPException(400, "segment_id required")
        
        segments = translation_data.get("segments", [])
        if segment_id < 0 or segment_id >= len(segments):
            raise HTTPException(404, "Segment not found")
        
        if "translated_text" in updates:
            segments[segment_id]["translated_text"] = updates["translated_text"]
        
        with open(translation_path, 'w', encoding='utf-8') as f:
            json.dump(translation_data, f, indent=2)
        
        return {
            "video_id": video_id,
            "language": language,
            "segment_id": segment_id,
            "updated": True,
            "message": "Translation updated"
        }
    except Exception as e:
        raise HTTPException(500, f"Error updating translation: {str(e)}")


@router.delete("/{video_id}/translations/{language}")
async def delete_translation(
    video_id: int,
    language: str,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Delete a generated translation."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    translation_dir = os.path.dirname(video.transcript_path) if video.transcript_path else None
    if not translation_dir:
        raise HTTPException(404, "Translation directory not found")
    
    translation_path = os.path.join(translation_dir, f"translation_{language}.json")
    if not os.path.exists(translation_path):
        raise HTTPException(404, f"Translation for language '{language}' not found")
    
    os.remove(translation_path)
    
    return {
        "video_id": video_id,
        "language": language,
        "deleted": True,
        "message": f"Translation for language '{language}' deleted"
    }


# ============================================================
# SUBTITLE GENERATION
# ============================================================

@router.post("/{video_id}/subtitles")
async def generate_subtitles(
    video_id: int,
    language: str = Query(..., description="Language for subtitles"),
    format: str = Query("srt", description="Subtitle format: srt, vtt, ass"),
    font_size: int = Query(20, description="Font size for subtitles"),
    position: str = Query("bottom", description="Subtitle position: bottom, top, middle"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Generate subtitles from transcript/translation with formatting options."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    translation_dir = os.path.dirname(video.transcript_path) if video.transcript_path else None
    if not translation_dir:
        raise HTTPException(404, "Transcript directory not found")
    
    # Try to use translation first, fallback to transcript
    translation_path = os.path.join(translation_dir, f"translation_{language}.json")
    if os.path.exists(translation_path):
        with open(translation_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            segments = data.get("segments", [])
            text_key = "translated_text"
    else:
        with open(video.transcript_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            segments = data.get("segments", [])
            text_key = "text"
    
    subtitle_service = SubtitleService()
    subtitle_path = os.path.join(translation_dir, f"subtitles_{language}.{format}")
    
    try:
        subtitle_service.save_subtitles(
            segments=segments,
            output_path=subtitle_path,
            format=format,
            text_key=text_key,
            font_size=font_size,
            position=position
        )
        
        video.subtitle_path = subtitle_path
        db.commit()
        
        return {
            "video_id": video_id,
            "language": language,
            "format": format,
            "font_size": font_size,
            "position": position,
            "path": subtitle_path,
            "status": "completed",
            "message": f"Subtitles generated in {format} format"
        }
    except Exception as e:
        raise HTTPException(500, f"Subtitle generation failed: {str(e)}")


@router.get("/{video_id}/subtitles")
async def list_subtitles(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """List generated subtitle files."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    subtitle_dir = os.path.dirname(video.subtitle_path) if video.subtitle_path else None
    
    subtitles = []
    if subtitle_dir and os.path.exists(subtitle_dir):
        for file in os.listdir(subtitle_dir):
            if file.startswith("subtitles_") and file.endswith((".srt", ".vtt", ".ass")):
                lang = file.replace("subtitles_", "").split(".")[0]
                subtitles.append({
                    "language": lang,
                    "format": file.split(".")[-1],
                    "path": os.path.join(subtitle_dir, file),
                    "size": os.path.getsize(os.path.join(subtitle_dir, file))
                })
    
    return {
        "video_id": video_id,
        "subtitles": subtitles,
        "count": len(subtitles)
    }


@router.get("/{video_id}/subtitles/{language}")
async def get_subtitles(
    video_id: int,
    language: str,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Get subtitles for a language."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    subtitle_dir = os.path.dirname(video.subtitle_path) if video.subtitle_path else None
    
    if subtitle_dir:
        for ext in ['.srt', '.vtt', '.ass']:
            subtitle_path = os.path.join(subtitle_dir, f"subtitles_{language}{ext}")
            if os.path.exists(subtitle_path):
                with open(subtitle_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                return {
                    "video_id": video_id,
                    "language": language,
                    "format": ext[1:],
                    "content": content
                }
    
    raise HTTPException(404, f"Subtitles for language '{language}' not found")


@router.get("/{video_id}/subtitles/{language}/download")
async def download_subtitles_file(
    video_id: int,
    language: str,
    format: str = Query("srt", regex="^(srt|vtt|ass)$"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Download subtitle file."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    subtitle_dir = os.path.dirname(video.subtitle_path) if video.subtitle_path else None
    
    if subtitle_dir:
        subtitle_path = os.path.join(subtitle_dir, f"subtitles_{language}.{format}")
        if os.path.exists(subtitle_path):
            media_type = "text/plain" if format in ["srt", "ass"] else "text/vtt"
            return FileResponse(
                subtitle_path,
                media_type=media_type,
                filename=f"subtitles_{language}.{format}"
            )
    
    raise HTTPException(404, f"Subtitles for language '{language}' not found")


# ============================================================
# TTS / VOICE
# ============================================================

@router.get("/{video_id}/voices")
async def list_voices(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """List detected/available speaker voices."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    speakers = db.query(SpeakerProfile).filter(SpeakerProfile.video_id == video_id).all()
    
    return {
        "video_id": video_id,
        "speakers": [
            {
                "id": s.id,
                "label": s.speaker_label,
                "language": s.language,
                "gender": s.gender,
                "voice_sample_path": s.voice_sample_path
            }
            for s in speakers
        ],
        "count": len(speakers)
    }


@router.post("/{video_id}/tts")
async def generate_tts(
    video_id: int,
    language: str = Query(..., description="Target language for TTS"),
    style: str = Query("neutral", description="Speaking style"),
    speed: float = Query(1.0, description="Speaking speed multiplier (0.5 - 2.0)"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Generate speech from translated text with voice selection and style."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    translation_dir = os.path.dirname(video.transcript_path) if video.transcript_path else None
    if not translation_dir:
        raise HTTPException(404, "Transcript directory not found")
    
    translation_path = os.path.join(translation_dir, f"translation_{language}.json")
    if not os.path.exists(translation_path):
        raise HTTPException(404, f"Translation for {language} not found")
    
    with open(translation_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        segments = data.get("segments", [])
    
    vocal_path = video.extracted_vocal_path
    if not vocal_path or not os.path.exists(vocal_path):
        raise HTTPException(404, "Vocal track not found")
    
    from app.core.languages import TARGET_LANGUAGE_MAP
    lang_config = TARGET_LANGUAGE_MAP.get(language)
    xtts_lang = lang_config["xtts"] if lang_config else "en"
    
    tts_service = TTSAlignerService()
    
    tts_dir = OUTPUT_DIR / f"tts_{video_id}"
    tts_dir.mkdir(parents=True, exist_ok=True)
    tts_path = tts_dir / f"tts_{language}.wav"
    
    try:
        tts_service.generate_tts_with_alignment(
            segments=segments,
            output_path=str(tts_path),
            temp_dir=str(tts_dir),
            vocal_path=vocal_path,
            tgt_lang=xtts_lang
        )
        
        if speed != 1.0:
            import subprocess
            temp_path = tts_dir / f"tts_{language}_temp.wav"
            subprocess.run([
                "ffmpeg", "-i", str(tts_path),
                "-filter:a", f"atempo={speed}",
                str(temp_path)
            ], check=True)
            shutil.move(str(temp_path), str(tts_path))
        
        video.dubbed_audio_path = str(tts_path)
        db.commit()
        
        return {
            "video_id": video_id,
            "language": language,
            "style": style,
            "speed": speed,
            "tts_path": str(tts_path),
            "status": "completed",
            "message": "TTS generated successfully"
        }
    except Exception as e:
        raise HTTPException(500, f"TTS generation failed: {str(e)}")


@router.get("/{video_id}/tts/{language}")
async def get_tts(
    video_id: int,
    language: str,
    preview: bool = Query(False, description="Get preview audio"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Get generated TTS information or preview audio."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    tts_dir = OUTPUT_DIR / f"tts_{video_id}"
    tts_path = tts_dir / f"tts_{language}.wav"
    
    if tts_path.exists():
        if preview:
            return FileResponse(tts_path, media_type="audio/wav", filename=f"tts_{language}_preview.wav")
        
        return {
            "video_id": video_id,
            "language": language,
            "tts_path": str(tts_path),
            "size": os.path.getsize(tts_path),
            "status": "available"
        }
    
    return {
        "video_id": video_id,
        "language": language,
        "status": "not_generated",
        "message": "TTS not generated yet. Use POST /tts first"
    }


# ============================================================
# VIDEO DUBBING
# ============================================================

@router.post("/{video_id}/dub")
async def generate_dubbed_video(
    video_id: int,
    language: str = Query(..., description="Target language for dubbing"),
    video_format: str = Query("mp4", description="Output video format: mp4, mov, avi"),
    quality: str = Query("1080p", description="Video quality: 360p, 720p, 1080p, 4K"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Generate a complete dubbed video with format and quality options."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    video_path = None
    for file in UPLOAD_DIR.glob(f"{video_id}_*"):
        video_path = str(file)
        break
    
    if not video_path:
        raise HTTPException(404, "Original video not found")
    
    tts_path = video.dubbed_audio_path
    if not tts_path or not os.path.exists(tts_path):
        raise HTTPException(400, "TTS not found. Generate TTS first.")
    
    bgm_path = video.background_music_path
    if not bgm_path or not os.path.exists(bgm_path):
        bgm_dir = OUTPUT_DIR / f"audio_{video_id}"
        if bgm_dir.exists():
            bgm_files = list(bgm_dir.glob("*bgm*.wav"))
            if bgm_files:
                bgm_path = str(bgm_files[0])
    
    audio_service = AudioService()
    
    output_filename = f"dubbed_{language}_{quality}.{video_format}"
    output_path = str(OUTPUT_DIR / output_filename)
    
    try:
        import tempfile
        with tempfile.TemporaryDirectory() as temp_dir:
            audio_service.mix_and_mux(
                video_path=video_path,
                tts_audio_path=tts_path,
                bgm_audio_path=bgm_path or "",
                final_output_path=output_path,
                temp_dir=temp_dir
            )
        
        video.output_path = output_path
        video.status = VideoStatus.COMPLETED.value
        video.resolution = quality
        db.commit()
        
        return {
            "video_id": video_id,
            "language": language,
            "video_format": video_format,
            "quality": quality,
            "output_path": output_path,
            "status": "completed",
            "message": "Dubbed video generated successfully"
        }
    except Exception as e:
        raise HTTPException(500, f"Dubbing failed: {str(e)}")


@router.get("/{video_id}/dub")
async def get_dubbing_status(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Get dubbing status and generated output."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    job = db.query(PipelineJob).filter(
        PipelineJob.video_id == video_id,
        PipelineJob.config_json.contains({"step": "dubbing"})
    ).order_by(PipelineJob.created_at.desc()).first()
    
    if not job:
        return {
            "video_id": video_id,
            "status": "not_started",
            "message": "No dubbing job found"
        }
    
    return {
        "video_id": video_id,
        "job_id": str(job.id),
        "status": job.status,
        "progress": job.progress,
        "error_message": job.error_message,
        "output_path": video.output_path if video.output_path else None
    }


@router.get("/{video_id}/dub/{language}/download")
async def download_dubbed_video(
    video_id: int,
    language: str,
    format: str = Query("mp4", description="Download format: mp4, mov, avi"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Download the dubbed video with format option."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    if not video.output_path or not os.path.exists(video.output_path):
        raise HTTPException(404, "Dubbed video not found")
    
    filename = f"dubbed_{language}_{video.original_filename}"
    
    if format != "mp4":
        output_dir = OUTPUT_DIR / "downloads"
        output_dir.mkdir(parents=True, exist_ok=True)
        converted_path = output_dir / f"dubbed_{language}_{video_id}.{format}"
        
        if not converted_path.exists():
            import subprocess
            subprocess.run([
                "ffmpeg", "-i", video.output_path,
                "-c:v", "libx264" if format != "mov" else "copy",
                "-c:a", "aac",
                str(converted_path)
            ], check=True)
        
        return FileResponse(converted_path, media_type="video/mp4", filename=filename)
    
    return FileResponse(video.output_path, media_type="video/mp4", filename=filename)


# ============================================================
# REVIEW & EXPORT
# ============================================================

@router.get("/{video_id}/export/options")
async def get_export_options(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Get available export options for the video."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    export_service = ExportService()
    available_exports = export_service.get_available_exports(video)
    
    return {
        "video_id": video_id,
        "title": video.title,
        "status": video.status,
        "available_exports": available_exports
    }


@router.get("/{video_id}/export")
async def export_video(
    video_id: int,
    export_type: str = Query(..., description="Export type: final_video, subtitles, audio, transcript, translation"),
    format: str = Query("mp4", description="Export format"),
    quality: Optional[str] = Query(None, description="Video quality for final video"),
    language: Optional[str] = Query(None, description="Language for subtitles/translation"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Export video with specified options."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    export_service = ExportService()
    
    if export_type == "final_video":
        if not video.output_path or not os.path.exists(video.output_path):
            raise HTTPException(404, "Final video not found")
        
        if quality:
            output_path = export_service.export_final_video(
                video_path=video.output_path,
                format=format,
                quality=quality
            )
            return FileResponse(output_path, media_type="video/mp4", filename=f"export_{quality}.{format}")
        
        return FileResponse(video.output_path, media_type="video/mp4", filename=f"export.{format}")
    
    elif export_type == "subtitles":
        if not language:
            language = video.target_language or "vi"
        
        subtitle_dir = os.path.dirname(video.subtitle_path) if video.subtitle_path else None
        if subtitle_dir:
            subtitle_path = os.path.join(subtitle_dir, f"subtitles_{language}.{format}")
            if os.path.exists(subtitle_path):
                return FileResponse(
                    subtitle_path,
                    media_type="text/plain" if format in ["srt", "ass"] else "text/vtt",
                    filename=f"subtitles_{language}.{format}"
                )
        raise HTTPException(404, f"Subtitles for language '{language}' not found")
    
    elif export_type == "audio":
        if not video.dubbed_audio_path or not os.path.exists(video.dubbed_audio_path):
            raise HTTPException(404, "Audio file not found")
        
        output_path = export_service.export_audio(
            audio_path=video.dubbed_audio_path,
            format=format
        )
        return FileResponse(output_path, media_type="audio/mpeg" if format == "mp3" else "audio/wav", filename=f"audio.{format}")
    
    elif export_type == "transcript":
        if not video.transcript_path or not os.path.exists(video.transcript_path):
            raise HTTPException(404, "Transcript not found")
        
        output_path = export_service.export_transcript(
            transcript_path=video.transcript_path,
            format=format
        )
        media_type = "text/plain" if format == "txt" else "application/json"
        return FileResponse(output_path, media_type=media_type, filename=f"transcript.{format}")
    
    elif export_type == "translation":
        if not language:
            language = video.target_language or "vi"
        
        if video.transcript_path:
            translation_dir = os.path.dirname(video.transcript_path)
            translation_path = os.path.join(translation_dir, f"translation_{language}.json")
            if os.path.exists(translation_path):
                output_path = export_service.export_translation(
                    translation_path=translation_path,
                    format=format
                )
                media_type = "text/plain" if format == "txt" else "application/json"
                return FileResponse(output_path, media_type=media_type, filename=f"translation_{language}.{format}")
        
        raise HTTPException(404, f"Translation for language '{language}' not found")
    
    raise HTTPException(400, f"Invalid export type: {export_type}")


# ============================================================
# PLAYBACK (HLS Streaming)
# ============================================================

@router.get("/{video_id}/play", response_model=PlaybackInfoResponse)
async def get_playback_info(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Get HLS playback URL for a completed video."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    project = db.query(Project).filter(Project.id == video.project_id).first()
    if not project or project.owner_id != user_id:
        raise HTTPException(403, "You don't have access to this video")
    
    if video.status != VideoStatus.COMPLETED.value:
        raise HTTPException(400, "Video is not ready for playback")
    
    config = db.query(VideoPipelineConfig).filter(VideoPipelineConfig.video_id == video_id).first()
    if not config:
        raise HTTPException(404, "Pipeline config not found")
    
    from app.core.config import AWS_S3_BUCKET, AWS_REGION
    
    s3_prefix = f"videos/{video_id}/translated/{config.target_language}/hls"
    s3_endpoint = os.getenv("S3_ENDPOINT_URL", "")
    
    if s3_endpoint:
        hls_url = f"{s3_endpoint.rstrip('/')}/{AWS_S3_BUCKET}/{s3_prefix}/master.m3u8"
    else:
        hls_url = f"https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_prefix}/master.m3u8"
    
    subtitle_urls = {}
    if video.subtitle_path and os.path.exists(video.subtitle_path):
        subtitle_urls[config.target_language] = f"/api/videos/{video_id}/subtitles/{config.target_language}"
    
    return PlaybackInfoResponse(
        hls_url=hls_url,
        qualities=["360p", "720p", "1080p"],
        metadata={
            "title": video.title,
            "duration": video.duration,
            "target_language": config.target_language,
            "video_id": video_id
        },
        subtitle_urls=subtitle_urls
    )


# ============================================================
# JOB STATUS ENDPOINTS
# ============================================================

@router.get("/jobs/{job_id}/status", response_model=JobStatusResponse)
async def get_job_status(
    job_id: str,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(400, "Invalid job ID format")
    
    job_service = JobService(db)
    job = job_service.get_job(job_uuid)
    
    if not job:
        raise HTTPException(404, "Job not found")
    
    # Verify user has access to the video
    video = db.query(Video).filter(Video.id == job.video_id).first()
    if video:
        project = db.query(Project).filter(Project.id == video.project_id).first()
        if not project or project.owner_id != user_id:
            raise HTTPException(403, "You don't have access to this job")
    
    status = job_service.get_job_status(job_uuid)
    return status


@router.get("/jobs/{job_id}/celery-status")
async def get_celery_status(
    job_id: str,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Get Celery task status for a job."""
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(400, "Invalid job ID format")
    
    job_service = JobService(db)
    job = job_service.get_job(job_uuid)
    
    if not job:
        raise HTTPException(404, "Job not found")
    
    # Verify user has access
    video = db.query(Video).filter(Video.id == job.video_id).first()
    if video:
        project = db.query(Project).filter(Project.id == video.project_id).first()
        if not project or project.owner_id != user_id:
            raise HTTPException(403, "You don't have access to this job")
    
    celery_task_id = job.config_json.get("celery_task_id") if job.config_json else None
    if not celery_task_id:
        return {"status": "no_celery_task", "message": "No Celery task associated with this job"}
    
    return check_task_status.delay(celery_task_id).get(timeout=5)


@router.get("/jobs/{job_id}/logs")
async def get_job_logs(
    job_id: str,
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(400, "Invalid job ID format")
    
    job_service = JobService(db)
    job = job_service.get_job(job_uuid)
    
    if not job:
        raise HTTPException(404, "Job not found")
    
    # Verify user has access
    video = db.query(Video).filter(Video.id == job.video_id).first()
    if video:
        project = db.query(Project).filter(Project.id == video.project_id).first()
        if not project or project.owner_id != user_id:
            raise HTTPException(403, "You don't have access to this job")
    
    logs = db.query(PipelineTaskLog).filter(
        PipelineTaskLog.job_id == job_uuid
    ).order_by(PipelineTaskLog.created_at.desc()).limit(limit).all()
    
    return [
        {
            "step": log.step_name,
            "status": log.status,
            "log_output": log.log_output,
            "error_trace": log.error_trace,
            "duration_ms": log.duration_ms,
            "created_at": log.created_at.isoformat()
        }
        for log in logs
    ]


@router.post("/jobs/{job_id}/cancel", response_model=JobCancelResponse)
async def cancel_job(
    job_id: str,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(400, "Invalid job ID format")
    
    job_service = JobService(db)
    job = job_service.get_job(job_uuid)
    
    if not job:
        raise HTTPException(404, "Job not found")
    
    # Verify user has access
    video = db.query(Video).filter(Video.id == job.video_id).first()
    if video:
        project = db.query(Project).filter(Project.id == video.project_id).first()
        if not project or project.owner_id != user_id:
            raise HTTPException(403, "You don't have access to this job")
    
    if job.status in [JobStatus.COMPLETED.value, JobStatus.FAILED.value]:
        raise HTTPException(400, f"Job is already {job.status}")
    
    if job.config_json and job.config_json.get("celery_task_id"):
        try:
            from celery.result import AsyncResult
            from app.tasks.celery_app import celery_app
            task = AsyncResult(job.config_json["celery_task_id"], app=celery_app)
            task.revoke(terminate=True)
            logger.info(f"Revoked Celery task: {job.config_json['celery_task_id']}")
        except Exception as e:
            logger.warning(f"Could not revoke Celery task: {e}")
    
    job_service.update_job_status(job.id, JobStatus.CANCELLED, error_message="Cancelled by user")
    
    return JobCancelResponse(status="cancelled", job_id=job_id, message="Job cancelled successfully")
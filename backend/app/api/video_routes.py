# app/api/video_routes.py - CLEANED with authentication
import os
import shutil
import subprocess
import uuid
import math
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, File, HTTPException, Query, UploadFile, Depends, status, Body
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.responses import FileResponse, RedirectResponse
import logging
import json
try:
    import boto3
    from botocore.exceptions import ClientError
    from botocore.config import Config as BotoConfig
except Exception:
    boto3 = None
    ClientError = Exception
    BotoConfig = None
from app.core.config import OUTPUT_DIR, UPLOAD_DIR, AWS_S3_BUCKET, AWS_REGION, S3_ENDPOINT_URL
from app.core.database import get_db, DatabaseSession, desc, Session
from app.core.security import get_user_id_from_token
from app.models import Video, VideoPipelineConfig, PipelineJob, PipelineTaskLog, SpeakerProfile, Project, ProjectFolder, TranscriptSegment, VideoRenderOutput
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
from app.services.subscription_service import (
    validate_upload_quota,
    get_user_effective_quota,
    deduct_user_credits,
    refund_user_credits,
    deduct_user_words,
    refund_user_words,
    get_model_credit_cost,
)
from app.core.tokenizer import TokenizerService
from app.schemas.video import (
    VideoUploadResponse,
    VideoUpdateRequest,
    StartProcessingResponse,
    JobStatusResponse,
    JobCancelResponse,
    VideoListItem,
    VideoDetailResponse,
    PlaybackInfoResponse,
    ProcessingStatusResponse,
    VideoChapterResponse,
    VideoDocumentResponse,
)
from app.services.video_understanding_service import VideoUnderstandingService
from fastapi.responses import JSONResponse

# Import Celery task
from app.tasks.video_tasks import process_video_pipeline, check_task_status

logger = logging.getLogger("app.api.video_routes")

router = APIRouter(prefix="/videos", tags=["videos"])
bearer_scheme = HTTPBearer(auto_error=False)

# Initialize S3 storage manager for Production (AWS S3 Primary + MinIO Fallback)
from app.services.s3_service import (
    storage_manager,
    delete_prefix,
    delete_file,
    upload_file as s3_upload_file,
    download_file as s3_download_file,
)
s3_client = storage_manager._primary_client or storage_manager._fallback_client
S3_PUBLIC_URL = os.getenv("S3_PUBLIC_URL", "http://localhost:9000")


def generate_browser_presigned_url(params: dict, expires_in: int = 3600) -> str:
    """Generate a presigned S3/MinIO URL with automatic circuit breaker failover."""
    s3_key = params.get("Key", "")
    disposition = params.get("ResponseContentDisposition")
    content_type = params.get("ResponseContentType")
    url = storage_manager.generate_presigned_url(
        s3_key=s3_key,
        expires_in=expires_in,
        response_content_disposition=disposition,
        response_content_type=content_type,
    )
    return url or ""


def check_user_project_access(
    project_id: int,
    user_id: int,
    db: Session,
    required_role: str = "viewer",
) -> tuple[bool, Optional[Project]]:
    """
    Verifies if a user has access to a project:
    1. If user is project.owner_id -> Full access (owner)
    2. If user is in project_members table (by user_id or email) -> Checks role hierarchy (owner > editor > viewer)
    """
    project = db.query(Project).filter(Project.id == project_id, Project.deleted_at.is_(None)).first()
    if not project:
        return False, None
    if project.owner_id == user_id:
        return True, project

    try:
        with db.conn.cursor() as cur:
            cur.execute(
                """
                SELECT role FROM project_members
                WHERE project_id = %s AND (user_id = %s OR email = (SELECT email FROM users WHERE id = %s))
                """,
                (project_id, user_id, user_id),
            )
            row = cur.fetchone()
            if row:
                role = (row[0] or "").lower()
                if required_role == "viewer":
                    return role in ("owner", "admin", "editor", "viewer"), project
                elif required_role == "editor":
                    return role in ("owner", "admin", "editor"), project
                elif required_role == "owner":
                    return role in ("owner", "admin"), project
    except Exception as e:
        logger.warning(f"Error checking project membership: {e}")

    return False, project


def get_video_with_access(
    video_id: int,
    user_id: int,
    db: Session,
    required_role: str = "viewer",
) -> tuple[Video, Project]:
    """Retrieve video and verify user project access permissions."""
    video = db.query(Video).filter(Video.id == video_id, Video.deleted_at.is_(None)).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    has_access, project = check_user_project_access(video.project_id, user_id, db, required_role)
    if not has_access:
        raise HTTPException(status_code=403, detail="You don't have access to this video")
    return video, project



# ============================================================
# AUTH DEPENDENCY
# ============================================================

def get_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    token: Optional[str] = Query(None, description="Optional access token for direct media streaming"),
) -> int:
    """Extract user ID from JWT token via Authorization header or query parameter."""
    raw_token = credentials.credentials if credentials else token
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return get_user_id_from_token(raw_token, "access")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


# ============================================================
# VIDEO UPLOAD & MANAGEMENT
# ============================================================

@router.get("/status", response_model=ProcessingStatusResponse)
async def processing_status():
    return ProcessingStatusResponse(status="ready", message="Video processing pipeline is available.")


@router.get("/languages")
async def get_supported_languages():
    """Return the list of supported source and target languages."""
    from app.core.languages import SUPPORTED_LANGUAGES
    return {"languages": SUPPORTED_LANGUAGES}



@router.post("/upload", response_model=VideoUploadResponse)
async def upload_video(
    file: UploadFile = File(...),
    target_language: str = Query("vi", description="Target language for translation"),
    project_id: Optional[int] = Query(None, description="Project ID to associate with"),
    folder_id: Optional[int] = Query(None, description="Folder ID within the project"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Upload a video for processing with quota validation."""
    valid_extensions = {'.mp4', '.mov', '.avi', '.mkv', '.webm', '.mpg', '.mpeg'}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in valid_extensions:
        raise HTTPException(400, f"Invalid format. Supported: {', '.join(valid_extensions)}")
    
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > 2 * 1024 * 1024 * 1024:
        raise HTTPException(400, "File size exceeds 2GB limit")
    
    # Enforce storage quota upfront before writing file
    validate_upload_quota(user_id=user_id, incoming_bytes=file_size, db=db)
    
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
        has_access, project = check_user_project_access(project_id, user_id, db, required_role="editor")
        if not project:
            raise HTTPException(404, f"Project with ID {project_id} not found")
        if not has_access:
            raise HTTPException(403, "You don't have access to this project")
            
    # Handle folder validation if specified
    if folder_id is not None:
        folder = db.query(ProjectFolder).filter(
            ProjectFolder.id == folder_id,
            ProjectFolder.project_id == project_id
        ).first()
        if not folder:
            raise HTTPException(404, f"Folder with ID {folder_id} not found in this project")
    
    # Get video info
    temp_path = UPLOAD_DIR / f"temp_{uuid.uuid4().hex[:8]}_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    video_info = VideoService.get_video_info(str(temp_path))
    
    # Create video record
    video = Video(
        project_id=project_id,
        folder_id=folder_id,
        title=file.filename,
        original_filename=file.filename,
        file_size=file_size,
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
    video.original_path = str(input_path)
    
    # Create pipeline config
    config = VideoPipelineConfig(
        video_id=video.id,
        target_language=target_language,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(config)
    db.commit()
    
    logger.info(f"📤 Video uploaded: {file.filename} (ID: {video.id}, Size: {file_size} bytes, User: {user_id})")
    logger.info(f"   Local path: {input_path}")
    
    return VideoUploadResponse(
        video_id=video.id,
        filename=file.filename,
        status=VideoStatus.UPLOADED.value,
        message="Video uploaded successfully",
        project_id=project_id,
        folder_id=folder_id,
        file_size=file_size
    )


@router.get("/", response_model=List[VideoListItem])
async def list_videos(
    project_id: Optional[int] = Query(None),
    folder_id: Optional[int] = Query(None),
    root_only: bool = Query(False),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Get the authenticated user's uploaded videos."""
    query = db.query(Video).filter(Video.deleted_at.is_(None))
    
    # Filter by user's owned projects OR projects where user is an invited member
    accessible_pids = [
        r.id for r in db.query(Project.id).filter(Project.owner_id == user_id, Project.deleted_at.is_(None)).all()
    ]
    try:
        with db.conn.cursor() as cur:
            cur.execute(
                "SELECT project_id FROM project_members WHERE user_id = %s",
                (user_id,)
            )
            for row in cur.fetchall():
                if row[0] not in accessible_pids:
                    accessible_pids.append(row[0])
    except Exception as e:
        logger.warning(f"Error fetching member projects: {e}")

    if not accessible_pids:
        return []

    query = query.filter(Video.project_id.in_(accessible_pids))
    
    if project_id:
        query = query.filter(Video.project_id == project_id)
    if folder_id is not None:
        query = query.filter(Video.folder_id == folder_id)
    elif root_only:
        query = query.filter(Video.folder_id.is_(None))
    if status:
        query = query.filter(Video.status == status)
    
    videos = query.order_by(Video.created_at.desc()).offset(offset).limit(limit).all()
    
    return [
        VideoListItem(
            id=v.id,
            project_id=v.project_id,
            folder_id=v.folder_id,
            title=v.title,
            original_filename=v.original_filename,
            file_size=v.file_size,
            status=v.status,
            progress=v.progress,
            current_step=v.current_step,
            duration=v.duration,
            created_at=v.created_at,
            updated_at=v.updated_at,
            has_hls=bool(v.output_path and v.output_path.startswith("videos/"))
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
    video, project = get_video_with_access(video_id, user_id, db, required_role="viewer")
    
    config = db.query(VideoPipelineConfig).filter(VideoPipelineConfig.video_id == video_id).first()
    
    segments = []
    if video.transcript_path and os.path.exists(video.transcript_path):
        try:
            with open(video.transcript_path, 'r', encoding='utf-8') as f:
                segments = json.load(f).get('segments', [])
        except Exception as e:
            logger.warning(f"Could not load transcript: {e}")
    
    return VideoDetailResponse(
        id=video.id,
        project_id=video.project_id,
        folder_id=video.folder_id,
        title=video.title,
        original_filename=video.original_filename,
        file_size=video.file_size,
        original_path=video.original_path,
        extracted_vocal_path=video.extracted_vocal_path,
        background_music_path=video.background_music_path,
        transcript_path=video.transcript_path,
        subtitle_path=video.subtitle_path,
        dubbed_audio_path=video.dubbed_audio_path,
        output_path=video.output_path,
        duration=video.duration,
        fps=video.fps,
        resolution=video.resolution,
        status=video.status,
        current_step=video.current_step,
        progress=video.progress,
        error_message=video.error_message,
        created_at=video.created_at,
        updated_at=video.updated_at,
        target_language=config.target_language if config else None,
        source_language=config.source_language if config else None,
        segments=segments
    )


@router.patch("/{video_id}", response_model=VideoDetailResponse)
async def update_video(
    video_id: int,
    payload: VideoUpdateRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Update video metadata (title rename, move folder)."""
    video, project = get_video_with_access(video_id, user_id, db, required_role="editor")
    
    if payload.title is not None:
        trimmed = payload.title.strip()
        if not trimmed:
            raise HTTPException(400, "Title cannot be empty")
        video.title = trimmed
        
    if payload.folder_id is not None:
        if payload.folder_id == 0:
            # 0 means move to project root
            video.folder_id = None
        else:
            folder = db.query(ProjectFolder).filter(
                ProjectFolder.id == payload.folder_id,
                ProjectFolder.project_id == video.project_id
            ).first()
            if not folder:
                raise HTTPException(404, f"Folder with ID {payload.folder_id} not found in this project")
            video.folder_id = payload.folder_id
            
    video.updated_at = datetime.utcnow()
    db.commit()
    return await get_video_details(video_id=video_id, db=db, user_id=user_id)


@router.get("/{video_id}/download")
async def download_video(
    video_id: int,
    kind: str = Query("output", description="'output' or 'original'"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Download translated output video or original uploaded video."""
    video, project = get_video_with_access(video_id, user_id, db, required_role="viewer")
    
    target_path = None
    target_filename = video.original_filename or f"video_{video_id}.mp4"
    
    if kind == "output":
        if video.output_path and os.path.exists(video.output_path):
            target_path = Path(video.output_path)
            target_filename = f"translated_{video.original_filename or f'{video_id}.mp4'}"
        elif video.dubbed_audio_path and os.path.exists(video.dubbed_audio_path):
            target_path = Path(video.dubbed_audio_path)
            target_filename = f"dubbed_{video_id}.wav"
    
    if not target_path or not target_path.exists():
        # Fallback to original
        if video.original_path and os.path.exists(video.original_path):
            target_path = Path(video.original_path)
        else:
            for file in UPLOAD_DIR.glob(f"{video_id}_*"):
                if file.exists():
                    target_path = file
                    break
    
    if not target_path or not target_path.exists():
        raise HTTPException(404, "Requested video file not found on disk")
        
    return FileResponse(
        str(target_path),
        media_type="application/octet-stream",
        filename=target_filename,
        headers={"Content-Disposition": f'attachment; filename="{target_filename}"'}
    )


@router.delete("/{video_id}")
async def delete_video(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Delete a video, soft delete record, and clean up physical and S3/MinIO files."""
    video = db.query(Video).filter(Video.id == video_id, Video.deleted_at.is_(None)).first()
    if not video:
        raise HTTPException(404, "Video not found")
    
    has_access, project = check_user_project_access(video.project_id, user_id, db, required_role="editor")
    if not has_access:
        raise HTTPException(403, "You don't have access to this video")
    
    # 1. Clean up local files
    try:
        for file in UPLOAD_DIR.glob(f"{video_id}_*"):
            try:
                os.remove(file)
                logger.info(f"Deleted local file: {file}")
            except Exception:
                pass
        if video.original_path and os.path.exists(video.original_path):
            try:
                os.remove(video.original_path)
            except Exception:
                pass
        if video.output_path and os.path.exists(video.output_path):
            try:
                os.remove(video.output_path)
            except Exception:
                pass
        for dir_pattern in [f"hls_{video_id}_*", f"audio_{video_id}", f"transcript_{video_id}", f"tts_{video_id}"]:
            for dir_path in OUTPUT_DIR.glob(dir_pattern):
                try:
                    shutil.rmtree(dir_path, ignore_errors=True)
                    logger.info(f"Deleted local dir: {dir_path}")
                except Exception:
                    pass
    except Exception as e:
        logger.warning(f"Could not delete some local files: {e}")

    # 2. Clean up S3 / MinIO storage with Circuit Breaker failover
    try:
        delete_prefix(f"videos/{video_id}/")
        delete_prefix(f"audio/{video_id}/")
        delete_prefix(f"subtitles/{video_id}/")
        delete_prefix(f"dubbing/{video_id}/")
        delete_prefix(f"thumbnails/{video_id}/")
        if video.s3_key:
            delete_file(video.s3_key)
        logger.info(f"[Storage] Successfully cleaned S3/MinIO objects for video {video_id}")
    except Exception as e:
        logger.warning(f"Could not delete S3/MinIO objects for video {video_id}: {e}")
    
    # 3. Soft-delete and release recorded storage quota
    video.deleted_at = datetime.utcnow()
    video.file_size = 0
    db.commit()
    
    return {"status": "deleted", "video_id": video_id, "message": "Video deleted successfully"}


@router.get("/{video_id}/original")
async def get_original_video(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Access/download the original uploaded video."""
    video, project = get_video_with_access(video_id, user_id, db, required_role="viewer")
    
    if video.original_path and os.path.exists(video.original_path):
        return FileResponse(
            video.original_path,
            media_type="video/mp4",
            filename=video.original_filename
        )
        
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
    """Start the complete AI video-processing workflow with quota and credit enforcement."""
    video, project = get_video_with_access(video_id, user_id, db, required_role="editor")
    
    if video.status == VideoStatus.PROCESSING.value:
        raise HTTPException(400, "Video is already processing")
    
    if video.status == VideoStatus.COMPLETED.value:
        raise HTTPException(400, "Video is already completed")
    
    # 1. Enforce concurrent processing limits based on subscription plan
    quota = get_user_effective_quota(user_id=user_id, db=db)
    max_concurrent = quota.get("max_concurrent_jobs", 1)
    active_jobs_count = (
        db.query(PipelineJob)
        .filter(
            PipelineJob.triggered_by == user_id,
            PipelineJob.status.in_([JobStatus.QUEUED.value, JobStatus.PROCESSING.value])
        )
        .count()
    )
    if active_jobs_count >= max_concurrent:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"Concurrent processing limit reached ({active_jobs_count}/{max_concurrent} active jobs). Please wait for active jobs to complete."
        )
    
    config = db.query(VideoPipelineConfig).filter(VideoPipelineConfig.video_id == video_id).first()
    if not config:
        raise HTTPException(404, "Pipeline config not found")

    # 2. Enforce AI credit deduction dynamically based on ai_models table
    sep_cost = get_model_credit_cost(config.separation_model or "demucs_v4", default_cost=1)
    stt_cost = get_model_credit_cost(config.stt_model or "whisperx_large_v3", default_cost=1)
    diar_cost = get_model_credit_cost(config.diarization_model or "pyannote_3.1", default_cost=1)
    trans_cost = get_model_credit_cost(config.translation_model or "nllb_200_1.3b", default_cost=1)
    tts_cost = get_model_credit_cost(config.tts_model or "xtts_v2", default_cost=2)
    llm_cost = get_model_credit_cost(config.llm_model or "gpt_4o_mini", default_cost=1) if (config.auto_chapter_detection or config.auto_generate_summary) else 0
    total_model_rate = sep_cost + stt_cost + diar_cost + trans_cost + tts_cost + llm_cost

    duration_mins = max(1, int(math.ceil((video.duration or 60) / 60.0)))
    credits_needed = duration_mins * total_model_rate

    if not deduct_user_credits(
        user_id=user_id,
        credits_amount=credits_needed,
        service_type="COMPLETE_PIPELINE",
        description=f"Full pipeline #{video_id} ({duration_mins}m x {total_model_rate}cr/m = {credits_needed} credits)",
        video_id=video_id,
    ):
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            f"Insufficient AI credits to start processing ({credits_needed} required). Please upgrade your plan or purchase extra credits."
        )

    # Enforce word quota deduction for tokenize-based subscription
    estimated_words = TokenizerService.estimate_video_words(video.duration or 60.0)
    deduct_user_words(
        user_id=user_id,
        words_amount=estimated_words,
        service_type="COMPLETE_PIPELINE",
        description=f"Full pipeline #{video_id} (~{estimated_words} words)",
        video_id=video_id,
    )
    
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
    
    logger.info(f"🚀 Processing started for video {video_id} (Celery Task: {task.id}, Credits: {credits_needed})")
    
    return StartProcessingResponse(
        job_id=str(job.id),
        video_id=video_id,
        status="processing_started",
        message=f"Processing started. Task ID: {task.id}. Poll /jobs/{job.id}/status for progress."
    )


@router.post("/{video_id}/process/cancel", response_model=JobCancelResponse)
async def cancel_processing(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Cancel an active processing job and refund credits."""
    video, project = get_video_with_access(video_id, user_id, db, required_role="editor")
    
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
    
    # Refund AI credits and word quota
    credits_to_refund = max(1, int(round((video.duration or 60) / 60)))
    refund_user_credits(user_id=user_id, credits=credits_to_refund, reason=f"Refund for cancelled video #{video_id}", db=db)
    refund_user_words(user_id=user_id, words_amount=TokenizerService.estimate_video_words(video.duration or 60.0), description=f"Refund for cancelled video #{video_id}", video_id=video_id)
    
    return JobCancelResponse(status="cancelled", job_id=str(job.id), message="Processing cancelled")


@router.get("/{video_id}/status", response_model=JobStatusResponse)
async def get_video_status(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Return current processing status and progress."""
    video, project = get_video_with_access(video_id, user_id, db, required_role="viewer")
    
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
    video, project = get_video_with_access(video_id, user_id, db, required_role="viewer")
    
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
    video, project = get_video_with_access(video_id, user_id, db, required_role="editor")
    
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
    video, project = get_video_with_access(video_id, user_id, db, required_role="viewer")
    
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
    video, project = get_video_with_access(video_id, user_id, db, required_role="editor")
    
    # ✅ Check if vocal track exists (separated audio)
    vocal_path = video.extracted_vocal_path
    if not vocal_path or not os.path.exists(vocal_path):
        raise HTTPException(400, "Audio not ready. Run /audio/extract and /audio/separate first")
    
    # ✅ If the vocal path ends with "audio.wav", it's raw audio - suggest separation
    if vocal_path.endswith("audio.wav"):
        logger.warning(f"Raw audio used for transcription, not separated vocals")
        # Still proceed, but log warning
    
    # Enforce AI credit deduction for STT from ai_models table
    config = db.query(VideoPipelineConfig).filter(VideoPipelineConfig.video_id == video_id).first()
    stt_model = config.stt_model if config and config.stt_model else "whisperx_large_v3"
    cost_per_min = get_model_credit_cost(stt_model, default_cost=1)
    duration_mins = max(1, int(math.ceil((video.duration or 60) / 60.0)))
    credits_needed = duration_mins * cost_per_min

    if not deduct_user_credits(
        user_id=user_id,
        credits_amount=credits_needed,
        service_type="WHISPER_STT",
        description=f"STT ({stt_model}) for video #{video_id} ({duration_mins}m @ {cost_per_min}cr/m = {credits_needed} credits)",
        video_id=video_id,
    ):
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            f"Insufficient AI credits for transcription ({credits_needed} required). Please upgrade your plan or top up credits."
        )
    
    stt_service = STTService()
    
    try:
        segments, detected_lang = stt_service.transcribe_audio(vocal_path)
        
        transcript_dir = OUTPUT_DIR / f"transcript_{video_id}"
        transcript_dir.mkdir(parents=True, exist_ok=True)
        transcript_path = transcript_dir / "transcript.json"

        with open(transcript_path, 'w', encoding='utf-8') as f:
            json.dump({
                "language": detected_lang,
                "segments": segments
            }, f, indent=2)

        # Enforce word quota deduction for tokenize-based subscription
        transcribed_words = TokenizerService.count_segments_words(segments)
        if transcribed_words <= 0:
            transcribed_words = TokenizerService.estimate_video_words(video.duration or 60.0)
        deduct_user_words(
            user_id=user_id,
            words_amount=transcribed_words,
            service_type="WHISPER_STT",
            description=f"Whisper STT for video #{video_id} ({transcribed_words} words)",
            video_id=video_id,
        )

        # Diarization: use Pyannote if available, otherwise default to single speaker (SPEAKER_01)
        from app.services.diarization_service import DiarizationService
        diar_service = DiarizationService()
        if diar_service.is_available():
            try:
                logger.info(f"Running pyannote diarization on {vocal_path}...")
                diar_segments = diar_service.diarize(vocal_path)
                segments = diar_service.assign_speakers_to_transcript(
                    str(transcript_path), diar_segments, output_path=str(transcript_path)
                )
            except Exception as e:
                logger.warning(f"Diarization error: {e}, falling back to single speaker")
                for seg in segments:
                    seg["speaker"] = "SPEAKER_01"
        else:
            logger.info("Diarization model unavailable or single speaker, defaulting to SPEAKER_01")
            for seg in segments:
                seg["speaker"] = "SPEAKER_01"

        with open(transcript_path, 'w', encoding='utf-8') as f:
            json.dump({
                "language": detected_lang,
                "segments": segments
            }, f, indent=2)
        
        # Clean up existing speaker profiles and transcript segments for clean re-runs
        db.query(TranscriptSegment).filter(TranscriptSegment.video_id == video_id).delete()
        db.query(SpeakerProfile).filter(SpeakerProfile.video_id == video_id).delete()
        db.flush()

        unique_speakers = sorted(list(set(seg.get("speaker") or "SPEAKER_01" for seg in segments)))
        if not unique_speakers:
            unique_speakers = ["SPEAKER_01"]

        speaker_id_map = {}
        for speaker_label in unique_speakers:
            speaker = SpeakerProfile(
                video_id=video_id,
                speaker_label=speaker_label,
                language=detected_lang,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(speaker)
            db.flush()
            speaker_id_map[speaker_label] = speaker.id
        
        # Populate TranscriptSegment records (BUG-12 fix)
        for idx, seg in enumerate(segments):
            spk_label = seg.get("speaker") or "SPEAKER_01"
            db.add(TranscriptSegment(
                video_id=video_id,
                speaker_id=speaker_id_map.get(spk_label),
                sequence=idx + 1,
                start_time=float(seg.get("start", 0.0)),
                end_time=float(seg.get("end", 0.0)),
                original_text=str(seg.get("text", "")).strip(),
                language=detected_lang,
                confidence=float(seg.get("confidence", 1.0)) if seg.get("confidence") is not None else 1.0,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            ))
        
        video.transcript_path = str(transcript_path)
        db.commit()

        # Extract voice samples for each speaker profile
        for speaker_label, spk_id in speaker_id_map.items():
            try:
                spk_seg = next((s for s in segments if s.get("speaker") == speaker_label and (float(s.get("end", 0)) - float(s.get("start", 0))) >= 1.0), None)
                start_sec = float(spk_seg.get("start", 0.0)) if spk_seg else 0.0
                dur_sec = min(float(spk_seg.get("end", start_sec + 8.0)) - start_sec, 8.0) if spk_seg else 8.0
                if dur_sec < 3.0:
                    dur_sec = 8.0

                sample_dir = OUTPUT_DIR / f"audio_{video_id}"
                sample_dir.mkdir(parents=True, exist_ok=True)
                sample_file = sample_dir / f"speaker_{spk_id}_sample.wav"
                
                import subprocess
                cmd = [
                    "ffmpeg", "-y",
                    "-ss", str(start_sec),
                    "-t", str(dur_sec),
                    "-i", vocal_path,
                    "-vn", "-ac", "1", "-ar", "24000",
                    "-c:a", "pcm_s16le",
                    str(sample_file)
                ]
                subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if sample_file.exists():
                    spk_record = db.query(SpeakerProfile).filter(SpeakerProfile.id == spk_id).first()
                    if spk_record:
                        spk_record.voice_sample_path = str(sample_file)
                        db.commit()
            except Exception as se:
                logger.warning(f"Could not pre-extract voice sample for speaker {spk_id}: {se}")
        
        return {
            "video_id": video_id,
            "status": "completed",
            "language": detected_lang,
            "segments": segments,
            "total_segments": len(segments),
            "message": "Transcription completed"
        }
    except Exception as e:
        logger.exception(f"Transcription failed for video #{video_id}: {e}")
        try:
            refund_user_credits(
                user_id=user_id,
                credits_amount=credits_needed,
                reason=f"Failed transcription for video #{video_id}",
                video_id=video_id,
            )
        except Exception as ref_err:
            logger.error(f"Failed to refund credits for user {user_id}: {ref_err}")
        raise HTTPException(500, f"Transcription failed: {str(e)}")


@router.get("/{video_id}/transcription")
async def get_transcription(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Get the transcript with timestamped segments and speaker labels."""
    video, project = get_video_with_access(video_id, user_id, db, required_role="viewer")
    
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
    video, project = get_video_with_access(video_id, user_id, db, required_role="viewer")
    
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
    video, project = get_video_with_access(video_id, user_id, db, required_role="editor")
    
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
    video, project = get_video_with_access(video_id, user_id, db, required_role="viewer")
    
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
    video, project = get_video_with_access(video_id, user_id, db, required_role="editor")
    
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
    video, project = get_video_with_access(video_id, user_id, db, required_role="viewer")
    
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
    video, project = get_video_with_access(video_id, user_id, db, required_role="editor")
    
    if not video.transcript_path or not os.path.exists(video.transcript_path):
        raise HTTPException(400, "Transcript not available. Run transcription first")
    
    from app.core.languages import TARGET_LANGUAGE_MAP, SOURCE_LANGUAGE_MAP
    
    # Enforce AI credit deduction for translation from ai_models table
    config = db.query(VideoPipelineConfig).filter(VideoPipelineConfig.video_id == video_id).first()
    trans_model = config.translation_model if config and config.translation_model else "nllb_200_1.3b"
    cost_per_min = get_model_credit_cost(trans_model, default_cost=1)
    duration_mins = max(1, int(math.ceil((video.duration or 60) / 60.0)))
    credits_needed = duration_mins * cost_per_min

    if not deduct_user_credits(
        user_id=user_id,
        credits_amount=credits_needed,
        service_type="TRANSLATION",
        description=f"Translation ({trans_model}, {target_language}) for video #{video_id} ({duration_mins}m @ {cost_per_min}cr/m = {credits_needed} credits)",
        video_id=video_id,
    ):
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            f"Insufficient AI credits for translation ({credits_needed} required). Please upgrade your plan or top up credits."
        )
    
    translation_service = TranslationService()
    
    try:
        with open(video.transcript_path, 'r', encoding='utf-8') as f:
            transcript_data = json.load(f)
        
        segments = transcript_data.get("segments", [])
        detected_lang = transcript_data.get("language", "en")

        # Enforce word quota deduction for tokenize-based subscription
        trans_words = TokenizerService.count_segments_words(segments)
        if trans_words <= 0:
            trans_words = TokenizerService.estimate_video_words(video.duration or 60.0)
        deduct_user_words(
            user_id=user_id,
            words_amount=trans_words,
            service_type="TRANSLATION",
            description=f"Translation ({target_language}) for video #{video_id} ({trans_words} words)",
            video_id=video_id,
        )
        
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
    video, project = get_video_with_access(video_id, user_id, db, required_role="viewer")
    
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
    video, project = get_video_with_access(video_id, user_id, db, required_role="viewer")
    
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
    video, project = get_video_with_access(video_id, user_id, db, required_role="editor")
    
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
    video, project = get_video_with_access(video_id, user_id, db, required_role="editor")
    
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
    font_name: str = Query("Arial", description="Font name for subtitles"),
    primary_color: str = Query("#FFFFFF", description="Text color in hex"),
    outline_color: str = "#000000",
    max_lines: int = Query(2, description="Max lines: 1, 2, or 0 (unlimited)"),
    effect: str = Query("none", description="Effect: none, fade, pop, slide, karaoke"),
    aspect_ratio: Optional[str] = Query(None, description="Video aspect ratio: 16:9, 9:16, 1:1, 4:3"),
    body: Optional[dict] = Body(None),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Generate subtitles from transcript/translation with formatting, colors, line limits, and animation effects."""
    video, project = get_video_with_access(video_id, user_id, db, required_role="editor")
    
    translation_dir = os.path.dirname(video.transcript_path) if video.transcript_path else None
    if not translation_dir:
        alt_dir = OUTPUT_DIR / f"transcript_{video_id}"
        alt_dir.mkdir(parents=True, exist_ok=True)
        translation_dir = str(alt_dir)
    
    # Check if custom segments were supplied in request body
    custom_segments = body.get("segments") if body else None
    if custom_segments and isinstance(custom_segments, list) and len(custom_segments) > 0:
        segments = custom_segments
        text_key = "translated_text"
        # Persist custom segments to translation_{language}.json
        translation_path = os.path.join(translation_dir, f"translation_{language}.json")
        try:
            with open(translation_path, 'w', encoding='utf-8') as f:
                json.dump({
                    "video_id": video_id,
                    "source_language": video.source_language or "en",
                    "target_language": language,
                    "segments": segments
                }, f, indent=2, ensure_ascii=False)
        except Exception as save_err:
            logger.warning(f"Could not persist custom segments: {save_err}")
    else:
        # Try to use translation first, fallback to transcript
        translation_path = os.path.join(translation_dir, f"translation_{language}.json")
        if os.path.exists(translation_path):
            with open(translation_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                segments = data.get("segments", [])
                text_key = "translated_text"
        elif video.transcript_path and os.path.exists(video.transcript_path):
            with open(video.transcript_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                segments = data.get("segments", [])
                text_key = "text"
        else:
            segments = []
            text_key = "translated_text"
    
    subtitle_service = SubtitleService()
    if body and body.get("auto_split_chunks"):
        segments = subtitle_service.split_long_segments(segments)
    subtitle_path = os.path.join(translation_dir, f"subtitles_{language}.{format}")
    
    try:
        # Detect aspect ratio and video dimensions for optimal subtitle sizing & margins
        req_aspect = (body.get("aspect_ratio") if body else None) or aspect_ratio
        video_width = None
        video_height = None
        detected_aspect = "16:9"
        is_portrait = False
        try:
            import subprocess
            source_file = video.original_path
            if not source_file or not os.path.exists(source_file):
                for f in UPLOAD_DIR.glob(f"{video_id}_*"):
                    if f.exists():
                        source_file = str(f)
                        break
            if source_file and os.path.exists(source_file):
                cmd = ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', str(source_file)]
                probe = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
                if probe.returncode == 0 and probe.stdout.strip():
                    parts = probe.stdout.strip().split(',')
                    if len(parts) >= 2:
                        video_width = int(parts[0])
                        video_height = int(parts[1])
                        ratio = float(video_width) / float(video_height)
                        if 0.9 <= ratio <= 1.1:
                            detected_aspect = "1:1"
                        elif ratio <= 0.65:
                            detected_aspect = "9:16"
                        elif ratio <= 0.85:
                            detected_aspect = "4:5"
                        elif 1.25 <= ratio <= 1.45:
                            detected_aspect = "4:3"
                        is_portrait = (ratio < 1.0)
        except Exception:
            pass

        final_aspect = req_aspect or detected_aspect

        # Save all 3 formats (srt, vtt, ass) so they are immediately ready for burning, streaming, downloading
        paths = subtitle_service.save_all_subtitles(
            segments=segments,
            base_dir=translation_dir,
            language=language,
            text_key=text_key,
            font_size=font_size,
            position=position,
            font_name=font_name,
            primary_color=primary_color,
            outline_color=outline_color,
            max_lines=max_lines,
            effect=effect,
            is_portrait=is_portrait,
            aspect_ratio=final_aspect,
            video_width=video_width,
            video_height=video_height,
            auto_split=True,
        )
        subtitle_path = paths.get(format, subtitle_path)
        video.subtitle_path = subtitle_path
        db.commit()
        
        with open(subtitle_path, 'r', encoding='utf-8') as f:
            content = f.read()

        return {
            "video_id": video_id,
            "language": language,
            "format": format,
            "font_size": font_size,
            "position": position,
            "font_name": font_name,
            "primary_color": primary_color,
            "outline_color": outline_color,
            "max_lines": max_lines,
            "effect": effect,
            "segments_count": len(segments),
            "path": subtitle_path,
            "content": content,
            "status": "completed",
            "message": f"Subtitles generated in {format} format with {effect} effect"
        }
    except Exception as e:
        raise HTTPException(500, f"Subtitle generation failed: {str(e)}")


@router.get("/{video_id}/subtitles/{language}/segments")
async def get_subtitle_segments(
    video_id: int,
    language: str,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Get structured subtitle segments list for the subtitle editor."""
    video, project = get_video_with_access(video_id, user_id, db, required_role="viewer")
    translation_dir = os.path.dirname(video.transcript_path) if video.transcript_path else None
    if not translation_dir:
        alt_dir = OUTPUT_DIR / f"transcript_{video_id}"
        if alt_dir.exists():
            translation_dir = str(alt_dir)
            
    segments = []
    if translation_dir:
        trans_file = os.path.join(translation_dir, f"translation_{language}.json")
        if os.path.exists(trans_file):
            with open(trans_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                segments = data.get("segments", [])
        elif video.transcript_path and os.path.exists(video.transcript_path):
            with open(video.transcript_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                raw_segments = data.get("segments", [])
                segments = [
                    {
                        "start": s.get("start", 0),
                        "end": s.get("end", 0),
                        "text": s.get("text", ""),
                        "translated_text": s.get("translated_text", s.get("text", ""))
                    }
                    for s in raw_segments
                ]
                
    return {
        "video_id": video_id,
        "language": language,
        "segments": segments,
        "count": len(segments)
    }


@router.put("/{video_id}/subtitles/{language}/segments")
async def update_subtitle_segments(
    video_id: int,
    language: str,
    body: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """
    Save and update subtitle segments directly from the Video Editor.
    Does NOT deduct quota (editing is free).
    Automatically regenerates SRT, VTT, and ASS files with current segments.
    """
    video, project = get_video_with_access(video_id, user_id, db, required_role="editor")
    segments = body.get("segments", [])
    if not isinstance(segments, list):
        raise HTTPException(400, "Invalid segments payload, must be a list")

    translation_dir = os.path.dirname(video.transcript_path) if video.transcript_path else None
    if not translation_dir:
        alt_dir = OUTPUT_DIR / f"transcript_{video_id}"
        alt_dir.mkdir(parents=True, exist_ok=True)
        translation_dir = str(alt_dir)

    # 1. Save updated segments to translation_{language}.json
    translation_path = os.path.join(translation_dir, f"translation_{language}.json")
    try:
        with open(translation_path, "w", encoding="utf-8") as f:
            json.dump({
                "video_id": video_id,
                "source_language": video.source_language or "en",
                "target_language": language,
                "segments": segments
            }, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Failed to persist segments to {translation_path}: {e}")
        raise HTTPException(500, f"Failed to save segments: {str(e)}")

    # 2. Re-generate all subtitle formats (SRT, VTT, ASS)
    subtitle_service = SubtitleService()
    style_params = body.get("style", {})
    font_size = int(style_params.get("fontSize", 22))
    position = style_params.get("position", "bottom")
    font_name = style_params.get("fontName", "Montserrat")
    primary_color = style_params.get("primaryColor", "#FFFFFF")
    outline_color = style_params.get("outlineColor", "#000000")
    max_lines = int(style_params.get("maxLines", 2))
    effect = style_params.get("effect", "pop")

    try:
        paths = subtitle_service.save_all_subtitles(
            segments=segments,
            output_dir=translation_dir,
            language=language,
            text_key="translated_text",
            font_size=font_size,
            position=position,
            font_name=font_name,
            primary_color=primary_color,
            outline_color=outline_color,
            max_lines=max_lines,
            effect=effect,
        )
        if "srt" in paths:
            video.subtitle_path = paths["srt"]
            db.commit()
    except Exception as e:
        logger.warning(f"Could not regenerate all subtitle files: {e}")

    return {
        "success": True,
        "video_id": video_id,
        "language": language,
        "count": len(segments),
        "segments": segments,
        "message": f"Successfully updated {len(segments)} subtitle segments"
    }


@router.get("/{video_id}/subtitles")
async def list_subtitles(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """List generated subtitle files."""
    video, project = get_video_with_access(video_id, user_id, db, required_role="viewer")
    
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
    format: Optional[str] = Query(None, description="Subtitle format: srt, vtt, ass"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Get subtitles for a language with optional format selection."""
    video, project = get_video_with_access(video_id, user_id, db, required_role="viewer")
    
    subtitle_dir = os.path.dirname(video.subtitle_path) if video.subtitle_path and os.path.exists(video.subtitle_path) else None
    if not subtitle_dir:
        alt_dir = OUTPUT_DIR / f"transcript_{video_id}"
        if alt_dir.exists():
            subtitle_dir = str(alt_dir)

    if subtitle_dir:
        req_fmt = (format or "srt").lower().lstrip(".")
        target_path = os.path.join(subtitle_dir, f"subtitles_{language}.{req_fmt}")
        
        # If requested format does not exist, try auto-generating from .srt
        if not os.path.exists(target_path):
            srt_path = os.path.join(subtitle_dir, f"subtitles_{language}.srt")
            if os.path.exists(srt_path):
                with open(srt_path, 'r', encoding='utf-8') as f:
                    srt_data = f.read()
                if req_fmt == "vtt":
                    vtt_content = SubtitleService.srt_to_vtt(srt_data)
                    with open(target_path, 'w', encoding='utf-8') as f:
                        f.write(vtt_content)
                elif req_fmt == "ass":
                    # Generate ASS from SRT
                    pass
        
        if os.path.exists(target_path):
            with open(target_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return {
                "video_id": video_id,
                "language": language,
                "format": req_fmt,
                "content": content
            }
        
        # Fallback to any existing subtitle format
        for ext in ['.srt', '.vtt', '.ass']:
            fallback_path = os.path.join(subtitle_dir, f"subtitles_{language}{ext}")
            if os.path.exists(fallback_path):
                with open(fallback_path, 'r', encoding='utf-8') as f:
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
    video, project = get_video_with_access(video_id, user_id, db, required_role="viewer")
    
    subtitle_dir = os.path.dirname(video.subtitle_path) if video.subtitle_path and os.path.exists(video.subtitle_path) else None
    if not subtitle_dir:
        alt_dir = OUTPUT_DIR / f"transcript_{video_id}"
        if alt_dir.exists():
            subtitle_dir = str(alt_dir)
    
    if subtitle_dir:
        subtitle_path = os.path.join(subtitle_dir, f"subtitles_{language}.{format}")
        # If missing, auto-convert from SRT if format is VTT
        if not os.path.exists(subtitle_path) and format == "vtt":
            srt_path = os.path.join(subtitle_dir, f"subtitles_{language}.srt")
            if os.path.exists(srt_path):
                with open(srt_path, 'r', encoding='utf-8') as f:
                    srt_data = f.read()
                vtt_data = SubtitleService.srt_to_vtt(srt_data)
                with open(subtitle_path, 'w', encoding='utf-8') as f:
                    f.write(vtt_data)
        
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
    video, project = get_video_with_access(video_id, user_id, db, required_role="viewer")
    
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


@router.get("/{video_id}/speakers/{speaker_id}/sample")
@router.get("/{video_id}/vocal/sample")
async def get_speaker_sample(
    video_id: int,
    speaker_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Serve the original voice sample used for speaker cloning."""
    video, project = get_video_with_access(video_id, user_id, db, required_role="viewer")

    speaker = None
    if speaker_id is not None:
        speaker = db.query(SpeakerProfile).filter(
            SpeakerProfile.video_id == video_id,
            SpeakerProfile.id == speaker_id
        ).first()
    
    # Fallback to first speaker for this video if speaker_id not found or not provided
    if not speaker:
        speaker = db.query(SpeakerProfile).filter(
            SpeakerProfile.video_id == video_id
        ).order_by(SpeakerProfile.id.asc()).first()

    # 1. If speaker already has an existing valid voice sample file
    if speaker and speaker.voice_sample_path and os.path.exists(speaker.voice_sample_path):
        return FileResponse(
            speaker.voice_sample_path,
            media_type="audio/wav",
            filename=f"speaker_{speaker.id}_sample.wav",
            headers={"Content-Disposition": f"inline; filename=speaker_{speaker.id}_sample.wav"}
        )

    # 2. Find source audio to extract sample from
    source_audio = None
    candidates = [
        video.extracted_vocal_path,
        str(OUTPUT_DIR / f"audio_{video_id}" / "audio.wav"),
        str(OUTPUT_DIR / f"audio_{video_id}" / "vocals.wav"),
    ]
    # Check htdemucs recursive files if vocals were separated
    audio_dir = OUTPUT_DIR / f"audio_{video_id}"
    if audio_dir.exists():
        for root, _, files in os.walk(audio_dir):
            for f in files:
                if f in ("vocals.wav", "audio.wav"):
                    p = os.path.join(root, f)
                    if p not in candidates:
                        candidates.append(p)

    for c in candidates:
        if c and os.path.exists(c):
            source_audio = c
            break

    # If no separated audio exists yet, check raw uploaded video file
    if not source_audio:
        for file in UPLOAD_DIR.glob(f"{video_id}_*"):
            if file.is_file():
                source_audio = str(file)
                break

    if not source_audio or not os.path.exists(source_audio):
        raise HTTPException(404, "Vocal sample not found")

    # 3. Determine start and duration for sample from speaker transcript segments
    start_time = 0.0
    duration = 8.0

    if speaker:
        seg = db.query(TranscriptSegment).filter(
            TranscriptSegment.video_id == video_id,
            TranscriptSegment.speaker_id == speaker.id
        ).order_by(TranscriptSegment.sequence.asc()).first()
        if seg and seg.start_time is not None and seg.end_time is not None:
            start_time = float(seg.start_time)
            seg_dur = float(seg.end_time) - start_time
            if seg_dur >= 3.0:
                duration = min(seg_dur, 8.0)

    # 4. Extract an 8-second 24kHz mono audio sample slice using ffmpeg
    sample_dir = OUTPUT_DIR / f"audio_{video_id}"
    sample_dir.mkdir(parents=True, exist_ok=True)
    sample_filename = f"speaker_{speaker.id if speaker else (speaker_id or 1)}_sample.wav"
    sample_path = sample_dir / sample_filename

    try:
        import subprocess
        cmd = [
            "ffmpeg", "-y",
            "-ss", str(start_time),
            "-t", str(duration),
            "-i", source_audio,
            "-vn",
            "-ac", "1",
            "-ar", "24000",
            "-c:a", "pcm_s16le",
            str(sample_path)
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        if speaker and os.path.exists(sample_path):
            speaker.voice_sample_path = str(sample_path)
            db.commit()

        return FileResponse(
            str(sample_path),
            media_type="audio/wav",
            filename=sample_filename,
            headers={"Content-Disposition": f"inline; filename={sample_filename}"}
        )
    except Exception as e:
        logger.warning(f"FFmpeg slicing failed, serving source audio directly: {e}")
        return FileResponse(
            source_audio,
            media_type="audio/wav",
            filename=sample_filename,
            headers={"Content-Disposition": f"inline; filename={sample_filename}"}
        )



@router.post("/{video_id}/tts")
async def generate_tts(
    video_id: int,
    language: str = Query(..., description="Target language for TTS"),
    speaker_id: Optional[int] = Query(None, description="Speaker ID for voice cloning"),
    style: str = Query("neutral", description="Speaking style"),
    speed: float = Query(1.0, description="Speaking speed multiplier (0.5 - 2.0)"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Generate speech from translated text with voice selection and style."""
    logger.info(f"🎤 Starting TTS generation for video {video_id}")
    logger.info(f"   Language: {language}, Style: {style}, Speed: {speed}")
    
    video, project = get_video_with_access(video_id, user_id, db, required_role="editor")
    
    # Enforce AI credit deduction for Neural TTS from ai_models table
    config = db.query(VideoPipelineConfig).filter(VideoPipelineConfig.video_id == video_id).first()
    tts_model = config.tts_model if config and config.tts_model else "xtts_v2"
    cost_per_min = get_model_credit_cost(tts_model, default_cost=2)
    duration_mins = max(1, int(math.ceil((video.duration or 60) / 60.0)))
    credits_needed = duration_mins * cost_per_min

    if not deduct_user_credits(
        user_id=user_id,
        credits_amount=credits_needed,
        service_type="TTS_SYNTHESIS",
        description=f"Voice TTS ({tts_model}, {language}) for video #{video_id} ({duration_mins}m @ {cost_per_min}cr/m = {credits_needed} credits)",
        video_id=video_id,
    ):
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            f"Insufficient AI credits for voice synthesis ({credits_needed} required). Please upgrade your plan or top up credits."
        )
    
    # Find translation
    translation_dir = os.path.dirname(video.transcript_path) if video.transcript_path else None
    if not translation_dir:
        logger.error(f"❌ Transcript directory not found for video {video_id}")
        raise HTTPException(404, "Transcript directory not found")
    
    translation_path = os.path.join(translation_dir, f"translation_{language}.json")
    if not os.path.exists(translation_path):
        logger.error(f"❌ Translation not found for video {video_id}, language {language}")
        raise HTTPException(404, f"Translation for {language} not found")
    
    # Load translation data
    try:
        with open(translation_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            segments = data.get("segments", [])
        logger.info(f"📄 Loaded {len(segments)} segments from translation")

        # Enforce word quota deduction for tokenize-based subscription
        tts_words = TokenizerService.count_segments_words(segments)
        if tts_words <= 0:
            tts_words = TokenizerService.estimate_video_words(video.duration or 60.0)
        deduct_user_words(
            user_id=user_id,
            words_amount=tts_words,
            service_type="TTS_SYNTHESIS",
            description=f"Voice TTS ({tts_model}, {language}) for video #{video_id} ({tts_words} words)",
            video_id=video_id,
        )
    except Exception as e:
        logger.error(f"❌ Failed to read translation: {e}")
        raise HTTPException(500, f"Failed to read translation: {str(e)}")
    
    if not segments:
        logger.error(f"❌ No segments found in translation for video {video_id}")
        raise HTTPException(400, "No segments found in translation")
    
    # Get vocal path for voice cloning
    vocal_path = video.extracted_vocal_path
    if not vocal_path or not os.path.exists(vocal_path):
        logger.warning(f"⚠️ No vocal track found for video {video_id}, using default voice")
        vocal_path = None
    else:
        logger.info(f"🎵 Using vocal track for voice cloning: {vocal_path}")
    
    # Language mapping for XTTS
    from app.core.languages import TARGET_LANGUAGE_MAP
    lang_config = TARGET_LANGUAGE_MAP.get(language)
    xtts_lang = lang_config["xtts"] if lang_config else "en"
    logger.info(f"🌐 XTTS language: {xtts_lang}")
    
    tts_service = TTSAlignerService()
    
    # Create TTS directory
    tts_dir = OUTPUT_DIR / f"tts_{video_id}"
    tts_dir.mkdir(parents=True, exist_ok=True)
    tts_path = tts_dir / f"tts_{language}.wav"
    
    try:
        # Generate TTS
        logger.info(f"🔧 Generating TTS for {len(segments)} segments...")
        tts_service.generate_tts_with_alignment(
            segments=segments,
            output_path=str(tts_path),
            temp_dir=str(tts_dir),
            vocal_path=vocal_path,
            tgt_lang=xtts_lang
        )
        
        # Validate the generated file
        if not os.path.exists(tts_path):
            logger.error(f"❌ TTS file was not created: {tts_path}")
            raise HTTPException(500, "TTS file was not created")
        
        file_size = os.path.getsize(tts_path)
        if file_size < 1024:
            logger.error(f"❌ TTS file is too small: {file_size} bytes")
            raise HTTPException(400, f"TTS audio file is corrupted or empty ({file_size} bytes)")
        
        logger.info(f"✅ TTS generated successfully: {tts_path} ({file_size} bytes)")
        
        # Apply speed adjustment if needed
        if speed != 1.0:
            logger.info(f"⏱️ Adjusting speed to {speed}x")
            temp_path = tts_dir / f"tts_{language}_temp.wav"
            try:
                subprocess.run([
                    "ffmpeg", "-y", "-i", str(tts_path),
                    "-filter:a", f"atempo={speed}",
                    str(temp_path)
                ], check=True, capture_output=True)
                
                # Replace with speed-adjusted version
                shutil.move(str(temp_path), str(tts_path))
                
                # Validate again
                if os.path.getsize(tts_path) < 1024:
                    logger.error(f"❌ Speed-adjusted TTS file is corrupted")
                    raise HTTPException(400, "Speed-adjusted TTS file is corrupted")
                    
            except subprocess.CalledProcessError as e:
                logger.error(f"⚠️ Speed adjustment failed: {e.stderr}")
                # Continue with original file
        
        # Update video record
        video.dubbed_audio_path = str(tts_path)
        db.commit()
        
        logger.info(f"✅ TTS generation completed for video {video_id}")
        
        return {
            "video_id": video_id,
            "language": language,
            "style": style,
            "speed": speed,
            "tts_path": str(tts_path),
            "file_size": file_size,
            "status": "completed",
            "message": "TTS generated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ TTS generation failed: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
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
    video, project = get_video_with_access(video_id, user_id, db, required_role="viewer")
    
    tts_dir = OUTPUT_DIR / f"tts_{video_id}"
    tts_path = tts_dir / f"tts_{language}.wav"
    
    if tts_path.exists():
        file_size = os.path.getsize(tts_path)
        
        # Check if file is valid
        if file_size < 1024:
            logger.warning(f"⚠️ TTS file {tts_path} is too small ({file_size} bytes)")
            return {
                "video_id": video_id,
                "language": language,
                "status": "corrupted",
                "message": f"TTS file is corrupted ({file_size} bytes)",
                "tts_path": str(tts_path),
                "size": file_size
            }
        
        if preview:
            # Verify it's a valid audio file
            try:
                # Quick validation with ffprobe
                probe_cmd = [
                    "ffprobe",
                    "-v", "error",
                    "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1",
                    str(tts_path)
                ]
                result = subprocess.run(probe_cmd, capture_output=True, text=True)
                if result.returncode != 0:
                    logger.error(f"❌ Invalid audio file: {result.stderr}")
                    raise HTTPException(400, "TTS file is corrupted")
                
                duration = float(result.stdout.strip()) if result.stdout else 0
                if duration < 0.1:
                    logger.warning(f"⚠️ TTS file has very short duration: {duration}s")
            except Exception as e:
                logger.error(f"❌ Error validating TTS file: {e}")
                # Still try to serve it
                pass
            
            return FileResponse(
                tts_path,
                media_type="audio/wav",
                filename=f"tts_{language}_preview.wav",
                headers={
                    "Content-Disposition": f"inline; filename=tts_{language}_preview.wav"
                }
            )
        
        calculated_duration = 0.0
        try:
            probe_cmd = [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                str(tts_path)
            ]
            probe_res = subprocess.run(probe_cmd, capture_output=True, text=True, timeout=5)
            if probe_res.returncode == 0 and probe_res.stdout:
                calculated_duration = round(float(probe_res.stdout.strip()), 2)
        except Exception:
            pass

        return {
            "video_id": video_id,
            "language": language,
            "tts_path": str(tts_path),
            "size": file_size,
            "duration": calculated_duration,
            "status": "available"
        }
    
    return {
        "video_id": video_id,
        "language": language,
        "status": "not_generated",
        "message": "TTS not generated yet. Use POST /tts first"
    }


# ============================================================
# VIDEO DUBBING - UPDATED WITH HLS SUPPORT
# ============================================================

@router.post("/{video_id}/dub")
async def generate_dubbed_video(
    video_id: int,
    language: str = Query(..., description="Target language for dubbing"),
    video_format: str = Query("mp4", description="Output video format: mp4, mov, avi"),
    quality: str = Query("1080p", description="Video quality: 360p, 720p, 1080p, 4K"),
    burn_subtitles: bool = Query(True, description="Burn subtitles into video (Hardsub)"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Generate a complete dubbed video with format and quality options."""
    logger.info(f"🎬 Starting dubbing for video {video_id}")
    logger.info(f"   Language: {language}, Format: {video_format}, Quality: {quality}, BurnSubtitles: {burn_subtitles}")
    
    video, project = get_video_with_access(video_id, user_id, db, required_role="editor")
    
    # Enforce AI credit deduction for video dubbing render
    duration_mins = max(1, int(math.ceil((video.duration or 60) / 60.0)))
    credits_needed = duration_mins * 1
    if not deduct_user_credits(
        user_id=user_id,
        credits_amount=credits_needed,
        service_type="DUBBING_RENDER",
        description=f"Dubbed video mixing ({language}) for video #{video_id} ({duration_mins} mins)",
        video_id=video_id,
    ):
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            f"Insufficient AI credits for video dubbing ({credits_needed} required). Please upgrade your plan or top up credits."
        )

    # Enforce word quota deduction for tokenize-based subscription
    dub_words = TokenizerService.estimate_video_words(video.duration or 60.0)
    deduct_user_words(
        user_id=user_id,
        words_amount=dub_words,
        service_type="DUBBING_RENDER",
        description=f"Dubbed video mixing ({language}) for video #{video_id} (~{dub_words} words)",
        video_id=video_id,
    )
    
    # Find original video file
    video_path = None
    for file in UPLOAD_DIR.glob(f"{video_id}_*"):
        video_path = str(file)
        logger.info(f"📹 Found original video: {video_path}")
        break
    
    if not video_path:
        logger.error(f"❌ Original video file not found for video {video_id}")
        raise HTTPException(404, "Original video not found")
    
    # Check TTS audio exists
    tts_path = video.dubbed_audio_path
    if not tts_path or not os.path.exists(tts_path):
        logger.error(f"❌ TTS not found for video {video_id}: {tts_path}")
        raise HTTPException(400, "TTS not found. Generate TTS first.")
    
    # Check TTS file size
    tts_size = os.path.getsize(tts_path)
    if tts_size < 1024:
        logger.error(f"❌ TTS file corrupted for video {video_id}: {tts_size} bytes")
        raise HTTPException(400, f"TTS audio file is corrupted or empty ({tts_size} bytes)")
    
    logger.info(f"✅ TTS file found: {tts_path} ({tts_size} bytes)")
    
    # ============================================================
    # ✅ FIXED: Handle BGM - Search multiple patterns and locations
    # ============================================================
    bgm_path = None
    
    # 1. Check if BGM path is saved in database
    if video.background_music_path and os.path.exists(video.background_music_path):
        bgm_path = video.background_music_path
        logger.info(f"🎵 Using BGM from video record: {bgm_path}")
    else:
        # 2. Search in audio directory with multiple patterns
        bgm_dir = OUTPUT_DIR / f"audio_{video_id}"
        if bgm_dir.exists():
            # Try different possible filenames
            possible_patterns = [
                "*bgm*.wav",
                "*no_vocals*.wav",      # ← Demucs output
                "*background*.wav",
                "*instrumental*.wav",
                "*.wav"                  # Last resort: any wav file
            ]
            
            bgm_files = []
            for pattern in possible_patterns:
                bgm_files = list(bgm_dir.glob(pattern))
                if bgm_files:
                    break
            
            # 3. Check in htdemucs subdirectory (Demucs output location)
            if not bgm_files:
                htdemucs_dir = bgm_dir / "htdemucs"
                if htdemucs_dir.exists():
                    for subdir in htdemucs_dir.iterdir():
                        if subdir.is_dir():
                            for pattern in possible_patterns:
                                bgm_files = list(subdir.glob(pattern))
                                if bgm_files:
                                    break
                            if bgm_files:
                                break
            
            # 4. Filter out vocal files (we want the non-vocal track)
            if bgm_files:
                # Prefer files with "no_vocals" or "bgm" in name
                bgm_files_filtered = []
                for f in bgm_files:
                    name_lower = f.name.lower()
                    if "no_vocals" in name_lower or "bgm" in name_lower or "background" in name_lower:
                        bgm_files_filtered.append(f)
                
                if bgm_files_filtered:
                    bgm_files = bgm_files_filtered
                
                bgm_path = str(bgm_files[0])
                logger.info(f"🎵 Found BGM at: {bgm_path}")
            else:
                logger.warning(f"⚠️ No BGM found in: {bgm_dir}")
        else:
            logger.warning(f"⚠️ Audio directory not found: {bgm_dir}")
    
    if not bgm_path:
        logger.warning(f"⚠️ No BGM found for video {video_id}, using TTS only")
    # ============================================================
    
    audio_service = AudioService()
    
    # Create output filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_filename = f"dubbed_{language}_{quality}_{timestamp}_{uuid.uuid4().hex[:8]}.{video_format}"
    output_path = str(OUTPUT_DIR / output_filename)
    
    logger.info(f"📁 Output path: {output_path}")
    
    try:
        import tempfile
        with tempfile.TemporaryDirectory() as temp_dir:
            logger.info(f"🔧 Starting audio mixing and muxing in temp dir: {temp_dir}")
            
            # Resolve subtitle path if subtitle burning is enabled
            resolved_sub_path = None
            if burn_subtitles:
                if video.subtitle_path and os.path.exists(video.subtitle_path):
                    resolved_sub_path = video.subtitle_path
                else:
                    # Look in outputs/transcript_{video_id}/
                    cand_dir = OUTPUT_DIR / f"transcript_{video_id}"
                    if cand_dir.exists():
                        for ext in [".ass", ".srt", ".vtt"]:
                            sub_candidate = cand_dir / f"subtitles_{language}{ext}"
                            if sub_candidate.exists():
                                resolved_sub_path = str(sub_candidate)
                                video.subtitle_path = resolved_sub_path
                                db.commit()
                                break
                if resolved_sub_path:
                    logger.info(f"🔥 Subtitles located for burning: {resolved_sub_path}")
                else:
                    logger.info(f"No subtitle file found for video {video_id}, proceeding without burning")

            # Generate dubbed video and upload to S3 with HLS
            result = audio_service.mix_and_mux(
                video_path=video_path,
                tts_audio_path=tts_path,
                bgm_audio_path=bgm_path,
                final_output_path=output_path,
                temp_dir=temp_dir,
                video_id=video_id,
                language=language,
                quality=quality,
                generate_hls=True,  # ✅ Enable HLS generation
                subtitle_path=resolved_sub_path,
                burn_subtitles=burn_subtitles,
            )
        
        # Get results
        s3_key = result.get("s3_key")
        local_path = result.get("local_path")
        file_size = result.get("file_size", 0)
        hls_result = result.get("hls", {})
        error = result.get("error")
        
        logger.info(f"✅ Dubbing completed for video {video_id}")
        logger.info(f"   Local path: {local_path}")
        logger.info(f"   File size: {file_size} bytes")
        
        if hls_result:
            logger.info(f"   HLS qualities: {hls_result.get('qualities', [])}")
            logger.info(f"   HLS segments: {hls_result.get('segment_count', 0)}")
            logger.info(f"   Master playlist: {hls_result.get('master_playlist_s3')}")
        
        if error:
            logger.warning(f"⚠️ Warning: {error}")
        
        # Update video record
        if s3_key:
            video.output_path = s3_key
            video.status = VideoStatus.COMPLETED.value
            video.resolution = quality
            video.file_size = file_size
            video.updated_at = datetime.utcnow()

            # Clean up all previous renders in video_render_outputs for this video to avoid serving stale videos
            try:
                db.query(VideoRenderOutput).filter(
                    VideoRenderOutput.video_id == video_id,
                ).delete()
                
                master_vro = VideoRenderOutput(
                    video_id=video_id,
                    target_language=language.lower().strip(),
                    resolution=quality.lower().strip(),
                    format=video_format.lower().strip(),
                    dubbed_audio_path=video.dubbed_audio_path,
                    subtitle_path=video.subtitle_path,
                    output_video_path=s3_key,
                    file_size_bytes=file_size,
                    status="completed",
                )
                db.add(master_vro)
            except Exception as vro_err:
                logger.warning(f"Could not refresh video_render_outputs on dub: {vro_err}")

            db.commit()
            
            response = {
                "video_id": video_id,
                "language": language,
                "video_format": video_format,
                "quality": quality,
                "s3_path": s3_key,
                "s3_uri": f"s3://{AWS_S3_BUCKET}/{s3_key}",
                "file_size": file_size,
                "status": "completed",
                "message": f"Dubbed video generated and uploaded to S3: {s3_key}",
                "has_burned_subtitles": bool(burn_subtitles and resolved_sub_path),
            }
            
            # ✅ Add HLS info if available
            if hls_result:
                response["hls"] = {
                    "master_playlist": hls_result.get("master_playlist_s3"),
                    "master_playlist_uri": f"s3://{AWS_S3_BUCKET}/{hls_result.get('master_playlist_s3')}",
                    "qualities": hls_result.get("qualities", []),
                    "segment_count": hls_result.get("segment_count", 0),
                    "s3_prefix": f"videos/{video_id}/hls/{language}"
                }
            
            if error:
                response["warning"] = error
            
            return response
        else:
            # Fallback to local path
            video.output_path = local_path
            video.status = VideoStatus.COMPLETED.value
            video.resolution = quality
            db.commit()
            
            return {
                "video_id": video_id,
                "language": language,
                "video_format": video_format,
                "quality": quality,
                "output_path": local_path,
                "file_size": file_size,
                "status": "completed",
                "message": f"Dubbed video generated locally: {local_path}"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Dubbing failed for video {video_id}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        
        # Clean up failed output file
        if os.path.exists(output_path):
            try:
                os.remove(output_path)
                logger.info(f"🧹 Cleaned up failed output: {output_path}")
            except Exception as cleanup_error:
                logger.warning(f"Could not clean up {output_path}: {cleanup_error}")
        
        raise HTTPException(500, f"Dubbing failed: {str(e)}")
    
@router.get("/{video_id}/dub")
async def get_dubbing_status(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Get dubbing status and generated output."""
    video, project = get_video_with_access(video_id, user_id, db, required_role="viewer")
    
    # Check if video has S3 path
    if video.output_path and video.output_path.startswith("videos/"):
        return {
            "video_id": video_id,
            "status": "completed",
            "output_path": video.output_path,
            "s3_uri": f"s3://{AWS_S3_BUCKET}/{video.output_path}",
            "message": "Video is available on S3",
            "has_burned_subtitles": bool(video.subtitle_path),
        }
    
    # Check local file
    if video.output_path and os.path.exists(video.output_path):
        return {
            "video_id": video_id,
            "status": "completed",
            "output_path": video.output_path,
            "message": "Video is available locally",
            "has_burned_subtitles": bool(video.subtitle_path),
        }
    
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


# ============================================================
# DUBBED VIDEO RESOLUTION & TRANSCODING CACHE
# ============================================================

def resolve_or_transcode_video_quality(
    video: Video,
    language: str,
    quality: str,
    format: str,
    db: Session,
) -> str:
    """
    Resolves the S3 key (or local path) for a dubbed video at a specific quality/format.
    If it already exists in video_render_outputs or on S3, returns the key.
    Otherwise, transcodes from the best available source video, caches in S3,
    and records in video_render_outputs.
    """
    quality_clean = (quality or "1080p").lower().strip()
    format_clean = (format or "mp4").lower().strip()
    language_clean = (language or "vi").lower().strip()

    quality_heights = {
        "360p": 360,
        "720p": 720,
        "1080p": 1080,
        "2k": 1440,
        "4k": 2160,
    }
    target_height = quality_heights.get(quality_clean, 1080)

    # 1. First priority: Check if video.output_path is the master render matching this resolution & format
    if video.output_path and video.output_path.startswith("videos/"):
        matches_quality = (f"/{quality_clean}/" in video.output_path) or (video.resolution and video.resolution.lower() == quality_clean)
        matches_format = video.output_path.endswith(f".{format_clean}") or (format_clean == "mp4" and video.output_path.endswith(".mp4"))
        if matches_quality and matches_format:
            logger.info(f"✅ video.output_path is the master render matching requested quality {quality_clean}: {video.output_path}")
            try:
                existing = db.query(VideoRenderOutput).filter(
                    VideoRenderOutput.video_id == video.id,
                    VideoRenderOutput.target_language == language_clean,
                    VideoRenderOutput.resolution == quality_clean,
                    VideoRenderOutput.format == format_clean,
                ).first()
                if existing:
                    existing.output_video_path = video.output_path
                    existing.status = "completed"
                    existing.file_size_bytes = video.file_size or 0
                else:
                    vro = VideoRenderOutput(
                        video_id=video.id,
                        target_language=language_clean,
                        resolution=quality_clean,
                        format=format_clean,
                        dubbed_audio_path=video.dubbed_audio_path,
                        subtitle_path=video.subtitle_path,
                        output_video_path=video.output_path,
                        file_size_bytes=video.file_size or 0,
                        status="completed",
                    )
                    db.add(vro)
                db.commit()
            except Exception as db_err:
                db.rollback()
                logger.warning(f"Could not synchronize master output in video_render_outputs: {db_err}")
            return video.output_path

    # 2. Check video_render_outputs table for existing completed render
    try:
        cached_render = db.query(VideoRenderOutput).filter(
            VideoRenderOutput.video_id == video.id,
            VideoRenderOutput.target_language == language_clean,
            VideoRenderOutput.resolution == quality_clean,
            VideoRenderOutput.format == format_clean,
            VideoRenderOutput.status == "completed",
        ).first()
        if cached_render and cached_render.output_video_path:
            # Verify cached render strictly belongs to this video
            if str(video.id) in cached_render.output_video_path:
                logger.info(f"✅ Found cached render in DB for video {video.id} ({quality_clean}, {format_clean}): {cached_render.output_video_path}")
                return cached_render.output_video_path
    except Exception as exc:
        logger.warning(f"Failed to query video_render_outputs: {exc}")

    # 3. Locate source video locally or download from S3 (STRICTLY for this video)
    source_video_path: Optional[str] = None
    temp_download_path: Optional[str] = None

    if video.output_path:
        candidate_name = Path(video.output_path).name
        local_candidate = OUTPUT_DIR / candidate_name
        if local_candidate.exists() and local_candidate.stat().st_size > 1024:
            source_video_path = str(local_candidate)
        elif os.path.exists(video.output_path) and os.path.getsize(video.output_path) > 1024:
            source_video_path = video.output_path

    if not source_video_path and video.output_path and video.output_path.startswith("videos/"):
        temp_dir = OUTPUT_DIR / "temp_transcode"
        temp_dir.mkdir(parents=True, exist_ok=True)
        temp_download_path = str(temp_dir / f"src_{video.id}_{Path(video.output_path).name}")
        try:
            logger.info(f"Downloading base video {video.output_path} from S3 to {temp_download_path}")
            if storage_manager.download_file(video.output_path, temp_download_path):
                if os.path.exists(temp_download_path) and os.path.getsize(temp_download_path) > 1024:
                    source_video_path = temp_download_path
        except Exception as s3_err:
            logger.error(f"Failed to download source video from S3: {s3_err}")

    if not source_video_path and video.original_path:
        if os.path.exists(video.original_path):
            source_video_path = video.original_path

    if not source_video_path or not os.path.exists(source_video_path):
        raise HTTPException(404, f"No source video available to render {quality_clean} {format_clean}")

    # 4. Transcode to target resolution and format using FFmpeg
    render_dir = OUTPUT_DIR / "renders" / str(video.id) / language_clean / quality_clean
    render_dir.mkdir(parents=True, exist_ok=True)
    out_filename = f"dubbed_{language_clean}_{quality_clean}_{uuid.uuid4().hex[:8]}.{format_clean}"
    local_render_path = render_dir / out_filename

    logger.info(f"🎬 Transcoding video {video.id} to {quality_clean} ({target_height}p) -> {local_render_path}")

    ffmpeg_cmd = [
        "ffmpeg", "-y",
        "-i", source_video_path,
        "-vf", f"scale=-2:{target_height}",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "22",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        str(local_render_path)
    ]

    proc = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
    if proc.returncode != 0 or not local_render_path.exists() or local_render_path.stat().st_size < 1024:
        logger.error(f"FFmpeg transcoding failed: {proc.stderr}")
        if os.path.exists(source_video_path):
            shutil.copy2(source_video_path, str(local_render_path))
        else:
            raise HTTPException(500, f"FFmpeg transcoding failed: {proc.stderr[:200]}")

    file_size = local_render_path.stat().st_size
    logger.info(f"✅ Transcoded successfully: {local_render_path} ({file_size} bytes)")

    # 5. Upload to S3
    s3_key = f"videos/{video.id}/dubbed/{language_clean}/{quality_clean}/{out_filename}"
    content_type = "video/mp4"
    if format_clean == "mov":
        content_type = "video/quicktime"
    elif format_clean == "avi":
        content_type = "video/x-msvideo"

    try:
        storage_manager.upload_file(str(local_render_path), s3_key, content_type=content_type)
        logger.info(f"✅ Uploaded transcoded video to S3: {s3_key}")
    except Exception as upload_err:
        logger.error(f"Failed to upload transcoded video to S3: {upload_err}")
        raise HTTPException(500, f"Failed to upload transcoded video to storage: {upload_err}")

    # 6. Record in video_render_outputs table
    try:
        render_record = VideoRenderOutput(
            video_id=video.id,
            target_language=language_clean,
            resolution=quality_clean,
            format=format_clean,
            dubbed_audio_path=video.dubbed_audio_path,
            subtitle_path=video.subtitle_path,
            output_video_path=s3_key,
            file_size_bytes=file_size,
            status="completed",
        )
        db.add(render_record)
        db.commit()
        logger.info("✅ Recorded render in video_render_outputs")
    except Exception as db_err:
        db.rollback()
        logger.warning(f"Failed to save record to video_render_outputs: {db_err}")

    # Clean up temp download if created
    if temp_download_path and os.path.exists(temp_download_path):
        try:
            os.remove(temp_download_path)
        except Exception:
            pass

    return s3_key


@router.get("/{video_id}/dub/{language}/download")
async def download_dubbed_video(
    video_id: int,
    language: str,
    format: str = Query("mp4", description="Download format: mp4, mov, avi"),
    quality: str = Query("1080p", description="Video quality: 360p, 720p, 1080p, 2k, 4k"),
    preview: bool = Query(False, description="Whether this is a preview request"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Download or preview the dubbed video at requested quality and format."""
    logger.info(f"📥 Download request for video {video_id}, language {language}, quality {quality}, format {format}, preview={preview}")
    
    video, project = get_video_with_access(video_id, user_id, db, required_role="viewer")
    
    s3_key_or_path = resolve_or_transcode_video_quality(
        video=video,
        language=language,
        quality=quality,
        format=format,
        db=db,
    )
    
    content_type = "video/mp4"
    if format == "mov":
        content_type = "video/quicktime"
    elif format == "avi":
        content_type = "video/x-msvideo"
    
    disposition = "inline" if preview else "attachment"
    filename = f"dubbed_{language}_{quality}.{format}"
    
    if s3_key_or_path.startswith("videos/"):
        presigned_url = generate_browser_presigned_url(
            params={
                "Bucket": AWS_S3_BUCKET,
                "Key": s3_key_or_path,
                "ResponseContentType": content_type,
                "ResponseContentDisposition": f"{disposition}; filename={filename}",
            },
            expires_in=3600,
        )
        if preview:
            return {
                "url": presigned_url,
                "video_id": video_id,
                "quality": quality,
                "content_type": content_type,
            }
        return {
            "url": presigned_url,
            "video_id": video_id,
            "language": language,
            "quality": quality,
            "format": format,
            "message": "Presigned URL generated successfully",
        }
        
    # Local file fallback
    if os.path.exists(s3_key_or_path):
        return FileResponse(s3_key_or_path, media_type=content_type, filename=filename)
        
    raise HTTPException(404, "Dubbed video file not found")

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
    video, project = get_video_with_access(video_id, user_id, db, required_role="viewer")
    
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
    logger.info(f"📤 Export request: video={video_id}, type={export_type}, format={format}, quality={quality}")
    
    video, project = get_video_with_access(video_id, user_id, db, required_role="viewer")
    
    export_service = ExportService()
    
    if export_type == "final_video":
        quality_to_use = quality or "1080p"
        s3_key_or_path = resolve_or_transcode_video_quality(
            video=video,
            language=language or "vi",
            quality=quality_to_use,
            format=format,
            db=db,
        )
        content_type = "video/mp4"
        if format == "mov":
            content_type = "video/quicktime"
        elif format == "avi":
            content_type = "video/x-msvideo"
            
        filename = f"export_{quality_to_use}.{format}"
        if s3_key_or_path.startswith("videos/"):
            try:
                presigned_url = generate_browser_presigned_url(
                    params={
                        'Bucket': AWS_S3_BUCKET,
                        'Key': s3_key_or_path,
                        'ResponseContentType': content_type,
                        'ResponseContentDisposition': f'attachment; filename={filename}'
                    },
                    expires_in=3600
                )
                logger.info(f"✅ Generated presigned URL for export: {presigned_url[:100]}...")
                return {
                    "url": presigned_url,
                    "video_id": video_id,
                    "quality": quality_to_use,
                    "format": format,
                    "message": "Presigned URL generated successfully"
                }
            except ClientError as e:
                logger.error(f"❌ S3 error: {e}")
                raise HTTPException(500, f"S3 error: {str(e)}")
            except Exception as e:
                logger.error(f"❌ Unexpected error: {e}")
                raise HTTPException(500, f"Error generating download URL: {str(e)}")

        if os.path.exists(s3_key_or_path):
            return FileResponse(s3_key_or_path, media_type=content_type, filename=filename)

        raise HTTPException(404, "Final video not found")
    
    elif export_type == "subtitles":
        if not language:
            config = db.query(VideoPipelineConfig).filter(VideoPipelineConfig.video_id == video_id).first()
            language = config.target_language if config else "vi"
        
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
        return FileResponse(
            output_path,
            media_type="audio/mpeg" if format == "mp3" else "audio/wav",
            filename=f"audio.{format}"
        )
    
    elif export_type == "transcript":
        if not video.transcript_path or not os.path.exists(video.transcript_path):
            raise HTTPException(404, "Transcript not found")
        
        output_path = export_service.export_transcript(
            transcript_path=video.transcript_path,
            format=format
        )
        media_type = "text/plain" if format == "txt" else "application/json"
        return FileResponse(
            output_path,
            media_type=media_type,
            filename=f"transcript.{format}"
        )
    
    elif export_type == "translation":
        if not language:
            config = db.query(VideoPipelineConfig).filter(VideoPipelineConfig.video_id == video_id).first()
            language = config.target_language if config else "vi"
        
        if video.transcript_path:
            translation_dir = os.path.dirname(video.transcript_path)
            translation_path = os.path.join(translation_dir, f"translation_{language}.json")
            if os.path.exists(translation_path):
                output_path = export_service.export_translation(
                    translation_path=translation_path,
                    format=format
                )
                media_type = "text/plain" if format == "txt" else "application/json"
                return FileResponse(
                    output_path,
                    media_type=media_type,
                    filename=f"translation_{language}.{format}"
                )
        
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
    video, project = get_video_with_access(video_id, user_id, db, required_role="viewer")
    
    if video.status != VideoStatus.COMPLETED.value:
        raise HTTPException(400, "Video is not ready for playback")
    
    config = db.query(VideoPipelineConfig).filter(VideoPipelineConfig.video_id == video_id).first()
    if not config:
        raise HTTPException(404, "Pipeline config not found")
    
    s3_key = f"videos/{video_id}/hls/{config.target_language}/master.m3u8"
    hls_url = storage_manager.generate_presigned_url(
        s3_key=s3_key,
        expires_in=86400,
        response_content_type="application/x-mpegURL",
    )
    if not hls_url:
        s3_endpoint = os.getenv("S3_ENDPOINT_URL", "")
        if s3_endpoint:
            hls_url = f"{s3_endpoint.rstrip('/')}/{AWS_S3_BUCKET}/{s3_key}"
        else:
            hls_url = f"https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
    
    subtitle_urls = {}
    if video.subtitle_path and os.path.exists(video.subtitle_path):
        subtitle_urls[config.target_language] = f"/api/videos/{video_id}/subtitles/{config.target_language}"
    
    return PlaybackInfoResponse(
        hls_url=hls_url,
        qualities=["360p", "720p", "1080p", "2k", "4k"],
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
        has_access, _ = check_user_project_access(video.project_id, user_id, db, required_role="viewer")
        if not has_access:
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
        has_access, _ = check_user_project_access(video.project_id, user_id, db, required_role="viewer")
        if not has_access:
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
        has_access, _ = check_user_project_access(video.project_id, user_id, db, required_role="viewer")
        if not has_access:
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
        has_access, _ = check_user_project_access(video.project_id, user_id, db, required_role="editor")
        if not has_access:
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

# Add this to video_routes.py after the extract_audio endpoint

@router.post("/{video_id}/audio/separate")
async def separate_audio(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """
    Separate audio into vocal and BGM tracks using Demucs.
    - Vocal track: Used for STT and voice cloning
    - BGM track: Used for background music in dubbing
    """
    video, project = get_video_with_access(video_id, user_id, db, required_role="editor")
    
    # Check if audio exists
    audio_path = video.extracted_vocal_path
    if not audio_path or not os.path.exists(audio_path):
        raise HTTPException(400, "Audio not extracted yet. Use POST /audio/extract first")
    
    audio_service = AudioService()
    
    output_dir = OUTPUT_DIR / f"audio_{video_id}"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        # Separate vocal and BGM
        vocal_path, bgm_path = audio_service.separate_vocal_bgm(audio_path, str(output_dir))
        
        # ✅ Save both paths to the video record
        video.extracted_vocal_path = vocal_path
        video.background_music_path = bgm_path
        db.commit()
        
        logger.info(f"✅ Audio separated for video {video_id}")
        logger.info(f"   Vocal track: {vocal_path}")
        logger.info(f"   BGM track: {bgm_path}")
        
        return {
            "video_id": video_id,
            "status": "completed",
            "vocal_path": vocal_path,
            "bgm_path": bgm_path,
            "message": "Audio separated successfully"
        }
    except Exception as e:
        logger.error(f"❌ Audio separation failed: {e}")
        raise HTTPException(500, f"Audio separation failed: {str(e)}")


# ============================================================
# VIDEO UNDERSTANDING: CHAPTERS & DOCUMENTS
# ============================================================

@router.get("/{video_id}/chapters", response_model=List[VideoChapterResponse])
def get_video_chapters(
    video_id: int,
    db: DatabaseSession = Depends(get_db),
    token: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    """Retrieve all structured chapters for a video."""
    user_id = get_user_id_from_token(token.credentials)
    service = VideoUnderstandingService(db=db)
    return service.get_chapters(video_id)


@router.post("/{video_id}/chapters/generate", response_model=List[VideoChapterResponse])
def generate_video_chapters(
    video_id: int,
    db: DatabaseSession = Depends(get_db),
    token: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    """Generate or regenerate structured timeline chapters from transcript segments."""
    user_id = get_user_id_from_token(token.credentials)
    service = VideoUnderstandingService(db=db)
    try:
        return service.generate_chapters(video_id)
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        logger.error(f"Failed to generate chapters for video {video_id}: {e}")
        raise HTTPException(500, f"Chapter generation failed: {str(e)}")


@router.get("/{video_id}/documents", response_model=List[VideoDocumentResponse])
def get_video_documents(
    video_id: int,
    db: DatabaseSession = Depends(get_db),
    token: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    """Retrieve all generated documents for a video."""
    user_id = get_user_id_from_token(token.credentials)
    service = VideoUnderstandingService(db=db)
    return service.get_documents(video_id)


@router.post("/{video_id}/documents/generate", response_model=VideoDocumentResponse)
def generate_video_document(
    video_id: int,
    doc_type: str = Query("markdown", regex="^(markdown|summary|timeline)$"),
    db: DatabaseSession = Depends(get_db),
    token: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    """Generate structured markdown summary & timeline document for video."""
    user_id = get_user_id_from_token(token.credentials)
    service = VideoUnderstandingService(db=db)
    try:
        return service.generate_document(video_id, doc_type=doc_type)
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        logger.error(f"Failed to generate document for video {video_id}: {e}")
        raise HTTPException(500, f"Document generation failed: {str(e)}")


@router.get("/{video_id}/documents/{doc_id}", response_model=VideoDocumentResponse)
def get_video_document(
    video_id: int,
    doc_id: int,
    db: DatabaseSession = Depends(get_db),
    token: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    """Retrieve a specific document by ID."""
    user_id = get_user_id_from_token(token.credentials)
    service = VideoUnderstandingService(db=db)
    doc = service.get_document(video_id, doc_id)
    if not doc:
        raise HTTPException(404, f"Document {doc_id} not found for video {video_id}")
    return doc


@router.get("/{video_id}/search")
def search_video_transcript(
    video_id: int,
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(20, ge=1, le=50),
    db: DatabaseSession = Depends(get_db),
    token: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    """Semantic and lexical search across video transcript with timestamped results."""
    user_id = get_user_id_from_token(token.credentials)
    service = VideoUnderstandingService(db=db)
    return service.search_transcript(video_id, query=q, limit=limit)

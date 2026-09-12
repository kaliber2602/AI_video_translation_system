# app/schemas/video.py - UPDATED
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class SegmentOut(BaseModel):
    start: float
    end: float
    text: str
    translated_text: Optional[str] = None
    speaker: Optional[str] = None


class ChapterOut(BaseModel):
    title: str
    start: str
    end: str
    text: str


class UploadResponse(BaseModel):
    filename: str
    content_type: Optional[str] = None
    message: str
    stored_name: Optional[str] = None
    transcript: Optional[str] = None
    segments: Optional[List[SegmentOut]] = None
    markdown: Optional[str] = None
    subtitle_path: Optional[str] = None
    translated_subtitle_path: Optional[str] = None
    detected_language: Optional[str] = None
    target_language: Optional[str] = None
    docx_path: Optional[str] = None
    html_path: Optional[str] = None
    txt_path: Optional[str] = None
    vtt_path: Optional[str] = None
    json_path: Optional[str] = None
    faq_path: Optional[str] = None
    quiz_path: Optional[str] = None
    mindmap_path: Optional[str] = None
    audio_path: Optional[str] = None
    output_video_path: Optional[str] = None
    dubbed_video_path: Optional[str] = None
    diarization_available: bool = False
    chapters: Optional[List[ChapterOut]] = None
    status: str = "completed"
    warnings: List[str] = []


class ProcessingStatusResponse(BaseModel):
    status: str
    message: str


# ============================================================
# NEW SCHEMAS FOR STEP-BY-STEP PIPELINE
# ============================================================

class VideoUploadResponse(BaseModel):
    video_id: int
    filename: str
    status: str
    message: str
    project_id: Optional[int] = None
    folder_id: Optional[int] = None
    file_size: Optional[int] = None


class VideoUpdateRequest(BaseModel):
    title: Optional[str] = None
    folder_id: Optional[int] = None
    target_language: Optional[str] = None
    source_language: Optional[str] = None
    current_step: Optional[str] = None
    progress: Optional[int] = None
    snapshot_data: Optional[Dict[str, Any]] = None


class VideoSnapshotRequest(BaseModel):
    active_step: Optional[int] = None
    current_step: Optional[str] = None
    target_language: Optional[str] = None
    progress: Optional[int] = None
    state_data: Optional[Dict[str, Any]] = None


class StartProcessingResponse(BaseModel):
    job_id: str
    video_id: int
    status: str
    message: str


class TaskLogResponse(BaseModel):
    step: str
    status: str
    duration_ms: Optional[int] = None
    log_output: Optional[str] = None
    error_trace: Optional[str] = None
    created_at: str


class JobStatusResponse(BaseModel):
    job_id: str
    video_id: int
    status: str
    progress: int
    current_step: Optional[str] = None
    error_message: Optional[str] = None
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    created_at: str
    tasks: List[TaskLogResponse] = []
    config: Optional[Dict[str, Any]] = None


class StepResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None


class JobCancelResponse(BaseModel):
    status: str
    job_id: str
    message: str


class VideoListItem(BaseModel):
    id: int
    project_id: Optional[int] = None
    folder_id: Optional[int] = None
    title: str
    original_filename: str
    file_size: Optional[int] = None
    status: str
    progress: int
    current_step: Optional[str] = None
    target_language: Optional[str] = None
    duration: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    has_hls: bool = False
    has_translation: bool = False
    thumbnail_path: Optional[str] = None
    thumbnail_url: Optional[str] = None


class VideoDetailResponse(BaseModel):
    id: int
    project_id: Optional[int] = None
    folder_id: Optional[int] = None
    title: str
    original_filename: str
    file_size: Optional[int] = None
    original_path: Optional[str] = None
    extracted_vocal_path: Optional[str] = None
    background_music_path: Optional[str] = None
    transcript_path: Optional[str] = None
    subtitle_path: Optional[str] = None
    dubbed_audio_path: Optional[str] = None
    output_path: Optional[str] = None
    has_translation: bool = False
    translation_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration: Optional[float] = None
    fps: Optional[float] = None
    resolution: Optional[str] = None
    status: str
    current_step: Optional[str] = None
    progress: int
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    target_language: Optional[str] = None
    source_language: Optional[str] = None
    snapshot_data: Optional[Dict[str, Any]] = None
    segments: Optional[List[SegmentOut]] = None
    job_info: Optional[Dict[str, Any]] = None


class ThumbnailCaptureRequest(BaseModel):
    timestamp: float = Field(default=1.0, ge=0.0)
    source: str = Field(default="output", description="'output' or 'original'")


class PlaybackInfoResponse(BaseModel):
    hls_url: Optional[str] = None
    qualities: List[str] = []
    metadata: Optional[Dict[str, Any]] = None
    subtitle_urls: Optional[Dict[str, str]] = None


class VideoChapterResponse(BaseModel):
    id: int
    video_id: int
    sequence: int
    start_time: float
    end_time: float
    title: str
    summary: Optional[str] = None
    thumbnail_path: Optional[str] = None
    created_at: Optional[datetime] = None


class VideoDocumentResponse(BaseModel):
    id: int
    video_id: int
    doc_type: str
    title: str
    file_path: Optional[str] = None
    content_markdown: Optional[str] = None
    file_size_bytes: Optional[int] = None
    created_at: Optional[datetime] = None
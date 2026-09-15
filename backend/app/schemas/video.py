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


# ============================================================
# NLE STUDIO & OVERLAY SCHEMAS (AC-21 to AC-25)
# ============================================================

class SubtitleMaskConfig(BaseModel):
    enabled: bool = Field(default=False, description="Enable subtitle eraser / blur mask")
    x: int = Field(default=0, description="Bounding box X coordinate in video pixels")
    y: int = Field(default=0, description="Bounding box Y coordinate in video pixels")
    width: int = Field(default=0, description="Bounding box width in pixels")
    height: int = Field(default=0, description="Bounding box height in pixels")
    mask_type: str = Field(default="blur", description="'blur' (delogo/gaussian blur) or 'banner' (solid backdrop)")
    opacity: float = Field(default=0.85, ge=0.0, le=1.0, description="Opacity of solid banner mask")
    color: str = Field(default="black", description="Color of solid banner mask (e.g. 'black', 'white', '#000000')")


class OverlayConfig(BaseModel):
    logo_url: Optional[str] = Field(default=None, description="Public URL or static path to logo image")
    logo_path: Optional[str] = Field(default=None, description="Absolute server filesystem path to logo image")
    logo_x: int = Field(default=20, description="X coordinate of logo in video pixels")
    logo_y: int = Field(default=20, description="Y coordinate of logo in video pixels")
    logo_scale: float = Field(default=1.0, description="Scale factor for logo")
    logo_opacity: float = Field(default=1.0, ge=0.0, le=1.0, description="Opacity for logo")
    ticker_text: Optional[str] = Field(default=None, description="Scrolling marquee text at bottom")
    ticker_speed: int = Field(default=100, description="Marquee scrolling speed in pixels per second")
    ticker_font_size: int = Field(default=24, description="Font size of ticker")
    ticker_color: str = Field(default="white", description="Font color of ticker text")
    ticker_bg_color: str = Field(default="black@0.6", description="Background color of ticker banner")


class ResynthesizeSegmentRequest(BaseModel):
    text: str = Field(..., description="New segment text to synthesize")
    target_language: Optional[str] = Field(default=None, description="Target language code (e.g. 'vi', 'en')")
    speaker_id: Optional[int] = Field(default=None, description="Speaker profile ID")
    speed: Optional[float] = Field(default=1.0, ge=0.5, le=2.0, description="Playback speed factor")
    voice_id: Optional[str] = Field(default=None, description="Voice identifier")


class ResynthesizeSegmentResponse(BaseModel):
    status: str = "success"
    video_id: int
    segment_id: int
    duration: float
    chunk_url: str
    master_audio_url: str
    text: str
    speed: float
    message: str = "Segment audio regenerated and spliced successfully"

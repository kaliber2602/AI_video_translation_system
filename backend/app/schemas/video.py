from pydantic import BaseModel
from typing import Optional, List


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
    
    
from typing import Optional, List, Dict
from pydantic import BaseModel


class ProcessingStatusResponse(BaseModel):
    status: str
    message: str


class HLSInfo(BaseModel):
    hls_prefix: str
    master_playlist: Optional[str] = None
    playlists: Optional[List[str]] = None
    segments: Optional[List[str]] = None


class UploadResponse(BaseModel):
    filename: str
    message: str
    stored_name: str
    transcript: str
    detected_language: str
    target_language: str
    output_video_path: str
    dubbed_video_path: str
    status: str
    s3_info: Optional[Dict] = None
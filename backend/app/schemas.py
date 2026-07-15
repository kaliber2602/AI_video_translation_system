from pydantic import BaseModel


class SegmentOut(BaseModel):
    start: float
    end: float
    text: str
    speaker: str | None = None


class ChapterOut(BaseModel):
    title: str
    start: str
    end: str
    text: str


class UploadResponse(BaseModel):
    filename: str
    content_type: str | None = None
    message: str
    stored_name: str | None = None
    transcript: str | None = None
    segments: list[SegmentOut] | None = None
    markdown: str | None = None
    subtitle_path: str | None = None
    translated_subtitle_path: str | None = None
    detected_language: str | None = None
    target_language: str | None = None
    docx_path: str | None = None
    html_path: str | None = None
    txt_path: str | None = None
    vtt_path: str | None = None
    json_path: str | None = None
    faq_path: str | None = None
    quiz_path: str | None = None
    mindmap_path: str | None = None
    audio_path: str | None = None
    output_video_path: str | None = None
    dubbed_video_path: str | None = None
    diarization_available: bool = False
    chapters: list[ChapterOut] | None = None
    status: str = "completed"
    warnings: list[str] = []


class ProcessingStatusResponse(BaseModel):
    status: str
    message: str

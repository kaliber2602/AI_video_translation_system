# app/models/enums.py - NEW FILE
import enum

class VideoStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class JobStatus(str, enum.Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class JobStep(str, enum.Enum):
    QUEUED = "queued"
    AUDIO_EXTRACT = "audio_extract"
    AUDIO_SEPARATE = "audio_separate"
    WHISPERX = "whisperx"
    TRANSLATION = "translation"
    TTS_GENERATE = "tts_generate"
    RENDER_VIDEO = "render_video"
    SUBTITLE_GENERATE = "subtitle_generate"
    HLS_CONVERT = "hls_convert"
    S3_UPLOAD = "s3_upload"
    COMPLETED = "completed"
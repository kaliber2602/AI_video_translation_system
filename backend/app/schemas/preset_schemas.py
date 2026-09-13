# backend/app/schemas/preset_schemas.py
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, field_validator


class AudioDuckingConfig(BaseModel):
    enabled: bool = True
    attenuation_db: float = -12.0
    threshold_db: float = -24.0
    attack_ms: int = 100
    release_ms: int = 500


class AudioSeparationConfig(BaseModel):
    model: Optional[str] = "htdemucs"
    demucs_model: Optional[str] = "htdemucs"
    dubbing_mode: Optional[str] = "full_dubbing"  # "full_dubbing" or "voiceover"
    original_vocal_volume: Optional[float] = 0.0
    vocal_volume: Optional[float] = 100.0
    bgm_volume: Optional[float] = 35.0
    enable_ducking: Optional[bool] = True
    ducking_level: Optional[float] = -14.0
    ducking_threshold: Optional[float] = -22.0
    ducking_attack: Optional[int] = 20
    ducking_release: Optional[int] = 250
    ducking: Optional[AudioDuckingConfig] = None


class TranscriptionConfig(BaseModel):
    model_size: Optional[str] = "medium"
    diarization: Optional[Union[bool, Dict[str, Any]]] = True
    min_speakers: Optional[int] = 1
    max_speakers: Optional[int] = 4
    filter_fillers: Optional[bool] = True
    temperature: Optional[float] = 0.0
    beam_size: Optional[int] = 5
    stt_engine: Optional[str] = "faster_whisper"
    compute_type: Optional[str] = "int8_float16"
    initial_prompt: Optional[str] = ""


class TranslationConfig(BaseModel):
    model_config = {"protected_namespaces": ()}
    model_name: Optional[str] = "nllb_200_1.3b"
    engine: Optional[str] = "nllb_local"  # "nllb_local" or "cloud_llm"
    source_language: Optional[str] = "auto"
    target_language: Optional[str] = "vi"
    apply_glossary: Optional[bool] = True
    preserve_tone: Optional[str] = "natural"
    tone_style: Optional[str] = "natural"
    system_instruction: Optional[str] = ""
    batch_size: Optional[int] = 32


class TTSDubbingConfig(BaseModel):
    engine: Optional[str] = "coqui_xtts_v2"  # "coqui_xtts_v2", "edge_tts", "none"
    default_voice_id: Optional[str] = "female_warm"
    speed_rate: Optional[float] = 1.0
    pitch_shift: Optional[int] = 0
    speaker_voice_mapping: Optional[Dict[str, Any]] = None
    time_stretching: Optional[Dict[str, Any]] = None


class SubtitleStyleConfig(BaseModel):
    font_name: Optional[str] = "Montserrat"
    font_size: Optional[int] = 22
    primary_color: Optional[str] = "#FFFFFF"
    outline_color: Optional[str] = "#000000"
    margin_v: Optional[int] = 25
    max_chars_per_line: Optional[int] = 40
    karaoke_effect: Optional[bool] = True
    highlight_color: Optional[str] = "#FFD700"
    bold: Optional[bool] = True
    italic: Optional[bool] = False
    alignment: Optional[int] = 2


class SubtitlesConfig(BaseModel):
    format: Optional[str] = "ass"
    burn_mode: Optional[str] = "hardcode"  # "hardcode", "hardsub", "soft", "none"
    style: Optional[SubtitleStyleConfig] = None
    max_lines: Optional[int] = 2


class ExportMuxingConfig(BaseModel):
    resolution: Optional[str] = "1080p"
    encoder: Optional[str] = "h264_nvenc"  # "h264_nvenc" or "libx264"
    bitrate: Optional[str] = "8M"
    preset_speed: Optional[str] = "p4"
    container: Optional[str] = "mp4"
    aspect_ratio: Optional[str] = "16:9"


class PresetConfigData(BaseModel):
    version: Optional[str] = "2.0"
    audio_separation: Optional[AudioSeparationConfig] = None
    transcription: Optional[TranscriptionConfig] = None
    translation: Optional[TranslationConfig] = None
    tts_dubbing: Optional[TTSDubbingConfig] = None
    subtitles: Optional[SubtitlesConfig] = None
    export_muxing: Optional[ExportMuxingConfig] = None


class CreatePresetRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(default="", max_length=2000)
    target_language: Optional[str] = "vi"
    source_language: Optional[str] = "auto"
    stt_model: Optional[str] = "whisper-medium"
    enable_diarization: Optional[Union[bool, Dict[str, Any], int, str]] = True
    translation_model: Optional[str] = "nllb_200_1.3b"
    tts_model: Optional[str] = "coqui_xtts_v2"
    voice_id: Optional[Union[str, int]] = "1"
    voice_speed: Optional[Union[float, int, str]] = 1.0
    subtitle_format: Optional[str] = "ass"
    burn_subtitles: Optional[Union[bool, int, str]] = True
    video_quality: Optional[str] = "1080p"
    video_format: Optional[str] = "mp4"
    config_data: Optional[Dict[str, Any]] = None

    @field_validator("enable_diarization", mode="before")
    @classmethod
    def coerce_enable_diarization(cls, v):
        if isinstance(v, dict):
            return bool(v.get("enabled", True))
        if isinstance(v, str):
            return v.lower() in ("true", "1", "yes", "on")
        return bool(v) if v is not None else True

    @field_validator("voice_id", mode="before")
    @classmethod
    def coerce_voice_id(cls, v):
        if v is not None:
            return str(v)
        return "1"

    @field_validator("voice_speed", mode="before")
    @classmethod
    def coerce_voice_speed(cls, v):
        if v is not None:
            try:
                return float(v)
            except (ValueError, TypeError):
                return 1.0
        return 1.0

    @field_validator("burn_subtitles", mode="before")
    @classmethod
    def coerce_burn_subtitles(cls, v):
        if isinstance(v, str):
            return v.lower() in ("true", "1", "yes", "on", "hardsub", "hardcode")
        return bool(v) if v is not None else True


class UpdatePresetRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    target_language: Optional[str] = None
    source_language: Optional[str] = None
    stt_model: Optional[str] = None
    enable_diarization: Optional[Union[bool, Dict[str, Any], int, str]] = None
    translation_model: Optional[str] = None
    tts_model: Optional[str] = None
    voice_id: Optional[Union[str, int]] = None
    voice_speed: Optional[Union[float, int, str]] = None
    subtitle_format: Optional[str] = None
    burn_subtitles: Optional[Union[bool, int, str]] = None
    video_quality: Optional[str] = None
    video_format: Optional[str] = None
    config_data: Optional[Dict[str, Any]] = None

    @field_validator("enable_diarization", mode="before")
    @classmethod
    def coerce_enable_diarization(cls, v):
        if v is not None:
            if isinstance(v, dict):
                return bool(v.get("enabled", True))
            if isinstance(v, str):
                return v.lower() in ("true", "1", "yes", "on")
            return bool(v)
        return None

    @field_validator("voice_id", mode="before")
    @classmethod
    def coerce_voice_id(cls, v):
        if v is not None:
            return str(v)
        return None

    @field_validator("voice_speed", mode="before")
    @classmethod
    def coerce_voice_speed(cls, v):
        if v is not None:
            try:
                return float(v)
            except (ValueError, TypeError):
                return 1.0
        return None

    @field_validator("burn_subtitles", mode="before")
    @classmethod
    def coerce_burn_subtitles(cls, v):
        if v is not None:
            if isinstance(v, str):
                return v.lower() in ("true", "1", "yes", "on", "hardsub", "hardcode")
            return bool(v)
        return None


class PresetResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    name: str
    description: Optional[str] = ""
    is_system: bool = False
    is_default: bool = False
    target_language: str
    source_language: str
    stt_model: str
    enable_diarization: bool
    translation_model: str
    tts_model: str
    voice_id: str
    voice_speed: float
    subtitle_format: str
    burn_subtitles: bool
    video_quality: str
    video_format: str
    config_data: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

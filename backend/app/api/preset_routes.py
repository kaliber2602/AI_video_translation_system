import logging
from typing import Any, Dict, List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from app.api.notification_routes import get_current_user_id
from app.services.preset_service import PresetService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/presets", tags=["presets"])


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
                return v.lower() in ("true", "1", "yes", "on")
            return bool(v)
        return None


@router.get("", response_model=List[Dict[str, Any]])
def list_presets(user_id: int = Depends(get_current_user_id)):
    """Retrieve all system presets and custom user-created presets."""
    return PresetService.list_presets(user_id=user_id)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=Dict[str, Any])
def create_preset(
    payload: CreatePresetRequest,
    user_id: int = Depends(get_current_user_id)
):
    """Save a new custom pipeline configuration preset."""
    data = payload.model_dump()
    created = PresetService.create_preset(user_id=user_id, data=data)
    if not created:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create pipeline preset."
        )
    return created


@router.put("/{preset_id}", response_model=Dict[str, Any])
def update_preset(
    preset_id: int,
    payload: UpdatePresetRequest,
    user_id: int = Depends(get_current_user_id)
):
    """Update an existing custom preset. System presets cannot be modified."""
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    updated = PresetService.update_preset(preset_id=preset_id, user_id=user_id, data=data)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Preset not found, belongs to system, or not owned by user."
        )
    return updated


@router.delete("/{preset_id}", status_code=status.HTTP_200_OK)
def delete_preset(
    preset_id: int,
    user_id: int = Depends(get_current_user_id)
):
    """Delete a user-defined custom preset. System presets cannot be deleted."""
    success = PresetService.delete_preset(preset_id=preset_id, user_id=user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Preset not found, belongs to system, or not owned by user."
        )
    return {"status": "success", "message": "Preset deleted successfully"}


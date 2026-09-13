import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.notification_routes import get_current_user_id
from app.services.preset_service import PresetService
from app.schemas.preset_schemas import (
    CreatePresetRequest,
    UpdatePresetRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/presets", tags=["presets"])


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


@router.post("/{preset_id}/apply/{video_id}", response_model=Dict[str, Any])
def apply_preset_to_video(
    preset_id: int,
    video_id: int,
    user_id: int = Depends(get_current_user_id)
):
    """Apply a preset's full 6-tier configuration to a video's pipeline settings & snapshot."""
    res = PresetService.apply_preset_to_video(video_id=video_id, preset_id=preset_id, user_id=user_id)
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Preset or video not found, or access denied."
        )
    return res


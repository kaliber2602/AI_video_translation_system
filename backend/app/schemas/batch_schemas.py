# backend/app/schemas/batch_schemas.py
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CreateBatchRequest(BaseModel):
    name: Optional[str] = ""
    video_ids: List[int] = Field(..., min_length=1)
    preset_id: Optional[int] = None
    config_override: Optional[Dict[str, Any]] = None


class BatchJobItemResponse(BaseModel):
    id: int
    batch_id: str
    video_id: int
    job_id: Optional[str] = None
    status: str
    current_step: Optional[str] = None
    progress: int = 0
    error_message: Optional[str] = None
    video_title: Optional[str] = None
    video_status: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


class BatchJobResponse(BaseModel):
    id: str
    project_id: int
    user_id: int
    name: str
    status: str
    total_videos: int
    completed_videos: int
    failed_videos: int
    progress: int = 0
    preset_id: Optional[int] = None
    config_snapshot: Optional[Dict[str, Any]] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    items: Optional[List[BatchJobItemResponse]] = None

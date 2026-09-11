from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class FolderCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Folder name")
    parent_id: Optional[int] = Field(None, description="Parent folder ID for nested folders")


class FolderUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="New folder name")
    parent_id: Optional[int] = Field(None, description="New parent folder ID to move folder")


class FolderResponse(BaseModel):
    id: int
    project_id: int
    parent_id: Optional[int] = None
    name: str
    video_count: int = 0
    created_at: datetime
    updated_at: datetime

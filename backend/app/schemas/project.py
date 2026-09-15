from datetime import datetime
from pydantic import BaseModel, Field

from app.schemas.tag import TagResponse


# =========================================================
# Create Project
# =========================================================

class ProjectCreateRequest(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=255,
    )
    description: str | None = Field(
        default=None,
    )
    cover_path: str | None = Field(
        default=None,
    )
    tag_ids: list[int] | None = Field(
        default=None,
    )


# =========================================================
# Update Project
# =========================================================

class ProjectUpdateRequest(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
    )
    description: str | None = Field(
        default=None,
    )
    cover_path: str | None = Field(
        default=None,
    )
    status: str | None = Field(
        default=None,
        max_length=50,
    )


# =========================================================
# Project Response
# =========================================================

class ProjectResponse(BaseModel):
    id: int
    owner_id: int
    name: str
    description: str | None
    cover_path: str | None
    status: str
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None
    is_favorite: bool = False
    is_shared: bool = False
    my_role: str = "owner"
    owner_name: str | None = None
    owner_email: str | None = None
    tags: list[TagResponse] = []
    video_count: int = 0
    recent_project: str | None = None
    duration: str | None = None
    size: str | None = None


# =========================================================
# Project Favorite Response
# =========================================================

class ProjectFavoriteResponse(BaseModel):
    project_id: int
    is_favorite: bool




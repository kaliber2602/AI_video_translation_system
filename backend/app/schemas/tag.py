from datetime import datetime

from pydantic import BaseModel, Field


# =========================================================
# Create Tag
# =========================================================

class TagCreateRequest(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=100,
    )

    color: str | None = Field(
        default=None,
        max_length=50,
    )


# =========================================================
# Update Tag
# =========================================================

class TagUpdateRequest(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=100,
    )

    color: str | None = Field(
        default=None,
        max_length=50,
    )


# =========================================================
# Tag Response
# =========================================================

class TagResponse(BaseModel):
    id: int
    user_id: int
    name: str
    color: str | None
    created_at: datetime
    updated_at: datetime
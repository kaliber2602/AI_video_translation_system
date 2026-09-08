from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class ContactCreateRequest(BaseModel):
    name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Name of the contact sender",
    )
    email: EmailStr = Field(
        ...,
        description="Email address of the contact sender",
    )
    subject: Optional[str] = Field(
        default="",
        max_length=200,
        description="Optional subject of the contact inquiry",
    )
    message: str = Field(
        ...,
        min_length=10,
        max_length=5000,
        description="Content of the contact message",
    )


class ContactResponse(BaseModel):
    id: int
    name: str
    email: str
    subject: Optional[str] = None
    message: str
    status: str = "pending"
    created_at: Optional[datetime] = None


class ContactSubmitSuccessResponse(BaseModel):
    success: bool = True
    message: str
    data: Optional[ContactResponse] = None

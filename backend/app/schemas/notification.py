from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# =========================================================
# Request Schemas
# =========================================================

class NotificationPreferencesPatch(BaseModel):
    # Email Channels
    email_on_pipeline_success: Optional[bool] = None
    email_on_pipeline_failed: Optional[bool] = None
    email_on_quota_warning: Optional[bool] = None
    email_on_project_invitation: Optional[bool] = None
    email_on_comment_mention: Optional[bool] = None

    # In-App Channels
    inapp_on_pipeline_success: Optional[bool] = None
    inapp_on_pipeline_failed: Optional[bool] = None
    inapp_on_quota_warning: Optional[bool] = None
    inapp_on_project_invitation: Optional[bool] = None
    inapp_on_comment_mention: Optional[bool] = None


class TestAlertRequest(BaseModel):
    type: Optional[str] = Field(default="system", max_length=50)
    title: Optional[str] = Field(default=None, max_length=255)
    message: Optional[str] = Field(default=None, max_length=1000)
    action_url: Optional[str] = Field(default=None, max_length=500)


# =========================================================
# Response Schemas
# =========================================================

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: str
    title: str
    message: str
    action_url: Optional[str] = None
    target_type: Optional[str] = None
    target_id: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime


class NotificationListResponse(BaseModel):
    items: List[NotificationResponse]
    total: int
    unread_count: int
    page: int
    page_size: int
    total_pages: int


class UnreadCountResponse(BaseModel):
    unread_count: int


class MarkAllReadResponse(BaseModel):
    success: bool
    updated_count: int


class NotificationPreferencesResponse(BaseModel):
    email_on_pipeline_success: bool
    email_on_pipeline_failed: bool
    email_on_quota_warning: bool
    email_on_project_invitation: bool
    email_on_comment_mention: bool
    inapp_on_pipeline_success: bool
    inapp_on_pipeline_failed: bool
    inapp_on_quota_warning: bool
    inapp_on_project_invitation: bool
    inapp_on_comment_mention: bool

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, EmailStr, Field


# =========================================================
# System Telemetry & Health
# =========================================================

class ServiceStatus(BaseModel):
    name: str
    status: str  # "healthy", "warning", "offline"
    latency_ms: Optional[float] = None
    message: Optional[str] = None


class DiskUsageInfo(BaseModel):
    path: str
    total_bytes: int
    used_bytes: int
    free_bytes: int
    percent_used: float


class SystemHealthResponse(BaseModel):
    overall_status: str  # "healthy", "warning", "critical"
    services: List[ServiceStatus]
    cpu_percent: Optional[float] = None
    memory_percent: Optional[float] = None
    disk_usage: List[DiskUsageInfo]
    checked_at: datetime


class SystemMetricsResponse(BaseModel):
    total_users: int
    active_users: int
    admin_users: int
    total_projects: int
    total_videos: int
    total_jobs: int
    jobs_by_status: Dict[str, int]
    total_revenue_usd: float
    total_credits_consumed: int
    timestamp: datetime


# =========================================================
# Pipeline Jobs & Task Logs
# =========================================================

class AdminJobResponse(BaseModel):
    id: str
    video_id: int
    video_title: Optional[str] = None
    triggered_by: int
    user_email: Optional[str] = None
    status: str
    current_step: Optional[str] = None
    progress: int = 0
    error_message: Optional[str] = None
    config_json: Optional[Dict[str, Any]] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class AdminTaskLogResponse(BaseModel):
    id: int
    job_id: str
    step_name: str
    worker_id: Optional[str] = None
    status: str
    retry_count: int = 0
    duration_ms: Optional[int] = None
    log_output: Optional[str] = None
    error_trace: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class AdminJobDetailResponse(BaseModel):
    job: AdminJobResponse
    task_logs: List[AdminTaskLogResponse]


class JobActionResponse(BaseModel):
    success: bool
    message: str


# =========================================================
# AI Models Catalog
# =========================================================

class AdminAIModelResponse(BaseModel):
    id: int
    code: str
    name: str
    category: str
    provider: str
    credit_cost_per_minute: int
    is_active: bool
    required_plan: str
    created_at: datetime


class AdminAIModelUpdateRequest(BaseModel):
    name: Optional[str] = None
    credit_cost_per_minute: Optional[int] = Field(default=None, ge=0)
    is_active: Optional[bool] = None
    required_plan: Optional[str] = None


# =========================================================
# Users & Subscriptions Management
# =========================================================

class AdminUserListItem(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    avatar: Optional[str] = None
    role: str
    is_active: bool
    plan_code: Optional[str] = "free"
    plan_name: Optional[str] = "Free"
    projects_count: int = 0
    videos_count: int = 0
    credits_used: int = 0
    created_at: datetime


class AdminUserDetailResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    avatar: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    plan_code: Optional[str] = "free"
    plan_name: Optional[str] = "Free"
    subscription_status: Optional[str] = "active"
    subscription_started_at: Optional[datetime] = None
    subscription_expires_at: Optional[datetime] = None
    projects_count: int = 0
    videos_count: int = 0
    total_credits_used: int = 0
    recent_jobs: List[AdminJobResponse] = []


class AdminUpdateUserRequest(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None


class AdminAdjustCreditsRequest(BaseModel):
    amount: int = Field(..., description="Positive amount to add credits, negative to deduct")
    reason: str = Field(..., min_length=2, max_length=255)


# =========================================================
# Finance & Payment Transactions
# =========================================================

class AdminPaymentTransactionResponse(BaseModel):
    id: int
    user_id: int
    user_email: Optional[str] = None
    transaction_code: str
    amount: float
    currency: str
    payment_method: str
    status: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime


class AdminPaymentStatsResponse(BaseModel):
    total_revenue_usd: float
    total_transactions_count: int
    completed_count: int
    pending_count: int
    failed_count: int
    gateway_breakdown: Dict[str, Dict[str, Any]]
    recent_transactions: List[AdminPaymentTransactionResponse]


# =========================================================
# Activity & Credit Audit Logs
# =========================================================

class AdminActivityLogResponse(BaseModel):
    id: int
    user_id: int
    user_email: Optional[str] = None
    project_id: Optional[int] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime


class AdminCreditAuditResponse(BaseModel):
    id: int
    user_id: int
    user_email: Optional[str] = None
    video_id: Optional[int] = None
    job_id: Optional[str] = None
    service_type: str
    credits_deducted: int
    balance_after: Optional[int] = None
    description: Optional[str] = None
    created_at: datetime


# =========================================================
# Contact Messages & Support
# =========================================================

class AdminContactMessageResponse(BaseModel):
    id: int
    name: str
    email: str
    subject: Optional[str] = None
    message: str
    status: str
    ip_address: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class AdminContactUpdateStatusRequest(BaseModel):
    status: str  # "pending", "read", "resolved"


# =========================================================
# Maintenance Tools
# =========================================================

class StorageDirectoryStats(BaseModel):
    directory: str
    path: str
    file_count: int
    size_bytes: int
    size_human: str


class AdminStorageStatsResponse(BaseModel):
    directories: List[StorageDirectoryStats]
    total_size_bytes: int
    total_size_human: str
    total_file_count: int


class AdminCleanupRequest(BaseModel):
    target: str = "temp"  # "temp", "uploads", "outputs"
    older_than_days: int = Field(default=7, ge=0)


class AdminCleanupResultResponse(BaseModel):
    success: bool
    deleted_files_count: int
    freed_bytes: int
    freed_human: str
    message: str


class DatabaseTableStats(BaseModel):
    table_name: str
    row_count: int
    total_size: str


class AdminDatabaseStatsResponse(BaseModel):
    database_name: str
    total_database_size: str
    tables: List[DatabaseTableStats]


class DiagnosticCheckResult(BaseModel):
    service: str
    status: str
    duration_ms: float
    details: str


class AdminDiagnosticsResponse(BaseModel):
    overall_status: str
    execution_time_ms: float
    checks: List[DiagnosticCheckResult]

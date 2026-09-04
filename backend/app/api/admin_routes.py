import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query, status

from app.core.admin_guard import require_admin
from app.schemas.admin import (
    AdminActivityLogResponse,
    AdminAIModelResponse,
    AdminAIModelUpdateRequest,
    AdminCleanupRequest,
    AdminCleanupResultResponse,
    AdminContactMessageResponse,
    AdminContactUpdateStatusRequest,
    AdminCreditAuditResponse,
    AdminDatabaseStatsResponse,
    AdminDiagnosticsResponse,
    AdminJobDetailResponse,
    AdminJobResponse,
    AdminPaymentStatsResponse,
    AdminPaymentTransactionResponse,
    AdminStorageStatsResponse,
    AdminUpdateUserRequest,
    AdminUserDetailResponse,
    AdminUserListItem,
    AdminAdjustCreditsRequest,
    JobActionResponse,
    SystemHealthResponse,
    SystemMetricsResponse,
)
from app.services.admin_service import (
    adjust_user_credits,
    cancel_pipeline_job,
    cleanup_temporary_files,
    get_database_stats,
    get_payment_stats,
    get_pipeline_job_details,
    get_pipeline_jobs,
    get_storage_stats,
    get_system_health,
    get_system_metrics,
    get_user_details,
    list_activity_logs,
    list_ai_models,
    list_contact_messages,
    list_credit_audit_logs,
    list_payment_transactions,
    list_users,
    retry_pipeline_job,
    run_system_diagnostics,
    update_ai_model,
    update_contact_message_status,
    update_user,
)

logger = logging.getLogger("app.api.admin_routes")

router = APIRouter(
    prefix="/admin",
    tags=["Admin Monitoring & Tools"],
    dependencies=[Depends(require_admin)],
)


# =========================================================
# 1. Telemetry & Metrics
# =========================================================

@router.get("/health", response_model=SystemHealthResponse)
def get_health():
    """Real-time system health and service dependencies check."""
    return get_system_health()


@router.get("/metrics", response_model=SystemMetricsResponse)
def get_metrics():
    """Aggregated platform KPI metrics."""
    return get_system_metrics()


# =========================================================
# 2. Pipeline Jobs Monitor
# =========================================================

@router.get("/jobs")
def list_jobs(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    """List asynchronous processing jobs across all users."""
    jobs, total = get_pipeline_jobs(
        limit=limit,
        offset=offset,
        status_filter=status,
        search=search,
    )
    return {
        "items": jobs,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/jobs/{job_id}", response_model=AdminJobDetailResponse)
def get_job_detail(job_id: str):
    """Get job details and step execution task logs."""
    return get_pipeline_job_details(job_id)


@router.post("/jobs/{job_id}/retry", response_model=JobActionResponse)
def retry_job(job_id: str):
    """Retry a failed or stuck processing job."""
    retry_pipeline_job(job_id)
    return JobActionResponse(success=True, message=f"Job {job_id} requeued for processing.")


@router.post("/jobs/{job_id}/cancel", response_model=JobActionResponse)
def cancel_job(job_id: str):
    """Cancel an active or queued processing job."""
    cancel_pipeline_job(job_id)
    return JobActionResponse(success=True, message=f"Job {job_id} cancelled.")


# =========================================================
# 3. AI Models Management
# =========================================================

@router.get("/models", response_model=List[AdminAIModelResponse])
def get_models(
    category: Optional[str] = Query(None),
    provider: Optional[str] = Query(None),
):
    """List AI models catalog."""
    return list_ai_models(category=category, provider=provider)


@router.put("/models/{model_id}", response_model=AdminAIModelResponse)
def update_model(model_id: int, payload: AdminAIModelUpdateRequest):
    """Update AI model parameters, toggle active/maintenance status or credit cost."""
    return update_ai_model(model_id, payload)


# =========================================================
# 4. User & Subscription Management
# =========================================================

@router.get("/users")
def get_users(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
):
    """List platform users with aggregate activity and quota counts."""
    users, total = list_users(
        limit=limit,
        offset=offset,
        search=search,
        role=role,
        is_active=is_active,
    )
    return {
        "items": users,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/users/{user_id}", response_model=AdminUserDetailResponse)
def get_user(user_id: int):
    """Get full profile, quota consumption and job history of a specific user."""
    return get_user_details(user_id)


@router.put("/users/{user_id}")
def update_user_status_or_role(user_id: int, payload: AdminUpdateUserRequest):
    """Change user role (admin/user) or toggle active/banned status."""
    update_user(user_id, role=payload.role, is_active=payload.is_active)
    return {"success": True, "message": "User updated successfully"}


@router.post("/users/{user_id}/adjust-credits")
def adjust_credits(
    user_id: int,
    payload: AdminAdjustCreditsRequest,
    current_admin: dict = Depends(require_admin),
):
    """Manually grant or deduct AI consumable credits for a user."""
    adjust_user_credits(
        user_id=user_id,
        amount=payload.amount,
        reason=payload.reason,
        admin_id=current_admin["id"],
    )
    return {
        "success": True,
        "message": f"Successfully adjusted {payload.amount} credits for user #{user_id}.",
    }


# =========================================================
# 5. Finance & Payments
# =========================================================

@router.get("/payments")
def get_payments(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    gateway: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
):
    """List payment transactions with filter options."""
    txs, total = list_payment_transactions(
        limit=limit,
        offset=offset,
        gateway=gateway,
        status_filter=status,
    )
    return {
        "items": txs,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/payments/stats", response_model=AdminPaymentStatsResponse)
def get_payment_overview():
    """Summary of financial income and gateway distribution."""
    return get_payment_stats()


# =========================================================
# 6. Audit & Activity Logs
# =========================================================

@router.get("/logs/activity")
def get_activity_logs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    action: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
):
    """List platform activity audit events."""
    logs, total = list_activity_logs(
        limit=limit,
        offset=offset,
        action=action,
        user_id=user_id,
    )
    return {
        "items": logs,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/logs/credits")
def get_credit_logs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user_id: Optional[int] = Query(None),
):
    """List AI credit consumption & adjustment audit trails."""
    logs, total = list_credit_audit_logs(
        limit=limit,
        offset=offset,
        user_id=user_id,
    )
    return {
        "items": logs,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


# =========================================================
# 7. Customer Inquiries & Contact Messages
# =========================================================

@router.get("/contacts")
def get_contacts(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: Optional[str] = Query(None),
):
    """Retrieve submitted contact/inquiry messages."""
    contacts, total = list_contact_messages(
        limit=limit,
        offset=offset,
        status_filter=status,
    )
    return {
        "items": contacts,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.put("/contacts/{contact_id}/status")
def update_contact_status(contact_id: int, payload: AdminContactUpdateStatusRequest):
    """Update contact message resolution status (pending, read, resolved)."""
    update_contact_message_status(contact_id, payload.status)
    return {"success": True, "message": f"Contact message status updated to {payload.status}"}


# =========================================================
# 8. Maintenance & Operations Tools
# =========================================================

@router.get("/tools/storage", response_model=AdminStorageStatsResponse)
def get_storage():
    """Detailed storage and cache consumption breakdown."""
    return get_storage_stats()


@router.post("/tools/cleanup", response_model=AdminCleanupResultResponse)
def run_cleanup(payload: AdminCleanupRequest):
    """Trigger cleanup of expired or orphaned temporary files."""
    return cleanup_temporary_files(
        target=payload.target,
        older_than_days=payload.older_than_days,
    )


@router.get("/tools/database", response_model=AdminDatabaseStatsResponse)
def get_db_stats():
    """PostgreSQL database size and table row counts."""
    return get_database_stats()


@router.post("/tools/diagnostics", response_model=AdminDiagnosticsResponse)
def run_diagnostics():
    """Run comprehensive round-trip latency & health checks across all components."""
    return run_system_diagnostics()

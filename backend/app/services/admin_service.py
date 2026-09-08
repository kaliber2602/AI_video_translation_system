import logging
import os
import shutil
import socket
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import psycopg2
from fastapi import HTTPException, status

from app.core.database import get_connection
from app.core.config import UPLOAD_DIR, OUTPUT_DIR

logger = logging.getLogger(__name__)
from app.schemas.admin import (
    AdminJobResponse,
    AdminJobDetailResponse,
    AdminTaskLogResponse,
    AdminAIModelResponse,
    AdminAIModelUpdateRequest,
    AdminUserListItem,
    AdminUserDetailResponse,
    AdminPaymentTransactionResponse,
    AdminPaymentStatsResponse,
    AdminActivityLogResponse,
    AdminCreditAuditResponse,
    AdminContactMessageResponse,
    DiskUsageInfo,
    ServiceStatus,
    SystemHealthResponse,
    SystemMetricsResponse,
    StorageDirectoryStats,
    AdminStorageStatsResponse,
    AdminCleanupResultResponse,
    DatabaseTableStats,
    AdminDatabaseStatsResponse,
    DiagnosticCheckResult,
    AdminDiagnosticsResponse,
)


# =========================================================
# Helper: Format Bytes to Human Readable String
# =========================================================

def _format_bytes(size_in_bytes: int) -> str:
    if size_in_bytes < 1024:
        return f"{size_in_bytes} B"
    elif size_in_bytes < 1024 ** 2:
        return f"{size_in_bytes / 1024:.1f} KB"
    elif size_in_bytes < 1024 ** 3:
        return f"{size_in_bytes / (1024 ** 2):.1f} MB"
    else:
        return f"{size_in_bytes / (1024 ** 3):.2f} GB"


# =========================================================
# Helper: TCP Socket Ping
# =========================================================

def _test_tcp_connection(host: str, port: int, timeout_sec: float = 1.5) -> tuple[bool, float, str]:
    start = time.perf_counter()
    try:
        with socket.create_connection((host, port), timeout=timeout_sec):
            latency = (time.perf_counter() - start) * 1000
            return True, round(latency, 2), "Connection successful"
    except Exception as exc:
        latency = (time.perf_counter() - start) * 1000
        return False, round(latency, 2), str(exc)


# =========================================================
# 1. System Health & Telemetry
# =========================================================

def get_system_health() -> SystemHealthResponse:
    services: List[ServiceStatus] = []
    overall_status = "healthy"

    # 1. Database Check
    db_start = time.perf_counter()
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT 1;")
            cursor.fetchone()
        conn.close()
        db_latency = round((time.perf_counter() - db_start) * 1000, 2)
        services.append(ServiceStatus(
            name="PostgreSQL Database",
            status="healthy",
            latency_ms=db_latency,
            message="Database connection and queries operational",
        ))
    except Exception as exc:
        overall_status = "critical"
        services.append(ServiceStatus(
            name="PostgreSQL Database",
            status="offline",
            message=f"Connection error: {str(exc)}",
        ))

    # 2. Redis Check
    redis_host = os.getenv("REDIS_HOST", "redis")
    redis_port = int(os.getenv("REDIS_PORT", "6379"))
    redis_ok, redis_latency, redis_msg = _test_tcp_connection(redis_host, redis_port)
    if not redis_ok:
        # Fallback to localhost if outside Docker
        redis_ok, redis_latency, redis_msg = _test_tcp_connection("localhost", redis_port)

    if redis_ok:
        services.append(ServiceStatus(
            name="Redis Cache & Queue",
            status="healthy",
            latency_ms=redis_latency,
            message="Broker reachable and listening",
        ))
    else:
        services.append(ServiceStatus(
            name="Redis Cache & Queue",
            status="warning",
            latency_ms=redis_latency,
            message=f"Redis unreachable ({redis_msg}). Local fallback mode active.",
        ))

    # 3. TTS Service Check
    tts_url = os.getenv("TTS_API_URL", "http://tts-service:8001/generate_tts")
    parsed_tts = urlparse(tts_url)
    tts_host = parsed_tts.hostname or "tts-service"
    tts_port = parsed_tts.port or 8001

    tts_ok, tts_latency, tts_msg = _test_tcp_connection(tts_host, tts_port)
    if not tts_ok:
        tts_ok, tts_latency, tts_msg = _test_tcp_connection("localhost", tts_port)

    if tts_ok:
        services.append(ServiceStatus(
            name="TTS Microservice",
            status="healthy",
            latency_ms=tts_latency,
            message="Neural TTS Service online and accepting syntheses",
        ))
    else:
        services.append(ServiceStatus(
            name="TTS Microservice",
            status="warning",
            latency_ms=tts_latency,
            message=f"TTS Service offline or in cold boot ({tts_msg})",
        ))

    # 4. MinIO / Object Storage Check
    minio_ok, minio_latency, minio_msg = _test_tcp_connection("minio", 9000)
    if not minio_ok:
        minio_ok, minio_latency, minio_msg = _test_tcp_connection("localhost", 9000)

    if minio_ok:
        services.append(ServiceStatus(
            name="MinIO Object Storage",
            status="healthy",
            latency_ms=minio_latency,
            message="Object store operational",
        ))
    else:
        services.append(ServiceStatus(
            name="MinIO Object Storage",
            status="warning",
            latency_ms=minio_latency,
            message="MinIO offline or filesystem storage mode active",
        ))

    # 5. Disk Usage on Workspace Volumes
    disk_infos: List[DiskUsageInfo] = []
    monitored_paths = [
        ("Uploads Directory", UPLOAD_DIR),
        ("Outputs Directory", OUTPUT_DIR),
        ("Root Workspace", Path.cwd()),
    ]

    for label, path in monitored_paths:
        try:
            path.mkdir(parents=True, exist_ok=True)
            usage = shutil.disk_usage(path)
            pct = round((usage.used / usage.total) * 100, 1)
            disk_infos.append(DiskUsageInfo(
                path=f"{label} ({path.name or '.'})",
                total_bytes=usage.total,
                used_bytes=usage.used,
                free_bytes=usage.free,
                percent_used=pct,
            ))
            if pct > 90 and overall_status != "critical":
                overall_status = "warning"
        except Exception:
            pass

    return SystemHealthResponse(
        overall_status=overall_status,
        services=services,
        disk_usage=disk_infos,
        checked_at=datetime.now(timezone.utc),
    )


# =========================================================
# 2. System Overview Metrics
# =========================================================

def get_system_metrics() -> SystemMetricsResponse:
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            # Users
            cursor.execute("SELECT COUNT(*) FROM users;")
            total_users = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM users WHERE is_active = TRUE;")
            active_users = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'admin';")
            admin_users = cursor.fetchone()[0]

            # Projects
            cursor.execute("SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL;")
            total_projects = cursor.fetchone()[0]

            # Videos
            cursor.execute("SELECT COUNT(*) FROM videos WHERE deleted_at IS NULL;")
            total_videos = cursor.fetchone()[0]

            # Jobs
            cursor.execute("SELECT COUNT(*) FROM pipeline_jobs;")
            total_jobs = cursor.fetchone()[0]

            cursor.execute("SELECT status, COUNT(*) FROM pipeline_jobs GROUP BY status;")
            jobs_by_status_rows = cursor.fetchall()
            jobs_by_status = {
                "queued": 0,
                "processing": 0,
                "completed": 0,
                "failed": 0,
                "cancelled": 0,
            }
            for status_name, count in jobs_by_status_rows:
                if status_name in jobs_by_status:
                    jobs_by_status[status_name] = count

            # Payments
            cursor.execute(
                "SELECT COALESCE(SUM(amount), 0.0) FROM payment_transactions WHERE status = 'completed';"
            )
            total_revenue_usd = float(cursor.fetchone()[0] or 0.0)

            # Consumable AI Credits
            cursor.execute(
                "SELECT COALESCE(SUM(credits_used), 0) FROM user_consumable_usage;"
            )
            total_credits_consumed = int(cursor.fetchone()[0] or 0)

            return SystemMetricsResponse(
                total_users=total_users,
                active_users=active_users,
                admin_users=admin_users,
                total_projects=total_projects,
                total_videos=total_videos,
                total_jobs=total_jobs,
                jobs_by_status=jobs_by_status,
                total_revenue_usd=total_revenue_usd,
                total_credits_consumed=total_credits_consumed,
                timestamp=datetime.now(timezone.utc),
            )
    finally:
        conn.close()


# =========================================================
# 3. Pipeline Jobs Management
# =========================================================

def get_pipeline_jobs(
    limit: int = 20,
    offset: int = 0,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
) -> tuple[List[AdminJobResponse], int]:
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            where_clauses = []
            params: List[Any] = []

            if status_filter and status_filter != "all":
                where_clauses.append("pj.status = %s")
                params.append(status_filter)

            if search:
                where_clauses.append("(v.title ILIKE %s OR u.email ILIKE %s)")
                params.extend([f"%{search}%", f"%{search}%"])

            where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

            # Count total
            count_query = f"""
                SELECT COUNT(*)
                FROM pipeline_jobs pj
                LEFT JOIN videos v ON pj.video_id = v.id
                LEFT JOIN users u ON pj.triggered_by = u.id
                {where_sql};
            """
            cursor.execute(count_query, params)
            total_count = cursor.fetchone()[0]

            # Fetch items
            data_query = f"""
                SELECT
                    pj.id,
                    pj.video_id,
                    v.title AS video_title,
                    pj.triggered_by,
                    u.email AS user_email,
                    pj.status,
                    pj.current_step,
                    pj.progress,
                    pj.error_message,
                    pj.config_json,
                    pj.started_at,
                    pj.finished_at,
                    pj.created_at,
                    pj.updated_at
                FROM pipeline_jobs pj
                LEFT JOIN videos v ON pj.video_id = v.id
                LEFT JOIN users u ON pj.triggered_by = u.id
                {where_sql}
                ORDER BY pj.created_at DESC
                LIMIT %s OFFSET %s;
            """
            cursor.execute(data_query, params + [limit, offset])
            rows = cursor.fetchall()

            jobs = []
            for r in rows:
                jobs.append(AdminJobResponse(
                    id=str(r[0]),
                    video_id=r[1],
                    video_title=r[2] or f"Video #{r[1]}",
                    triggered_by=r[3],
                    user_email=r[4] or "unknown",
                    status=r[5],
                    current_step=r[6],
                    progress=r[7],
                    error_message=r[8],
                    config_json=r[9] if isinstance(r[9], dict) else None,
                    started_at=r[10],
                    finished_at=r[11],
                    created_at=r[12],
                    updated_at=r[13],
                ))

            return jobs, total_count
    finally:
        conn.close()


def get_pipeline_job_details(job_id: str) -> AdminJobDetailResponse:
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            # 1. Fetch Job
            cursor.execute(
                """
                SELECT
                    pj.id,
                    pj.video_id,
                    v.title AS video_title,
                    pj.triggered_by,
                    u.email AS user_email,
                    pj.status,
                    pj.current_step,
                    pj.progress,
                    pj.error_message,
                    pj.config_json,
                    pj.started_at,
                    pj.finished_at,
                    pj.created_at,
                    pj.updated_at
                FROM pipeline_jobs pj
                LEFT JOIN videos v ON pj.video_id = v.id
                LEFT JOIN users u ON pj.triggered_by = u.id
                WHERE pj.id = %s;
                """,
                (job_id,),
            )
            row = cursor.fetchone()
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Pipeline job with ID '{job_id}' not found",
                )

            job_resp = AdminJobResponse(
                id=str(row[0]),
                video_id=row[1],
                video_title=row[2] or f"Video #{row[1]}",
                triggered_by=row[3],
                user_email=row[4] or "unknown",
                status=row[5],
                current_step=row[6],
                progress=row[7],
                error_message=row[8],
                config_json=row[9] if isinstance(row[9], dict) else None,
                started_at=row[10],
                finished_at=row[11],
                created_at=row[12],
                updated_at=row[13],
            )

            # 2. Fetch Task Logs
            cursor.execute(
                """
                SELECT
                    id,
                    job_id,
                    step_name,
                    worker_id,
                    status,
                    retry_count,
                    duration_ms,
                    log_output,
                    error_trace,
                    created_at,
                    updated_at
                FROM pipeline_task_logs
                WHERE job_id = %s
                ORDER BY created_at ASC;
                """,
                (job_id,),
            )
            log_rows = cursor.fetchall()

            task_logs = []
            for lr in log_rows:
                task_logs.append(AdminTaskLogResponse(
                    id=lr[0],
                    job_id=str(lr[1]),
                    step_name=lr[2],
                    worker_id=lr[3],
                    status=lr[4],
                    retry_count=lr[5],
                    duration_ms=lr[6],
                    log_output=lr[7],
                    error_trace=lr[8],
                    created_at=lr[9],
                    updated_at=lr[10],
                ))

            return AdminJobDetailResponse(
                job=job_resp,
                task_logs=task_logs,
            )
    finally:
        conn.close()


def retry_pipeline_job(job_id: str) -> bool:
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE pipeline_jobs
                SET status = 'queued',
                    progress = 0,
                    error_message = NULL,
                    started_at = NULL,
                    finished_at = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s;
                """,
                (job_id,),
            )
            if cursor.rowcount == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Job {job_id} not found",
                )
            conn.commit()
            return True
    finally:
        conn.close()


def cancel_pipeline_job(job_id: str) -> bool:
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE pipeline_jobs
                SET status = 'cancelled',
                    finished_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND status IN ('queued', 'processing');
                """,
                (job_id,),
            )
            if cursor.rowcount == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Job is not in queued or processing state",
                )
            conn.commit()
            return True
    finally:
        conn.close()


# =========================================================
# 4. AI Models Catalog
# =========================================================

def list_ai_models(
    category: Optional[str] = None,
    provider: Optional[str] = None,
) -> List[AdminAIModelResponse]:
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            where_clauses = []
            params = []

            if category and category != "all":
                where_clauses.append("category = %s")
                params.append(category)

            if provider and provider != "all":
                where_clauses.append("provider = %s")
                params.append(provider)

            where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

            cursor.execute(
                f"""
                SELECT
                    id,
                    code,
                    name,
                    category,
                    provider,
                    credit_cost_per_minute,
                    is_active,
                    required_plan,
                    created_at
                FROM ai_models
                {where_sql}
                ORDER BY category ASC, id ASC;
                """,
                params,
            )
            rows = cursor.fetchall()

            return [
                AdminAIModelResponse(
                    id=r[0],
                    code=r[1],
                    name=r[2],
                    category=r[3],
                    provider=r[4],
                    credit_cost_per_minute=r[5],
                    is_active=r[6],
                    required_plan=r[7],
                    created_at=r[8],
                )
                for r in rows
            ]
    finally:
        conn.close()


def update_ai_model(model_id: int, update_data: AdminAIModelUpdateRequest) -> AdminAIModelResponse:
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            updates = []
            params: List[Any] = []

            if update_data.name is not None:
                updates.append("name = %s")
                params.append(update_data.name)

            if update_data.credit_cost_per_minute is not None:
                updates.append("credit_cost_per_minute = %s")
                params.append(update_data.credit_cost_per_minute)

            if update_data.is_active is not None:
                updates.append("is_active = %s")
                params.append(update_data.is_active)

            if update_data.required_plan is not None:
                updates.append("required_plan = %s")
                params.append(update_data.required_plan)

            if not updates:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No fields provided for update",
                )

            params.append(model_id)
            cursor.execute(
                f"""
                UPDATE ai_models
                SET {', '.join(updates)}
                WHERE id = %s
                RETURNING
                    id,
                    code,
                    name,
                    category,
                    provider,
                    credit_cost_per_minute,
                    is_active,
                    required_plan,
                    created_at;
                """,
                params,
            )
            row = cursor.fetchone()
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"AI model #{model_id} not found",
                )
            conn.commit()

            return AdminAIModelResponse(
                id=row[0],
                code=row[1],
                name=row[2],
                category=row[3],
                provider=row[4],
                credit_cost_per_minute=row[5],
                is_active=row[6],
                required_plan=row[7],
                created_at=row[8],
            )
    finally:
        conn.close()


# =========================================================
# 5. Users Management
# =========================================================

def list_users(
    limit: int = 20,
    offset: int = 0,
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
) -> tuple[List[AdminUserListItem], int]:
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            where_clauses = []
            params: List[Any] = []

            if search:
                where_clauses.append("(u.email ILIKE %s OR u.full_name ILIKE %s)")
                params.extend([f"%{search}%", f"%{search}%"])

            if role and role != "all":
                where_clauses.append("u.role = %s")
                params.append(role)

            if is_active is not None:
                where_clauses.append("u.is_active = %s")
                params.append(is_active)

            where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

            # Count total
            cursor.execute(f"SELECT COUNT(*) FROM users u {where_sql};", params)
            total_count = cursor.fetchone()[0]

            # Fetch users with aggregates
            query = f"""
                SELECT
                    u.id,
                    u.email,
                    u.full_name,
                    u.avatar,
                    u.role,
                    u.is_active,
                    u.created_at,
                    COALESCE(p.code, 'free') AS plan_code,
                    COALESCE(p.name, 'Free') AS plan_name,
                    (SELECT COUNT(*) FROM projects pr WHERE pr.owner_id = u.id AND pr.deleted_at IS NULL) AS projects_count,
                    (SELECT COUNT(*) FROM videos v JOIN projects pr ON v.project_id = pr.id WHERE pr.owner_id = u.id AND v.deleted_at IS NULL) AS videos_count,
                    COALESCE((SELECT SUM(credits_used) FROM user_consumable_usage WHERE user_id = u.id), 0) AS credits_used
                FROM users u
                LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
                LEFT JOIN plans p ON us.plan_id = p.id
                {where_sql}
                ORDER BY u.created_at DESC
                LIMIT %s OFFSET %s;
            """
            cursor.execute(query, params + [limit, offset])
            rows = cursor.fetchall()

            users = [
                AdminUserListItem(
                    id=r[0],
                    email=r[1],
                    full_name=r[2],
                    avatar=r[3],
                    role=r[4],
                    is_active=r[5],
                    created_at=r[6],
                    plan_code=r[7],
                    plan_name=r[8],
                    projects_count=r[9],
                    videos_count=r[10],
                    credits_used=r[11],
                )
                for r in rows
            ]

            return users, total_count
    finally:
        conn.close()


def get_user_details(user_id: int) -> AdminUserDetailResponse:
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            # User & Subscription details
            cursor.execute(
                """
                SELECT
                    u.id,
                    u.email,
                    u.full_name,
                    u.avatar,
                    u.role,
                    u.is_active,
                    u.created_at,
                    u.updated_at,
                    COALESCE(p.code, 'free') AS plan_code,
                    COALESCE(p.name, 'Free') AS plan_name,
                    us.status AS subscription_status,
                    us.started_at,
                    us.expires_at,
                    (SELECT COUNT(*) FROM projects pr WHERE pr.owner_id = u.id AND pr.deleted_at IS NULL) AS projects_count,
                    (SELECT COUNT(*) FROM videos v JOIN projects pr ON v.project_id = pr.id WHERE pr.owner_id = u.id AND v.deleted_at IS NULL) AS videos_count,
                    COALESCE((SELECT SUM(credits_used) FROM user_consumable_usage WHERE user_id = u.id), 0) AS total_credits_used
                FROM users u
                LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
                LEFT JOIN plans p ON us.plan_id = p.id
                WHERE u.id = %s;
                """,
                (user_id,),
            )
            r = cursor.fetchone()
            if not r:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"User #{user_id} not found",
                )

            # Recent jobs by this user
            cursor.execute(
                """
                SELECT
                    pj.id,
                    pj.video_id,
                    v.title,
                    pj.triggered_by,
                    pj.status,
                    pj.current_step,
                    pj.progress,
                    pj.error_message,
                    pj.config_json,
                    pj.started_at,
                    pj.finished_at,
                    pj.created_at,
                    pj.updated_at
                FROM pipeline_jobs pj
                LEFT JOIN videos v ON pj.video_id = v.id
                WHERE pj.triggered_by = %s
                ORDER BY pj.created_at DESC
                LIMIT 5;
                """,
                (user_id,),
            )
            job_rows = cursor.fetchall()
            recent_jobs = [
                AdminJobResponse(
                    id=str(jr[0]),
                    video_id=jr[1],
                    video_title=jr[2] or f"Video #{jr[1]}",
                    triggered_by=jr[3],
                    user_email=r[1],
                    status=jr[4],
                    current_step=jr[5],
                    progress=jr[6],
                    error_message=jr[7],
                    config_json=jr[8] if isinstance(jr[8], dict) else None,
                    started_at=jr[9],
                    finished_at=jr[10],
                    created_at=jr[11],
                    updated_at=jr[12],
                )
                for jr in job_rows
            ]

            return AdminUserDetailResponse(
                id=r[0],
                email=r[1],
                full_name=r[2],
                avatar=r[3],
                role=r[4],
                is_active=r[5],
                created_at=r[6],
                updated_at=r[7],
                plan_code=r[8],
                plan_name=r[9],
                subscription_status=r[10] or "active",
                subscription_started_at=r[11],
                subscription_expires_at=r[12],
                projects_count=r[13],
                videos_count=r[14],
                total_credits_used=r[15],
                recent_jobs=recent_jobs,
            )
    finally:
        conn.close()


def update_user(user_id: int, role: Optional[str] = None, is_active: Optional[bool] = None) -> bool:
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            updates = []
            params = []

            if role is not None:
                if role not in ("admin", "user"):
                    raise HTTPException(status_code=400, detail="Invalid role. Must be 'admin' or 'user'.")
                updates.append("role = %s")
                params.append(role)

            if is_active is not None:
                updates.append("is_active = %s")
                params.append(is_active)

            if not updates:
                raise HTTPException(status_code=400, detail="No update parameters provided.")

            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(user_id)

            cursor.execute(
                f"UPDATE users SET {', '.join(updates)} WHERE id = %s;",
                params,
            )
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="User not found")
            conn.commit()
            return True
    finally:
        conn.close()


def adjust_user_credits(user_id: int, amount: int, reason: str, admin_id: int) -> bool:
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            # Verify user exists
            cursor.execute("SELECT id FROM users WHERE id = %s;", (user_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="User not found")

            # Insert into credit audit logs
            # If amount is positive (adding credits), credits_deducted is negative
            credits_deducted = -amount
            description = f"[Admin #{admin_id} Manual Adjustment] {reason} ({'+' if amount > 0 else ''}{amount} credits)"

            cursor.execute(
                """
                INSERT INTO credit_audit_logs (
                    user_id,
                    service_type,
                    credits_deducted,
                    description,
                    created_at
                )
                VALUES (%s, 'admin_adjustment', %s, %s, CURRENT_TIMESTAMP);
                """,
                (user_id, credits_deducted, description),
            )

            # Also log into activity logs
            cursor.execute(
                """
                INSERT INTO activity_logs (
                    user_id,
                    action,
                    target_type,
                    target_id,
                    metadata,
                    created_at
                )
                VALUES (%s, 'admin_credit_adjustment', 'user', %s, %s, CURRENT_TIMESTAMP);
                """,
                (
                    admin_id,
                    user_id,
                    psycopg2.extras.Json({"amount": amount, "reason": reason}) if hasattr(psycopg2, "extras") else None,
                ),
            )
            conn.commit()

            try:
                from app.services.notification_service import create_notification
                sign_str = f"+{amount}" if amount > 0 else f"{amount}"
                create_notification(
                    user_id=user_id,
                    type="system",
                    title="Credit Balance Updated",
                    message=f"Your credit balance was adjusted by {sign_str} credits. Reason: {reason}",
                    action_url="/settings?tab=billing",
                    target_type="credit_ledger",
                    target_id=None,
                    metadata={
                        "event": "admin.credit.adjusted",
                        "adjusted_by": admin_id,
                        "amount": amount,
                        "reason": reason,
                    },
                )
            except Exception as notif_err:
                logger.error(f"[AdminService] Failed to create credit adjustment notification: {notif_err}")

            return True
    finally:
        conn.close()


# =========================================================
# 6. Finance & Payment Transactions
# =========================================================

def list_payment_transactions(
    limit: int = 20,
    offset: int = 0,
    gateway: Optional[str] = None,
    status_filter: Optional[str] = None,
) -> tuple[List[AdminPaymentTransactionResponse], int]:
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            where_clauses = []
            params: List[Any] = []

            if gateway and gateway != "all":
                where_clauses.append("pt.payment_method = %s")
                params.append(gateway)

            if status_filter and status_filter != "all":
                where_clauses.append("pt.status = %s")
                params.append(status_filter)

            where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

            # Count
            cursor.execute(f"SELECT COUNT(*) FROM payment_transactions pt {where_sql};", params)
            total_count = cursor.fetchone()[0]

            # Fetch
            query = f"""
                SELECT
                    pt.id,
                    pt.user_id,
                    u.email,
                    pt.transaction_code,
                    pt.amount,
                    pt.currency,
                    pt.payment_method,
                    pt.status,
                    pt.metadata,
                    pt.created_at,
                    pt.updated_at
                FROM payment_transactions pt
                LEFT JOIN users u ON pt.user_id = u.id
                {where_sql}
                ORDER BY pt.created_at DESC
                LIMIT %s OFFSET %s;
            """
            cursor.execute(query, params + [limit, offset])
            rows = cursor.fetchall()

            txs = [
                AdminPaymentTransactionResponse(
                    id=r[0],
                    user_id=r[1],
                    user_email=r[2] or "unknown",
                    transaction_code=r[3],
                    amount=float(r[4]),
                    currency=r[5],
                    payment_method=r[6],
                    status=r[7],
                    metadata=r[8] if isinstance(r[8], dict) else None,
                    created_at=r[9],
                    updated_at=r[10],
                )
                for r in rows
            ]
            return txs, total_count
    finally:
        conn.close()


def get_payment_stats() -> AdminPaymentStatsResponse:
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            # Total revenue
            cursor.execute("SELECT COALESCE(SUM(amount), 0) FROM payment_transactions WHERE status = 'completed';")
            total_revenue = float(cursor.fetchone()[0] or 0)

            # Count by status
            cursor.execute("SELECT COUNT(*) FROM payment_transactions;")
            total_count = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM payment_transactions WHERE status = 'completed';")
            completed_count = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM payment_transactions WHERE status = 'pending';")
            pending_count = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM payment_transactions WHERE status = 'failed';")
            failed_count = cursor.fetchone()[0]

            # Gateway breakdown
            cursor.execute(
                """
                SELECT
                    payment_method,
                    COUNT(*),
                    COALESCE(SUM(amount), 0)
                FROM payment_transactions
                WHERE status = 'completed'
                GROUP BY payment_method;
                """
            )
            gw_rows = cursor.fetchall()
            gateway_breakdown = {}
            for gw, count, sum_amt in gw_rows:
                gateway_breakdown[gw] = {
                    "count": count,
                    "total_amount": float(sum_amt),
                }

            # Recent 10 transactions
            recent_txs, _ = list_payment_transactions(limit=10, offset=0)

            return AdminPaymentStatsResponse(
                total_revenue_usd=total_revenue,
                total_transactions_count=total_count,
                completed_count=completed_count,
                pending_count=pending_count,
                failed_count=failed_count,
                gateway_breakdown=gateway_breakdown,
                recent_transactions=recent_txs,
            )
    finally:
        conn.close()


# =========================================================
# 7. Activity & Credit Audit Logs
# =========================================================

def list_activity_logs(
    limit: int = 50,
    offset: int = 0,
    action: Optional[str] = None,
    user_id: Optional[int] = None,
) -> tuple[List[AdminActivityLogResponse], int]:
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            where_clauses = []
            params: List[Any] = []

            if action and action != "all":
                where_clauses.append("al.action = %s")
                params.append(action)

            if user_id:
                where_clauses.append("al.user_id = %s")
                params.append(user_id)

            where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

            cursor.execute(f"SELECT COUNT(*) FROM activity_logs al {where_sql};", params)
            total = cursor.fetchone()[0]

            query = f"""
                SELECT
                    al.id,
                    al.user_id,
                    u.email,
                    al.project_id,
                    al.action,
                    al.target_type,
                    al.target_id,
                    al.metadata,
                    al.created_at
                FROM activity_logs al
                LEFT JOIN users u ON al.user_id = u.id
                {where_sql}
                ORDER BY al.created_at DESC
                LIMIT %s OFFSET %s;
            """
            cursor.execute(query, params + [limit, offset])
            rows = cursor.fetchall()

            logs = [
                AdminActivityLogResponse(
                    id=r[0],
                    user_id=r[1],
                    user_email=r[2],
                    project_id=r[3],
                    action=r[4],
                    target_type=r[5],
                    target_id=r[6],
                    metadata=r[7] if isinstance(r[7], dict) else None,
                    created_at=r[8],
                )
                for r in rows
            ]
            return logs, total
    finally:
        conn.close()


def list_credit_audit_logs(
    limit: int = 50,
    offset: int = 0,
    user_id: Optional[int] = None,
) -> tuple[List[AdminCreditAuditResponse], int]:
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            where_clauses = []
            params: List[Any] = []

            if user_id:
                where_clauses.append("cal.user_id = %s")
                params.append(user_id)

            where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

            cursor.execute(f"SELECT COUNT(*) FROM credit_audit_logs cal {where_sql};", params)
            total = cursor.fetchone()[0]

            query = f"""
                SELECT
                    cal.id,
                    cal.user_id,
                    u.email,
                    cal.video_id,
                    cal.job_id,
                    cal.service_type,
                    cal.credits_deducted,
                    cal.balance_after,
                    cal.description,
                    cal.created_at
                FROM credit_audit_logs cal
                LEFT JOIN users u ON cal.user_id = u.id
                {where_sql}
                ORDER BY cal.created_at DESC
                LIMIT %s OFFSET %s;
            """
            cursor.execute(query, params + [limit, offset])
            rows = cursor.fetchall()

            logs = [
                AdminCreditAuditResponse(
                    id=r[0],
                    user_id=r[1],
                    user_email=r[2],
                    video_id=r[3],
                    job_id=str(r[4]) if r[4] else None,
                    service_type=r[5],
                    credits_deducted=r[6],
                    balance_after=r[7],
                    description=r[8],
                    created_at=r[9],
                )
                for r in rows
            ]
            return logs, total
    finally:
        conn.close()


# =========================================================
# 8. Contact Messages & Support
# =========================================================

def list_contact_messages(
    limit: int = 50,
    offset: int = 0,
    status_filter: Optional[str] = None,
) -> tuple[List[AdminContactMessageResponse], int]:
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            where_clauses = []
            params: List[Any] = []

            if status_filter and status_filter != "all":
                where_clauses.append("status = %s")
                params.append(status_filter)

            where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

            cursor.execute(f"SELECT COUNT(*) FROM contact_messages {where_sql};", params)
            total = cursor.fetchone()[0]

            query = f"""
                SELECT
                    id,
                    name,
                    email,
                    subject,
                    message,
                    status,
                    ip_address,
                    created_at,
                    updated_at
                FROM contact_messages
                {where_sql}
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s;
            """
            cursor.execute(query, params + [limit, offset])
            rows = cursor.fetchall()

            items = [
                AdminContactMessageResponse(
                    id=r[0],
                    name=r[1],
                    email=r[2],
                    subject=r[3],
                    message=r[4],
                    status=r[5],
                    ip_address=r[6],
                    created_at=r[7],
                    updated_at=r[8],
                )
                for r in rows
            ]
            return items, total
    finally:
        conn.close()


def update_contact_message_status(contact_id: int, new_status: str) -> bool:
    if new_status not in ("pending", "read", "resolved"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be 'pending', 'read', or 'resolved'",
        )

    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE contact_messages
                SET status = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s;
                """,
                (new_status, contact_id),
            )
            if cursor.rowcount == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Contact message #{contact_id} not found",
                )
            conn.commit()
            return True
    finally:
        conn.close()


# =========================================================
# 9. Maintenance & Operations Tools
# =========================================================

def get_storage_stats() -> AdminStorageStatsResponse:
    directories_to_inspect = [
        ("Uploads", UPLOAD_DIR),
        ("Outputs", OUTPUT_DIR),
        ("Model Cache", Path("./model-cache")),
        ("TTS Model Cache", Path("./tts-model-cache")),
    ]

    dir_stats = []
    total_size = 0
    total_files = 0

    for name, path in directories_to_inspect:
        size = 0
        count = 0
        if path.exists():
            for root, _, files in os.walk(path):
                for f in files:
                    try:
                        fp = os.path.join(root, f)
                        if os.path.isfile(fp):
                            size += os.path.getsize(fp)
                            count += 1
                    except Exception:
                        pass

        total_size += size
        total_files += count
        dir_stats.append(StorageDirectoryStats(
            directory=name,
            path=str(path),
            file_count=count,
            size_bytes=size,
            size_human=_format_bytes(size),
        ))

    return AdminStorageStatsResponse(
        directories=dir_stats,
        total_size_bytes=total_size,
        total_size_human=_format_bytes(total_size),
        total_file_count=total_files,
    )


def cleanup_temporary_files(target: str = "temp", older_than_days: int = 7) -> AdminCleanupResultResponse:
    cutoff_time = time.time() - (older_than_days * 86400)
    deleted_count = 0
    freed_bytes = 0

    target_dirs = []
    if target in ("temp", "all"):
        target_dirs.append(UPLOAD_DIR)
        target_dirs.append(OUTPUT_DIR)
    elif target == "uploads":
        target_dirs.append(UPLOAD_DIR)
    elif target == "outputs":
        target_dirs.append(OUTPUT_DIR)

    for directory in target_dirs:
        if not directory.exists():
            continue

        for root, _, files in os.walk(directory):
            for f in files:
                # Do not delete files like .gitkeep
                if f.startswith("."):
                    continue

                fp = os.path.join(root, f)
                try:
                    mtime = os.path.getmtime(fp)
                    if mtime < cutoff_time:
                        size = os.path.getsize(fp)
                        os.remove(fp)
                        deleted_count += 1
                        freed_bytes += size
                except Exception:
                    pass

    return AdminCleanupResultResponse(
        success=True,
        deleted_files_count=deleted_count,
        freed_bytes=freed_bytes,
        freed_human=_format_bytes(freed_bytes),
        message=f"Cleaned up {deleted_count} files older than {older_than_days} days. Freed {_format_bytes(freed_bytes)} of storage.",
    )


def get_database_stats() -> AdminDatabaseStatsResponse:
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            # Database size
            cursor.execute("SELECT pg_size_pretty(pg_database_size(current_database()));")
            total_db_size = cursor.fetchone()[0]

            # Table row counts and sizes
            tables = [
                "users",
                "projects",
                "videos",
                "pipeline_jobs",
                "pipeline_task_logs",
                "ai_models",
                "payment_transactions",
                "activity_logs",
                "credit_audit_logs",
                "contact_messages",
                "user_subscriptions",
            ]

            table_stats = []
            for t in tables:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {t};")
                    count = cursor.fetchone()[0]
                    cursor.execute(f"SELECT pg_size_pretty(pg_total_relation_size('{t}'));")
                    sz = cursor.fetchone()[0]
                    table_stats.append(DatabaseTableStats(
                        table_name=t,
                        row_count=count,
                        total_size=sz,
                    ))
                except Exception:
                    pass

            return AdminDatabaseStatsResponse(
                database_name="ai_video",
                total_database_size=total_db_size,
                tables=table_stats,
            )
    finally:
        conn.close()


def run_system_diagnostics() -> AdminDiagnosticsResponse:
    start_total = time.perf_counter()
    checks: List[DiagnosticCheckResult] = []
    overall_status = "healthy"

    # 1. DB Query Test
    t0 = time.perf_counter()
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT version();")
            version_str = cursor.fetchone()[0]
        conn.close()
        dur = (time.perf_counter() - t0) * 1000
        checks.append(DiagnosticCheckResult(
            service="PostgreSQL Engine",
            status="PASS",
            duration_ms=round(dur, 2),
            details=f"Read test OK. {version_str[:35]}...",
        ))
    except Exception as exc:
        overall_status = "CRITICAL"
        checks.append(DiagnosticCheckResult(
            service="PostgreSQL Engine",
            status="FAIL",
            duration_ms=round((time.perf_counter() - t0) * 1000, 2),
            details=f"Query failed: {exc}",
        ))

    # 2. Redis Socket Test
    t0 = time.perf_counter()
    r_ok, r_lat, r_msg = _test_tcp_connection(os.getenv("REDIS_HOST", "redis"), 6379)
    if not r_ok:
        r_ok, r_lat, r_msg = _test_tcp_connection("localhost", 6379)

    checks.append(DiagnosticCheckResult(
        service="Redis Broker",
        status="PASS" if r_ok else "WARN",
        duration_ms=r_lat,
        details="Socket handshake succeeded" if r_ok else f"Handshake failed: {r_msg}",
    ))

    # 3. TTS Service
    t0 = time.perf_counter()
    tts_url = os.getenv("TTS_API_URL", "http://tts-service:8001/generate_tts")
    parsed_tts = urlparse(tts_url)
    tts_ok, tts_lat, tts_msg = _test_tcp_connection(parsed_tts.hostname or "tts-service", parsed_tts.port or 8001)
    if not tts_ok:
        tts_ok, tts_lat, tts_msg = _test_tcp_connection("localhost", parsed_tts.port or 8001)

    checks.append(DiagnosticCheckResult(
        service="Neural TTS Service",
        status="PASS" if tts_ok else "WARN",
        duration_ms=tts_lat,
        details="TTS container port 8001 responding" if tts_ok else f"TTS service unreachable: {tts_msg}",
    ))

    # 4. Storage Write Test
    t0 = time.perf_counter()
    test_file = UPLOAD_DIR / ".healthcheck_tmp"
    try:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        with open(test_file, "w") as f:
            f.write("write_test")
        test_file.unlink()
        dur = (time.perf_counter() - t0) * 1000
        checks.append(DiagnosticCheckResult(
            service="Disk I/O Write Test",
            status="PASS",
            duration_ms=round(dur, 2),
            details="Successfully created and purged temporary test block",
        ))
    except Exception as exc:
        overall_status = "CRITICAL"
        checks.append(DiagnosticCheckResult(
            service="Disk I/O Write Test",
            status="FAIL",
            duration_ms=round((time.perf_counter() - t0) * 1000, 2),
            details=f"Disk write error: {exc}",
        ))

    total_dur = round((time.perf_counter() - start_total) * 1000, 2)
    return AdminDiagnosticsResponse(
        overall_status=overall_status,
        execution_time_ms=total_dur,
        checks=checks,
    )

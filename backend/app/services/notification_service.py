import json
import logging
from datetime import datetime
from math import ceil
from typing import Any, Dict, List, Optional, Tuple, Union

from fastapi import BackgroundTasks
import psycopg2.extras

from app.core.database import get_connection
from app.schemas.notification import NotificationPreferencesPatch

logger = logging.getLogger(__name__)

DEFAULT_PREFERENCES: Dict[str, bool] = {
    "email_on_pipeline_success": True,
    "email_on_pipeline_failed": True,
    "email_on_quota_warning": True,
    "email_on_project_invitation": True,
    "email_on_comment_mention": True,
    "inapp_on_pipeline_success": True,
    "inapp_on_pipeline_failed": True,
    "inapp_on_quota_warning": True,
    "inapp_on_project_invitation": True,
    "inapp_on_comment_mention": True,
}

ALLOWED_ACTION_PREFIXES = ("/workspace", "/admin", "/settings")
FORBIDDEN_ACTION_PREFIXES = ("http://", "https://", "//", "javascript:", "data:")


def validate_action_url(action_url: Optional[str]) -> Optional[str]:
    """
    Validates action_url against open redirect and XSS exploits.
    Returns the sanitized URL if valid, or None if invalid.
    """
    if not action_url:
        return None

    cleaned = action_url.strip()
    lower_cleaned = cleaned.lower()

    for forbidden in FORBIDDEN_ACTION_PREFIXES:
        if lower_cleaned.startswith(forbidden):
            logger.warning(f"[NotificationService] Rejected unsafe action_url: {cleaned}")
            return None

    if not cleaned.startswith("/"):
        logger.warning(f"[NotificationService] Rejected non-relative action_url: {cleaned}")
        return None

    if not any(lower_cleaned.startswith(prefix) for prefix in ALLOWED_ACTION_PREFIXES):
        logger.warning(f"[NotificationService] Disallowed action_url prefix: {cleaned}")
        return None

    return cleaned[:500]


def _row_to_notification(row: Optional[tuple]) -> Optional[Dict[str, Any]]:
    if row is None:
        return None

    meta = row[8]
    if isinstance(meta, str):
        try:
            meta = json.loads(meta)
        except Exception:
            meta = {}

    return {
        "id": row[0],
        "user_id": row[1],
        "type": row[2],
        "title": row[3],
        "message": row[4],
        "action_url": row[5],
        "target_type": row[6],
        "target_id": row[7],
        "metadata": meta,
        "is_read": row[9],
        "read_at": row[10],
        "created_at": row[11],
    }


def _row_to_preferences(row: Optional[tuple]) -> Optional[Dict[str, bool]]:
    if row is None:
        return None

    return {
        "email_on_pipeline_success": bool(row[2]),
        "email_on_pipeline_failed": bool(row[3]),
        "email_on_quota_warning": bool(row[4]),
        "email_on_project_invitation": bool(row[5]),
        "email_on_comment_mention": bool(row[6]),
        "inapp_on_pipeline_success": bool(row[7]),
        "inapp_on_pipeline_failed": bool(row[8]),
        "inapp_on_quota_warning": bool(row[9]),
        "inapp_on_project_invitation": bool(row[10]),
        "inapp_on_comment_mention": bool(row[11]),
    }


# =========================================================
# Preferences Operations
# =========================================================

def get_notification_preferences(user_id: int) -> Dict[str, bool]:
    """
    Retrieves the user's notification preferences.
    If no preference record exists (legacy users), automatically creates default record.
    """
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id, user_id,
                    email_on_pipeline_success, email_on_pipeline_failed, email_on_quota_warning,
                    email_on_project_invitation, email_on_comment_mention,
                    inapp_on_pipeline_success, inapp_on_pipeline_failed, inapp_on_quota_warning,
                    inapp_on_project_invitation, inapp_on_comment_mention
                FROM user_notification_preferences
                WHERE user_id = %s
                """,
                (user_id,),
            )
            row = cursor.fetchone()

            if row is not None:
                return _row_to_preferences(row)

            # Auto-create default row if missing
            cursor.execute(
                """
                INSERT INTO user_notification_preferences (user_id)
                VALUES (%s)
                ON CONFLICT (user_id) DO NOTHING
                RETURNING
                    id, user_id,
                    email_on_pipeline_success, email_on_pipeline_failed, email_on_quota_warning,
                    email_on_project_invitation, email_on_comment_mention,
                    inapp_on_pipeline_success, inapp_on_pipeline_failed, inapp_on_quota_warning,
                    inapp_on_project_invitation, inapp_on_comment_mention
                """,
                (user_id,),
            )
            new_row = cursor.fetchone()
            connection.commit()

            if new_row is not None:
                return _row_to_preferences(new_row)

            return dict(DEFAULT_PREFERENCES)
    except Exception as exc:
        connection.rollback()
        logger.error(f"[NotificationService] Error getting preferences for user {user_id}: {exc}")
        return dict(DEFAULT_PREFERENCES)
    finally:
        connection.close()


def patch_notification_preferences(
    user_id: int, data: Union[NotificationPreferencesPatch, dict]
) -> Dict[str, bool]:
    """
    Partially updates notification delivery preferences for the authenticated user.
    """
    if isinstance(data, dict):
        update_dict = data
    else:
        update_dict = data.model_dump(exclude_unset=True)
    if not update_dict:
        return get_notification_preferences(user_id)

    allowed_fields = set(DEFAULT_PREFERENCES.keys())
    fields_to_update = {k: v for k, v in update_dict.items() if k in allowed_fields and v is not None}

    if not fields_to_update:
        return get_notification_preferences(user_id)

    connection = get_connection()
    try:
        # Ensure row exists first
        get_notification_preferences(user_id)

        set_clauses = [f"{field} = %s" for field in fields_to_update.keys()]
        set_clauses.append("updated_at = CURRENT_TIMESTAMP")
        values = list(fields_to_update.values())
        values.append(user_id)

        query = f"""
            UPDATE user_notification_preferences
            SET {", ".join(set_clauses)}
            WHERE user_id = %s
            RETURNING
                id, user_id,
                email_on_pipeline_success, email_on_pipeline_failed, email_on_quota_warning,
                email_on_project_invitation, email_on_comment_mention,
                inapp_on_pipeline_success, inapp_on_pipeline_failed, inapp_on_quota_warning,
                inapp_on_project_invitation, inapp_on_comment_mention
        """

        with connection.cursor() as cursor:
            cursor.execute(query, tuple(values))
            row = cursor.fetchone()
            connection.commit()

            if row is not None:
                return _row_to_preferences(row)

            return dict(DEFAULT_PREFERENCES)
    except Exception as exc:
        connection.rollback()
        logger.error(f"[NotificationService] Error patching preferences for user {user_id}: {exc}")
        raise
    finally:
        connection.close()


# =========================================================
# Query & Mutate Notifications
# =========================================================

def get_unread_count(user_id: int) -> int:
    """
    Fast query using idx_notifications_unread (user_id, is_read).
    Returns the number of unread notifications for polling.
    """
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT COUNT(*)
                FROM notifications
                WHERE user_id = %s AND is_read = FALSE
                """,
                (user_id,),
            )
            return int(cursor.fetchone()[0])
    finally:
        connection.close()


def get_notifications(
    user_id: int,
    page: int = 1,
    page_size: int = 20,
    unread_only: bool = False,
    type: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], int, int, int]:
    """
    Retrieves paginated notifications for the user.
    Returns (items, total, unread_count, total_pages).
    """
    page = max(1, page)
    page_size = min(50, max(1, page_size))
    offset = (page - 1) * page_size

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            # 1. Unread count
            cursor.execute(
                "SELECT COUNT(*) FROM notifications WHERE user_id = %s AND is_read = FALSE",
                (user_id,),
            )
            unread_count = int(cursor.fetchone()[0])

            # 2. Base query filters
            where_clauses = ["user_id = %s"]
            params: List[Any] = [user_id]

            if unread_only:
                where_clauses.append("is_read = FALSE")

            if type and type.strip():
                where_clauses.append("type = %s")
                params.append(type.strip().lower())

            where_str = " AND ".join(where_clauses)

            # 3. Total matching items
            count_query = f"SELECT COUNT(*) FROM notifications WHERE {where_str}"
            cursor.execute(count_query, tuple(params))
            total = int(cursor.fetchone()[0])

            # 4. Items query
            items_query = f"""
                SELECT
                    id, user_id, type, title, message, action_url,
                    target_type, target_id, metadata, is_read, read_at, created_at
                FROM notifications
                WHERE {where_str}
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """
            params.extend([page_size, offset])
            cursor.execute(items_query, tuple(params))
            rows = cursor.fetchall()

            items = [_row_to_notification(row) for row in rows]
            total_pages = max(1, ceil(total / page_size)) if total > 0 else 1

            return items, total, unread_count, total_pages
    finally:
        connection.close()


def mark_notification_as_read(user_id: int, notification_id: int) -> Optional[Dict[str, Any]]:
    """
    Marks a single notification as read with strict ownership check.
    Returns the updated notification dict, or None if not found / owned by another user.
    """
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE notifications
                SET
                    is_read = TRUE,
                    read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
                WHERE id = %s AND user_id = %s
                RETURNING
                    id, user_id, type, title, message, action_url,
                    target_type, target_id, metadata, is_read, read_at, created_at
                """,
                (notification_id, user_id),
            )
            row = cursor.fetchone()
            connection.commit()
            return _row_to_notification(row)
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def mark_all_notifications_as_read(user_id: int) -> int:
    """
    Marks all unread notifications as read for the user.
    Returns the count of updated rows.
    """
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE notifications
                SET
                    is_read = TRUE,
                    read_at = CURRENT_TIMESTAMP
                WHERE user_id = %s AND is_read = FALSE
                """,
                (user_id,),
            )
            updated_count = cursor.rowcount
            connection.commit()
            return updated_count
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def delete_notification(user_id: int, notification_id: int) -> bool:
    """
    Permanently deletes a notification with strict ownership check.
    Returns True if deleted, False if not found.
    """
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                DELETE FROM notifications
                WHERE id = %s AND user_id = %s
                """,
                (notification_id, user_id),
            )
            deleted = cursor.rowcount > 0
            connection.commit()
            return deleted
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


# =========================================================
# Email Helper (Non-blocking, isolated)
# =========================================================

def _send_notification_email_safe(
    to_email: str, subject: str, message: str, action_url: Optional[str] = None
) -> None:
    """
    Sends notification email via email_service.
    Never throws an exception to ensure zero impact on calling transactions.
    """
    try:
        from app.services.email_service import send_email

        html_body = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="margin-bottom: 20px;">
                <span style="font-weight: 800; font-size: 18px; color: #0d9488; letter-spacing: -0.5px;">VIDNOVA</span>
            </div>
            <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">{subject}</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">{message}</p>
            {f'<div style="margin-bottom: 24px;"><a href="{action_url}" style="display: inline-block; padding: 10px 20px; font-size: 14px; font-weight: 600; color: #ffffff; background-color: #0d9488; text-decoration: none; border-radius: 8px;">Open VidNova</a></div>' if action_url else ''}
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">You received this update because email alerts are enabled in your VidNova notification preferences.</p>
        </div>
        """
        send_email(
            to_email=to_email,
            subject=f"[VIDNOVA] {subject}",
            html_body=html_body,
            text_body=message,
        )
        logger.info(f"[NotificationService] Notification email dispatched to {to_email}")
    except Exception as exc:
        logger.warning(f"[NotificationService] Notification email delivery skipped/failed: {exc}")


# =========================================================
# Internal Notification Creator (Core Domain Boundary)
# =========================================================

def create_notification(
    user_id: int,
    type: str,
    title: str,
    message: str,
    action_url: Optional[str] = None,
    target_type: Optional[str] = None,
    target_id: Optional[int] = None,
    metadata: Optional[Dict[str, Any]] = None,
    background_tasks: Optional[BackgroundTasks] = None,
) -> Optional[Dict[str, Any]]:
    """
    Internal domain service boundary for creating notifications.
    Enforces user delivery preferences, inserts in-app notification row,
    and optionally queues background email delivery.

    Guarantees:
    - Never throws unhandled exceptions to callers.
    - Email failures never block or rollback database insertion.
    """
    try:
        cleaned_url = validate_action_url(action_url)
        safe_title = (title or "").strip()[:255]
        safe_message = (message or "").strip()
        safe_type = (type or "system").strip().lower()[:50]

        prefs = get_notification_preferences(user_id)
        event_name = (metadata or {}).get("event", "")

        # 1. Determine In-App Permission
        inapp_allowed = True
        if safe_type == "pipeline":
            inapp_allowed = prefs.get("inapp_on_pipeline_failed", True) if "failed" in event_name else prefs.get("inapp_on_pipeline_success", True)
        elif safe_type == "quota":
            inapp_allowed = prefs.get("inapp_on_quota_warning", True)
        elif safe_type == "collaboration":
            inapp_allowed = prefs.get("inapp_on_project_invitation", True)

        created_notification = None

        if inapp_allowed:
            connection = get_connection()
            try:
                with connection.cursor() as cursor:
                    meta_json = psycopg2.extras.Json(metadata) if metadata else None
                    cursor.execute(
                        """
                        INSERT INTO notifications (
                            user_id, type, title, message, action_url, target_type, target_id, metadata
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING
                            id, user_id, type, title, message, action_url,
                            target_type, target_id, metadata, is_read, read_at, created_at
                        """,
                        (
                            user_id,
                            safe_type,
                            safe_title,
                            safe_message,
                            cleaned_url,
                            target_type,
                            target_id,
                            meta_json,
                        ),
                    )
                    row = cursor.fetchone()
                    connection.commit()
                    created_notification = _row_to_notification(row)
            finally:
                connection.close()

        # 2. Determine Email Permission
        email_allowed = False
        if safe_type == "pipeline":
            email_allowed = prefs.get("email_on_pipeline_failed", True) if "failed" in event_name else prefs.get("email_on_pipeline_success", True)
        elif safe_type == "quota":
            email_allowed = prefs.get("email_on_quota_warning", True)
        elif safe_type == "collaboration":
            email_allowed = prefs.get("email_on_project_invitation", True)

        if email_allowed and background_tasks is not None:
            # Query user email
            user_email = None
            conn = get_connection()
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT email FROM users WHERE id = %s", (user_id,))
                    user_row = cur.fetchone()
                    if user_row:
                        user_email = user_row[0]
            finally:
                conn.close()

            if user_email:
                background_tasks.add_task(
                    _send_notification_email_safe,
                    user_email,
                    safe_title,
                    safe_message,
                    cleaned_url,
                )

        return created_notification
    except Exception as exc:
        logger.error(f"[NotificationService] Failed to create notification for user {user_id}: {exc}", exc_info=True)
        return None

import logging
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Path,
    Query,
    Response,
    status,
)

from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import get_user_id_from_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> int:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return get_user_id_from_token(credentials.credentials, "access")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
from app.schemas.notification import (
    MarkAllReadResponse,
    NotificationListResponse,
    NotificationPreferencesPatch,
    NotificationPreferencesResponse,
    NotificationResponse,
    TestAlertRequest,
    UnreadCountResponse,
)
from app.services.notification_service import (
    create_notification,
    delete_notification,
    get_notification_preferences,
    get_notifications,
    get_unread_count,
    mark_all_notifications_as_read,
    mark_notification_as_read,
    patch_notification_preferences,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


# =========================================================
# GET /api/notifications/unread-count
# (Declared BEFORE /{notification_id} to avoid path conflict)
# =========================================================

@router.get(
    "/unread-count",
    response_model=UnreadCountResponse,
    status_code=status.HTTP_200_OK,
    summary="Get unread notifications count for polling",
)
def get_unread_count_route(
    user_id: int = Depends(get_current_user_id),
):
    try:
        count = get_unread_count(user_id=user_id)
        return UnreadCountResponse(unread_count=count)
    except Exception as exc:
        logger.error(f"[NotificationRoutes] Error getting unread count: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve unread notification count.",
        ) from exc


# =========================================================
# GET & PATCH /api/notifications/preferences
# (Declared BEFORE /{notification_id} to avoid path conflict)
# =========================================================

@router.get(
    "/preferences",
    response_model=NotificationPreferencesResponse,
    status_code=status.HTTP_200_OK,
    summary="Get user notification delivery preferences",
)
def get_preferences_route(
    user_id: int = Depends(get_current_user_id),
):
    try:
        prefs = get_notification_preferences(user_id=user_id)
        return NotificationPreferencesResponse(**prefs)
    except Exception as exc:
        logger.error(f"[NotificationRoutes] Error getting preferences: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve notification preferences.",
        ) from exc


@router.patch(
    "/preferences",
    response_model=NotificationPreferencesResponse,
    status_code=status.HTTP_200_OK,
    summary="Update user notification delivery preferences",
)
def patch_preferences_route(
    data: NotificationPreferencesPatch,
    user_id: int = Depends(get_current_user_id),
):
    try:
        updated = patch_notification_preferences(user_id=user_id, data=data)
        return NotificationPreferencesResponse(**updated)
    except Exception as exc:
        logger.error(f"[NotificationRoutes] Error updating preferences: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update notification preferences.",
        ) from exc


# =========================================================
# POST /api/notifications/mark-all-read
# =========================================================

@router.post(
    "/mark-all-read",
    response_model=MarkAllReadResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark all unread notifications as read",
)
def mark_all_read_route(
    user_id: int = Depends(get_current_user_id),
):
    try:
        count = mark_all_notifications_as_read(user_id=user_id)
        return MarkAllReadResponse(success=True, updated_count=count)
    except Exception as exc:
        logger.error(f"[NotificationRoutes] Error marking all read: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark all notifications as read.",
        ) from exc


# =========================================================
# POST /api/notifications/test-alert
# =========================================================

@router.post(
    "/test-alert",
    response_model=NotificationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Trigger a simulated test notification (in-app only)",
)
def test_alert_route(
    request: Optional[TestAlertRequest] = None,
    user_id: int = Depends(get_current_user_id),
):
    try:
        notif_type = request.type if request and request.type else "system"
        title = request.title if request and request.title else f"{notif_type.capitalize()} Alert"
        message = (
            request.message
            if request and request.message
            else f"This is a simulated {notif_type} verification alert for your VIDNOVA workspace."
        )
        action_url = request.action_url if request and request.action_url else "/settings?tab=notifications"

        notification = create_notification(
            user_id=user_id,
            type=notif_type,
            title=title,
            message=message,
            action_url=action_url,
            target_type=notif_type,
            target_id=None,
            metadata={
                "event": f"{notif_type}.test_alert",
                "is_test": True,
            },
            background_tasks=None,  # NEVER send real email on test alert
        )

        if notification is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate test notification.",
            )

        return NotificationResponse(**notification)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"[NotificationRoutes] Error triggering test alert: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to trigger test alert.",
        ) from exc


# =========================================================
# GET /api/notifications
# =========================================================

@router.get(
    "",
    response_model=NotificationListResponse,
    status_code=status.HTTP_200_OK,
    summary="List paginated notifications for current user",
)
def get_notifications_route(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    unread_only: bool = Query(default=False),
    type: Optional[str] = Query(default=None),
    user_id: int = Depends(get_current_user_id),
):
    try:
        items, total, unread_count, total_pages = get_notifications(
            user_id=user_id,
            page=page,
            page_size=page_size,
            unread_only=unread_only,
            type=type,
        )

        return NotificationListResponse(
            items=[NotificationResponse(**item) for item in items],
            total=total,
            unread_count=unread_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
    except Exception as exc:
        logger.error(f"[NotificationRoutes] Error listing notifications: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve notifications.",
        ) from exc


# =========================================================
# PATCH /api/notifications/{notification_id}/read
# =========================================================

@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark single notification as read",
)
def mark_notification_read_route(
    notification_id: int = Path(..., ge=1),
    user_id: int = Depends(get_current_user_id),
):
    try:
        notification = mark_notification_as_read(
            user_id=user_id, notification_id=notification_id
        )

        if notification is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found.",
            )

        return NotificationResponse(**notification)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"[NotificationRoutes] Error marking read: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update notification.",
        ) from exc


# =========================================================
# DELETE /api/notifications/{notification_id}
# =========================================================

@router.delete(
    "/{notification_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Permanently delete a notification",
)
def delete_notification_route(
    notification_id: int = Path(..., ge=1),
    user_id: int = Depends(get_current_user_id),
):
    try:
        deleted = delete_notification(
            user_id=user_id, notification_id=notification_id
        )

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found.",
            )

        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"[NotificationRoutes] Error deleting notification: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete notification.",
        ) from exc

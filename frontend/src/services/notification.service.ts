import api from "./api/axios";
import type {
  MarkAllReadResponse,
  NotificationItem,
  NotificationListResponse,
  NotificationPreferences,
  NotificationPreferencesPatch,
  NotificationQueryParams,
  TestAlertRequest,
  UnreadCountResponse,
} from "../types/notification";

/**
 * Fetch paginated notifications with optional filters (unread_only, type).
 */
export async function getNotifications(
  params: NotificationQueryParams = {}
): Promise<NotificationListResponse> {
  const query = new URLSearchParams();

  if (params.page !== undefined) query.set("page", params.page.toString());
  if (params.page_size !== undefined) query.set("page_size", params.page_size.toString());
  if (params.unread_only !== undefined) query.set("unread_only", params.unread_only.toString());
  if (params.type) query.set("type", params.type);

  const queryString = query.toString();
  const url = queryString ? `/api/notifications?${queryString}` : "/api/notifications";

  const response = await api.get<NotificationListResponse>(url);
  return response.data;
}

/**
 * Quick polling endpoint to fetch unread notification count.
 */
export async function getUnreadCount(): Promise<number> {
  const response = await api.get<UnreadCountResponse>("/api/notifications/unread-count");
  return response.data.unread_count;
}

/**
 * Mark a single notification as read (idempotent).
 */
export async function markAsRead(notificationId: number): Promise<NotificationItem> {
  const response = await api.patch<NotificationItem>(`/api/notifications/${notificationId}/read`);
  return response.data;
}

/**
 * Mark all unread notifications as read for current user.
 */
export async function markAllAsRead(): Promise<MarkAllReadResponse> {
  const response = await api.post<MarkAllReadResponse>("/api/notifications/mark-all-read");
  return response.data;
}

/**
 * Delete an individual notification.
 */
export async function deleteNotification(notificationId: number): Promise<void> {
  await api.delete(`/api/notifications/${notificationId}`);
}

/**
 * Fetch delivery preferences for in-app and email channels.
 */
export async function getPreferences(): Promise<NotificationPreferences> {
  const response = await api.get<NotificationPreferences>("/api/notifications/preferences");
  return response.data;
}

/**
 * Partially update delivery preferences.
 */
export async function updatePreferences(
  patch: NotificationPreferencesPatch
): Promise<NotificationPreferences> {
  const response = await api.patch<NotificationPreferences>(
    "/api/notifications/preferences",
    patch
  );
  return response.data;
}

/**
 * Trigger an in-app simulated test notification.
 */
export async function createTestAlert(
  request: TestAlertRequest = {}
): Promise<NotificationItem> {
  const response = await api.post<NotificationItem>(
    "/api/notifications/test-alert",
    request
  );
  return response.data;
}

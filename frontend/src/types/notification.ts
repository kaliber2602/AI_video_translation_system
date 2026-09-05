export type NotificationType =
  | "pipeline"
  | "quota"
  | "collaboration"
  | "billing"
  | "security"
  | "system";

export interface NotificationItem {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  action_url: string | null;
  target_type: string | null;
  target_id: number | null;
  metadata: Record<string, any> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  total: number;
  unread_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface MarkAllReadResponse {
  success: boolean;
  updated_count: number;
}

export interface NotificationPreferences {
  // Email Channels
  email_on_pipeline_success: boolean;
  email_on_pipeline_failed: boolean;
  email_on_quota_warning: boolean;
  email_on_project_invitation: boolean;
  email_on_comment_mention: boolean;

  // In-App Channels
  inapp_on_pipeline_success: boolean;
  inapp_on_pipeline_failed: boolean;
  inapp_on_quota_warning: boolean;
  inapp_on_project_invitation: boolean;
  inapp_on_comment_mention: boolean;
}

export type NotificationPreferencesPatch = Partial<NotificationPreferences>;

export interface TestAlertRequest {
  type?: string;
  title?: string;
  message?: string;
  action_url?: string;
}

export interface NotificationQueryParams {
  page?: number;
  page_size?: number;
  unread_only?: boolean;
  type?: string;
}

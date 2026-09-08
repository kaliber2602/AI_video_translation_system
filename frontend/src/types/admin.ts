export interface ServiceStatus {
  name: string;
  status: "healthy" | "warning" | "offline";
  latency_ms?: number;
  message?: string;
}

export interface DiskUsageInfo {
  path: string;
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  percent_used: number;
}

export interface SystemHealthResponse {
  overall_status: "healthy" | "warning" | "critical";
  services: ServiceStatus[];
  cpu_percent?: number;
  memory_percent?: number;
  disk_usage: DiskUsageInfo[];
  checked_at: string;
}

export interface SystemMetricsResponse {
  total_users: number;
  active_users: number;
  admin_users: number;
  total_projects: number;
  total_videos: number;
  total_jobs: number;
  jobs_by_status: {
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
  total_revenue_usd: number;
  total_credits_consumed: number;
  timestamp: string;
}

export interface AdminJobResponse {
  id: string;
  video_id: number;
  video_title?: string;
  triggered_by: number;
  user_email?: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  current_step?: string;
  progress: number;
  error_message?: string;
  config_json?: Record<string, unknown>;
  started_at?: string;
  finished_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminTaskLogResponse {
  id: number;
  job_id: string;
  step_name: string;
  worker_id?: string;
  status: string;
  retry_count: number;
  duration_ms?: number;
  log_output?: string;
  error_trace?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminJobDetailResponse {
  job: AdminJobResponse;
  task_logs: AdminTaskLogResponse[];
}

export interface AdminAIModelResponse {
  id: number;
  code: string;
  name: string;
  category: "separation" | "stt" | "diarization" | "translation" | "tts" | "llm" | "embedding" | string;
  provider: "local" | "openai" | "elevenlabs" | "anthropic" | "google" | string;
  credit_cost_per_minute: number;
  is_active: boolean;
  required_plan: "free" | "pro" | "business" | string;
  created_at: string;
}

export interface AdminAIModelUpdateRequest {
  name?: string;
  credit_cost_per_minute?: number;
  is_active?: boolean;
  required_plan?: string;
}

export interface AdminUserListItem {
  id: number;
  email: string;
  full_name: string;
  avatar?: string | null;
  role: "admin" | "user";
  is_active: boolean;
  plan_code?: string;
  plan_name?: string;
  projects_count: number;
  videos_count: number;
  credits_used: number;
  created_at: string;
}

export interface AdminUserDetailResponse {
  id: number;
  email: string;
  full_name: string;
  avatar?: string | null;
  role: "admin" | "user";
  is_active: boolean;
  created_at: string;
  updated_at: string;
  plan_code?: string;
  plan_name?: string;
  subscription_status?: string;
  subscription_started_at?: string;
  subscription_expires_at?: string;
  projects_count: number;
  videos_count: number;
  total_credits_used: number;
  recent_jobs: AdminJobResponse[];
}

export interface AdminPaymentTransactionResponse {
  id: number;
  user_id: number;
  user_email?: string;
  transaction_code: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: "completed" | "pending" | "failed" | string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AdminPaymentStatsResponse {
  total_revenue_usd: number;
  total_transactions_count: number;
  completed_count: number;
  pending_count: number;
  failed_count: number;
  gateway_breakdown: Record<string, { count: number; total_amount: number }>;
  recent_transactions: AdminPaymentTransactionResponse[];
}

export interface AdminActivityLogResponse {
  id: number;
  user_id: number;
  user_email?: string;
  project_id?: number;
  action: string;
  target_type?: string;
  target_id?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface AdminCreditAuditResponse {
  id: number;
  user_id: number;
  user_email?: string;
  video_id?: number;
  job_id?: string;
  service_type: string;
  credits_deducted: number;
  balance_after?: number;
  description?: string;
  created_at: string;
}

export interface AdminContactMessageResponse {
  id: number;
  name: string;
  email: string;
  subject?: string;
  message: string;
  status: "pending" | "read" | "resolved";
  ip_address?: string;
  created_at: string;
  updated_at: string;
}

export interface StorageDirectoryStats {
  directory: string;
  path: string;
  file_count: number;
  size_bytes: number;
  size_human: string;
}

export interface AdminStorageStatsResponse {
  directories: StorageDirectoryStats[];
  total_size_bytes: number;
  total_size_human: string;
  total_file_count: number;
}

export interface AdminCleanupResultResponse {
  success: boolean;
  deleted_files_count: number;
  freed_bytes: number;
  freed_human: string;
  message: string;
}

export interface DatabaseTableStats {
  table_name: string;
  row_count: number;
  total_size: string;
}

export interface AdminDatabaseStatsResponse {
  database_name: string;
  total_database_size: string;
  tables: DatabaseTableStats[];
}

export interface DiagnosticCheckResult {
  service: string;
  status: string;
  duration_ms: number;
  details: string;
}

export interface AdminDiagnosticsResponse {
  overall_status: string;
  execution_time_ms: number;
  checks: DiagnosticCheckResult[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

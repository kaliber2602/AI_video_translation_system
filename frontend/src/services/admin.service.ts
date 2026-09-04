import api from "./api/axios";
import type {
  AdminActivityLogResponse,
  AdminAIModelResponse,
  AdminAIModelUpdateRequest,
  AdminCleanupResultResponse,
  AdminContactMessageResponse,
  AdminCreditAuditResponse,
  AdminDatabaseStatsResponse,
  AdminDiagnosticsResponse,
  AdminJobDetailResponse,
  AdminJobResponse,
  AdminPaymentStatsResponse,
  AdminPaymentTransactionResponse,
  AdminStorageStatsResponse,
  AdminUserDetailResponse,
  AdminUserListItem,
  PaginatedResult,
  SystemHealthResponse,
  SystemMetricsResponse,
} from "../types/admin";

// =========================================================
// 1. Telemetry & Metrics
// =========================================================

export const getSystemHealth = async (): Promise<SystemHealthResponse> => {
  const res = await api.get<SystemHealthResponse>("/api/admin/health");
  return res.data;
};

export const getSystemMetrics = async (): Promise<SystemMetricsResponse> => {
  const res = await api.get<SystemMetricsResponse>("/api/admin/metrics");
  return res.data;
};

// =========================================================
// 2. Pipeline Jobs
// =========================================================

export const getAdminJobs = async (params?: {
  limit?: number;
  offset?: number;
  status?: string;
  search?: string;
}): Promise<PaginatedResult<AdminJobResponse>> => {
  const res = await api.get<PaginatedResult<AdminJobResponse>>("/api/admin/jobs", {
    params,
  });
  return res.data;
};

export const getAdminJobDetail = async (jobId: string): Promise<AdminJobDetailResponse> => {
  const res = await api.get<AdminJobDetailResponse>(`/api/admin/jobs/${jobId}`);
  return res.data;
};

export const retryAdminJob = async (jobId: string): Promise<{ success: boolean; message: string }> => {
  const res = await api.post<{ success: boolean; message: string }>(`/api/admin/jobs/${jobId}/retry`);
  return res.data;
};

export const cancelAdminJob = async (jobId: string): Promise<{ success: boolean; message: string }> => {
  const res = await api.post<{ success: boolean; message: string }>(`/api/admin/jobs/${jobId}/cancel`);
  return res.data;
};

// =========================================================
// 3. AI Models Catalog
// =========================================================

export const getAdminModels = async (params?: {
  category?: string;
  provider?: string;
}): Promise<AdminAIModelResponse[]> => {
  const res = await api.get<AdminAIModelResponse[]>("/api/admin/models", { params });
  return res.data;
};

export const updateAdminModel = async (
  modelId: number,
  payload: AdminAIModelUpdateRequest
): Promise<AdminAIModelResponse> => {
  const res = await api.put<AdminAIModelResponse>(`/api/admin/models/${modelId}`, payload);
  return res.data;
};

// =========================================================
// 4. Users Management
// =========================================================

export const getAdminUsers = async (params?: {
  limit?: number;
  offset?: number;
  search?: string;
  role?: string;
  is_active?: boolean;
}): Promise<PaginatedResult<AdminUserListItem>> => {
  const res = await api.get<PaginatedResult<AdminUserListItem>>("/api/admin/users", {
    params,
  });
  return res.data;
};

export const getAdminUserDetail = async (userId: number): Promise<AdminUserDetailResponse> => {
  const res = await api.get<AdminUserDetailResponse>(`/api/admin/users/${userId}`);
  return res.data;
};

export const updateAdminUser = async (
  userId: number,
  payload: { role?: string; is_active?: boolean }
): Promise<{ success: boolean; message: string }> => {
  const res = await api.put<{ success: boolean; message: string }>(`/api/admin/users/${userId}`, payload);
  return res.data;
};

export const adjustAdminUserCredits = async (
  userId: number,
  payload: { amount: number; reason: string }
): Promise<{ success: boolean; message: string }> => {
  const res = await api.post<{ success: boolean; message: string }>(
    `/api/admin/users/${userId}/adjust-credits`,
    payload
  );
  return res.data;
};

// =========================================================
// 5. Finance & Payments
// =========================================================

export const getAdminPayments = async (params?: {
  limit?: number;
  offset?: number;
  gateway?: string;
  status?: string;
}): Promise<PaginatedResult<AdminPaymentTransactionResponse>> => {
  const res = await api.get<PaginatedResult<AdminPaymentTransactionResponse>>("/api/admin/payments", {
    params,
  });
  return res.data;
};

export const getAdminPaymentStats = async (): Promise<AdminPaymentStatsResponse> => {
  const res = await api.get<AdminPaymentStatsResponse>("/api/admin/payments/stats");
  return res.data;
};

// =========================================================
// 6. Audit & Activity Logs
// =========================================================

export const getAdminActivityLogs = async (params?: {
  limit?: number;
  offset?: number;
  action?: string;
  user_id?: number;
}): Promise<PaginatedResult<AdminActivityLogResponse>> => {
  const res = await api.get<PaginatedResult<AdminActivityLogResponse>>("/api/admin/logs/activity", {
    params,
  });
  return res.data;
};

export const getAdminCreditLogs = async (params?: {
  limit?: number;
  offset?: number;
  user_id?: number;
}): Promise<PaginatedResult<AdminCreditAuditResponse>> => {
  const res = await api.get<PaginatedResult<AdminCreditAuditResponse>>("/api/admin/logs/credits", {
    params,
  });
  return res.data;
};

// =========================================================
// 7. Contact Messages
// =========================================================

export const getAdminContacts = async (params?: {
  limit?: number;
  offset?: number;
  status?: string;
}): Promise<PaginatedResult<AdminContactMessageResponse>> => {
  const res = await api.get<PaginatedResult<AdminContactMessageResponse>>("/api/admin/contacts", {
    params,
  });
  return res.data;
};

export const updateAdminContactStatus = async (
  contactId: number,
  status: string
): Promise<{ success: boolean; message: string }> => {
  const res = await api.put<{ success: boolean; message: string }>(`/api/admin/contacts/${contactId}/status`, {
    status,
  });
  return res.data;
};

// =========================================================
// 8. Maintenance Tools
// =========================================================

export const getAdminStorage = async (): Promise<AdminStorageStatsResponse> => {
  const res = await api.get<AdminStorageStatsResponse>("/api/admin/tools/storage");
  return res.data;
};

export const runAdminCleanup = async (payload: {
  target: string;
  older_than_days: number;
}): Promise<AdminCleanupResultResponse> => {
  const res = await api.post<AdminCleanupResultResponse>("/api/admin/tools/cleanup", payload);
  return res.data;
};

export const getAdminDatabaseStats = async (): Promise<AdminDatabaseStatsResponse> => {
  const res = await api.get<AdminDatabaseStatsResponse>("/api/admin/tools/database");
  return res.data;
};

export const runAdminDiagnostics = async (): Promise<AdminDiagnosticsResponse> => {
  const res = await api.post<AdminDiagnosticsResponse>("/api/admin/tools/diagnostics");
  return res.data;
};

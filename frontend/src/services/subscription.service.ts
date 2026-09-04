import api from "./api/axios";
import type {
  CreditAuditLogListResponse,
  EffectiveQuota,
  Plan,
  PricingCatalog,
  StorageAddon,
  UserConsumableUsage,
  UserStorageAddon,
  UserSubscriptionSummary,
} from "../types/subscription";

// =========================================================
// Get Pricing Catalog (Public)
// GET /api/subscriptions/catalog
// =========================================================

export const getPricingCatalog = async (): Promise<PricingCatalog> => {
  const response = await api.get<PricingCatalog>("/api/subscriptions/catalog");
  return response.data;
};

// =========================================================
// Get Active Plans (Public)
// GET /api/subscriptions/plans
// =========================================================

export const getPlans = async (): Promise<Plan[]> => {
  const response = await api.get<Plan[]>("/api/subscriptions/plans");
  return response.data;
};

// =========================================================
// Get Single Plan Details (Public)
// GET /api/subscriptions/plans/{id}
// =========================================================

export const getPlan = async (planId: string | number): Promise<Plan> => {
  const response = await api.get<Plan>(`/api/subscriptions/plans/${planId}`);
  return response.data;
};

// =========================================================
// Get Active Storage Add-ons (Public)
// GET /api/subscriptions/addons
// =========================================================

export const getStorageAddons = async (): Promise<StorageAddon[]> => {
  const response = await api.get<StorageAddon[]>("/api/subscriptions/addons");
  return response.data;
};

// =========================================================
// Get Single Storage Add-on Details (Public)
// GET /api/subscriptions/addons/{id}
// =========================================================

export const getStorageAddon = async (addonId: number): Promise<StorageAddon> => {
  const response = await api.get<StorageAddon>(`/api/subscriptions/addons/${addonId}`);
  return response.data;
};

// =========================================================
// Get User Subscription & Quota Summary (Protected)
// GET /api/subscriptions/me
// =========================================================

export const getMySubscriptionSummary = async (): Promise<UserSubscriptionSummary> => {
  const response = await api.get<UserSubscriptionSummary>("/api/subscriptions/me");
  return response.data;
};

// =========================================================
// Get User Effective Quota (Protected)
// GET /api/subscriptions/quota
// =========================================================

export const getMyQuota = async (): Promise<EffectiveQuota> => {
  const response = await api.get<EffectiveQuota>("/api/subscriptions/quota");
  return response.data;
};

// =========================================================
// Get User Consumable Usage (Protected)
// GET /api/subscriptions/usage
// =========================================================

export const getMyUsage = async (): Promise<UserConsumableUsage> => {
  const response = await api.get<UserConsumableUsage>("/api/subscriptions/usage");
  return response.data;
};

// =========================================================
// Get User Active Storage Addons (Protected)
// GET /api/subscriptions/storage-addons
// =========================================================

export const getMyStorageAddons = async (): Promise<UserStorageAddon[]> => {
  const response = await api.get<UserStorageAddon[]>("/api/subscriptions/storage-addons");
  return response.data;
};

// =========================================================
// Get User Credit Audit Logs (Protected)
// GET /api/subscriptions/audit-logs
// =========================================================

export const getMyCreditAuditLogs = async (
  limit: number = 50,
  offset: number = 0
): Promise<CreditAuditLogListResponse> => {
  const response = await api.get<CreditAuditLogListResponse>("/api/subscriptions/audit-logs", {
    params: { limit, offset },
  });
  return response.data;
};

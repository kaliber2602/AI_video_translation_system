import api from "./api/axios";
import type {
  EffectiveQuota,
  Plan,
  PricingCatalog,
  StorageAddon,
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
// Get Active Storage Add-ons (Public)
// GET /api/subscriptions/addons
// =========================================================

export const getStorageAddons = async (): Promise<StorageAddon[]> => {
  const response = await api.get<StorageAddon[]>("/api/subscriptions/addons");
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

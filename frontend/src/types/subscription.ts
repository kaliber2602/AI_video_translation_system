export type BillingCycle = "monthly" | "yearly";

export interface PlanResource {
  id: number;
  plan_id: number;
  resource_type: "STORAGE" | "CONSUMABLE" | "LIMIT" | "FEATURE";
  resource_key: string;
  limit_value: string;
  unit: string | null;
}

export interface Plan {
  id: number;
  code: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  billing_cycle: string;
  is_active: boolean;
  is_popular: boolean;
  display_order: number;
  resources: PlanResource[];
}

export interface StorageAddon {
  id: number;
  code: string;
  name: string;
  storage_bytes: number;
  storage_gb: number;
  price_monthly: number;
  price_yearly: number;
  is_active: boolean;
  display_order: number;
}

export interface UserSubscription {
  id: number;
  user_id: number;
  plan_id: number;
  plan_code: string;
  plan_name: string;
  status: string;
  billing_cycle: string;
  started_at: string;
  expires_at: string | null;
}

export interface UserStorageAddon {
  id: number;
  user_id: number;
  addon_id: number;
  addon_code: string;
  addon_name: string;
  storage_bytes: number;
  status: string;
  started_at: string;
  expires_at: string | null;
}

export interface EffectiveStorage {
  total_bytes: number;
  total_gb: number;
  used_bytes: number;
  used_gb: number;
  included_bytes: number;
  included_gb: number;
  addon_bytes: number;
  addon_gb: number;
  usage_percent: number;
}

export interface EffectiveCredits {
  total_credits: number;
  used_credits: number;
  remaining_credits: number;
  converted_minutes_total: number;
  converted_minutes_used: number;
  converted_minutes_remaining: number;
}

export interface EffectiveQuota {
  storage: EffectiveStorage;
  credits: EffectiveCredits;
  limits: Record<string, any>;
  features: Record<string, boolean>;
}

export interface PricingCatalog {
  plans: Plan[];
  storage_addons: StorageAddon[];
}

export interface UserSubscriptionSummary {
  subscription: UserSubscription | null;
  addons: UserStorageAddon[];
  effective_quota: EffectiveQuota;
}

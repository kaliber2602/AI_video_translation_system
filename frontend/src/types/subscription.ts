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

export interface EffectiveWords {
  total_words: number;
  used_words: number;
  remaining_words: number;
  usage_percent: number;
}

export interface EffectiveQuota {
  storage: EffectiveStorage;
  credits: EffectiveCredits;
  words?: EffectiveWords;
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

export interface UserConsumableUsage {
  user_id: number;
  credits_allocated: number;
  credits_used: number;
  credits_remaining: number;
  words_allocated?: number;
  words_used?: number;
  words_remaining?: number;
  storage_bytes_allocated: number;
  storage_bytes_used: number;
  storage_bytes_remaining: number;
}

export interface CreditAuditLog {
  id: number;
  user_id: number;
  video_id: number | null;
  job_id: string | null;
  service_type: string;
  credits_deducted: number;
  words_deducted?: number;
  balance_after: number | null;
  description: string | null;
  created_at: string;
}

export interface CreditAuditLogListResponse {
  logs: CreditAuditLog[];
  total: number;
}

export interface StorageByTypeItem {
  key: string;
  label: string;
  db_field: string;
  size_bytes: number;
  size_formatted: string;
  size_gb: number;
  percentage: number;
  color: string;
}

export interface ProjectStorageItem {
  project_id: number;
  project_name: string;
  storage_bytes: number;
  storage_formatted: string;
  storage_gb: number;
  video_count: number;
  percentage: number;
}

export interface LargestFileItem {
  id: string;
  filename: string;
  project_id: number;
  project_name: string;
  resource_type: string;
  size_bytes: number;
  size_formatted: string;
  specs: string;
  created_at: string | null;
  download_url: string | null;
  status: string;
}

export interface StorageBreakdownPlanInfo {
  code: string;
  name: string;
  total_bytes: number;
  total_gb: number;
  used_bytes: number;
  used_gb: number;
  available_bytes: number;
  available_gb: number;
  usage_percent: number;
}

export interface CacheSummaryInfo {
  cache_bytes: number;
  cache_formatted: string;
  can_clean: boolean;
}

export interface StorageBreakdownResponse {
  plan: StorageBreakdownPlanInfo;
  storage_by_type: StorageByTypeItem[];
  storage_by_project: ProjectStorageItem[];
  largest_files: LargestFileItem[];
  all_files: LargestFileItem[];
  cache_summary: CacheSummaryInfo;
}

export interface CleanCacheResponse {
  reclaimed_bytes: number;
  reclaimed_formatted: string;
  new_used_bytes: number;
  new_used_gb: number;
  message: string;
}

export interface DeleteStorageFileResponse {
  success: boolean;
  reclaimed_bytes: number;
  message: string;
}


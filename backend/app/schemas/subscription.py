from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class PlanResourceOut(BaseModel):
    id: int
    plan_id: int
    resource_type: str  # STORAGE, CONSUMABLE, LIMIT, FEATURE
    resource_key: str
    limit_value: str
    unit: Optional[str] = None


class PlanOut(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None
    price_monthly: float
    price_yearly: float
    billing_cycle: str = "monthly"
    is_active: bool = True
    is_popular: bool = False
    display_order: int = 0
    resources: List[PlanResourceOut] = []


class StorageAddonOut(BaseModel):
    id: int
    code: str
    name: str
    storage_bytes: int
    storage_gb: float
    price_monthly: float
    price_yearly: float
    is_active: bool = True
    display_order: int = 0


class UserSubscriptionOut(BaseModel):
    id: int
    user_id: int
    plan_id: int
    plan_code: str
    plan_name: str
    status: str
    billing_cycle: str
    started_at: datetime
    expires_at: Optional[datetime] = None


class UserStorageAddonOut(BaseModel):
    id: int
    user_id: int
    addon_id: int
    addon_code: str
    addon_name: str
    storage_bytes: int
    status: str
    started_at: datetime
    expires_at: Optional[datetime] = None


class EffectiveStorageOut(BaseModel):
    total_bytes: int
    total_gb: float
    used_bytes: int
    used_gb: float
    included_bytes: int
    included_gb: float
    addon_bytes: int
    addon_gb: float
    usage_percent: float


class EffectiveCreditsOut(BaseModel):
    total_credits: int
    used_credits: int
    remaining_credits: int
    converted_minutes_total: int
    converted_minutes_used: int
    converted_minutes_remaining: int


class EffectiveWordsOut(BaseModel):
    total_words: int
    used_words: int
    remaining_words: int
    usage_percent: float = 0.0


class EffectiveQuotaOut(BaseModel):
    storage: EffectiveStorageOut
    credits: EffectiveCreditsOut
    words: Optional[EffectiveWordsOut] = None
    limits: Dict[str, Any]
    features: Dict[str, bool]


class PricingCatalogResponse(BaseModel):
    plans: List[PlanOut]
    storage_addons: List[StorageAddonOut]


class UserSubscriptionSummaryResponse(BaseModel):
    subscription: Optional[UserSubscriptionOut] = None
    addons: List[UserStorageAddonOut] = []
    effective_quota: EffectiveQuotaOut


class UserConsumableUsageOut(BaseModel):
    user_id: int
    credits_allocated: int
    credits_used: int
    credits_remaining: int
    storage_bytes_allocated: int
    storage_bytes_used: int
    storage_bytes_remaining: int


class CreditAuditLogOut(BaseModel):
    id: int
    user_id: int
    video_id: Optional[int] = None
    job_id: Optional[str] = None
    service_type: str
    credits_deducted: int
    balance_after: Optional[int] = None
    description: Optional[str] = None
    created_at: datetime


class CreditAuditLogListResponse(BaseModel):
    logs: List[CreditAuditLogOut]
    total: int


class StorageByTypeItem(BaseModel):
    key: str
    label: str
    db_field: str
    size_bytes: int
    size_formatted: str
    size_gb: float
    percentage: float
    color: str


class ProjectStorageItem(BaseModel):
    project_id: int
    project_name: str
    storage_bytes: int
    storage_formatted: str
    storage_gb: float
    video_count: int
    percentage: float


class LargestFileItem(BaseModel):
    id: str
    filename: str
    project_id: int
    project_name: str
    resource_type: str
    size_bytes: int
    size_formatted: str
    specs: str
    created_at: Optional[str] = None
    download_url: Optional[str] = None
    status: str = "ready"


class StorageBreakdownPlanInfo(BaseModel):
    code: str
    name: str
    total_bytes: int
    total_gb: float
    used_bytes: int
    used_gb: float
    available_bytes: int
    available_gb: float
    usage_percent: float


class CacheSummaryInfo(BaseModel):
    cache_bytes: int
    cache_formatted: str
    can_clean: bool


class StorageBreakdownResponse(BaseModel):
    plan: StorageBreakdownPlanInfo
    storage_by_type: List[StorageByTypeItem]
    storage_by_project: List[ProjectStorageItem]
    largest_files: List[LargestFileItem]
    all_files: List[LargestFileItem]
    cache_summary: CacheSummaryInfo


class CleanCacheResponse(BaseModel):
    reclaimed_bytes: int
    reclaimed_formatted: str
    new_used_bytes: int
    new_used_gb: float
    message: str


class DeleteStorageFileResponse(BaseModel):
    success: bool
    reclaimed_bytes: int
    message: str


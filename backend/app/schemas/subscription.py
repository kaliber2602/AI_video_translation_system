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


class EffectiveQuotaOut(BaseModel):
    storage: EffectiveStorageOut
    credits: EffectiveCreditsOut
    limits: Dict[str, Any]
    features: Dict[str, bool]


class PricingCatalogResponse(BaseModel):
    plans: List[PlanOut]
    storage_addons: List[StorageAddonOut]


class UserSubscriptionSummaryResponse(BaseModel):
    subscription: Optional[UserSubscriptionOut] = None
    addons: List[UserStorageAddonOut] = []
    effective_quota: EffectiveQuotaOut

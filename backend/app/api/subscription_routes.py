from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import get_user_id_from_token
from app.schemas.subscription import (
    EffectiveQuotaOut,
    PlanOut,
    PricingCatalogResponse,
    StorageAddonOut,
    UserSubscriptionOut,
    UserStorageAddonOut,
    UserSubscriptionSummaryResponse,
    UserConsumableUsageOut,
    CreditAuditLogListResponse,
)
from app.services.subscription_service import (
    get_active_plans,
    get_plan_by_id_or_code,
    get_pricing_catalog,
    get_storage_addons,
    get_storage_addon_by_id,
    get_user_effective_quota,
    get_user_subscription_summary,
    get_user_active_storage_addons,
    get_user_usage_details,
    get_user_credit_audit_logs,
)

router = APIRouter(
    prefix="/subscriptions",
    tags=["Subscriptions & Quotas"],
)

bearer_scheme = HTTPBearer(auto_error=False)


def get_optional_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[int]:
    if not credentials:
        return None
    try:
        return get_user_id_from_token(credentials.credentials, "access")
    except Exception:
        return None


def get_required_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> int:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is required.",
        )
    try:
        return get_user_id_from_token(credentials.credentials, "access")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
        )


# =========================================================
# Public Catalog & Plans Endpoints
# =========================================================

@router.get(
    "/catalog",
    response_model=PricingCatalogResponse,
    summary="Get complete pricing catalog (Plans & Storage Add-ons)",
)
def get_catalog_endpoint():
    return get_pricing_catalog()


@router.get(
    "/plans",
    response_model=List[PlanOut],
    summary="List all active subscription plans with full limits and features",
)
def get_plans_endpoint():
    return get_active_plans()


@router.get(
    "/plans/{plan_id}",
    response_model=PlanOut,
    summary="Get details and resource breakdown of a specific plan",
)
def get_plan_detail_endpoint(plan_id: str):
    plan = get_plan_by_id_or_code(plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription plan '{plan_id}' not found.",
        )
    return plan


@router.get(
    "/addons",
    response_model=List[StorageAddonOut],
    summary="List all active storage add-ons (+50GB, +200GB, +500GB, +1TB)",
)
def get_addons_endpoint():
    return get_storage_addons()


@router.get(
    "/addons/{addon_id}",
    response_model=StorageAddonOut,
    summary="Get details of a specific storage add-on",
)
def get_addon_detail_endpoint(addon_id: int):
    addon = get_storage_addon_by_id(addon_id)
    if not addon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Storage addon ID {addon_id} not found.",
        )
    return addon


# =========================================================
# Authenticated User Subscription & Quota Endpoints
# =========================================================

@router.get(
    "/me",
    response_model=UserSubscriptionSummaryResponse,
    summary="Get current user's active subscription, active add-ons, and calculated quota",
)
def get_my_subscription_endpoint(
    user_id: int = Depends(get_required_current_user_id),
):
    return get_user_subscription_summary(user_id)


@router.get(
    "/quota",
    response_model=EffectiveQuotaOut,
    summary="Get calculated effective storage, AI credits balance, and runtime limits",
)
def get_my_quota_endpoint(
    user_id: int = Depends(get_required_current_user_id),
):
    return get_user_effective_quota(user_id)


@router.get(
    "/usage",
    response_model=UserConsumableUsageOut,
    summary="Get detailed consumable AI credits and storage bytes usage",
)
def get_my_usage_endpoint(
    user_id: int = Depends(get_required_current_user_id),
):
    return get_user_usage_details(user_id)


@router.get(
    "/storage-addons",
    response_model=List[UserStorageAddonOut],
    summary="Get list of current user's active storage add-ons",
)
def get_my_storage_addons_endpoint(
    user_id: int = Depends(get_required_current_user_id),
):
    return get_user_active_storage_addons(user_id)


@router.get(
    "/audit-logs",
    response_model=CreditAuditLogListResponse,
    summary="Get user's AI credits deduction and allocation audit trail logs",
)
def get_my_audit_logs_endpoint(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user_id: int = Depends(get_required_current_user_id),
):
    logs, total = get_user_credit_audit_logs(user_id=user_id, limit=limit, offset=offset)
    return {"logs": logs, "total": total}

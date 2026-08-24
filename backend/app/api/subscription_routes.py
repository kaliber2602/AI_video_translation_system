from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import get_user_id_from_token
from app.schemas.subscription import (
    EffectiveQuotaOut,
    PlanOut,
    PricingCatalogResponse,
    StorageAddonOut,
    UserSubscriptionSummaryResponse,
)
from app.services.subscription_service import (
    get_active_plans,
    get_pricing_catalog,
    get_storage_addons,
    get_user_effective_quota,
    get_user_subscription_summary,
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
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return get_user_id_from_token(credentials.credentials, "access")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


# =========================================================
# Public Catalog & Pricing Endpoints
# =========================================================

@router.get(
    "/catalog",
    response_model=PricingCatalogResponse,
    summary="Get complete pricing catalog with plans, resources and storage add-ons",
)
def get_catalog():
    """
    Public endpoint providing all available subscription plans with their categorized resources
    and storage add-on packages.
    """
    return get_pricing_catalog()


@router.get(
    "/plans",
    response_model=List[PlanOut],
    summary="Get active subscription plans",
)
def get_plans():
    return get_active_plans()


@router.get(
    "/addons",
    response_model=List[StorageAddonOut],
    summary="Get active storage add-ons",
)
def get_addons():
    return get_storage_addons()


# =========================================================
# User Subscription & Effective Quota
# =========================================================

@router.get(
    "/me",
    response_model=UserSubscriptionSummaryResponse,
    summary="Get current user subscription, active add-ons and effective quota",
)
def get_current_user_subscription(
    user_id: int = Depends(get_required_current_user_id),
):
    return get_user_subscription_summary(user_id)


@router.get(
    "/quota",
    response_model=EffectiveQuotaOut,
    summary="Get current user effective resource quota",
)
def get_current_user_quota(
    user_id: int = Depends(get_required_current_user_id),
):
    return get_user_effective_quota(user_id)

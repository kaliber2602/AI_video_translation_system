# app/api/payment_routes.py - Clean VNPay Payment Routes (Zero Stripe / Demo)
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import get_user_id_from_token
from app.schemas.payment import (
    CreatePaymentTransactionRequest,
    PaymentTransactionResponse,
    PaymentTransactionListResponse,
    VNPayReturnResponse,
)
from app.services.payment_service import (
    create_payment_transaction,
    process_vnpay_return,
    get_user_transactions,
    get_transaction_by_id,
    get_payment_provider,
)

router = APIRouter(
    prefix="/payments",
    tags=["Payments & Transactions"],
)

bearer_scheme = HTTPBearer(auto_error=False)


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
# Payment Transactions Endpoints
# =========================================================

@router.post(
    "/transactions",
    response_model=PaymentTransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a pending payment transaction for Plan Upgrade or Storage Add-on",
)
def create_transaction_endpoint(
    body: CreatePaymentTransactionRequest,
    request: Request,
    user_id: int = Depends(get_required_current_user_id),
):
    """
    Creates a new pending payment transaction.
    The exact amount is fetched server-side from database seeds/tables based on the billing cycle.
    If payment_method is VNPAY, signed checkout URL is attached in metadata.payment_url.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    txn = create_payment_transaction(
        user_id=user_id,
        product_type=body.product_type,
        product_id=body.product_id,
        billing_cycle=body.billing_cycle,
        payment_method="VNPAY",
        client_ip=client_ip,
    )
    return txn


@router.get(
    "/transactions",
    response_model=PaymentTransactionListResponse,
    summary="List current user's payment transaction history",
)
def get_my_transactions_endpoint(
    status: Optional[str] = Query(default=None, description="pending, completed, failed, cancelled"),
    product_type: Optional[str] = Query(default=None, description="PLAN, STORAGE_ADDON"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user_id: int = Depends(get_required_current_user_id),
):
    transactions, total = get_user_transactions(
        user_id=user_id,
        status=status,
        product_type=product_type,
        limit=limit,
        offset=offset,
    )
    return {"transactions": transactions, "total": total}


@router.get(
    "/transactions/{transaction_id}",
    response_model=PaymentTransactionResponse,
    summary="Get single payment transaction detail by ID or Transaction Code",
)
def get_transaction_detail_endpoint(
    transaction_id: str,
    user_id: int = Depends(get_required_current_user_id),
):
    txn = get_transaction_by_id(transaction_id, user_id=user_id)
    if not txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment transaction not found.",
        )
    return txn


# =========================================================
# Gateway Return Interfaces (VNPay)
# =========================================================

@router.get(
    "/vnpay/return",
    response_model=VNPayReturnResponse,
    summary="VNPay return URL handler (Verifies HMAC-SHA512 and activates subscription)",
)
def vnpay_return_endpoint(request: Request):
    """
    Return URL endpoint for VNPay redirects.
    Validates HMAC-SHA512 checksum and atomically updates payment + subscription status.
    """
    query_params = dict(request.query_params)
    vnp_provider = get_payment_provider("VNPAY")

    if not hasattr(vnp_provider, "is_active") or not vnp_provider.is_active():
        return {
            "status": "inactive",
            "message": "VNPay integration credentials not configured in environment.",
            "transaction_code": query_params.get("vnp_TxnRef"),
            "is_active": False,
            "is_success": False,
        }

    result = process_vnpay_return(query_params)
    return {
        "status": result["transaction"]["status"] if result.get("transaction") else ("completed" if result["is_success"] else "failed"),
        "message": result["message"],
        "transaction_code": query_params.get("vnp_TxnRef"),
        "is_active": True,
        "is_success": result["is_success"],
        "amount_vnd": float(query_params.get("vnp_Amount", 0)) / 100 if query_params.get("vnp_Amount") else None,
        "transaction": result.get("transaction"),
    }

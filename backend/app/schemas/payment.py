# app/schemas/payment.py - Clean VNPay Payment Schemas (Zero Stripe / Demo)
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CreatePaymentTransactionRequest(BaseModel):
    product_type: str = Field(..., description="PLAN or STORAGE_ADDON")
    product_id: int = Field(..., description="ID of the plan or storage addon")
    billing_cycle: str = Field(default="monthly", description="monthly or yearly")
    payment_method: str = Field(default="VNPAY", description="VNPAY payment gateway")


class PaymentTransactionResponse(BaseModel):
    id: int
    user_id: int
    transaction_code: str
    amount: float
    currency: str = "VND"
    payment_method: str
    status: str  # pending, completed, failed, cancelled, expired
    product_type: Optional[str] = None
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    billing_cycle: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime


class PaymentTransactionListResponse(BaseModel):
    transactions: List[PaymentTransactionResponse]
    total: int


class VNPayReturnResponse(BaseModel):
    status: str
    message: str
    transaction_code: Optional[str] = None
    is_active: bool = False
    is_success: Optional[bool] = None
    amount_vnd: Optional[float] = None
    transaction: Optional[PaymentTransactionResponse] = None

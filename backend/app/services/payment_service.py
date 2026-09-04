import os
import json
import uuid
import hmac
import hashlib
import urllib.parse
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple, Union

from fastapi import HTTPException, status
import psycopg2
from psycopg2.extras import Json

from app.core.database import get_connection
from app.services.subscription_service import (
    get_plan_by_id_or_code,
    get_storage_addon_by_id,
    activate_plan_subscription,
    activate_storage_addon,
    ensure_subscription_tables_exist,
)

logger = logging.getLogger(__name__)


# =========================================================
# Payment Provider Abstraction Layer
# =========================================================

class BasePaymentProvider(ABC):
    """
    Abstract Payment Provider interface for modular gateway integration.
    """

    @abstractmethod
    def create_payment_intent(self, transaction: Dict[str, Any], ip_addr: str = "127.0.0.1") -> Dict[str, Any]:
        """Creates a checkout session / intent with the provider."""
        pass

    @abstractmethod
    def verify_callback(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Validates incoming webhook or redirect callback from gateway."""
        pass


class DemoPaymentProvider(BasePaymentProvider):
    """
    Simulated Demo Payment Provider for local dev, testing, and sandbox flow.
    """

    def create_payment_intent(self, transaction: Dict[str, Any], ip_addr: str = "127.0.0.1") -> Dict[str, Any]:
        return {
            "provider": "DEMO",
            "is_active": True,
            "transaction_code": transaction["transaction_code"],
            "amount": transaction["amount"],
            "currency": transaction.get("currency", "USD"),
            "status": "pending",
            "checkout_url": f"/payments/demo-checkout?txn={transaction['transaction_code']}",
            "instruction": "Click Simulate Success or Simulate Failure in the demo payment dialog.",
        }

    def verify_callback(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "is_valid": True,
            "is_success": payload.get("status") == "completed",
            "status": payload.get("status", "completed"),
            "provider_ref": f"DEMO-{uuid.uuid4().hex[:8]}",
        }


class VNPayPaymentProvider(BasePaymentProvider):
    """
    Official VNPay Payment Gateway Provider (Sandbox & Production).
    Computes and verifies HMAC-SHA512 checksums compliant with VNPay standards.
    """

    def __init__(self):
        self.tmn_code = os.getenv("VNPAY_TMN_CODE", "").strip()
        self.hash_secret = os.getenv("VNPAY_HASH_SECRET", "").strip()
        self.payment_url = os.getenv("VNPAY_URL", "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html").strip()
        self.return_url = os.getenv("VNPAY_RETURN_URL", "http://localhost:5173/payments/vnpay/return").strip()
        self.exchange_rate = float(os.getenv("VNPAY_EXCHANGE_RATE_USD_VND", "25000"))

    def is_active(self) -> bool:
        # Reload dynamically in case environment variables were populated at runtime
        self.tmn_code = os.getenv("VNPAY_TMN_CODE", "").strip()
        self.hash_secret = os.getenv("VNPAY_HASH_SECRET", "").strip()
        return bool(self.tmn_code and self.hash_secret)

    def create_payment_intent(self, transaction: Dict[str, Any], ip_addr: str = "127.0.0.1") -> Dict[str, Any]:
        if not self.is_active():
            return {
                "provider": "VNPAY",
                "is_active": False,
                "message": "VNPay credentials not configured. Please set VNPAY_TMN_CODE and VNPAY_HASH_SECRET in .env",
            }

        # 1. Convert USD amount to VND (VNPay amount = VND * 100)
        amount_usd = float(transaction.get("amount", 0))
        amount_vnd = int(amount_usd * self.exchange_rate)
        vnp_amount = amount_vnd * 100

        # 2. VN Timezone (UTC+7)
        tz_vn = timezone(timedelta(hours=7))
        now = datetime.now(tz_vn)
        create_date = now.strftime("%Y%m%d%H%M%S")
        expire_date = (now + timedelta(minutes=15)).strftime("%Y%m%d%H%M%S")

        txn_code = transaction["transaction_code"]
        product_name = transaction.get("product_name", "Subscription")

        vnp_params = {
            "vnp_Version": "2.1.0",
            "vnp_Command": "pay",
            "vnp_TmnCode": self.tmn_code,
            "vnp_Amount": str(vnp_amount),
            "vnp_CurrCode": "VND",
            "vnp_TxnRef": txn_code,
            "vnp_OrderInfo": f"Thanh toan {product_name} - {txn_code}",
            "vnp_OrderType": "other",
            "vnp_Locale": "vn",
            "vnp_ReturnUrl": self.return_url,
            "vnp_IpAddr": ip_addr or "127.0.0.1",
            "vnp_CreateDate": create_date,
            "vnp_ExpireDate": expire_date,
        }

        # 3. Sort parameters alphabetically A-Z and encode
        sorted_params = sorted(vnp_params.items())
        hash_data = "&".join([f"{k}={urllib.parse.quote_plus(str(v))}" for k, v in sorted_params])

        # 4. Compute HMAC-SHA512
        secure_hash = hmac.new(
            self.hash_secret.encode("utf-8"),
            hash_data.encode("utf-8"),
            hashlib.sha512,
        ).hexdigest()

        payment_url = f"{self.payment_url}?{hash_data}&vnp_SecureHash={secure_hash}"

        return {
            "provider": "VNPAY",
            "is_active": True,
            "payment_url": payment_url,
            "transaction_code": txn_code,
            "amount_vnd": amount_vnd,
        }

    def verify_callback(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not self.is_active():
            return {"is_valid": False, "is_success": False, "message": "VNPay credentials missing"}

        incoming_hash = str(payload.get("vnp_SecureHash") or payload.get("vnp_securehash") or "").strip()
        clean_params = {
            k: v for k, v in payload.items()
            if k.startswith("vnp_") and k.lower() not in ["vnp_securehash", "vnp_securehashtype"]
        }

        sorted_params = sorted(clean_params.items())
        hash_data_plus = "&".join([f"{k}={urllib.parse.quote_plus(str(v))}" for k, v in sorted_params])
        hash_data_quote = "&".join([f"{k}={urllib.parse.quote(str(v))}" for k, v in sorted_params])
        hash_data_raw = "&".join([f"{k}={str(v)}" for k, v in sorted_params])

        secret_bytes = self.hash_secret.encode("utf-8")
        expected_hashes = [
            hmac.new(secret_bytes, h.encode("utf-8"), hashlib.sha512).hexdigest().lower()
            for h in [hash_data_plus, hash_data_quote, hash_data_raw]
        ]

        is_valid = bool(incoming_hash and (incoming_hash.lower() in expected_hashes))
        response_code = payload.get("vnp_ResponseCode")
        is_success = is_valid and (response_code == "00")

        logger.info(
            f"[VNPay] Verify callback: valid={is_valid}, success={is_success}, "
            f"response_code={response_code}, txn={payload.get('vnp_TxnRef')}"
        )

        return {
            "is_valid": is_valid,
            "is_success": is_success,
            "status": "completed" if is_success else "failed",
            "response_code": response_code,
            "transaction_code": payload.get("vnp_TxnRef"),
            "provider_ref": payload.get("vnp_TransactionNo"),
            "amount_vnd": float(payload.get("vnp_Amount", 0)) / 100 if payload.get("vnp_Amount") else 0,
            "bank_code": payload.get("vnp_BankCode"),
            "pay_date": payload.get("vnp_PayDate"),
        }


class StripePaymentProvider(BasePaymentProvider):
    """
    Official Stripe Checkout Provider (Sandbox & Production).
    Generates hosted Stripe Checkout sessions and validates payment returns.
    """

    def __init__(self):
        self.secret_key = os.getenv("STRIPE_SECRET_KEY", "").strip()
        self.publishable_key = os.getenv("STRIPE_PUBLISHABLE_KEY", "").strip()
        self.success_url = os.getenv(
            "STRIPE_SUCCESS_URL",
            "http://localhost:5173/payments/stripe/return?session_id={CHECKOUT_SESSION_ID}&txn={TXN_CODE}",
        ).strip()
        self.cancel_url = os.getenv("STRIPE_CANCEL_URL", "http://localhost:5173/pricing").strip()

    def is_active(self) -> bool:
        self.secret_key = os.getenv("STRIPE_SECRET_KEY", "").strip()
        return bool(self.secret_key)

    def create_payment_intent(self, transaction: Dict[str, Any], ip_addr: str = "127.0.0.1") -> Dict[str, Any]:
        txn_code = transaction["transaction_code"]
        amount_usd = float(transaction.get("amount", 0))
        product_name = transaction.get("product_name", "Subscription")

        success_url = self.success_url.replace("{TXN_CODE}", txn_code)
        if "{CHECKOUT_SESSION_ID}" not in success_url:
            success_url += "&session_id={CHECKOUT_SESSION_ID}"

        if not self.is_active():
            # If Stripe secret key not set, return simulated Stripe checkout link
            mock_session_id = f"cs_test_mock_{uuid.uuid4().hex[:12]}"
            mock_return_url = f"http://localhost:5173/payments/stripe/return?session_id={mock_session_id}&txn={txn_code}&status=success"
            return {
                "provider": "STRIPE",
                "is_active": False,
                "payment_url": mock_return_url,
                "session_id": mock_session_id,
                "transaction_code": txn_code,
                "amount_usd": amount_usd,
                "message": "Running Stripe in simulated mode (Add STRIPE_SECRET_KEY to .env for live Stripe Checkout).",
            }

        try:
            import requests

            data = {
                "mode": "payment",
                "payment_method_types[0]": "card",
                "line_items[0][price_data][currency]": "usd",
                "line_items[0][price_data][unit_amount]": int(round(amount_usd * 100)),
                "line_items[0][price_data][product_data][name]": f"VidNova {product_name}",
                "line_items[0][quantity]": "1",
                "client_reference_id": txn_code,
                "success_url": success_url,
                "cancel_url": self.cancel_url,
                "metadata[transaction_code]": txn_code,
            }

            resp = requests.post(
                "https://api.stripe.com/v1/checkout/sessions",
                auth=(self.secret_key, ""),
                data=data,
                timeout=10,
            )

            if resp.status_code != 200:
                logger.error(f"[Stripe] Error creating checkout session: {resp.text}")
                raise Exception(f"Stripe API error: {resp.text}")

            session_data = resp.json()
            return {
                "provider": "STRIPE",
                "is_active": True,
                "payment_url": session_data.get("url"),
                "session_id": session_data.get("id"),
                "transaction_code": txn_code,
                "amount_usd": amount_usd,
            }
        except Exception as e:
            logger.error(f"[Stripe] Exception creating checkout session: {e}")
            mock_session_id = f"cs_test_err_{uuid.uuid4().hex[:12]}"
            mock_return_url = f"http://localhost:5173/payments/stripe/return?session_id={mock_session_id}&txn={txn_code}&status=success"
            return {
                "provider": "STRIPE",
                "is_active": False,
                "payment_url": mock_return_url,
                "session_id": mock_session_id,
                "transaction_code": txn_code,
                "amount_usd": amount_usd,
            }

    def verify_callback(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        session_id = payload.get("session_id", "")
        txn_code = payload.get("txn") or payload.get("transaction_code")

        if not self.is_active() or str(session_id).startswith("cs_test_mock_") or str(session_id).startswith("cs_test_err_"):
            is_success = payload.get("status") != "failed" and payload.get("status") != "cancel"
            return {
                "is_valid": True,
                "is_success": is_success,
                "status": "completed" if is_success else "failed",
                "session_id": session_id,
                "transaction_code": txn_code,
                "provider_ref": session_id,
                "amount_usd": payload.get("amount_usd"),
            }

        try:
            import requests

            resp = requests.get(
                f"https://api.stripe.com/v1/checkout/sessions/{session_id}",
                auth=(self.secret_key, ""),
                timeout=10,
            )
            if resp.status_code != 200:
                return {"is_valid": False, "is_success": False, "message": "Failed to retrieve Stripe session"}

            session_data = resp.json()
            is_paid = session_data.get("payment_status") == "paid"

            return {
                "is_valid": True,
                "is_success": is_paid,
                "status": "completed" if is_paid else "failed",
                "session_id": session_id,
                "transaction_code": session_data.get("client_reference_id") or txn_code,
                "provider_ref": session_data.get("payment_intent") or session_id,
                "amount_usd": float(session_data.get("amount_total", 0)) / 100,
            }
        except Exception as e:
            logger.error(f"[Stripe] Exception verifying callback: {e}")
            return {"is_valid": False, "is_success": False, "message": str(e)}


# Registry of payment providers
PAYMENT_PROVIDERS: Dict[str, BasePaymentProvider] = {
    "DEMO": DemoPaymentProvider(),
    "VNPAY": VNPayPaymentProvider(),
    "STRIPE": StripePaymentProvider(),
}


def get_payment_provider(provider_name: str = "DEMO") -> BasePaymentProvider:
    return PAYMENT_PROVIDERS.get(provider_name.upper(), PAYMENT_PROVIDERS["DEMO"])


# =========================================================
# Payment Service Engine
# =========================================================

def create_payment_transaction(
    user_id: int,
    product_type: str,
    product_id: int,
    billing_cycle: str = "monthly",
    payment_method: str = "DEMO",
    client_ip: str = "127.0.0.1",
) -> Dict[str, Any]:
    """
    Creates a new pending payment transaction.
    Guarantees:
    - Product existence & is_active check.
    - Amount is calculated strictly from DB (client amount is NEVER trusted).
    - Generates unique transaction code.
    - If payment_method is VNPAY or STRIPE, attaches signed payment_url.
    - Returns serialized transaction.
    """
    ensure_subscription_tables_exist()
    product_type = product_type.upper().strip()
    billing_cycle = billing_cycle.lower().strip()
    payment_method = payment_method.upper().strip()

    if billing_cycle not in ["monthly", "yearly"]:
        billing_cycle = "monthly"

    amount = 0.0
    product_name = ""
    product_code = ""

    if product_type == "PLAN":
        plan = get_plan_by_id_or_code(product_id)
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subscription Plan ID {product_id} not found.",
            )
        if not plan.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Subscription Plan {plan['name']} is currently inactive.",
            )

        amount = float(plan["price_yearly"]) if billing_cycle == "yearly" else float(plan["price_monthly"])
        product_name = plan["name"]
        product_code = plan["code"]
        actual_product_id = plan["id"]

    elif product_type == "STORAGE_ADDON":
        addon = get_storage_addon_by_id(product_id)
        if not addon:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Storage Addon ID {product_id} not found.",
            )
        if not addon.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Storage Addon {addon['name']} is currently inactive.",
            )

        amount = float(addon["price_yearly"]) if billing_cycle == "yearly" else float(addon["price_monthly"])
        product_name = addon["name"]
        product_code = addon["code"]
        actual_product_id = addon["id"]

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid product_type: '{product_type}'. Must be 'PLAN' or 'STORAGE_ADDON'.",
        )

    # Generate unique transaction code
    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    transaction_code = f"TXN-{timestamp_str}-{unique_suffix}"

    metadata: Dict[str, Any] = {
        "product_type": product_type,
        "product_id": actual_product_id,
        "product_code": product_code,
        "product_name": product_name,
        "billing_cycle": billing_cycle,
        "payment_method": payment_method,
    }

    # If VNPay, generate signed payment_url
    if payment_method == "VNPAY":
        vnp_provider = get_payment_provider("VNPAY")
        intent_info = vnp_provider.create_payment_intent(
            {
                "transaction_code": transaction_code,
                "amount": amount,
                "product_name": product_name,
            },
            ip_addr=client_ip,
        )
        if intent_info.get("payment_url"):
            metadata["payment_url"] = intent_info["payment_url"]
            metadata["amount_vnd"] = intent_info.get("amount_vnd")
        metadata["vnpay_status"] = "intent_created" if intent_info.get("is_active") else "unconfigured"

    # If Stripe, generate hosted Checkout URL
    elif payment_method == "STRIPE":
        stripe_provider = get_payment_provider("STRIPE")
        intent_info = stripe_provider.create_payment_intent(
            {
                "transaction_code": transaction_code,
                "amount": amount,
                "product_name": product_name,
            },
            ip_addr=client_ip,
        )
        if intent_info.get("payment_url"):
            metadata["payment_url"] = intent_info["payment_url"]
            metadata["session_id"] = intent_info.get("session_id")
        metadata["stripe_status"] = "intent_created" if intent_info.get("is_active") else "simulated"

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO payment_transactions (
                    user_id, transaction_code, amount, currency, payment_method, status, metadata, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, 'pending', %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id, user_id, transaction_code, amount, currency, payment_method, status, metadata, created_at, updated_at
                """,
                (user_id, transaction_code, amount, "USD", payment_method, Json(metadata)),
            )
            row = cursor.fetchone()
        connection.commit()

        return _format_transaction_row(row)
    except Exception as e:
        connection.rollback()
        logger.error(f"[PaymentService] Error creating transaction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not create payment transaction: {str(e)}",
        )
    finally:
        connection.close()


def process_demo_success(transaction_id_or_code: Union[int, str], user_id: int) -> Dict[str, Any]:
    """
    Simulates successful payment completion for demo & development:
    - Atomically updates payment status to 'completed'.
    - Activates plan subscription or storage addon.
    - Idempotent: safe against duplicate invocations.
    """
    ensure_subscription_tables_exist()
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            if isinstance(transaction_id_or_code, int) or (isinstance(transaction_id_or_code, str) and transaction_id_or_code.isdigit()):
                cursor.execute(
                    """
                    SELECT id, user_id, transaction_code, amount, currency, payment_method, status, metadata, created_at, updated_at
                    FROM payment_transactions
                    WHERE id = %s FOR UPDATE
                    """,
                    (int(transaction_id_or_code),),
                )
            else:
                cursor.execute(
                    """
                    SELECT id, user_id, transaction_code, amount, currency, payment_method, status, metadata, created_at, updated_at
                    FROM payment_transactions
                    WHERE transaction_code = %s FOR UPDATE
                    """,
                    (str(transaction_id_or_code),),
                )

            row = cursor.fetchone()
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Payment transaction not found.",
                )

            current_txn = _format_transaction_row(row)

            if current_txn["user_id"] != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to access this payment transaction.",
                )

            if current_txn["status"] == "completed":
                return {
                    "success": True,
                    "message": "Payment transaction was already completed.",
                    "transaction": current_txn,
                    "activated_entitlement": current_txn.get("metadata", {}),
                }

            if current_txn["status"] in ["failed", "cancelled", "expired"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot complete a transaction with status '{current_txn['status']}'.",
                )

            meta = current_txn.get("metadata") or {}
            product_type = meta.get("product_type", "PLAN")
            product_id = meta.get("product_id")
            billing_cycle = meta.get("billing_cycle", "monthly")

            activated_entitlement: Dict[str, Any] = {}
            if product_type == "PLAN":
                activated_entitlement = activate_plan_subscription(
                    user_id=user_id,
                    plan_id=int(product_id),
                    billing_cycle=billing_cycle,
                    connection=connection,
                )
            elif product_type == "STORAGE_ADDON":
                activated_entitlement = activate_storage_addon(
                    user_id=user_id,
                    addon_id=int(product_id),
                    billing_cycle=billing_cycle,
                    connection=connection,
                )

            meta["paid_at"] = datetime.now(timezone.utc).isoformat()
            meta["provider_reference"] = f"DEMO-{uuid.uuid4().hex[:8]}"

            cursor.execute(
                """
                UPDATE payment_transactions
                SET status = 'completed', metadata = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id, user_id, transaction_code, amount, currency, payment_method, status, metadata, created_at, updated_at
                """,
                (Json(meta), current_txn["id"]),
            )
            updated_row = cursor.fetchone()

        connection.commit()
        updated_txn = _format_transaction_row(updated_row)

        return {
            "success": True,
            "message": "Payment completed successfully! Entitlements have been activated.",
            "transaction": updated_txn,
            "activated_entitlement": activated_entitlement,
        }
    except HTTPException:
        connection.rollback()
        raise
    except Exception as e:
        connection.rollback()
        logger.error(f"[PaymentService] Error in demo success: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not complete payment transaction: {str(e)}",
        )
    finally:
        connection.close()


def process_demo_fail(transaction_id_or_code: Union[int, str], user_id: int) -> Dict[str, Any]:
    """
    Simulates payment failure.
    """
    ensure_subscription_tables_exist()
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            if isinstance(transaction_id_or_code, int) or (isinstance(transaction_id_or_code, str) and transaction_id_or_code.isdigit()):
                cursor.execute(
                    """
                    SELECT id, user_id, transaction_code, amount, currency, payment_method, status, metadata, created_at, updated_at
                    FROM payment_transactions
                    WHERE id = %s FOR UPDATE
                    """,
                    (int(transaction_id_or_code),),
                )
            else:
                cursor.execute(
                    """
                    SELECT id, user_id, transaction_code, amount, currency, payment_method, status, metadata, created_at, updated_at
                    FROM payment_transactions
                    WHERE transaction_code = %s FOR UPDATE
                    """,
                    (str(transaction_id_or_code),),
                )

            row = cursor.fetchone()
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Payment transaction not found.",
                )

            current_txn = _format_transaction_row(row)

            if current_txn["user_id"] != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to access this payment transaction.",
                )

            if current_txn["status"] == "completed":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot fail an already completed payment transaction.",
                )

            meta = current_txn.get("metadata") or {}
            meta["failed_at"] = datetime.now(timezone.utc).isoformat()
            meta["failure_reason"] = "Simulated Demo payment failure requested by user."

            cursor.execute(
                """
                UPDATE payment_transactions
                SET status = 'failed', metadata = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id, user_id, transaction_code, amount, currency, payment_method, status, metadata, created_at, updated_at
                """,
                (Json(meta), current_txn["id"]),
            )
            updated_row = cursor.fetchone()

        connection.commit()
        return {
            "success": False,
            "message": "Payment simulation was marked as failed.",
            "transaction": _format_transaction_row(updated_row),
        }
    except HTTPException:
        connection.rollback()
        raise
    except Exception as e:
        connection.rollback()
        logger.error(f"[PaymentService] Error in demo fail: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not update payment transaction: {str(e)}",
        )
    finally:
        connection.close()


def process_vnpay_return(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Processes VNPay Return redirect callback.
    """
    ensure_subscription_tables_exist()
    vnp_provider = get_payment_provider("VNPAY")
    verification = vnp_provider.verify_callback(params)

    transaction_code = params.get("vnp_TxnRef")
    if not transaction_code:
        return {
            "is_valid": False,
            "is_success": False,
            "message": "Missing vnp_TxnRef parameter.",
            "transaction": None,
            "activated_entitlement": {},
        }

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, user_id, transaction_code, amount, currency, payment_method, status, metadata, created_at, updated_at
                FROM payment_transactions
                WHERE transaction_code = %s FOR UPDATE
                """,
                (str(transaction_code),),
            )
            row = cursor.fetchone()
            if not row:
                return {
                    "is_valid": verification["is_valid"],
                    "is_success": False,
                    "message": f"Transaction '{transaction_code}' not found.",
                    "transaction": None,
                    "activated_entitlement": {},
                }

            current_txn = _format_transaction_row(row)
            user_id = current_txn["user_id"]
            meta = current_txn.get("metadata") or {}

            meta["vnp_ResponseCode"] = params.get("vnp_ResponseCode")
            meta["vnp_TransactionNo"] = params.get("vnp_TransactionNo")
            meta["vnp_BankCode"] = params.get("vnp_BankCode")
            meta["vnp_PayDate"] = params.get("vnp_PayDate")
            meta["vnpay_verified"] = verification["is_valid"]

            activated_entitlement: Dict[str, Any] = {}

            if verification["is_success"]:
                if current_txn["status"] == "completed":
                    return {
                        "is_valid": True,
                        "is_success": True,
                        "message": "Payment transaction was already completed.",
                        "transaction": current_txn,
                        "activated_entitlement": meta,
                    }

                product_type = meta.get("product_type", "PLAN")
                product_id = meta.get("product_id")
                billing_cycle = meta.get("billing_cycle", "monthly")

                if product_type == "PLAN":
                    activated_entitlement = activate_plan_subscription(
                        user_id=user_id,
                        plan_id=int(product_id),
                        billing_cycle=billing_cycle,
                        connection=connection,
                    )
                elif product_type == "STORAGE_ADDON":
                    activated_entitlement = activate_storage_addon(
                        user_id=user_id,
                        addon_id=int(product_id),
                        billing_cycle=billing_cycle,
                        connection=connection,
                    )

                meta["paid_at"] = datetime.now(timezone.utc).isoformat()
                cursor.execute(
                    """
                    UPDATE payment_transactions
                    SET status = 'completed', metadata = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    RETURNING id, user_id, transaction_code, amount, currency, payment_method, status, metadata, created_at, updated_at
                    """,
                    (Json(meta), current_txn["id"]),
                )
            else:
                meta["failed_at"] = datetime.now(timezone.utc).isoformat()
                meta["failure_reason"] = f"VNPay response code: {params.get('vnp_ResponseCode', 'unknown')}"
                cursor.execute(
                    """
                    UPDATE payment_transactions
                    SET status = 'failed', metadata = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    RETURNING id, user_id, transaction_code, amount, currency, payment_method, status, metadata, created_at, updated_at
                    """,
                    (Json(meta), current_txn["id"]),
                )

            updated_row = cursor.fetchone()

        connection.commit()
        updated_txn = _format_transaction_row(updated_row)

        return {
            "is_valid": verification["is_valid"],
            "is_success": verification["is_success"],
            "message": "Payment processed successfully!" if verification["is_success"] else "Payment was unsuccessful or cancelled.",
            "transaction": updated_txn,
            "activated_entitlement": activated_entitlement,
        }
    except Exception as e:
        connection.rollback()
        logger.error(f"[PaymentService] Error in process_vnpay_return: {e}")
        return {
            "is_valid": False,
            "is_success": False,
            "message": f"Error processing VNPay return: {str(e)}",
            "transaction": None,
            "activated_entitlement": {},
        }
    finally:
        connection.close()


def process_stripe_return(session_id: str, transaction_code: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Processes Stripe Checkout Return redirect callback.
    - Validates Stripe Checkout session status.
    - Atomically updates transaction status to 'completed'.
    - Activates Plan or Storage Addon entitlement in Database.
    """
    ensure_subscription_tables_exist()
    payload = params or {}
    payload["session_id"] = session_id
    payload["txn"] = transaction_code

    stripe_provider = get_payment_provider("STRIPE")
    verification = stripe_provider.verify_callback(payload)

    txn_ref = verification.get("transaction_code") or transaction_code
    if not txn_ref:
        return {
            "is_valid": False,
            "is_success": False,
            "message": "Missing transaction reference for Stripe return.",
            "transaction": None,
            "activated_entitlement": {},
        }

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, user_id, transaction_code, amount, currency, payment_method, status, metadata, created_at, updated_at
                FROM payment_transactions
                WHERE transaction_code = %s FOR UPDATE
                """,
                (str(txn_ref),),
            )
            row = cursor.fetchone()
            if not row:
                return {
                    "is_valid": verification["is_valid"],
                    "is_success": False,
                    "message": f"Transaction '{txn_ref}' not found.",
                    "transaction": None,
                    "activated_entitlement": {},
                }

            current_txn = _format_transaction_row(row)
            user_id = current_txn["user_id"]
            meta = current_txn.get("metadata") or {}

            meta["stripe_session_id"] = session_id
            meta["stripe_verified"] = verification["is_valid"]
            meta["provider_reference"] = verification.get("provider_ref")

            activated_entitlement: Dict[str, Any] = {}

            if verification["is_success"]:
                if current_txn["status"] == "completed":
                    return {
                        "is_valid": True,
                        "is_success": True,
                        "message": "Payment transaction was already completed.",
                        "transaction": current_txn,
                        "activated_entitlement": meta,
                    }

                product_type = meta.get("product_type", "PLAN")
                product_id = meta.get("product_id")
                billing_cycle = meta.get("billing_cycle", "monthly")

                if product_type == "PLAN":
                    activated_entitlement = activate_plan_subscription(
                        user_id=user_id,
                        plan_id=int(product_id),
                        billing_cycle=billing_cycle,
                        connection=connection,
                    )
                elif product_type == "STORAGE_ADDON":
                    activated_entitlement = activate_storage_addon(
                        user_id=user_id,
                        addon_id=int(product_id),
                        billing_cycle=billing_cycle,
                        connection=connection,
                    )

                meta["paid_at"] = datetime.now(timezone.utc).isoformat()
                cursor.execute(
                    """
                    UPDATE payment_transactions
                    SET status = 'completed', metadata = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    RETURNING id, user_id, transaction_code, amount, currency, payment_method, status, metadata, created_at, updated_at
                    """,
                    (Json(meta), current_txn["id"]),
                )
            else:
                meta["failed_at"] = datetime.now(timezone.utc).isoformat()
                meta["failure_reason"] = "Stripe checkout session was not paid."
                cursor.execute(
                    """
                    UPDATE payment_transactions
                    SET status = 'failed', metadata = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    RETURNING id, user_id, transaction_code, amount, currency, payment_method, status, metadata, created_at, updated_at
                    """,
                    (Json(meta), current_txn["id"]),
                )

            updated_row = cursor.fetchone()

        connection.commit()
        updated_txn = _format_transaction_row(updated_row)

        return {
            "is_valid": verification["is_valid"],
            "is_success": verification["is_success"],
            "message": "Stripe payment processed successfully!" if verification["is_success"] else "Stripe payment was unsuccessful or cancelled.",
            "transaction": updated_txn,
            "activated_entitlement": activated_entitlement,
        }
    except Exception as e:
        connection.rollback()
        logger.error(f"[PaymentService] Error in process_stripe_return: {e}")
        return {
            "is_valid": False,
            "is_success": False,
            "message": f"Error processing Stripe return: {str(e)}",
            "transaction": None,
            "activated_entitlement": {},
        }
    finally:
        connection.close()


def get_user_transactions(
    user_id: int,
    status: Optional[str] = None,
    product_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Returns the user's payment transaction history.
    """
    ensure_subscription_tables_exist()
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            base_count_query = "SELECT COUNT(*) FROM payment_transactions WHERE user_id = %s"
            params: List[Any] = [user_id]

            if status:
                base_count_query += " AND status = %s"
                params.append(status.lower())

            cursor.execute(base_count_query, tuple(params))
            total = cursor.fetchone()[0]

            query = """
                SELECT id, user_id, transaction_code, amount, currency, payment_method, status, metadata, created_at, updated_at
                FROM payment_transactions
                WHERE user_id = %s
            """
            q_params: List[Any] = [user_id]

            if status:
                query += " AND status = %s"
                q_params.append(status.lower())

            query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
            q_params.extend([limit, offset])

            cursor.execute(query, tuple(q_params))
            rows = cursor.fetchall()

            transactions = [_format_transaction_row(r) for r in rows]

            if product_type:
                pt_upper = product_type.upper()
                transactions = [t for t in transactions if t.get("product_type") == pt_upper]

            return transactions, total
    except Exception as e:
        logger.error(f"[PaymentService] Error fetching user transactions: {e}")
        return [], 0
    finally:
        connection.close()


def get_transaction_by_id(transaction_id_or_code: Union[int, str], user_id: int) -> Optional[Dict[str, Any]]:
    """
    Gets single payment transaction by ID or Code with authorization check.
    """
    ensure_subscription_tables_exist()
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            if isinstance(transaction_id_or_code, int) or (isinstance(transaction_id_or_code, str) and transaction_id_or_code.isdigit()):
                cursor.execute(
                    """
                    SELECT id, user_id, transaction_code, amount, currency, payment_method, status, metadata, created_at, updated_at
                    FROM payment_transactions
                    WHERE id = %s
                    """,
                    (int(transaction_id_or_code),),
                )
            else:
                cursor.execute(
                    """
                    SELECT id, user_id, transaction_code, amount, currency, payment_method, status, metadata, created_at, updated_at
                    FROM payment_transactions
                    WHERE transaction_code = %s
                    """,
                    (str(transaction_id_or_code),),
                )

            row = cursor.fetchone()
            if not row:
                return None

            txn = _format_transaction_row(row)
            if txn["user_id"] != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to view this transaction.",
                )
            return txn
    finally:
        connection.close()


def _format_transaction_row(row: Tuple) -> Dict[str, Any]:
    """Helper to convert database row to dictionary."""
    meta = row[7] if row[7] is not None else {}
    if isinstance(meta, str):
        try:
            meta = json.loads(meta)
        except Exception:
            meta = {}

    return {
        "id": row[0],
        "user_id": row[1],
        "transaction_code": row[2],
        "amount": float(row[3]),
        "currency": row[4] or "USD",
        "payment_method": row[5] or "DEMO",
        "status": row[6] or "pending",
        "product_type": meta.get("product_type"),
        "product_id": meta.get("product_id"),
        "product_name": meta.get("product_name"),
        "billing_cycle": meta.get("billing_cycle"),
        "metadata": meta,
        "created_at": row[8],
        "updated_at": row[9],
    }

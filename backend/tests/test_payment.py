import os
import sys
from pathlib import Path

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

os.environ.setdefault("JWT_SECRET_KEY", "test_jwt_secret_key_1234567890")

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.core.database import get_connection
from app.services.subscription_service import ensure_subscription_tables_exist, get_user_effective_quota

client = TestClient(app)


def get_auth_headers(user_id: int = 1) -> dict:
    token = create_access_token(user_id=user_id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def setup_db():
    ensure_subscription_tables_exist()
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO users (id, email, full_name, password_hash, is_active, is_verified)
                VALUES (1, 'tester@vidnova.ai', 'Test User', 'hashed_pw_test', TRUE, TRUE)
                ON CONFLICT (id) DO NOTHING;
                """
            )
        conn.commit()
        conn.close()
    except Exception as e:
        pass


def test_create_plan_transaction():
    headers = get_auth_headers(user_id=1)
    payload = {
        "product_type": "PLAN",
        "product_id": 2,  # Pro plan
        "billing_cycle": "monthly",
        "payment_method": "DEMO",
    }
    response = client.post("/api/payments/transactions", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending"
    assert data["amount"] == 12.0
    assert data["currency"] == "USD"
    assert data["product_type"] == "PLAN"
    assert data["product_id"] == 2
    assert data["product_name"] == "Pro"
    assert data["transaction_code"].startswith("TXN-")


def test_create_addon_transaction():
    headers = get_auth_headers(user_id=1)
    payload = {
        "product_type": "STORAGE_ADDON",
        "product_id": 1,  # +50GB addon
        "billing_cycle": "yearly",
        "payment_method": "DEMO",
    }
    response = client.post("/api/payments/transactions", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending"
    assert data["amount"] == 20.0  # yearly price for +50GB
    assert data["product_type"] == "STORAGE_ADDON"


def test_demo_payment_success_and_entitlement_activation():
    headers = get_auth_headers(user_id=1)
    
    # 1. Create transaction for Pro plan
    create_res = client.post(
        "/api/payments/transactions",
        json={"product_type": "PLAN", "product_id": 2, "billing_cycle": "monthly", "payment_method": "DEMO"},
        headers=headers,
    )
    assert create_res.status_code == 201
    txn_id = create_res.json()["id"]

    # 2. Simulate demo success
    success_res = client.post(f"/api/payments/transactions/{txn_id}/demo-success", headers=headers)
    assert success_res.status_code == 200
    success_data = success_res.json()
    assert success_data["success"] is True
    assert success_data["transaction"]["status"] == "completed"
    assert "paid_at" in success_data["transaction"]["metadata"]

    # 3. Verify user subscription & quota updated
    quota_res = client.get("/api/subscriptions/quota", headers=headers)
    assert quota_res.status_code == 200
    quota_data = quota_res.json()
    assert quota_data["storage"]["total_bytes"] >= 107374182400  # Pro 100 GB
    assert quota_data["credits"]["total_credits"] >= 10000  # Pro 10,000 AI Credits

    # 4. Idempotency test - repeated success call on completed transaction
    repeat_res = client.post(f"/api/payments/transactions/{txn_id}/demo-success", headers=headers)
    assert repeat_res.status_code == 200
    assert repeat_res.json()["transaction"]["status"] == "completed"


def test_demo_payment_fail():
    headers = get_auth_headers(user_id=1)
    
    # 1. Create transaction
    create_res = client.post(
        "/api/payments/transactions",
        json={"product_type": "STORAGE_ADDON", "product_id": 2, "billing_cycle": "monthly", "payment_method": "DEMO"},
        headers=headers,
    )
    assert create_res.status_code == 201
    txn_id = create_res.json()["id"]

    # 2. Simulate failure
    fail_res = client.post(f"/api/payments/transactions/{txn_id}/demo-fail", headers=headers)
    assert fail_res.status_code == 200
    fail_data = fail_res.json()
    assert fail_data["success"] is False
    assert fail_data["transaction"]["status"] == "failed"


def test_user_transaction_history():
    headers = get_auth_headers(user_id=1)
    response = client.get("/api/payments/transactions", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "transactions" in data
    assert "total" in data
    assert isinstance(data["transactions"], list)
    assert data["total"] >= 1


def test_vnpay_create_intent_and_signed_url():
    headers = get_auth_headers(user_id=1)
    os.environ["VNPAY_TMN_CODE"] = "K742YGYA"
    os.environ["VNPAY_HASH_SECRET"] = "NPVWUJBAUQGZUGYLXRSOQBJYCTWSYMBA"
    
    response = client.post(
        "/api/payments/transactions",
        json={"product_type": "PLAN", "product_id": 2, "billing_cycle": "monthly", "payment_method": "VNPAY"},
        headers=headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["payment_method"] == "VNPAY"
    assert data["status"] == "pending"
    assert "metadata" in data
    assert "payment_url" in data["metadata"]
    assert "vnp_SecureHash=" in data["metadata"]["payment_url"]
    assert "vnp_TmnCode=K742YGYA" in data["metadata"]["payment_url"]


def test_vnpay_return_interface():
    response = client.get("/api/payments/vnpay/return?vnp_ResponseCode=00&vnp_TxnRef=TXN-123456")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "is_active" in data
    assert data["is_active"] is True


def test_stripe_create_intent():
    headers = get_auth_headers(user_id=1)
    response = client.post(
        "/api/payments/transactions",
        json={"product_type": "PLAN", "product_id": 2, "billing_cycle": "monthly", "payment_method": "STRIPE"},
        headers=headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["payment_method"] == "STRIPE"
    assert data["status"] == "pending"
    assert "metadata" in data
    assert "payment_url" in data["metadata"]


def test_stripe_return_interface():
    response = client.get("/api/payments/stripe/return?session_id=cs_test_mock_123456&txn=TXN-123456")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "is_active" in data

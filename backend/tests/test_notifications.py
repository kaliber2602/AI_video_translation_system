import os
import sys
from datetime import timedelta
from pathlib import Path

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

os.environ.setdefault("JWT_SECRET_KEY", "test_jwt_secret_key_1234567890")

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.security import create_token
from app.core.database import get_connection
from app.services.notification_service import (
    validate_action_url,
    create_notification,
    get_notification_preferences,
    patch_notification_preferences,
)
from app.services.project_service import create_project, add_project_member
from app.services.admin_service import adjust_user_credits

client = TestClient(app)

USER_1_ID = 1
USER_2_ID = 2

token_user_1 = create_token(USER_1_ID, "access", timedelta(hours=2))
token_user_2 = create_token(USER_2_ID, "access", timedelta(hours=2))

headers_user_1 = {"Authorization": f"Bearer {token_user_1}"}
headers_user_2 = {"Authorization": f"Bearer {token_user_2}"}


@pytest.fixture(autouse=True)
def setup_users():
    """Ensure test users 1 and 2 exist in database before tests run."""
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO users (id, email, full_name, password_hash, is_active)
                VALUES 
                    (1, 'tester1@vidnova.ai', 'Tester One', 'hashed_pw_test1', TRUE),
                    (2, 'tester2@vidnova.ai', 'Tester Two', 'hashed_pw_test2', TRUE)
                ON CONFLICT (id) DO NOTHING;
                """
            )
        conn.commit()
    finally:
        conn.close()


# =========================================================
# 1. Action URL Validation Security Unit Tests
# =========================================================

def test_validate_action_url_security():
    # Valid relative URLs
    assert validate_action_url("/workspace/project/42") == "/workspace/project/42"
    assert validate_action_url("/settings?tab=notifications") == "/settings?tab=notifications"
    assert validate_action_url("/admin/overview") == "/admin/overview"

    # Dangerous URLs must be rejected (return None)
    assert validate_action_url("https://evil.com/phishing") is None
    assert validate_action_url("http://localhost:3000/steal") is None
    assert validate_action_url("//evil.com") is None
    assert validate_action_url("javascript:alert(1)") is None
    assert validate_action_url("data:text/html,<script>alert(1)</script>") is None
    assert validate_action_url("vbscript:alert(1)") is None
    assert validate_action_url("invalid-route") is None
    assert validate_action_url("/unauthorized-top-level") is None
    assert validate_action_url("") is None
    assert validate_action_url(None) is None


# =========================================================
# 2. Authentication & Unauthorized Access Tests
# =========================================================

def test_unauthorized_endpoints():
    res_list = client.get("/api/notifications")
    assert res_list.status_code == 401

    res_unread = client.get("/api/notifications/unread-count")
    assert res_unread.status_code == 401

    res_pref = client.get("/api/notifications/preferences")
    assert res_pref.status_code == 401

    res_test = client.post("/api/notifications/test-alert", json={"type": "system"})
    assert res_test.status_code == 401

    res_mark_all = client.post("/api/notifications/mark-all-read")
    assert res_mark_all.status_code == 401

    res_patch = client.patch("/api/notifications/1/read")
    assert res_patch.status_code == 401

    res_del = client.delete("/api/notifications/1")
    assert res_del.status_code == 401


# =========================================================
# 3. Test Alert Endpoint & In-App Notification Creation
# =========================================================

def test_test_alert_creates_notification():
    # User 1 sends test alert
    res = client.post(
        "/api/notifications/test-alert",
        json={"type": "system"},
        headers=headers_user_1,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["type"] == "system"
    assert data["title"] == "System Alert"
    assert data["user_id"] == USER_1_ID
    assert data["is_read"] is False
    assert data["action_url"] == "/settings?tab=notifications"

    # Verify unread count is at least 1
    unread_res = client.get("/api/notifications/unread-count", headers=headers_user_1)
    assert unread_res.status_code == 200
    assert unread_res.json()["unread_count"] >= 1


# =========================================================
# 4. Mark Notification As Read & Idempotency
# =========================================================

def test_mark_as_read_and_idempotency():
    # Create notification for User 1
    res = client.post(
        "/api/notifications/test-alert",
        json={"type": "billing"},
        headers=headers_user_1,
    )
    assert res.status_code == 201
    nid = res.json()["id"]

    # First mark as read
    patch_res = client.patch(f"/api/notifications/{nid}/read", headers=headers_user_1)
    assert patch_res.status_code == 200
    patch_data = patch_res.json()
    assert patch_data["id"] == nid
    assert patch_data["is_read"] is True
    assert patch_data["read_at"] is not None

    # Second mark as read (Idempotent call)
    patch_res_again = client.patch(f"/api/notifications/{nid}/read", headers=headers_user_1)
    assert patch_res_again.status_code == 200
    assert patch_res_again.json()["is_read"] is True


# =========================================================
# 5. IDOR Protection (Cross-User Isolation)
# =========================================================

def test_idor_protection_read_and_delete():
    # Create notification belonging to User 1
    res = client.post(
        "/api/notifications/test-alert",
        json={"type": "collaboration"},
        headers=headers_user_1,
    )
    assert res.status_code == 201
    user1_nid = res.json()["id"]

    # User 2 tries to mark User 1's notification as read -> MUST return 404 (Not Found)
    res_idor_read = client.patch(f"/api/notifications/{user1_nid}/read", headers=headers_user_2)
    assert res_idor_read.status_code == 404
    assert "Notification not found" in res_idor_read.json()["detail"]

    # User 2 tries to delete User 1's notification -> MUST return 404 (Not Found)
    res_idor_delete = client.delete(f"/api/notifications/{user1_nid}", headers=headers_user_2)
    assert res_idor_delete.status_code == 404
    assert "Notification not found" in res_idor_delete.json()["detail"]


# =========================================================
# 6. List, Filtering, and Pagination
# =========================================================

def test_notification_list_filtering_and_pagination():
    # Clean any old test notifications for User 1 to have clean state
    client.post("/api/notifications/mark-all-read", headers=headers_user_1)

    # Create 3 distinct notifications for User 1
    client.post("/api/notifications/test-alert", json={"type": "system"}, headers=headers_user_1)
    client.post("/api/notifications/test-alert", json={"type": "billing"}, headers=headers_user_1)
    res3 = client.post("/api/notifications/test-alert", json={"type": "collaboration"}, headers=headers_user_1)
    nid3 = res3.json()["id"]

    # Mark one of them as read
    client.patch(f"/api/notifications/{nid3}/read", headers=headers_user_1)

    # 1. Unread-only filter
    res_unread = client.get("/api/notifications?unread_only=true", headers=headers_user_1)
    assert res_unread.status_code == 200
    unread_data = res_unread.json()
    assert all(n["is_read"] is False for n in unread_data["items"])

    # 2. Type filter
    res_type = client.get("/api/notifications?type=billing", headers=headers_user_1)
    assert res_type.status_code == 200
    billing_data = res_type.json()
    assert all(n["type"] == "billing" for n in billing_data["items"])
    assert any(n["type"] == "billing" for n in billing_data["items"])

    # 3. Pagination (page_size=1)
    res_page = client.get("/api/notifications?page=1&page_size=1", headers=headers_user_1)
    assert res_page.status_code == 200
    page_data = res_page.json()
    assert len(page_data["items"]) == 1
    assert page_data["page"] == 1
    assert page_data["page_size"] == 1
    assert page_data["total"] >= 3


# =========================================================
# 7. Mark All Read
# =========================================================

def test_mark_all_read():
    # Create two unread notifications for User 1
    client.post("/api/notifications/test-alert", json={"type": "system"}, headers=headers_user_1)
    client.post("/api/notifications/test-alert", json={"type": "billing"}, headers=headers_user_1)

    # Call mark-all-read
    res = client.post("/api/notifications/mark-all-read", headers=headers_user_1)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "updated_count" in data

    # Verify unread count is 0
    unread_res = client.get("/api/notifications/unread-count", headers=headers_user_1)
    assert unread_res.status_code == 200
    assert unread_res.json()["unread_count"] == 0


# =========================================================
# 8. Delete Notification
# =========================================================

def test_delete_notification():
    res = client.post("/api/notifications/test-alert", json={"type": "system"}, headers=headers_user_1)
    assert res.status_code == 201
    nid = res.json()["id"]

    # Delete the notification
    del_res = client.delete(f"/api/notifications/{nid}", headers=headers_user_1)
    assert del_res.status_code == 204

    # Subsequent access should be 404
    patch_res = client.patch(f"/api/notifications/{nid}/read", headers=headers_user_1)
    assert patch_res.status_code == 404


# =========================================================
# 9. Preferences GET, Auto-creation & PATCH
# =========================================================

def test_preferences_lifecycle():
    # 1. GET preferences (auto-creates if missing)
    get_res = client.get("/api/notifications/preferences", headers=headers_user_1)
    assert get_res.status_code == 200
    pref = get_res.json()
    assert "email_on_pipeline_success" in pref
    assert "inapp_on_project_invitation" in pref

    # 2. PATCH preferences with partial updates
    patch_res = client.patch(
        "/api/notifications/preferences",
        json={"email_on_quota_warning": False, "inapp_on_project_invitation": True},
        headers=headers_user_1,
    )
    assert patch_res.status_code == 200
    updated_pref = patch_res.json()
    assert updated_pref["email_on_quota_warning"] is False
    assert updated_pref["inapp_on_project_invitation"] is True

    # 3. Verify persistence via GET
    get_again = client.get("/api/notifications/preferences", headers=headers_user_1)
    assert get_again.status_code == 200
    assert get_again.json()["email_on_quota_warning"] is False


# =========================================================
# 10. Preference Suppression in create_notification
# =========================================================

def test_preference_suppresses_in_app_notification():
    # Disable inapp_on_project_invitation for User 2
    patch_notification_preferences(USER_2_ID, {"inapp_on_project_invitation": False})

    # Try creating collaboration notification for User 2
    notif = create_notification(
        user_id=USER_2_ID,
        type="collaboration",
        title="Collaboration Test",
        message="Should be suppressed",
        action_url="/workspace",
    )
    assert notif is None

    # Re-enable inapp_on_project_invitation for User 2
    patch_notification_preferences(USER_2_ID, {"inapp_on_project_invitation": True})

    # Now creation should succeed
    notif_allowed = create_notification(
        user_id=USER_2_ID,
        type="collaboration",
        title="Collaboration Allowed",
        message="Should succeed",
        action_url="/workspace",
    )
    assert notif_allowed is not None
    assert notif_allowed["title"] == "Collaboration Allowed"


# =========================================================
# 11. Event Hook: Project Invitation
# =========================================================

def test_project_invitation_event_hook():
    # 1. User 1 creates a project
    proj = create_project(
        owner_id=USER_1_ID,
        name="Notification Collab Test Project",
        description="Testing project invitation event hook",
    )
    proj_id = proj["id"]

    # 2. User 1 invites User 2
    add_project_member(
        owner_id=USER_1_ID,
        project_id=proj_id,
        email="user@vidnova.com",
        role="editor",
    )

    # 3. User 2 checks notifications
    res = client.get("/api/notifications?type=collaboration", headers=headers_user_2)
    assert res.status_code == 200
    data = res.json()
    invitation_notifs = [
        n for n in data["items"]
        if n["target_type"] == "project" and n["target_id"] == proj_id
    ]
    assert len(invitation_notifs) >= 1
    invited_notif = invitation_notifs[0]
    assert invited_notif["title"] == "Project Invitation"
    assert "invited you to project" in invited_notif["message"]
    assert invited_notif["action_url"] == f"/workspace/project/{proj_id}"


# =========================================================
# 12. Event Hook: Admin Credit Adjustment
# =========================================================

def test_admin_credit_adjustment_event_hook():
    # Admin (User 1) adjusts credits for User 2
    adjust_user_credits(
        user_id=USER_2_ID,
        amount=150,
        reason="Good Community Contributor",
        admin_id=USER_1_ID,
    )

    # User 2 checks notifications for system credit update
    res = client.get("/api/notifications?type=system", headers=headers_user_2)
    assert res.status_code == 200
    data = res.json()
    credit_notifs = [
        n for n in data["items"]
        if n["title"] == "Credit Balance Updated" and "150 credits" in n["message"]
    ]
    assert len(credit_notifs) >= 1
    c_notif = credit_notifs[0]
    assert c_notif["action_url"] == "/settings?tab=billing"
    assert c_notif["target_type"] == "credit_ledger"


# =========================================================
# 13. Event Hook: Demo Payment Success
# =========================================================

def test_payment_success_event_hook():
    # User 1 creates and completes a demo transaction
    create_res = client.post(
        "/api/payments/transactions",
        json={
            "product_type": "PLAN",
            "product_id": 2,
            "billing_cycle": "monthly",
            "payment_method": "DEMO",
        },
        headers=headers_user_1,
    )
    assert create_res.status_code == 201
    txn_id = create_res.json()["id"]

    success_res = client.post(f"/api/payments/transactions/{txn_id}/demo-success", headers=headers_user_1)
    assert success_res.status_code == 200

    # Verify notification created for User 1
    res = client.get("/api/notifications?type=billing", headers=headers_user_1)
    assert res.status_code == 200
    billing_notifs = [
        n for n in res.json()["items"]
        if n["target_type"] == "transaction" and n["target_id"] == txn_id
    ]
    assert len(billing_notifs) >= 1
    p_notif = billing_notifs[0]
    assert p_notif["title"] == "Payment Successful"
    assert "was processed successfully" in p_notif["message"]
    assert p_notif["action_url"] == "/settings?tab=billing"

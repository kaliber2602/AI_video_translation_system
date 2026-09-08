import os
import sys
from pathlib import Path
from unittest.mock import patch

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

os.environ.setdefault("JWT_SECRET_KEY", "test_jwt_secret_key_1234567890")

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.security import create_access_token

client = TestClient(app)


def test_admin_endpoints_require_auth():
    """Verify that requests without token to admin endpoints are rejected."""
    endpoints = [
        "/api/admin/health",
        "/api/admin/metrics",
        "/api/admin/jobs",
        "/api/admin/models",
        "/api/admin/users",
        "/api/admin/payments",
        "/api/admin/logs/activity",
        "/api/admin/contacts",
        "/api/admin/tools/storage",
    ]

    for ep in endpoints:
        response = client.get(ep)
        assert response.status_code in (401, 403), f"Endpoint {ep} did not require authentication!"


def test_admin_endpoint_forbidden_for_regular_user():
    """Verify that a user with role 'user' receives 403 Forbidden."""
    user_token = create_access_token(user_id=2)

    # Mock find_user_by_id to return a standard user with role 'user'
    regular_user_mock = (
        2,
        "user@vidnova.com",
        "hash",
        "Regular User",
        None,
        "user",  # role
        True,    # is_active
        "2026-01-01",
        "2026-01-01",
    )

    with patch("app.core.admin_guard.find_user_by_id", return_value=regular_user_mock):
        response = client.get(
            "/api/admin/metrics",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 403
        assert "Admin privileges required" in response.json().get("detail", "")


def test_admin_endpoint_allowed_for_admin_user():
    """Verify that a user with role 'admin' can access admin endpoints."""
    admin_token = create_access_token(user_id=1)

    admin_user_mock = (
        1,
        "admin@vidnova.com",
        "hash",
        "Admin User",
        None,
        "admin",  # role
        True,     # is_active
        "2026-01-01",
        "2026-01-01",
    )

    with patch("app.core.admin_guard.find_user_by_id", return_value=admin_user_mock):
        response = client.get(
            "/api/admin/health",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "overall_status" in data
        assert "services" in data
        assert "disk_usage" in data

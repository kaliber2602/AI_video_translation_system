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
from fastapi import HTTPException

from app.main import app
from app.services.subscription_service import (
    get_active_plans,
    get_storage_addons,
    get_pricing_catalog,
    get_user_effective_quota,
    validate_upload_quota,
    validate_project_quota,
)

client = TestClient(app)


def test_get_catalog_public_endpoint():
    response = client.get("/api/subscriptions/catalog")
    assert response.status_code == 200
    data = response.json()
    assert "plans" in data
    assert "storage_addons" in data
    assert len(data["plans"]) >= 3
    assert len(data["storage_addons"]) >= 4

    # Verify plans
    plan_codes = [p["code"] for p in data["plans"]]
    assert "free" in plan_codes
    assert "pro" in plan_codes
    assert "business" in plan_codes

    # Verify features are enabled
    for p in data["plans"]:
        features = [r for r in p["resources"] if r["resource_type"] == "FEATURE"]
        assert len(features) > 0
        for f in features:
            assert f["limit_value"] == "true"


def test_get_plans_endpoint():
    response = client.get("/api/subscriptions/plans")
    assert response.status_code == 200
    plans = response.json()
    assert len(plans) >= 3


def test_get_addons_endpoint():
    response = client.get("/api/subscriptions/addons")
    assert response.status_code == 200
    addons = response.json()
    assert len(addons) >= 4
    addon_codes = [a["code"] for a in addons]
    assert "addon_50gb" in addon_codes
    assert "addon_200gb" in addon_codes
    assert "addon_500gb" in addon_codes
    assert "addon_1tb" in addon_codes


def test_effective_quota_structure():
    # Test for virtual / non-existent user falling back to free defaults safely
    quota = get_user_effective_quota(user_id=999999)
    assert "storage" in quota
    assert "credits" in quota
    assert "limits" in quota
    assert "features" in quota
    assert quota["storage"]["total_bytes"] >= 5368709120
    assert quota["credits"]["total_credits"] >= 1000
    assert quota["features"]["ai_translation"] is True
    assert quota["features"]["text_to_speech"] is True
    assert quota["features"]["speaker_diarization"] is True


def test_validate_upload_quota_file_size_limit():
    # File size 10 GB exceeds Free max_file_size (500 MB)
    huge_file_size = 10 * 1024 * 1024 * 1024
    with pytest.raises(HTTPException) as exc_info:
        validate_upload_quota(user_id=999999, new_file_size=huge_file_size)
    assert exc_info.value.status_code == 400
    assert "exceeds your plan's maximum allowed limit" in exc_info.value.detail

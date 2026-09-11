import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token

client = TestClient(app)


@pytest.fixture
def auth_headers():
    token = create_access_token(1)
    return {"Authorization": f"Bearer {token}"}


def test_update_profile(auth_headers):
    res = client.put(
        "/api/auth/me",
        headers=auth_headers,
        json={"full_name": "Antigravity Engineer"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["full_name"] == "Antigravity Engineer"


def test_user_sessions_and_logs(auth_headers):
    # Sessions
    res_sess = client.get("/api/auth/sessions", headers=auth_headers)
    assert res_sess.status_code == 200
    assert isinstance(res_sess.json(), list)

    # Security logs
    res_logs = client.get("/api/auth/security-logs", headers=auth_headers)
    assert res_logs.status_code == 200
    assert isinstance(res_logs.json(), list)


def test_user_settings_preferences_persistence(auth_headers):
    prefs = {
        "general": {"bio": "Professional video localizer", "density": "compact"},
        "ai": {"concurrency": 4, "noiseReduction": True},
        "workspace": {"name": "Nova Lab Pro"},
    }
    patch_res = client.patch(
        "/api/settings",
        headers=auth_headers,
        json={"preferences": prefs},
    )
    assert patch_res.status_code == 200
    patch_data = patch_res.json()
    assert "preferences" in patch_data
    assert patch_data["preferences"]["general"]["bio"] == "Professional video localizer"
    assert patch_data["preferences"]["ai"]["concurrency"] == 4

    # Fetch to confirm persistence
    get_res = client.get("/api/settings", headers=auth_headers)
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["preferences"]["workspace"]["name"] == "Nova Lab Pro"


def test_api_keys_lifecycle(auth_headers):
    # Create key
    create_res = client.post(
        "/api/api-keys",
        headers=auth_headers,
        json={"name": "Test Automation Key", "environment": "development"},
    )
    assert create_res.status_code == 201
    key_data = create_res.json()
    assert key_data["name"] == "Test Automation Key"
    assert key_data["environment"] == "development"
    assert "secret" in key_data
    key_id = int(key_data["id"])

    # List keys
    list_res = client.get("/api/api-keys", headers=auth_headers)
    assert list_res.status_code == 200
    assert any(k["id"] == str(key_id) for k in list_res.json())

    # Delete key
    del_res = client.delete(f"/api/api-keys/{key_id}", headers=auth_headers)
    assert del_res.status_code == 200


def test_integrations_lifecycle(auth_headers):
    # List integrations
    res = client.get("/api/integrations", headers=auth_headers)
    assert res.status_code == 200
    apps = res.json()
    assert len(apps) > 0

    # Toggle integration
    put_res = client.put(
        "/api/integrations/gdrive",
        headers=auth_headers,
        json={"is_connected": True, "account_email": "test@vidnova.ai"},
    )
    assert put_res.status_code == 200
    data = put_res.json()
    assert data["connected"] is True


def test_tts_preview(auth_headers):
    res = client.post(
        "/api/settings/tts/preview",
        headers=auth_headers,
        json={"text": "Hello preview", "language": "en"},
    )
    assert res.status_code == 200
    assert len(res.content) > 0


def test_export_archive(auth_headers):
    res = client.post(
        "/api/subscriptions/storage/export-archive",
        headers=auth_headers,
    )
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/zip"
    assert len(res.content) > 0

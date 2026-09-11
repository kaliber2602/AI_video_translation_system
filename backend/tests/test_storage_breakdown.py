import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token

client = TestClient(app)


@pytest.fixture
def auth_header():
    token = create_access_token(user_id=2)
    return {"Authorization": f"Bearer {token}"}


def test_get_storage_breakdown_unauthorized():
    response = client.get("/api/subscriptions/storage/breakdown")
    assert response.status_code == 401


def test_get_storage_breakdown_authorized(auth_header):
    response = client.get("/api/subscriptions/storage/breakdown", headers=auth_header)
    assert response.status_code == 200
    data = response.json()
    assert "plan" in data
    assert "storage_by_type" in data
    assert "storage_by_project" in data
    assert "largest_files" in data
    assert "all_files" in data
    assert "cache_summary" in data

    # Check Plan Quota structure
    assert data["plan"]["total_gb"] >= 5.0
    assert "usage_percent" in data["plan"]

    # Check Categories
    type_keys = [item["key"] for item in data["storage_by_type"]]
    assert "source_video" in type_keys
    assert "dubbed_video" in type_keys
    assert "audio_track" in type_keys
    assert "subtitles_docs" in type_keys
    assert "pipeline_cache" in type_keys


def test_clean_pipeline_cache(auth_header):
    response = client.post("/api/subscriptions/storage/clean-cache", headers=auth_header)
    assert response.status_code == 200
    data = response.json()
    assert "reclaimed_bytes" in data
    assert "reclaimed_formatted" in data
    assert "new_used_bytes" in data
    assert "message" in data


def test_delete_storage_resource_invalid_format(auth_header):
    response = client.delete("/api/subscriptions/storage/files/source_video/invalid_id", headers=auth_header)
    assert response.status_code == 400


def test_delete_storage_resource_not_found(auth_header):
    response = client.delete("/api/subscriptions/storage/files/source_video/source_999999", headers=auth_header)
    assert response.status_code == 404

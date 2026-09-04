import os
import sys
from datetime import datetime
from pathlib import Path

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

os.environ.setdefault("JWT_SECRET_KEY", "test_jwt_secret_key_1234567890")

from fastapi.testclient import TestClient
from app.main import app
import app.api.contact_routes as contact_routes

client = TestClient(app)


def test_contact_validation_errors():
    # Missing required name
    response = client.post(
        "/api/contact",
        json={
            "email": "user@example.com",
            "subject": "Test",
            "message": "This is a valid message over 10 chars.",
        },
    )
    assert response.status_code == 422

    # Invalid email format
    response = client.post(
        "/api/contact",
        json={
            "name": "Jane Doe",
            "email": "not-an-email",
            "subject": "Test",
            "message": "This is a valid message over 10 chars.",
        },
    )
    assert response.status_code == 422

    # Message too short (< 10 chars)
    response = client.post(
        "/api/contact",
        json={
            "name": "Jane Doe",
            "email": "jane@example.com",
            "subject": "Test",
            "message": "Too short",
        },
    )
    assert response.status_code == 422


def test_submit_contact_success(monkeypatch):
    fake_record = {
        "id": 101,
        "name": "Jane Doe",
        "email": "jane@example.com",
        "subject": "Partnership Inquiry",
        "message": "We would like to partner with Vidnova for education.",
        "status": "pending",
        "created_at": datetime.now(),
    }

    monkeypatch.setattr(
        contact_routes,
        "create_contact_message",
        lambda **kwargs: fake_record,
    )

    notifications_called = []
    monkeypatch.setattr(
        contact_routes,
        "send_contact_notifications",
        lambda data: notifications_called.append(data),
    )

    response = client.post(
        "/api/contact",
        json={
            "name": "Jane Doe",
            "email": "jane@example.com",
            "subject": "Partnership Inquiry",
            "message": "We would like to partner with Vidnova for education.",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["success"] is True
    assert body["data"]["name"] == "Jane Doe"
    assert body["data"]["email"] == "jane@example.com"
    assert body["data"]["id"] == 101


def test_list_contacts(monkeypatch):
    fake_list = [
        {
            "id": 1,
            "name": "John Smith",
            "email": "john@example.com",
            "subject": "Hello",
            "message": "Testing contact inquiry list functionality.",
            "status": "pending",
            "created_at": datetime.now(),
        }
    ]

    monkeypatch.setattr(
        contact_routes,
        "get_contact_messages",
        lambda limit, offset: fake_list,
    )

    response = client.get("/api/contact?limit=10&offset=0")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "John Smith"

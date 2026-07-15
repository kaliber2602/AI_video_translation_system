from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app import services

client = TestClient(app)


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_upload_endpoint_accepts_file():
    response = client.post(
        "/api/uploads",
        files={"file": ("sample.mp4", b"fake-video-bytes", "video/mp4")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["filename"] == "sample.mp4"
    assert body["content_type"] == "video/mp4"
    assert body["stored_name"]
    assert "Transcript" in body["markdown"]
    assert body["subtitle_path"]


def test_upload_endpoint_rejects_unsupported_format():
    response = client.post(
        "/api/uploads",
        files={"file": ("sample.txt", b"not-a-video", "text/plain")},
    )
    assert response.status_code == 400
    assert "unsupported" in response.json()["detail"].lower()


def test_build_srt_content_contains_subtitle_lines():
    content = services.build_srt_content("hello world")
    assert "1" in content
    assert "hello world" in content


def test_files_endpoint_serves_upload_artifacts():
    artifact_path = services.UPLOAD_DIR / "sample-test.txt"
    artifact_path.write_text("hello from artifact", encoding="utf-8")

    response = client.get(f"/api/files/{artifact_path.name}")

    assert response.status_code == 200
    assert response.text == "hello from artifact"


def test_create_docx_and_html_outputs(tmp_path):
    docx_path = tmp_path / "summary.docx"
    html_path = tmp_path / "summary.html"

    services.create_docx_document("Hello from test", docx_path)
    services.create_html_document("Hello from test", html_path)

    assert docx_path.exists()
    assert html_path.exists()
    assert html_path.read_text(encoding="utf-8").startswith("<html")

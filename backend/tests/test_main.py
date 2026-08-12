from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_processing_status():
    response = client.get("/api/status")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"


def test_missing_file_returns_404():
    response = client.get("/api/files/does-not-exist.mp4")
    assert response.status_code == 404
    assert response.json()["detail"] == "File not found"


def test_upload_endpoint_with_mocked_pipeline(monkeypatch):
    import app.api.routes as routes

    def fake_pipeline(video_input_path, final_output_path, target_language, glossary):
        from pathlib import Path
        Path(final_output_path).write_bytes(b"fake-output")
        return (
            final_output_path,
            "en",
            [{"start": 0.0, "end": 2.0, "text": "Hello",
              "translated_text": "Xin chao"}],
        )

    monkeypatch.setattr(routes, "process_video_translation", fake_pipeline)

    response = client.post(
        "/api/uploads?target_language=vi",
        files={"file": ("sample.mp4", b"fake-video", "video/mp4")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["filename"] == "sample.mp4"
    assert body["detected_language"] == "en"
    assert body["target_language"] == "vi"
    assert body["status"] == "completed"
    assert "Xin chao" in body["transcript"]


def test_upload_returns_500_when_pipeline_fails(monkeypatch):
    import app.api.routes as routes

    def failing_pipeline(*args, **kwargs):
        raise RuntimeError("pipeline failed")

    monkeypatch.setattr(routes, "process_video_translation", failing_pipeline)

    response = client.post(
        "/api/uploads",
        files={"file": ("sample.mp4", b"fake-video", "video/mp4")},
    )

    assert response.status_code == 500
    assert response.json()["detail"] == "pipeline failed"

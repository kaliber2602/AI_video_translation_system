# backend/tests/test_video_understanding.py
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

os.environ.setdefault("JWT_SECRET_KEY", "test_jwt_secret_key_1234567890")

from app.services.video_understanding_service import _format_timestamp, VideoUnderstandingService


def test_format_timestamp():
    assert _format_timestamp(0) == "00:00"
    assert _format_timestamp(65) == "01:05"
    assert _format_timestamp(3665) == "01:01:05"


def test_video_understanding_service_mock():
    mock_db = MagicMock()
    
    # Mock video
    mock_video = {
        "id": 42,
        "title": "Quantum Physics Overview",
        "duration": 180.0,
        "original_filename": "quantum.mp4"
    }
    
    # Mock segments
    mock_segments = [
        {"start_time": 0.0, "end_time": 45.0, "original_text": "Welcome to the lecture.", "speaker": "Prof A"},
        {"start_time": 45.0, "end_time": 95.0, "original_text": "Now we discuss wave-particle duality.", "speaker": "Prof A"},
        {"start_time": 95.0, "end_time": 180.0, "original_text": "In conclusion, quantum mechanics is foundational.", "speaker": "Prof A"},
    ]
    
    # Setup query mock returns
    def mock_query(model):
        m = MagicMock()
        model_name = getattr(model, "__table_name__", str(model))
        if "videos" in model_name:
            m.filter.return_value.first.return_value = mock_video
        elif "transcript_segments" in model_name:
            m.filter.return_value.all.return_value = mock_segments
        elif "video_chapters" in model_name:
            m.filter.return_value.all.return_value = [
                {"sequence": 1, "start_time": 0.0, "end_time": 95.0, "title": "Chapter 1", "summary": "Intro"},
                {"sequence": 2, "start_time": 95.0, "end_time": 180.0, "title": "Chapter 2", "summary": "Conclusion"},
            ]
        elif "video_documents" in model_name:
            m.filter.return_value.all.return_value = []
        return m

    mock_db.query = mock_query

    service = VideoUnderstandingService(db=mock_db)
    
    # Test chapters generation
    chapters = service.generate_chapters(video_id=42)
    assert len(chapters) > 0
    assert chapters[0]["sequence"] == 1

    # Test document generation
    doc = service.generate_document(video_id=42, doc_type="markdown")
    assert "content_markdown" in doc
    assert "Quantum Physics" in doc["title"]

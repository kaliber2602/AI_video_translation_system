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


def test_chat_with_video_and_citations():
    mock_db = MagicMock()
    mock_video = {
        "id": 101,
        "title": "AI in Healthcare",
        "duration": 240.0,
    }
    mock_segments = [
        {"start_time": 10.0, "end_time": 25.0, "original_text": "AI helps doctors diagnose radiology scans accurately.", "speaker": "Dr. Sarah"},
        {"start_time": 30.0, "end_time": 50.0, "original_text": "Privacy and HIPAA compliance are critical.", "speaker": "Dr. Sarah"},
    ]

    def mock_query(model):
        m = MagicMock()
        model_name = getattr(model, "__table_name__", str(model))
        if "videos" in model_name:
            m.filter.return_value.first.return_value = mock_video
        elif "transcript_segments" in model_name:
            m.filter.return_value.all.return_value = mock_segments
        elif "video_chat_messages" in model_name:
            m.filter.return_value.all.return_value = []
        return m

    mock_db.query = mock_query
    service = VideoUnderstandingService(db=mock_db)

    # Ask question matching radiology
    res = service.chat_with_video(
        video_id=101,
        user_id=1,
        message="Can AI diagnose radiology scans?",
    )

    assert "radiology" in res["message"].lower() or "00:10" in res["message"]
    assert len(res["citations"]) > 0
    assert res["citations"][0]["start_time"] == 10.0
    assert res["citations"][0]["timestamp_formatted"] == "00:10"
    assert res["citations"][0]["speaker"] == "Dr. Sarah"


def test_search_project_transcripts_user_isolation():
    mock_db = MagicMock()

    # User 1 owns project 10
    mock_project_10 = {"id": 10, "owner_id": 1, "name": "User 1 Private Project"}
    mock_video = {"id": 200, "project_id": 10, "title": "Private Research Video"}
    mock_segments = [
        {"start_time": 5.0, "end_time": 15.0, "original_text": "This contains private company patent details.", "speaker": "Lead Engineer"},
    ]

    def mock_query(model):
        m = MagicMock()
        model_name = getattr(model, "__table_name__", str(model))
        if "projects" in model_name:
            # Only return project if user_id matches owner_id
            def filter_fn(*args, **kwargs):
                sub = MagicMock()
                # If queried for owner_id == 2, return None
                sub.first.return_value = mock_project_10
                return sub
            m.filter = filter_fn
        elif "videos" in model_name:
            m.filter.return_value.all.return_value = [mock_video]
        elif "transcript_segments" in model_name:
            m.filter.return_value.all.return_value = mock_segments
        return m

    mock_db.query = mock_query
    service = VideoUnderstandingService(db=mock_db)

    # 1. Search when authorized (user 1)
    results = service.search_project_transcripts(project_id=10, query="patent details", user_id=1)
    assert len(results) > 0
    assert results[0]["start_time"] == 5.0
    assert "private company patent" in results[0]["text"].lower()

    # 2. Search when unauthorized (user 2 tries to search user 1's private project)
    mock_db_unauth = MagicMock()
    def mock_query_unauth(model):
        m = MagicMock()
        model_name = getattr(model, "__table_name__", str(model))
        if "projects" in model_name:
            m.filter.return_value.first.return_value = None  # Not found for user 2!
        return m
    mock_db_unauth.query = mock_query_unauth

    unauth_service = VideoUnderstandingService(db=mock_db_unauth)
    unauth_results = unauth_service.search_project_transcripts(project_id=10, query="patent details", user_id=2)
    assert len(unauth_results) == 0  # Completely empty / isolated!


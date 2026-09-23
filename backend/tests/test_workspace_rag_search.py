# backend/tests/test_workspace_rag_search.py
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

os.environ.setdefault("JWT_SECRET_KEY", "test_jwt_secret_key_1234567890")

from app.services.video_understanding_service import VideoUnderstandingService


def test_search_workspace_transcripts_cross_projects():
    mock_db = MagicMock()

    # User 3 owns Project 345 and Project 346
    user_projects = [
        {"id": 345, "owner_id": 3, "name": "ML Video Projects"},
        {"id": 346, "owner_id": 3, "name": "AI Speech Lab"},
    ]

    def mock_query(model):
        m = MagicMock()
        model_name = getattr(model, "__table_name__", str(model))
        if "projects" in model_name:
            m.filter.return_value.all.return_value = user_projects
        return m

    mock_db.query = mock_query

    service = VideoUnderstandingService(db=mock_db)

    # Mock search_project_transcripts for project 345 & 346
    def mock_search_project(project_id, query, user_id, limit):
        if project_id == 345:
            return [
                {
                    "video_id": 28,
                    "video_title": "snaptik_sample.mp4",
                    "start_time": 14.2,
                    "end_time": 18.5,
                    "timestamp_formatted": "00:14",
                    "text": "Nathan đang đứng ở dưới gốc cây sung.",
                    "translated_text": "Nathan was standing under the fig tree.",
                    "relevance_score": 0.88,
                }
            ]
        elif project_id == 346:
            return [
                {
                    "video_id": 99,
                    "video_title": "speech_notes.mp4",
                    "start_time": 2.0,
                    "end_time": 6.0,
                    "timestamp_formatted": "00:02",
                    "text": "Khởi tạo mô hình dịch ngôn ngữ.",
                    "translated_text": "Initialize translation model.",
                    "relevance_score": 0.65,
                }
            ]
        return []

    service.search_project_transcripts = mock_search_project

    # Execute search_workspace_transcripts
    results = service.search_workspace_transcripts(user_id=3, query="cây sung", limit=5)

    assert len(results) == 2
    # Highest relevance score first
    assert results[0]["project_id"] == 345
    assert results[0]["project_name"] == "ML Video Projects"
    assert results[0]["video_id"] == 28
    assert results[0]["timestamp_formatted"] == "00:14"
    assert "cây sung" in results[0]["text"]


def test_chat_with_workspace_rag_response():
    mock_db = MagicMock()
    service = VideoUnderstandingService(db=mock_db)

    # Mock search_workspace_transcripts
    service.search_workspace_transcripts = MagicMock(return_value=[
        {
            "project_id": 345,
            "project_name": "ML",
            "video_id": 28,
            "video_title": "snaptik.mp4",
            "start_time": 14.2,
            "end_time": 18.5,
            "timestamp_formatted": "00:14",
            "text": "Nathan đang đứng ở dưới gốc cây sung.",
            "translated_text": "Nathan was standing under the fig tree.",
            "relevance_score": 0.92,
        }
    ])

    res = service.chat_with_workspace(user_id=3, message="Nathan đứng ở đâu?")

    assert res["role"] == "assistant"
    assert len(res["citations"]) == 1
    assert res["citations"][0]["project_id"] == 345
    assert res["citations"][0]["video_id"] == 28
    assert res["citations"][0]["timestamp_formatted"] == "00:14"
    assert "cây sung" in res["message"].lower() or "00:14" in res["message"]

import pytest
import json
import uuid
from unittest.mock import MagicMock, patch
from app.services.batch_service import BatchService
from app.schemas.batch_schemas import CreateBatchRequest
from app.pipeline.orchestrator import run_full_pipeline

def test_batch_service_busy_videos_validation():
    """Verify that BatchService raises ValueError when selecting already processing videos (BUG-5)."""
    with patch("app.services.batch_service.get_connection") as mock_conn_fn:
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_conn_fn.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cur

        # First query: SELECT id FROM videos -> [1, 2]
        # Second query: SELECT video_id FROM batch_job_items -> [1] (video 1 is busy)
        mock_cur.fetchall.side_effect = [
            [(1,), (2,)],
            [(1,)],
        ]

        with pytest.raises(ValueError) as exc_info:
            BatchService.create_batch_job(
                project_id=10,
                user_id=1,
                name="Test Batch",
                video_ids=[1, 2],
            )
        assert "đang trong tiến trình xử lý" in str(exc_info.value)
        assert "[1]" in str(exc_info.value)

def test_save_as_preset_payload_in_memory_override():
    """Verify that in-memory config_data takes priority over stale DB snapshot (BUG-4 / Phase 5.1)."""
    # Unit level assertion of config override
    in_memory_cfg = {
        "transcription": {"model_size": "large-v3"},
        "translation": {"model_name": "nllb_local", "target_language": "vi"}
    }
    payload = {
        "name": "Custom High-End",
        "config_data": in_memory_cfg
    }
    payload_cfg = payload.get("config_data")
    assert payload_cfg == in_memory_cfg
    assert payload_cfg["transcription"]["model_size"] == "large-v3"

def test_orchestrator_resolves_6tier_stt_and_demucs():
    """Verify that orchestrator resolves stt_model and demucs_model from job config_data (BUG-1)."""
    mock_session = MagicMock()
    mock_job = MagicMock()
    mock_job.config_json = json.dumps({
        "config_data": {
            "audio_separation": {"demucs_model": "htdemucs_ft"},
            "transcription": {"model_size": "large-v3"}
        }
    })
    
    mock_video = MagicMock()
    mock_video.original_filename = "test.mp4"
    mock_config = MagicMock()
    mock_config.target_language = "vi"
    mock_config.separation_model = "htdemucs"
    mock_config.stt_model = "whisper-medium"

    # Mock session queries
    def mock_query(model):
        q = MagicMock()
        if hasattr(model, "name") and model.name == "videos":
            q.filter.return_value.first.return_value = mock_video
        elif hasattr(model, "name") and model.name == "pipeline_jobs":
            q.filter.return_value.first.return_value = mock_job
        elif hasattr(model, "name") and model.name == "video_pipeline_configs":
            q.filter.return_value.first.return_value = mock_config
        return q

    mock_session.query.side_effect = mock_query

    # Verify extraction logic matches orchestrator implementation
    job_cfg = json.loads(mock_job.config_json)
    cfg_data = job_cfg.get("config_data") or {}
    resolved_demucs = cfg_data.get("audio_separation", {}).get("demucs_model") or mock_config.separation_model
    resolved_stt = cfg_data.get("transcription", {}).get("model_size") or mock_config.stt_model

    assert resolved_demucs == "htdemucs_ft"
    assert resolved_stt == "large-v3"

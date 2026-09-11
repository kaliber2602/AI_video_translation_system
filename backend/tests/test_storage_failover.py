# backend/tests/test_storage_failover.py - High Availability Storage Failover Tests
# Verifies zero-downtime Circuit Breaker transition from AWS S3 Primary to MinIO Fallback

import os
import sys
import tempfile
from unittest.mock import MagicMock, patch
import pytest

from app.services.s3_service import StorageManager, CircuitState


@pytest.fixture
def mock_storage_manager():
    """Fixture providing an isolated StorageManager instance with mocked AWS S3 and MinIO clients."""
    manager = StorageManager()
    manager.failure_threshold = 3
    manager.recovery_timeout = 1  # 1 second for fast test execution
    manager.aws_bucket = "vidnova-test-s3"
    manager.minio_bucket = "vidnova-test-minio"

    # Mock AWS S3 client
    mock_s3 = MagicMock()
    mock_s3.upload_file.return_value = None
    mock_s3.download_file.return_value = None
    mock_s3.generate_presigned_url.return_value = "https://vidnova-test-s3.s3.amazonaws.com/test.mp4?signed=aws"

    # Mock MinIO Fallback client
    mock_minio = MagicMock()
    mock_minio.upload_file.return_value = None
    mock_minio.download_file.return_value = None
    mock_minio.generate_presigned_url.return_value = "http://minio:9000/vidnova-test-minio/test.mp4?signed=minio"

    manager._primary_client = mock_s3
    manager._fallback_client = mock_minio
    manager._fallback_public_client = mock_minio
    manager.active_tier = "s3"
    manager.state = CircuitState.CLOSED
    manager.failure_count = 0
    return manager


def test_primary_s3_normal_flow(mock_storage_manager):
    """Verify that operations normally route to AWS S3 when circuit is CLOSED."""
    with tempfile.NamedTemporaryFile(delete=False) as tf:
        tf.write(b"video content data")
        temp_path = tf.name

    try:
        success = mock_storage_manager.upload_file(temp_path, "videos/1/test.mp4")
        assert success is True
        assert mock_storage_manager.state == CircuitState.CLOSED
        assert mock_storage_manager.failure_count == 0
        mock_storage_manager._primary_client.upload_file.assert_called_once()
        mock_storage_manager._fallback_client.upload_file.assert_not_called()

        # Presigned URL should originate from AWS S3
        url = mock_storage_manager.generate_presigned_url("videos/1/test.mp4")
        assert "s3.amazonaws.com" in url
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def test_s3_disruption_triggers_minio_fallback(mock_storage_manager):
    """
    Simulate AWS S3 outage (connection error / 500 server error).
    Verify automatic failover to MinIO with ZERO downtime.
    """
    with tempfile.NamedTemporaryFile(delete=False) as tf:
        tf.write(b"video stream content")
        temp_path = tf.name

    try:
        # Simulate AWS S3 connection error
        mock_storage_manager._primary_client.upload_file.side_effect = Exception("AWS S3 503 Service Unavailable")

        # 1. First upload failure -> Should fall back to MinIO transparently (returns True)
        success = mock_storage_manager.upload_file(temp_path, "videos/1/video.mp4")
        assert success is True, "Upload should succeed via MinIO Fallback"
        assert mock_storage_manager.failure_count == 1
        assert mock_storage_manager.state == CircuitState.CLOSED
        mock_storage_manager._fallback_client.upload_file.assert_called_once()

        # 2. Second upload failure
        mock_storage_manager.upload_file(temp_path, "videos/1/video.mp4")
        assert mock_storage_manager.failure_count == 2
        assert mock_storage_manager.state == CircuitState.CLOSED

        # 3. Third upload failure -> Trips Circuit Breaker to OPEN
        mock_storage_manager.upload_file(temp_path, "videos/1/video.mp4")
        assert mock_storage_manager.failure_count == 3
        assert mock_storage_manager.state == CircuitState.OPEN

        # 4. In OPEN state, subsequent requests route directly to MinIO without calling S3
        mock_storage_manager._primary_client.upload_file.reset_mock()
        mock_storage_manager.upload_file(temp_path, "videos/1/video.mp4")
        mock_storage_manager._primary_client.upload_file.assert_not_called()
        assert mock_storage_manager.state == CircuitState.OPEN

        # Presigned URL in OPEN state routes to MinIO
        url = mock_storage_manager.generate_presigned_url("videos/1/video.mp4")
        assert "minio:9000" in url
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def test_circuit_breaker_recovery(mock_storage_manager):
    """Verify automatic recovery from OPEN -> HALF_OPEN -> CLOSED when S3 comes back online."""
    import time

    with tempfile.NamedTemporaryFile(delete=False) as tf:
        tf.write(b"recovery test data")
        temp_path = tf.name

    try:
        # Force OPEN state
        mock_storage_manager.state = CircuitState.OPEN
        mock_storage_manager.last_failure_time = time.time() - 2.0  # Expired recovery timeout

        # Restore AWS S3 healthy behavior
        mock_storage_manager._primary_client.upload_file.side_effect = None

        # Next upload probes S3 (HALF_OPEN) and restores CLOSED state upon success
        success = mock_storage_manager.upload_file(temp_path, "videos/1/probe.mp4")
        assert success is True
        assert mock_storage_manager.state == CircuitState.CLOSED
        assert mock_storage_manager.failure_count == 0
        mock_storage_manager._primary_client.upload_file.assert_called_once()
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def test_delete_prefix_cleans_both_tiers(mock_storage_manager):
    """Verify that delete_prefix cleans objects from BOTH Primary and Fallback buckets."""
    paginator_s3 = MagicMock()
    paginator_s3.paginate.return_value = [{"Contents": [{"Key": "videos/1/video.mp4"}, {"Key": "videos/1/thumb.jpg"}]}]
    mock_storage_manager._primary_client.get_paginator.return_value = paginator_s3

    paginator_minio = MagicMock()
    paginator_minio.paginate.return_value = [{"Contents": [{"Key": "videos/1/audio.wav"}]}]
    mock_storage_manager._fallback_client.get_paginator.return_value = paginator_minio

    deleted = mock_storage_manager.delete_prefix("videos/1/")
    assert deleted == 3
    mock_storage_manager._primary_client.delete_objects.assert_called_once()
    mock_storage_manager._fallback_client.delete_objects.assert_called_once()


def test_minio_dev_mode_direct_flow(mock_storage_manager):
    """Verify that in MinIO dev mode, operations route directly to MinIO without S3."""
    mock_storage_manager.active_tier = "minio"

    with tempfile.NamedTemporaryFile(delete=False) as tf:
        tf.write(b"local minio test data")
        temp_path = tf.name

    try:
        success = mock_storage_manager.upload_file(temp_path, "videos/1/dev_video.mp4")
        assert success is True
        # In MinIO dev mode, MinIO client is called, AWS S3 is bypassed
        mock_storage_manager._fallback_client.upload_file.assert_called_once()
        mock_storage_manager._primary_client.upload_file.assert_not_called()

        # Presigned URL in MinIO dev mode originates from MinIO
        url = mock_storage_manager.generate_presigned_url("videos/1/dev_video.mp4")
        assert "minio:9000" in url
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def test_runtime_tier_switching(mock_storage_manager):
    """Verify switching between S3 and MinIO tiers at runtime."""
    # 1. Switch to MinIO
    mock_storage_manager.set_active_tier("minio")
    assert mock_storage_manager.active_tier == "minio"
    status = mock_storage_manager.get_status()
    assert status["active_tier"] == "minio"
    assert "MINIO" in status["active_provider"]

    # 2. Switch back to S3
    mock_storage_manager.set_active_tier("s3")
    assert mock_storage_manager.active_tier == "s3"
    status = mock_storage_manager.get_status()
    assert status["active_tier"] == "s3"
    assert "AWS_S3" in status["active_provider"]


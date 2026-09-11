# app/services/s3_service.py - Production High-Availability Object Storage
# AWS S3 Primary + MinIO Fallback with Circuit Breaker Pattern

import os
import time
import logging
import threading
from enum import Enum
from pathlib import Path
from typing import Optional, Dict, Any, List

try:
    import boto3
    from botocore.config import Config as BotoConfig
    from botocore.exceptions import ClientError, EndpointConnectionError, ConnectTimeoutError
except ImportError:
    boto3 = None
    ClientError = Exception
    EndpointConnectionError = Exception
    ConnectTimeoutError = Exception
    BotoConfig = None

from app.core.config import (
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_REGION,
    AWS_S3_BUCKET,
    AWS_S3_ENDPOINT_URL,
    MINIO_ENDPOINT_URL,
    MINIO_PUBLIC_URL,
    MINIO_ACCESS_KEY,
    MINIO_SECRET_KEY,
    MINIO_BUCKET,
    MINIO_REGION,
    STORAGE_CIRCUIT_BREAKER_ENABLED,
    STORAGE_FAILURE_THRESHOLD,
    STORAGE_RECOVERY_TIMEOUT_SECONDS,
    STORAGE_MODE,
)

logger = logging.getLogger("app.services.s3_service")


class CircuitState(str, Enum):
    CLOSED = "CLOSED"        # Normal: Traffic directed to AWS S3 Primary
    OPEN = "OPEN"            # Failover: AWS S3 is down, traffic routed to MinIO Fallback
    HALF_OPEN = "HALF_OPEN"  # Testing: Testing AWS S3 recovery with probe requests


class StorageManager:
    """
    High-Availability Object Storage Manager supporting both AWS S3 and MinIO:
    - Production Mode ('s3'): AWS S3 as Primary Cloud Storage + MinIO as Fallback with Circuit Breaker.
    - Development Mode ('minio'): MinIO directly as Primary Storage for rapid local testing without AWS latency.
    - Seamless switching: Both S3 and MinIO can be used at any time via STORAGE_MODE or runtime method.
    """

    def __init__(self):
        self.lock = threading.Lock()
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0.0
        self.failure_threshold = STORAGE_FAILURE_THRESHOLD
        self.recovery_timeout = STORAGE_RECOVERY_TIMEOUT_SECONDS
        self.circuit_breaker_enabled = STORAGE_CIRCUIT_BREAKER_ENABLED

        self.aws_bucket = AWS_S3_BUCKET
        self.minio_bucket = MINIO_BUCKET

        self.storage_mode = STORAGE_MODE
        self.active_tier = self._resolve_active_tier(self.storage_mode)

        self._primary_client = None
        self._fallback_client = None
        self._fallback_public_client = None
        self._init_clients()

    def _resolve_active_tier(self, mode: str) -> str:
        """Resolve whether S3 or MinIO is the primary active tier."""
        clean_mode = (mode or "auto").lower().strip()
        if clean_mode in ("minio", "local", "dev", "development"):
            return "minio"
        if clean_mode in ("s3", "aws", "prod", "production"):
            return "s3"

        # In "auto" mode:
        # Check if real AWS credentials exist (not minioadmin and not placeholder)
        is_minio_creds = AWS_ACCESS_KEY_ID in (None, "", "minioadmin", "your_aws_access_key_id", "AKIA_EXAMPLE")
        env = os.getenv("ENVIRONMENT", "development").lower().strip()
        if not is_minio_creds and env in ("production", "prod", "staging"):
            return "s3"

        # In dev or without cloud keys, default to MinIO for zero-latency local development
        return "minio"

    def set_active_tier(self, tier: str):
        """Switch active storage tier at runtime ('s3' or 'minio')."""
        with self.lock:
            target = tier.lower().strip()
            if target not in ("s3", "minio"):
                raise ValueError(f"Invalid storage tier '{tier}'. Must be 's3' or 'minio'.")
            self.active_tier = target
            logger.info(f"[StorageManager] Switched active storage tier to: {target.upper()}")

    def _init_clients(self):
        if boto3 is None:
            logger.warning("[StorageManager] boto3 is not installed; storage operations will be disabled.")
            return

        boto_config = BotoConfig(
            connect_timeout=5,
            read_timeout=10,
            retries={"max_attempts": 2, "mode": "standard"},
        )

        # 1. Initialize AWS S3 Primary Client (only if credentials are provided and not MinIO defaults)
        is_minio_default = AWS_ACCESS_KEY_ID in ("minioadmin", "your_aws_access_key_id") and not AWS_S3_ENDPOINT_URL
        if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and not is_minio_default:
            try:
                self._primary_client = boto3.client(
                    "s3",
                    region_name=AWS_REGION,
                    aws_access_key_id=AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                    endpoint_url=AWS_S3_ENDPOINT_URL,
                    config=boto_config,
                )
                logger.info(f"[StorageManager] AWS S3 client ready (Region: {AWS_REGION}, Bucket: {self.aws_bucket})")
            except Exception as e:
                logger.warning(f"[StorageManager] Failed to initialize AWS S3 client: {e}")
                self._primary_client = None
        else:
            logger.info("[StorageManager] AWS cloud credentials not configured. MinIO available for storage.")

        # 2. Initialize MinIO Client (Internal container network)
        try:
            self._fallback_client = boto3.client(
                "s3",
                endpoint_url=MINIO_ENDPOINT_URL,
                region_name=MINIO_REGION,
                aws_access_key_id=MINIO_ACCESS_KEY,
                aws_secret_access_key=MINIO_SECRET_KEY,
                config=boto_config,
            )
            logger.info(f"[StorageManager] MinIO client ready (Endpoint: {MINIO_ENDPOINT_URL}, Bucket: {self.minio_bucket})")
        except Exception as e:
            logger.warning(f"[StorageManager] Failed to initialize MinIO client: {e}")
            self._fallback_client = None

        # 3. Initialize MinIO Public Client (For browser presigned URLs)
        try:
            public_endpoint = MINIO_PUBLIC_URL or MINIO_ENDPOINT_URL
            self._fallback_public_client = boto3.client(
                "s3",
                endpoint_url=public_endpoint,
                region_name=MINIO_REGION,
                aws_access_key_id=MINIO_ACCESS_KEY,
                aws_secret_access_key=MINIO_SECRET_KEY,
                config=boto_config,
            )
        except Exception:
            self._fallback_public_client = self._fallback_client

        logger.info(f"[StorageManager] Active storage tier: {self.active_tier.upper()} (Mode: {self.storage_mode})")

    def _check_circuit_state(self) -> CircuitState:
        with self.lock:
            if not self.circuit_breaker_enabled:
                return CircuitState.CLOSED if self._primary_client else CircuitState.OPEN

            if not self._primary_client:
                return CircuitState.OPEN

            now = time.time()
            if self.state == CircuitState.OPEN:
                if now - self.last_failure_time >= self.recovery_timeout:
                    logger.info("[StorageManager] Circuit Breaker entering HALF_OPEN probe state.")
                    self.state = CircuitState.HALF_OPEN
            return self.state

    def _record_success(self):
        with self.lock:
            if self.state in (CircuitState.HALF_OPEN, CircuitState.OPEN):
                logger.info("[StorageManager] AWS S3 recovered! Circuit Breaker reset to CLOSED.")
            self.state = CircuitState.CLOSED
            self.failure_count = 0

    def _record_failure(self, error: Exception):
        with self.lock:
            self.failure_count += 1
            self.last_failure_time = time.time()
            logger.warning(f"[StorageManager] S3 operation failed ({self.failure_count}/{self.failure_threshold}): {error}")

            if self.failure_count >= self.failure_threshold and self.state != CircuitState.OPEN:
                self.state = CircuitState.OPEN
                logger.critical(
                    f"[StorageManager] Circuit Breaker TRIPPED to OPEN! Failures={self.failure_count}. "
                    f"Rerouting all storage I/O to MinIO Fallback for {self.recovery_timeout}s."
                )

    def _ensure_bucket(self, client, bucket: str, region: str) -> bool:
        if not client or not bucket:
            return False
        try:
            client.head_bucket(Bucket=bucket)
            return True
        except Exception:
            try:
                if region and region not in ("us-east-1", ""):
                    client.create_bucket(
                        Bucket=bucket,
                        CreateBucketConfiguration={"LocationConstraint": region},
                    )
                else:
                    client.create_bucket(Bucket=bucket)
                return True
            except Exception as e:
                logger.warning(f"[StorageManager] Could not ensure bucket '{bucket}': {e}")
                return False

    def ensure_buckets_exist(self) -> Dict[str, bool]:
        """Ensure both AWS S3 and MinIO buckets exist."""
        results = {"primary": False, "fallback": False}
        if self._primary_client:
            results["primary"] = self._ensure_bucket(self._primary_client, self.aws_bucket, AWS_REGION)
        if self._fallback_client:
            results["fallback"] = self._ensure_bucket(self._fallback_client, self.minio_bucket, MINIO_REGION)
        return results

    # =========================================================
    # CORE STORAGE OPERATIONS WITH CIRCUIT BREAKER FAILOVER
    # =========================================================

    def upload_file(
        self,
        local_path: str,
        s3_key: str,
        content_type: Optional[str] = None,
        extra_args: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Upload file to active storage tier:
        - If active_tier is 'minio' (Dev/Testing): Uploads directly to MinIO.
        - If active_tier is 's3' (Production): Uploads to AWS S3 Primary with Circuit Breaker failover to MinIO.
        """
        if not os.path.exists(local_path):
            logger.error(f"[StorageManager] File does not exist: {local_path}")
            return False

        upload_args = dict(extra_args or {})
        if content_type:
            upload_args["ContentType"] = content_type

        # 1. Dev / MinIO active tier (Direct to MinIO)
        if self.active_tier == "minio":
            if self._fallback_client and self.minio_bucket:
                try:
                    self._ensure_bucket(self._fallback_client, self.minio_bucket, MINIO_REGION)
                    self._fallback_client.upload_file(
                        local_path,
                        self.minio_bucket,
                        s3_key,
                        ExtraArgs=upload_args,
                    )
                    logger.debug(f"[StorageManager] Uploaded to MinIO (Dev Mode): {s3_key}")
                    return True
                except Exception as exc:
                    logger.warning(f"[StorageManager] MinIO upload failed, trying S3 if available: {exc}")
                    if self._primary_client:
                        try:
                            self._primary_client.upload_file(local_path, self.aws_bucket, s3_key, ExtraArgs=upload_args)
                            return True
                        except Exception:
                            pass
                    return False

        # 2. Production AWS S3 active tier with Circuit Breaker
        state = self._check_circuit_state()
        if state in (CircuitState.CLOSED, CircuitState.HALF_OPEN) and self._primary_client:
            try:
                self._primary_client.upload_file(
                    local_path,
                    self.aws_bucket,
                    s3_key,
                    ExtraArgs=upload_args,
                )
                self._record_success()
                logger.debug(f"[StorageManager] Uploaded to AWS S3: {s3_key}")
                return True
            except (EndpointConnectionError, ConnectTimeoutError, ClientError, Exception) as exc:
                self._record_failure(exc)
                logger.warning(f"[StorageManager] Falling back to MinIO for upload: {s3_key}")

        # Fallback to MinIO
        if self._fallback_client and self.minio_bucket:
            try:
                self._ensure_bucket(self._fallback_client, self.minio_bucket, MINIO_REGION)
                self._fallback_client.upload_file(
                    local_path,
                    self.minio_bucket,
                    s3_key,
                    ExtraArgs=upload_args,
                )
                logger.info(f"[StorageManager] Successfully uploaded to MinIO Fallback: {s3_key}")
                return True
            except Exception as exc:
                logger.error(f"[StorageManager] Fallback upload to MinIO also failed: {exc}")
                return False

        logger.error("[StorageManager] No available storage client to upload file.")
        return False

    def download_file(self, s3_key: str, local_path: str) -> bool:
        """Download file from active tier, with cross-tier fallback."""
        os.makedirs(os.path.dirname(os.path.abspath(local_path)), exist_ok=True)

        if self.active_tier == "minio":
            # Check MinIO first
            if self._fallback_client and self.minio_bucket:
                try:
                    self._fallback_client.download_file(self.minio_bucket, s3_key, local_path)
                    logger.debug(f"[StorageManager] Downloaded from MinIO: {s3_key}")
                    return True
                except Exception:
                    pass
            # Cross-check S3 if available
            if self._primary_client and self.aws_bucket:
                try:
                    self._primary_client.download_file(self.aws_bucket, s3_key, local_path)
                    logger.debug(f"[StorageManager] Downloaded from S3 (cross-check): {s3_key}")
                    return True
                except Exception:
                    pass
            return False

        # Production S3 tier
        state = self._check_circuit_state()
        if state in (CircuitState.CLOSED, CircuitState.HALF_OPEN) and self._primary_client:
            try:
                self._primary_client.download_file(self.aws_bucket, s3_key, local_path)
                self._record_success()
                return True
            except (EndpointConnectionError, ConnectTimeoutError, ClientError, Exception) as exc:
                self._record_failure(exc)
                logger.info(f"[StorageManager] S3 download failed or missing. Trying MinIO: {s3_key}")

        # Fallback to MinIO
        if self._fallback_client and self.minio_bucket:
            try:
                self._fallback_client.download_file(self.minio_bucket, s3_key, local_path)
                logger.info(f"[StorageManager] Downloaded from MinIO Fallback: {s3_key}")
                return True
            except Exception as exc:
                logger.warning(f"[StorageManager] File not found in MinIO Fallback: {s3_key} ({exc})")
                return False

        return False

    def delete_file(self, s3_key: str) -> bool:
        """Delete file from BOTH Primary and Fallback to prevent orphan media."""
        success = False

        if self._primary_client and self.aws_bucket:
            try:
                self._primary_client.delete_object(Bucket=self.aws_bucket, Key=s3_key)
                success = True
            except Exception as e:
                logger.warning(f"[StorageManager] Could not delete {s3_key} from AWS S3: {e}")

        if self._fallback_client and self.minio_bucket:
            try:
                self._fallback_client.delete_object(Bucket=self.minio_bucket, Key=s3_key)
                success = True
            except Exception as e:
                logger.warning(f"[StorageManager] Could not delete {s3_key} from MinIO: {e}")

        return success

    def delete_prefix(self, prefix: str) -> int:
        """Delete all objects matching prefix from BOTH Primary and Fallback."""
        deleted_count = 0

        def _clean_bucket(client, bucket):
            nonlocal deleted_count
            if not client or not bucket:
                return
            try:
                paginator = client.get_paginator("list_objects_v2")
                for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
                    objects = page.get("Contents", [])
                    if not objects:
                        continue
                    delete_keys = [{"Key": obj["Key"]} for obj in objects]
                    client.delete_objects(Bucket=bucket, Delete={"Objects": delete_keys})
                    deleted_count += len(delete_keys)
                    logger.info(f"[StorageManager] Deleted {len(delete_keys)} objects under prefix '{prefix}' from {bucket}")
            except Exception as e:
                logger.warning(f"[StorageManager] Error deleting prefix '{prefix}' from {bucket}: {e}")

        _clean_bucket(self._primary_client, self.aws_bucket)
        _clean_bucket(self._fallback_client, self.minio_bucket)
        return deleted_count

    def generate_presigned_url(
        self,
        s3_key: str,
        expires_in: int = 3600,
        http_method: str = "get_object",
        response_content_disposition: Optional[str] = None,
        response_content_type: Optional[str] = None,
    ) -> Optional[str]:
        """Generate browser-accessible presigned URL according to active storage tier."""
        params: Dict[str, Any] = {"Key": s3_key}
        if response_content_disposition:
            params["ResponseContentDisposition"] = response_content_disposition
        if response_content_type:
            params["ResponseContentType"] = response_content_type

        # 1. Dev / MinIO active tier
        if self.active_tier == "minio":
            client = self._fallback_public_client or self._fallback_client
            if client and self.minio_bucket:
                try:
                    params["Bucket"] = self.minio_bucket
                    return client.generate_presigned_url(
                        http_method,
                        Params=params,
                        ExpiresIn=expires_in,
                    )
                except Exception as exc:
                    logger.error(f"[StorageManager] MinIO presigned URL generation failed: {exc}")
                    return None

        # 2. Production AWS S3 tier with Circuit Breaker
        state = self._check_circuit_state()
        if state in (CircuitState.CLOSED, CircuitState.HALF_OPEN) and self._primary_client:
            try:
                params["Bucket"] = self.aws_bucket
                url = self._primary_client.generate_presigned_url(
                    http_method,
                    Params=params,
                    ExpiresIn=expires_in,
                )
                self._record_success()
                return url
            except Exception as exc:
                self._record_failure(exc)
                logger.warning(f"[StorageManager] Failed to generate S3 presigned URL. Falling back to MinIO: {exc}")

        # Fallback to MinIO Public Client
        client = self._fallback_public_client or self._fallback_client
        if client and self.minio_bucket:
            try:
                params["Bucket"] = self.minio_bucket
                url = client.generate_presigned_url(
                    http_method,
                    Params=params,
                    ExpiresIn=expires_in,
                )
                return url
            except Exception as exc:
                logger.error(f"[StorageManager] MinIO presigned URL generation failed: {exc}")
                return None

        return None

    def upload_hls_directory(
        self,
        local_dir: str,
        s3_prefix: str,
        content_type_map: Optional[dict] = None,
    ) -> dict:
        """Upload all files in an HLS directory (.m3u8 and .ts files) with failover."""
        if content_type_map is None:
            content_type_map = {
                ".m3u8": "application/x-mpegURL",
                ".ts": "video/mp2t",
            }

        uploaded_files = {
            "playlists": [],
            "segments": [],
            "master_playlist": None,
        }

        for root, dirs, files in os.walk(local_dir):
            for file in files:
                local_path = os.path.join(root, file)
                relative_path = os.path.relpath(local_path, local_dir)
                ext = os.path.splitext(file)[1]
                content_type = content_type_map.get(ext, "application/octet-stream")
                s3_key = f"{s3_prefix}/{relative_path}".replace("\\", "/")

                self.upload_file(local_path, s3_key, content_type)

                if ext == ".m3u8":
                    if "master.m3u8" in file:
                        uploaded_files["master_playlist"] = s3_key
                    else:
                        uploaded_files["playlists"].append(s3_key)
                elif ext == ".ts":
                    uploaded_files["segments"].append(s3_key)

        return uploaded_files

    def get_status(self) -> Dict[str, Any]:
        """Return diagnostic health and circuit breaker status."""
        state = self._check_circuit_state()
        active_provider = "MINIO (Dev/Local)" if self.active_tier == "minio" else (
            "AWS_S3 (Production)" if state == CircuitState.CLOSED and self._primary_client else "MINIO_FALLBACK"
        )
        return {
            "storage_mode": self.storage_mode,
            "active_tier": self.active_tier,
            "circuit_state": state.value,
            "failure_count": self.failure_count,
            "failure_threshold": self.failure_threshold,
            "recovery_timeout_seconds": self.recovery_timeout,
            "primary_available": bool(self._primary_client),
            "fallback_available": bool(self._fallback_client),
            "active_provider": active_provider,
            "aws_bucket": self.aws_bucket,
            "minio_bucket": self.minio_bucket,
        }


# Singleton StorageManager instance
storage_manager = StorageManager()


# Module-level convenience functions (preserving backward compatibility)
def get_storage_manager() -> StorageManager:
    return storage_manager


def ensure_bucket_exists(bucket_name: Optional[str] = None) -> bool:
    res = storage_manager.ensure_buckets_exist()
    return res.get("primary") or res.get("fallback")


def upload_file(local_path: str, s3_key: str, content_type: Optional[str] = None) -> None:
    storage_manager.upload_file(local_path, s3_key, content_type)


def download_file(s3_key: str, local_path: str) -> bool:
    return storage_manager.download_file(s3_key, local_path)


def delete_file(s3_key: str) -> bool:
    return storage_manager.delete_file(s3_key)


def delete_prefix(prefix: str) -> int:
    return storage_manager.delete_prefix(prefix)


def generate_presigned_url(
    s3_key: str,
    expires_in: int = 3600,
    http_method: str = "get_object",
    response_content_disposition: Optional[str] = None,
    response_content_type: Optional[str] = None,
) -> Optional[str]:
    return storage_manager.generate_presigned_url(
        s3_key,
        expires_in=expires_in,
        http_method=http_method,
        response_content_disposition=response_content_disposition,
        response_content_type=response_content_type,
    )


def upload_hls_directory(local_dir: str, s3_prefix: str, content_type_map: Optional[dict] = None) -> dict:
    return storage_manager.upload_hls_directory(local_dir, s3_prefix, content_type_map)


def set_storage_tier(tier: str):
    storage_manager.set_active_tier(tier)


# Expose s3 client proxy for legacy references
s3 = storage_manager._primary_client or storage_manager._fallback_client


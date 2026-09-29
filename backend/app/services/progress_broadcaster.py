import json
import logging
import time
from typing import Optional, Any, Dict
import redis
from app.core.config import REDIS_URL

logger = logging.getLogger(__name__)

# Synchronous Redis client for Celery workers
_sync_redis_client: Optional[redis.Redis] = None


def get_sync_redis() -> redis.Redis:
    global _sync_redis_client
    if _sync_redis_client is None:
        _sync_redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
    return _sync_redis_client


def publish_video_progress(
    video_id: int,
    step: str,
    progress: int,
    message: str,
    status: str = "processing",
    meta: Optional[Dict[str, Any]] = None,
) -> bool:
    """
    Broadcasts real-time progress to Redis Pub/Sub channel for immediate WebSocket streaming to open tabs.
    Channel format: 'channel:video_progress:{video_id}'
    """
    try:
        r = get_sync_redis()
        channel = f"channel:video_progress:{video_id}"
        payload = {
            "video_id": video_id,
            "step": step,
            "progress": max(0, min(100, int(progress))),
            "message": message,
            "status": status,
            "timestamp": time.time(),
            "meta": meta or {},
        }
        r.publish(channel, json.dumps(payload))
        return True
    except Exception as e:
        logger.warning(f"⚠️ [Redis PubSub] Failed to publish video progress for Video #{video_id}: {e}")
        return False

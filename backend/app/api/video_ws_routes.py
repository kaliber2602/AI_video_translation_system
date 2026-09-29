import asyncio
import json
import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
import redis.asyncio as aioredis

from app.core.config import REDIS_URL
from app.core.security import get_user_id_from_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["WebSockets"])


@router.websocket("/videos/{video_id}/progress")
async def video_progress_websocket(
    websocket: WebSocket,
    video_id: int,
    token: Optional[str] = Query(None),
):
    """
    Real-time bidirectional WebSocket stream for video progress updates (Mechanism 1).
    Subscribes to Redis Pub/Sub channel 'channel:video_progress:{video_id}'.
    Falls back to periodic ping/pong keep-alive.
    """
    # 1. Validate Authentication
    user_id: Optional[int] = None
    if token:
        try:
            user_id = get_user_id_from_token(token, "access")
        except Exception as auth_err:
            logger.warning(f"⚠️ [WebSocket] Auth failed for video {video_id}: {auth_err}")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    await websocket.accept()
    logger.info(f"🔌 [WebSocket Connected] User {user_id or 'anonymous'} subscribed to Video #{video_id}")

    redis_conn: Optional[aioredis.Redis] = None
    pubsub: Optional[aioredis.client.PubSub] = None
    channel_name = f"channel:video_progress:{video_id}"

    try:
        redis_conn = aioredis.from_url(REDIS_URL, decode_responses=True)
        pubsub = redis_conn.pubsub()
        await pubsub.subscribe(channel_name)

        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connection_ack",
            "video_id": video_id,
            "message": f"Connected to real-time stream for Video #{video_id}"
        })

        async def redis_listener():
            try:
                async for message in pubsub.listen():
                    if message and message.get("type") == "message":
                        raw_data = message.get("data")
                        if raw_data:
                            try:
                                data = json.loads(raw_data)
                                await websocket.send_json(data)
                            except Exception as parse_err:
                                logger.debug(f"Error parsing pubsub message: {parse_err}")
            except asyncio.CancelledError:
                pass
            except Exception as listener_err:
                logger.debug(f"Redis listener ended: {listener_err}")

        listener_task = asyncio.create_task(redis_listener())

        # Keep socket open and listen for client heartbeats/pings
        try:
            while True:
                client_msg = await websocket.receive_text()
                if client_msg == "ping":
                    await websocket.send_text("pong")
        except WebSocketDisconnect:
            pass
        except Exception:
            pass
        finally:
            listener_task.cancel()
            try:
                await listener_task
            except (asyncio.CancelledError, Exception):
                pass

    except Exception as exc:
        logger.error(f"❌ [WebSocket Error] Video #{video_id}: {exc}")
    finally:
        if pubsub:
            try:
                await pubsub.unsubscribe(channel_name)
                await pubsub.close()
            except Exception:
                pass
        if redis_conn:
            try:
                await redis_conn.close()
            except Exception:
                pass
        logger.info(f"🔌 [WebSocket Disconnected] Video #{video_id}")

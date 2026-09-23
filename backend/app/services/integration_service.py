# app/services/integration_service.py - System AI Status & User API Keys
import hashlib
import json
import secrets
from typing import Any, Dict, List, Optional
from datetime import datetime

from app.core.database import get_connection
from app.core.config import (
    OLLAMA_BASE_URL,
    OLLAMA_MODEL,
    GEMINI_API_KEY,
    GROQ_API_KEY,
    OPENAI_API_KEY,
    CLAUDE_API_KEY,
    ELEVENLABS_API_KEY,
    HF_TOKEN,
)

AVAILABLE_APPS = [
    {
        "id": "ollama_local",
        "name": "Ollama Local GPU (DeepSeek / Qwen)",
        "category": "ai",
        "description": "Local offline reasoning & summarization powered by your GPU (RTX 4060). 100% Free & Private.",
        "iconName": "cpu",
    },
    {
        "id": "gemini_free",
        "name": "Google Gemini 2.0 / 1.5 Flash",
        "category": "ai",
        "description": "Google AI Studio Free Tier (1,500 requests/day, 15 RPM). High speed multilingual comprehension.",
        "iconName": "sparkles",
    },
    {
        "id": "groq_free",
        "name": "Groq Cloud Llama-3.3",
        "category": "ai",
        "description": "Ultra high-speed Cloud LLM inference (Free Tier).",
        "iconName": "zap",
    },
    {
        "id": "edge_tts",
        "name": "Microsoft Neural Edge-TTS",
        "category": "ai",
        "description": "Natural sounding multilingual & Vietnamese voice synthesis (Included & Free).",
        "iconName": "mic",
    },
    {
        "id": "nllb_local",
        "name": "Meta NLLB-200 Translation",
        "category": "ai",
        "description": "State-of-the-art offline translation across 200+ languages on local GPU.",
        "iconName": "globe",
    },
    {
        "id": "whisper_local",
        "name": "Faster-Whisper Speech-to-Text",
        "category": "ai",
        "description": "Highly optimized GPU speech recognition and automated timestamping.",
        "iconName": "radio",
    },
    {
        "id": "openai",
        "name": "OpenAI GPT & Whisper (Shared Key)",
        "category": "ai",
        "description": "System-wide configured OpenAI API key for premium cloud models.",
        "iconName": "cpu",
    },
    {
        "id": "elevenlabs",
        "name": "ElevenLabs Voice API (Shared Key)",
        "category": "ai",
        "description": "System-wide configured ElevenLabs API key for custom voice cloning.",
        "iconName": "volume-2",
    },
]


def get_user_integrations(user_id: int) -> List[Dict[str, Any]]:
    """
    Returns system-wide AI and cloud status.
    Keys are centrally managed in server .env rather than requiring users to provide personal keys.
    """
    result = []
    for app in AVAILABLE_APPS:
        app_id = app["id"]
        connected = False
        badge = "Offline"
        account_email = "System Managed"

        if app_id in ("edge_tts", "nllb_local", "whisper_local"):
            connected = True
            badge = "Active (Free)"
        elif app_id == "ollama_local":
            connected = True
            badge = "Active (GPU)"
            account_email = f"{OLLAMA_MODEL} @ {OLLAMA_BASE_URL}"
        elif app_id == "gemini_free":
            connected = bool(GEMINI_API_KEY)
            badge = "Active (Free Tier)" if connected else "Not Configured"
        elif app_id == "groq_free":
            connected = bool(GROQ_API_KEY)
            badge = "Active (Free Tier)" if connected else "Not Configured"
        elif app_id == "openai":
            connected = bool(OPENAI_API_KEY)
            badge = "System Ready" if connected else "Key Not Set"
        elif app_id == "elevenlabs":
            connected = bool(ELEVENLABS_API_KEY)
            badge = "System Ready" if connected else "Key Not Set"

        result.append({
            "id": app["id"],
            "name": app["name"],
            "category": app["category"],
            "description": app["description"],
            "iconName": app["iconName"],
            "connected": connected,
            "accountEmail": account_email,
            "badge": badge,
            "config": {
                "shared_system": True,
                "status": "ready" if connected else "disabled",
            },
        })
    return result


def update_user_integration(
    user_id: int,
    app_id: str,
    is_connected: bool,
    account_email: Optional[str] = None,
    config: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Deprecated for user API key storage: returns current status since keys are centrally loaded from .env.
    """
    return {
        "id": app_id,
        "connected": is_connected,
        "accountEmail": "System Managed (.env)",
        "message": "AI services are centrally configured by the system administrator.",
    }


def get_user_api_keys(user_id: int) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, prefix, environment, created_at, last_used_at
                FROM user_api_keys
                WHERE user_id = %s
                ORDER BY created_at DESC
                """,
                (user_id,),
            )
            rows = cur.fetchall()
            keys = []
            for r in rows:
                created_str = r[4].strftime("%b %d, %Y") if r[4] else "Recently"
                last_used_str = r[5].strftime("%b %d, %Y %H:%M") if r[5] else "Never"
                keys.append({
                    "id": str(r[0]),
                    "name": r[1],
                    "prefix": r[2],
                    "environment": r[3],
                    "createdDate": created_str,
                    "lastUsed": last_used_str,
                })
            return keys
    finally:
        conn.close()


def create_user_api_key(
    user_id: int,
    name: str,
    environment: str = "production",
) -> Dict[str, Any]:
    env_tag = "live" if environment == "production" else "test"
    rand_prefix = secrets.token_hex(2)
    prefix = f"vn_{env_tag}_{rand_prefix}"
    secret_token = f"{prefix}_{secrets.token_urlsafe(24)}"
    key_hash = hashlib.sha256(secret_token.encode("utf-8")).hexdigest()

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO user_api_keys (user_id, name, prefix, key_hash, environment)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, name, prefix, environment, created_at
                """,
                (user_id, name.strip(), prefix, key_hash, environment),
            )
            row = cur.fetchone()
            conn.commit()
            created_str = row[4].strftime("%b %d, %Y") if row[4] else "Just now"
            return {
                "id": str(row[0]),
                "name": row[1],
                "prefix": row[2],
                "secret": secret_token,
                "environment": row[3],
                "createdDate": created_str,
                "lastUsed": "Never",
            }
    finally:
        conn.close()


def delete_user_api_key(user_id: int, key_id: int) -> bool:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM user_api_keys
                WHERE id = %s AND user_id = %s
                """,
                (key_id, user_id),
            )
            conn.commit()
            return True
    finally:
        conn.close()

import hashlib
import json
import secrets
from typing import Any, Dict, List, Optional
from datetime import datetime

from app.core.database import get_connection

AVAILABLE_APPS = [
    {
        "id": "gdrive",
        "name": "Google Drive",
        "category": "storage",
        "description": "Direct import and export projects from your Google Drive storage.",
        "iconName": "hard-drive",
    },
    {
        "id": "dropbox",
        "name": "Dropbox",
        "category": "storage",
        "description": "Seamlessly synchronize completed video translations with Dropbox folders.",
        "iconName": "box",
    },
    {
        "id": "s3",
        "name": "AWS S3 / Cloudflare R2",
        "category": "storage",
        "description": "Connect enterprise object storage bucket for automated media backups.",
        "iconName": "database",
    },
    {
        "id": "elevenlabs",
        "name": "ElevenLabs Voice API",
        "category": "ai",
        "description": "Access custom ElevenLabs multilingual voice clones and low-latency synthesis.",
        "iconName": "mic",
    },
    {
        "id": "openai",
        "name": "OpenAI GPT & Whisper API",
        "category": "ai",
        "description": "Access latest OpenAI models using your organization's API quota.",
        "iconName": "cpu",
    },
    {
        "id": "slack",
        "name": "Slack Notifications",
        "category": "productivity",
        "description": "Receive channel notifications when team video translations complete.",
        "iconName": "message-square",
    },
    {
        "id": "discord",
        "name": "Discord Webhook",
        "category": "productivity",
        "description": "Post automated pipeline status updates into community channels.",
        "iconName": "radio",
    },
]


def get_user_integrations(user_id: int) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT app_id, is_connected, account_email, config, updated_at
                FROM user_integrations
                WHERE user_id = %s
                """,
                (user_id,),
            )
            rows = {}
            for r in cur.fetchall():
                app_id, is_conn, email, raw_cfg, _ = r
                cfg = raw_cfg if isinstance(raw_cfg, dict) else (json.loads(raw_cfg) if isinstance(raw_cfg, str) else {})
                rows[app_id] = {
                    "is_connected": is_conn,
                    "account_email": email,
                    "config": cfg,
                }

        result = []
        for app in AVAILABLE_APPS:
            app_data = rows.get(app["id"], {})
            connected = app_data.get("is_connected", False)
            email = app_data.get("account_email")
            raw_cfg = app_data.get("config") or {}

            # Mask sensitive API keys and secrets for secure frontend display
            masked_config = {}
            for k, v in raw_cfg.items():
                if isinstance(v, str) and any(s in k.lower() for s in ["key", "secret", "token", "password"]):
                    if len(v) > 8:
                        masked_config[k] = f"{v[:4]}••••••••{v[-4:]}"
                    else:
                        masked_config[k] = "••••••••"
                else:
                    masked_config[k] = v

            result.append({
                "id": app["id"],
                "name": app["name"],
                "category": app["category"],
                "description": app["description"],
                "iconName": app["iconName"],
                "connected": connected,
                "accountEmail": email,
                "badge": "Connected" if connected else None,
                "config": masked_config,
            })
        return result
    finally:
        conn.close()


def update_user_integration(
    user_id: int,
    app_id: str,
    is_connected: bool,
    account_email: Optional[str] = None,
    config: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Check existing config in user_integrations to avoid overwriting masked secrets
            cur.execute(
                "SELECT config, account_email FROM user_integrations WHERE user_id = %s AND app_id = %s",
                (user_id, app_id),
            )
            existing_row = cur.fetchone()
            existing_cfg = {}
            existing_email = None
            if existing_row:
                raw_cfg = existing_row[0]
                existing_email = existing_row[1]
                if raw_cfg:
                    existing_cfg = raw_cfg if isinstance(raw_cfg, dict) else json.loads(raw_cfg)

            # Preserve existing secret if input contains masked bullet points '•'
            final_cfg = dict(existing_cfg)
            if config is not None:
                for k, v in config.items():
                    if isinstance(v, str) and "•" in v and k in existing_cfg:
                        # Retain original unmasked value from DB
                        continue
                    final_cfg[k] = v
                config_json = json.dumps(final_cfg)
            else:
                config_json = json.dumps(existing_cfg) if existing_cfg else None

            final_email = account_email if account_email is not None else existing_email

            cur.execute(
                """
                INSERT INTO user_integrations (user_id, app_id, is_connected, account_email, config, updated_at)
                VALUES (%s, %s, %s, %s, COALESCE(%s::jsonb, '{}'::jsonb), CURRENT_TIMESTAMP)
                ON CONFLICT (user_id, app_id)
                DO UPDATE SET
                    is_connected = EXCLUDED.is_connected,
                    account_email = COALESCE(EXCLUDED.account_email, user_integrations.account_email),
                    config = CASE 
                        WHEN %s::jsonb IS NOT NULL THEN %s::jsonb 
                        ELSE user_integrations.config 
                    END,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING app_id, is_connected, account_email, config
                """,
                (user_id, app_id, is_connected, final_email, config_json, config_json, config_json),
            )
            row = cur.fetchone()
            conn.commit()
            return {
                "id": row[0],
                "connected": row[1],
                "accountEmail": row[2],
                "config": row[3] if len(row) > 3 else {},
            }
    finally:
        conn.close()


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

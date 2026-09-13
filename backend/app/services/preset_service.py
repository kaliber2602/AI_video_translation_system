import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from psycopg2.extras import Json
from app.core.database import get_connection

logger = logging.getLogger(__name__)


def _row_to_preset(row: Optional[tuple]) -> Optional[Dict[str, Any]]:
    if not row:
        return None
    raw_config = row[20] if len(row) > 20 and row[20] is not None else {}
    if isinstance(raw_config, str):
        try:
            raw_config = json.loads(raw_config)
        except Exception:
            raw_config = {}
    elif not isinstance(raw_config, dict):
        raw_config = {}

    return {
        "id": row[0],
        "user_id": row[1],
        "name": row[2],
        "description": row[3],
        "is_system": bool(row[4]),
        "is_default": bool(row[5]),
        "target_language": row[6],
        "source_language": row[7],
        "stt_model": row[8],
        "enable_diarization": bool(row[9]),
        "translation_model": row[10],
        "tts_model": row[11],
        "voice_id": row[12],
        "voice_speed": float(row[13]) if row[13] is not None else 1.0,
        "subtitle_format": row[14],
        "burn_subtitles": bool(row[15]),
        "video_quality": row[16],
        "video_format": row[17],
        "created_at": row[18].isoformat() if row[18] else None,
        "updated_at": row[19].isoformat() if row[19] else None,
        "config_data": raw_config,
    }


class PresetService:
    @staticmethod
    def list_presets(user_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """List all system presets plus user's custom presets."""
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                if user_id:
                    cur.execute(
                        """
                        SELECT id, user_id, name, description, is_system, is_default,
                               target_language, source_language, stt_model, enable_diarization,
                               translation_model, tts_model, voice_id, voice_speed,
                               subtitle_format, burn_subtitles, video_quality, video_format,
                               created_at, updated_at, config_data
                        FROM pipeline_presets
                        WHERE is_system = TRUE OR user_id = %s
                        ORDER BY is_system DESC, is_default DESC, name ASC;
                        """,
                        (user_id,),
                    )
                else:
                    cur.execute(
                        """
                        SELECT id, user_id, name, description, is_system, is_default,
                               target_language, source_language, stt_model, enable_diarization,
                               translation_model, tts_model, voice_id, voice_speed,
                               subtitle_format, burn_subtitles, video_quality, video_format,
                               created_at, updated_at, config_data
                        FROM pipeline_presets
                        WHERE is_system = TRUE
                        ORDER BY is_default DESC, name ASC;
                        """
                    )
                rows = cur.fetchall()
                return [_row_to_preset(r) for r in rows]
        except Exception as e:
            logger.error(f"[PresetService] Error listing presets: {e}", exc_info=True)
            return []
        finally:
            conn.close()

    @staticmethod
    def get_preset(preset_id: int) -> Optional[Dict[str, Any]]:
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, user_id, name, description, is_system, is_default,
                           target_language, source_language, stt_model, enable_diarization,
                           translation_model, tts_model, voice_id, voice_speed,
                           subtitle_format, burn_subtitles, video_quality, video_format,
                           created_at, updated_at, config_data
                    FROM pipeline_presets
                    WHERE id = %s;
                    """,
                    (preset_id,),
                )
                row = cur.fetchone()
                return _row_to_preset(row)
        except Exception as e:
            logger.error(f"[PresetService] Error getting preset {preset_id}: {e}", exc_info=True)
            return None
        finally:
            conn.close()

    @staticmethod
    def create_preset(user_id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a custom preset owned by user."""
        conn = get_connection()
        try:
            config_data = data.get("config_data") or {}
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO pipeline_presets (
                        user_id, name, description, is_system, is_default,
                        target_language, source_language, stt_model, enable_diarization,
                        translation_model, tts_model, voice_id, voice_speed,
                        subtitle_format, burn_subtitles, video_quality, video_format, config_data
                    ) VALUES (
                        %s, %s, %s, FALSE, FALSE,
                        %s, %s, %s, %s,
                        %s, %s, %s, %s,
                        %s, %s, %s, %s, %s
                    )
                    RETURNING id, user_id, name, description, is_system, is_default,
                              target_language, source_language, stt_model, enable_diarization,
                              translation_model, tts_model, voice_id, voice_speed,
                              subtitle_format, burn_subtitles, video_quality, video_format,
                              created_at, updated_at, config_data;
                    """,
                    (
                        user_id,
                        data.get("name", "Custom Preset").strip(),
                        data.get("description", ""),
                        data.get("target_language", "vi"),
                        data.get("source_language", "auto"),
                        data.get("stt_model", "whisper-medium"),
                        bool(data.get("enable_diarization", True)),
                        data.get("translation_model", "nllb_200_1.3b"),
                        data.get("tts_model", "coqui_xtts_v2"),
                        data.get("voice_id", "1"),
                        float(data.get("voice_speed", 1.0)),
                        data.get("subtitle_format", "ass"),
                        bool(data.get("burn_subtitles", True)),
                        data.get("video_quality", "1080p"),
                        data.get("video_format", "mp4"),
                        Json(config_data),
                    ),
                )
                row = cur.fetchone()
                conn.commit()
                return _row_to_preset(row)
        except Exception as e:
            conn.rollback()
            logger.error(f"[PresetService] Error creating preset: {e}", exc_info=True)
            return None
        finally:
            conn.close()

    @staticmethod
    def update_preset(preset_id: int, user_id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing custom preset owned by user."""
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                # Check existence and ownership
                cur.execute(
                    "SELECT is_system, user_id FROM pipeline_presets WHERE id = %s;",
                    (preset_id,)
                )
                check = cur.fetchone()
                if not check:
                    return None
                if check[0] is True or check[1] != user_id:
                    logger.warning(f"[PresetService] Cannot update system or unowned preset {preset_id}")
                    return None

                config_data = data.get("config_data")
                cur.execute(
                    """
                    UPDATE pipeline_presets
                    SET name = COALESCE(%s, name),
                        description = COALESCE(%s, description),
                        target_language = COALESCE(%s, target_language),
                        source_language = COALESCE(%s, source_language),
                        stt_model = COALESCE(%s, stt_model),
                        enable_diarization = COALESCE(%s, enable_diarization),
                        translation_model = COALESCE(%s, translation_model),
                        tts_model = COALESCE(%s, tts_model),
                        voice_id = COALESCE(%s, voice_id),
                        voice_speed = COALESCE(%s, voice_speed),
                        subtitle_format = COALESCE(%s, subtitle_format),
                        burn_subtitles = COALESCE(%s, burn_subtitles),
                        video_quality = COALESCE(%s, video_quality),
                        video_format = COALESCE(%s, video_format),
                        config_data = CASE WHEN %s IS NOT NULL THEN %s ELSE config_data END,
                        updated_at = NOW()
                    WHERE id = %s AND user_id = %s AND is_system = FALSE
                    RETURNING id, user_id, name, description, is_system, is_default,
                              target_language, source_language, stt_model, enable_diarization,
                              translation_model, tts_model, voice_id, voice_speed,
                              subtitle_format, burn_subtitles, video_quality, video_format,
                              created_at, updated_at, config_data;
                    """,
                    (
                        data.get("name"),
                        data.get("description"),
                        data.get("target_language"),
                        data.get("source_language"),
                        data.get("stt_model"),
                        data.get("enable_diarization"),
                        data.get("translation_model"),
                        data.get("tts_model"),
                        data.get("voice_id"),
                        data.get("voice_speed"),
                        data.get("subtitle_format"),
                        data.get("burn_subtitles"),
                        data.get("video_quality"),
                        data.get("video_format"),
                        Json(config_data) if config_data is not None else None,
                        Json(config_data) if config_data is not None else None,
                        preset_id,
                        user_id,
                    ),
                )
                row = cur.fetchone()
                conn.commit()
                return _row_to_preset(row)
        except Exception as e:
            conn.rollback()
            logger.error(f"[PresetService] Error updating preset {preset_id}: {e}", exc_info=True)
            return None
        finally:
            conn.close()

    @staticmethod
    def delete_preset(preset_id: int, user_id: int) -> bool:
        """Delete custom preset. System presets cannot be deleted."""
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    DELETE FROM pipeline_presets
                    WHERE id = %s AND user_id = %s AND is_system = FALSE;
                    """,
                    (preset_id, user_id),
                )
                deleted = cur.rowcount > 0
                conn.commit()
                return deleted
        except Exception as e:
            conn.rollback()
            logger.error(f"[PresetService] Error deleting preset {preset_id}: {e}", exc_info=True)
            return False
        finally:
            conn.close()


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

    @staticmethod
    def apply_preset_to_video(video_id: int, preset_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        """Apply full 6-tier preset configuration to video and its pipeline config."""
        preset = PresetService.get_preset(preset_id)
        if not preset:
            return None

        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT v.id, v.project_id, v.snapshot_data, v.target_language, p.owner_id
                    FROM videos v
                    JOIN projects p ON v.project_id = p.id
                    WHERE v.id = %s AND (p.owner_id = %s OR EXISTS (
                        SELECT 1 FROM project_members pm
                        WHERE pm.project_id = p.id AND (pm.user_id = %s OR pm.email = (SELECT email FROM users WHERE id = %s))
                        AND pm.role IN ('owner', 'admin', 'editor')
                    ));
                    """,
                    (video_id, user_id, user_id, user_id)
                )
                v_row = cur.fetchone()
                if not v_row:
                    return None

                existing_snap = v_row[2] or {}
                if isinstance(existing_snap, str):
                    try:
                        existing_snap = json.loads(existing_snap)
                    except Exception:
                        existing_snap = {}
                elif not isinstance(existing_snap, dict):
                    existing_snap = {}

                cfg_data = preset.get("config_data") or {}
                existing_snap["preset_id"] = preset["id"]
                existing_snap["preset_name"] = preset["name"]
                existing_snap["preset_config"] = cfg_data
                existing_snap["target_language"] = preset["target_language"]

                cur.execute(
                    """
                    UPDATE videos
                    SET target_language = %s,
                        source_language = %s,
                        snapshot_data = %s,
                        updated_at = NOW()
                    WHERE id = %s;
                    """,
                    (preset["target_language"], preset["source_language"], Json(existing_snap), video_id)
                )

                audio_sep = cfg_data.get("audio_separation") or {}
                transcription = cfg_data.get("transcription") or {}
                translation = cfg_data.get("translation") or {}
                tts = cfg_data.get("tts_dubbing") or {}
                subtitles = cfg_data.get("subtitles") or {}
                export_mux = cfg_data.get("export_muxing") or {}

                sep_model = audio_sep.get("demucs_model", "demucs_v4")
                stt_model = transcription.get("model_size", preset["stt_model"])
                enable_diar = transcription.get("diarization", preset["enable_diarization"])
                if isinstance(enable_diar, dict):
                    enable_diar = enable_diar.get("enabled", True)
                diar_model = "pyannote_3.1" if enable_diar else None
                trans_model = translation.get("model_name", preset["translation_model"])
                tts_model = tts.get("engine", preset["tts_model"])
                voice_speed = float(tts.get("speed_rate", preset["voice_speed"]))

                cur.execute(
                    """
                    INSERT INTO video_pipeline_configs (
                        video_id, target_language, source_language,
                        separation_model, stt_model, diarization_model,
                        translation_model, tts_model, voice_speed,
                        auto_generate_subtitles, auto_generate_dubbing,
                        created_at, updated_at
                    ) VALUES (
                        %s, %s, %s,
                        %s, %s, %s,
                        %s, %s, %s,
                        %s, %s,
                        NOW(), NOW()
                    )
                    ON CONFLICT (video_id) DO UPDATE SET
                        target_language = EXCLUDED.target_language,
                        source_language = EXCLUDED.source_language,
                        separation_model = EXCLUDED.separation_model,
                        stt_model = EXCLUDED.stt_model,
                        diarization_model = EXCLUDED.diarization_model,
                        translation_model = EXCLUDED.translation_model,
                        tts_model = EXCLUDED.tts_model,
                        voice_speed = EXCLUDED.voice_speed,
                        auto_generate_subtitles = EXCLUDED.auto_generate_subtitles,
                        auto_generate_dubbing = EXCLUDED.auto_generate_dubbing,
                        updated_at = NOW();
                    """,
                    (
                        video_id, preset["target_language"], preset["source_language"],
                        sep_model, stt_model, diar_model,
                        trans_model, tts_model, voice_speed,
                        subtitles.get("burn_mode") != "none" if "burn_mode" in subtitles else True,
                        tts_model != "none",
                    )
                )
                conn.commit()
                return {
                    "status": "success",
                    "video_id": video_id,
                    "preset_id": preset["id"],
                    "preset_name": preset["name"],
                    "preset": preset
                }
        except Exception as e:
            logger.error(f"[PresetService] Error applying preset to video {video_id}: {e}", exc_info=True)
            if conn:
                conn.rollback()
            return None
        finally:
            if conn:
                conn.close()


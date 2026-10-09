import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
import psycopg2.extras

from app.core.database import get_connection
from app.services.preset_service import PresetService

logger = logging.getLogger(__name__)



class BatchService:
    @staticmethod
    def create_batch_job(
        project_id: int,
        user_id: int,
        name: str,
        video_ids: List[int],
        preset_id: Optional[int] = None,
        config_override: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Create a new batch processing job and itemize the selected videos."""
        if not video_ids:
            raise ValueError("video_ids list cannot be empty")

        # 1. Resolve preset configuration snapshot
        preset_data = None
        if preset_id:
            preset_data = PresetService.get_preset(preset_id)
        if not preset_data:
            # Fallback to default preset or standard defaults
            presets = PresetService.list_presets(user_id)
            preset_data = next((p for p in presets if p.get("is_default")), None)
            if not preset_data and presets:
                preset_data = presets[0]

        snapshot = dict(preset_data) if preset_data else {
            "target_language": "vi",
            "source_language": "auto",
            "stt_model": "whisper-medium",
            "enable_diarization": True,
            "translation_model": "nllb_200_1.3b",
            "tts_model": "coqui_xtts_v2",
            "voice_id": "1",
            "voice_speed": 1.0,
            "subtitle_format": "ass",
            "burn_subtitles": True,
            "video_quality": "1080p",
            "video_format": "mp4",
        }

        if config_override:
            snapshot.update(config_override)

        batch_id = str(uuid.uuid4())
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                # Verify all videos belong to project
                cur.execute(
                    """
                    SELECT id, duration FROM videos
                    WHERE id = ANY(%s) AND project_id = %s;
                    """,
                    (video_ids, project_id),
                )
                video_rows = cur.fetchall()
                if not video_rows:
                    raise ValueError("None of the specified videos belong to this project.")
                valid_video_ids = [r[0] for r in video_rows]
                video_duration_map = {r[0]: (float(r[1]) if r[1] is not None else 60.0) for r in video_rows}

                # Check if any requested videos are currently queued or processing in another batch job
                cur.execute(
                    """
                    SELECT video_id FROM batch_job_items
                    WHERE video_id = ANY(%s) AND status IN ('queued', 'processing');
                    """,
                    (valid_video_ids,),
                )
                busy_video_ids = [r[0] for r in cur.fetchall()]
                if busy_video_ids:
                    raise ValueError(f"Các video sau đang trong tiến trình xử lý khác: {busy_video_ids}")

                # Quota calculation & deduction for all videos in batch (Tokenize / Word Quota with Model Multipliers)
                from app.services.subscription_service import (
                    get_model_word_multiplier,
                    deduct_user_words,
                    get_user_effective_quota,
                )
                from app.core.tokenizer import TokenizerService

                cfg_data = snapshot.get("config_data") or {}
                if isinstance(cfg_data, str):
                    try:
                        cfg_data = json.loads(cfg_data)
                    except Exception:
                        cfg_data = {}

                stt_model = cfg_data.get("transcription", {}).get("model_size") or snapshot.get("stt_model", "whisper_medium")
                trans_model = cfg_data.get("translation", {}).get("model_name") or snapshot.get("translation_model", "nllb_200_1.3b")
                tts_model = cfg_data.get("tts_dubbing", {}).get("engine") or snapshot.get("tts_model", "coqui_xtts_v2")

                stt_multiplier = get_model_word_multiplier(stt_model, default_multiplier=1)
                trans_multiplier = get_model_word_multiplier(trans_model, default_multiplier=1)
                tts_multiplier = get_model_word_multiplier(tts_model, default_multiplier=1)
                # Full pipeline total multiplier per word
                pipeline_word_multiplier = max(1, stt_multiplier + trans_multiplier + tts_multiplier)

                # Calculate total required words across all videos
                total_words_needed = 0
                video_cost_map = {}
                for vid in valid_video_ids:
                    dur_secs = video_duration_map.get(vid, 60.0)
                    raw_words = TokenizerService.estimate_video_words(dur_secs)
                    vid_words = raw_words * pipeline_word_multiplier
                    video_cost_map[vid] = (vid_words, raw_words)
                    total_words_needed += vid_words

                # Check if user has sufficient word quota before deducting
                quota = get_user_effective_quota(user_id)
                rem_words = quota.get("words", {}).get("remaining_words", 0)

                if rem_words < total_words_needed:
                    raise ValueError(
                        f"Không đủ hạn mức từ (word quota) để chạy batch (~{total_words_needed} từ cần thiết, còn lại: {rem_words} từ). Vui lòng nâng cấp gói."
                    )

                # Deduct word quota per video atomically
                for vid in valid_video_ids:
                    vid_words, raw_words = video_cost_map[vid]
                    w_ok = deduct_user_words(
                        user_id=user_id,
                        words_amount=vid_words,
                        service_type="BATCH_PIPELINE",
                        description=f"Batch {batch_id[:8]} - Video #{vid} ({raw_words} từ x {pipeline_word_multiplier}x = {vid_words} từ)",
                        video_id=vid,
                    )
                    if not w_ok:
                        logger.warning(f"[BatchService] Word quota deduct returned False for video #{vid} in batch {batch_id}")

                # Create batch_job
                snapshot["total_words_deducted"] = total_words_needed
                snapshot_json = psycopg2.extras.Json(snapshot)
                cur.execute(
                    """
                    INSERT INTO batch_jobs (
                        id, project_id, user_id, preset_id, name, status,
                        total_videos, completed_videos, failed_videos, config_snapshot,
                        created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, 'queued',
                        %s, 0, 0, %s,
                        NOW(), NOW()
                    )
                    RETURNING id, project_id, user_id, preset_id, name, status,
                              total_videos, completed_videos, failed_videos, config_snapshot,
                              created_at, updated_at;
                    """,
                    (
                        batch_id,
                        project_id,
                        user_id,
                        preset_id,
                        name.strip() or f"Batch {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                        len(valid_video_ids),
                        snapshot_json,
                    ),
                )
                batch_row = cur.fetchone()

                # Insert items for each valid video
                for vid in valid_video_ids:
                    cur.execute(
                        """
                        INSERT INTO batch_job_items (
                            batch_id, video_id, status, progress, created_at, updated_at
                        ) VALUES (%s, %s, 'queued', 0, NOW(), NOW());
                        """,
                        (batch_id, vid),
                    )

                conn.commit()

            return BatchService.get_batch_job(batch_id)
        except Exception as e:
            conn.rollback()
            logger.error(f"[BatchService] Error creating batch job: {e}", exc_info=True)
            raise
        finally:
            conn.close()

    @staticmethod
    def get_batch_job(batch_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve full details of a batch job including all item statuses."""
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, project_id, user_id, preset_id, name, status,
                           total_videos, completed_videos, failed_videos, config_snapshot,
                           error_message, started_at, finished_at, created_at, updated_at
                    FROM batch_jobs
                    WHERE id = %s;
                    """,
                    (batch_id,),
                )
                row = cur.fetchone()
                if not row:
                    return None

                config = row[9]
                if isinstance(config, str):
                    try:
                        config = json.loads(config)
                    except Exception:
                        config = {}

                total = row[6] or 0
                completed = row[7] or 0
                failed = row[8] or 0

                # Query item details joined with videos to get real-time status, progress, and current step
                cur.execute(
                    """
                    SELECT i.id, i.batch_id, i.video_id, i.job_id,
                           CASE
                               WHEN i.status = 'failed' THEN 'failed'
                               WHEN i.status = 'cancelled' THEN 'cancelled'
                               WHEN i.status = 'completed' AND v.status = 'completed' THEN 'completed'
                               WHEN i.status = 'processing' OR v.status = 'processing' THEN 'processing'
                               ELSE i.status
                           END AS resolved_status,
                           CASE
                               WHEN i.status = 'completed' AND v.status = 'completed' THEN 100
                               ELSE LEAST(99, GREATEST(COALESCE(i.progress, 0), COALESCE(v.progress, 0)))
                           END AS resolved_progress,
                           i.error_message, i.started_at, i.finished_at,
                           v.title, v.duration, v.thumbnail_path, v.output_path,
                           v.current_step
                    FROM batch_job_items i
                    JOIN videos v ON i.video_id = v.id
                    WHERE i.batch_id = %s
                    ORDER BY i.id ASC;
                    """,
                    (batch_id,),
                )
                # Step-based global progress mapping to prevent progress oscillation
                # (audio_extract: 25%, transcript/whisperx: 50%, translation: 70%, tts: 85%, dub: 95%, completed: 100%)
                step_weight_map = {
                    "audio_extract": 25,
                    "extract_audio": 25,
                    "audio_separate": 25,
                    "transcript": 50,
                    "transcribe": 50,
                    "whisperx": 50,
                    "translation": 70,
                    "translate": 70,
                    "tts": 85,
                    "tts_generate": 85,
                    "generate_tts": 85,
                    "dub": 95,
                    "dub_mux": 95,
                    "render_video": 95,
                    "mux": 95,
                    "export": 95,
                    "completed": 100,
                }

                item_rows = cur.fetchall()
                items = []
                total_item_progress = 0
                for ir in item_rows:
                    i_status = ir[4]
                    raw_prog = ir[5] or 0
                    current_step_name = (ir[13] or "").lower().strip()

                    # Calculate monotonic progress for item
                    if i_status == "completed":
                        item_display_prog = 100
                    elif i_status == "failed":
                        item_display_prog = 0
                    else:
                        base_step_prog = step_weight_map.get(current_step_name, 10)
                        # Ensure item progress cannot jump backward below its current stage
                        item_display_prog = max(base_step_prog, min(95, raw_prog))

                    total_item_progress += item_display_prog
                    items.append({
                        "id": ir[0],
                        "batch_id": str(ir[1]),
                        "video_id": ir[2],
                        "job_id": str(ir[3]) if ir[3] else None,
                        "status": i_status,
                        "progress": item_display_prog,
                        "error_message": ir[6],
                        "started_at": ir[7].isoformat() if ir[7] else None,
                        "finished_at": ir[8].isoformat() if ir[8] else None,
                        "video_title": ir[9],
                        "duration": ir[10],
                        "thumbnail": ir[11],
                        "output_path": ir[12],
                        "current_step": ir[13],
                    })

                # Real-time aggregated stats based on resolved items
                real_completed = sum(1 for it in items if it["status"] == "completed")
                real_failed = sum(1 for it in items if it["status"] == "failed")
                has_active = any(it["status"] in ("processing", "queued", "pending") for it in items)

                # Mathematical aggregate progress: 1/N * sum(Progress(V_i))
                item_count = len(items) if items else total
                if item_count > 0:
                    progress = round(total_item_progress / item_count)
                else:
                    progress = round(((real_completed + real_failed) / total) * 100) if total > 0 else 0

                batch_status = row[5]
                if has_active:
                    batch_status = "processing"
                elif item_count > 0 and real_completed + real_failed >= item_count:
                    batch_status = "completed" if real_completed > 0 else ("failed" if real_failed > 0 else batch_status)

                return {
                    "id": str(row[0]),
                    "project_id": row[1],
                    "user_id": row[2],
                    "preset_id": row[3],
                    "name": row[4],
                    "status": batch_status,
                    "total_videos": total,
                    "completed_videos": real_completed,
                    "failed_videos": real_failed,
                    "progress": progress,
                    "config_snapshot": config,
                    "error_message": row[10],
                    "started_at": row[11].isoformat() if row[11] else None,
                    "finished_at": row[12].isoformat() if row[12] else None,
                    "created_at": row[13].isoformat() if row[13] else None,
                    "updated_at": row[14].isoformat() if row[14] else None,
                    "items": items,
                }
        except Exception as e:
            logger.error(f"[BatchService] Error getting batch {batch_id}: {e}", exc_info=True)
            return None
        finally:
            conn.close()

    @staticmethod
    def list_project_batches(project_id: int) -> List[Dict[str, Any]]:
        """List all batch jobs for a given project."""
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT b.id, b.project_id, b.user_id, b.preset_id, b.name, b.status,
                           b.total_videos, b.completed_videos, b.failed_videos,
                           b.started_at, b.finished_at, b.created_at, b.updated_at,
                           COALESCE(AVG(
                               CASE
                                   WHEN i.status = 'completed' AND v.status = 'completed' THEN 100
                                   WHEN i.status = 'failed' THEN 0
                                   ELSE LEAST(99, GREATEST(COALESCE(i.progress, 0), COALESCE(v.progress, 0)))
                               END
                           ), 0) as avg_progress
                    FROM batch_jobs b
                    LEFT JOIN batch_job_items i ON b.id = i.batch_id
                    LEFT JOIN videos v ON i.video_id = v.id
                    WHERE b.project_id = %s
                    GROUP BY b.id
                    ORDER BY b.created_at DESC;
                    """,
                    (project_id,),
                )
                rows = cur.fetchall()
                result = []
                for r in rows:
                    total = r[6] or 0
                    completed = r[7] or 0
                    failed = r[8] or 0
                    avg_prog = r[13] or 0
                    progress = round(float(avg_prog)) if total > 0 else 0
                    result.append({
                        "id": str(r[0]),
                        "project_id": r[1],
                        "user_id": r[2],
                        "preset_id": r[3],
                        "name": r[4],
                        "status": r[5],
                        "total_videos": total,
                        "completed_videos": completed,
                        "failed_videos": failed,
                        "progress": progress,
                        "started_at": r[9].isoformat() if r[9] else None,
                        "finished_at": r[10].isoformat() if r[10] else None,
                        "created_at": r[11].isoformat() if r[11] else None,
                        "updated_at": r[12].isoformat() if r[12] else None,
                    })
                return result
        except Exception as e:
            logger.error(f"[BatchService] Error listing batches for project {project_id}: {e}", exc_info=True)
            return []
        finally:
            conn.close()

    @staticmethod
    def cancel_batch_job(batch_id: str, user_id: int) -> bool:
        """Cancel a pending or running batch job."""
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE batch_jobs
                    SET status = 'cancelled', finished_at = NOW(), updated_at = NOW()
                    WHERE id = %s AND status IN ('queued', 'processing');
                    """,
                    (batch_id,),
                )
                updated = cur.rowcount > 0

                # Query uncompleted items to refund word quota
                cur.execute(
                    """
                    SELECT i.video_id, v.duration, b.config_snapshot
                    FROM batch_job_items i
                    JOIN videos v ON i.video_id = v.id
                    JOIN batch_jobs b ON i.batch_id = b.id
                    WHERE i.batch_id = %s AND i.status IN ('queued', 'processing');
                    """,
                    (batch_id,),
                )
                items_to_refund = cur.fetchall()

                cur.execute(
                    """
                    UPDATE batch_job_items
                    SET status = 'cancelled', finished_at = NOW(), updated_at = NOW()
                    WHERE batch_id = %s AND status IN ('queued', 'processing');
                    """,
                    (batch_id,),
                )
                conn.commit()

                # Refund words to user
                if items_to_refund:
                    try:
                        from app.services.subscription_service import refund_user_words, get_model_word_multiplier
                        from app.core.tokenizer import TokenizerService
                        for r_item in items_to_refund:
                            v_id = r_item[0]
                            dur = float(r_item[1] or 60.0)
                            snap = r_item[2] or {}
                            if isinstance(snap, str):
                                snap = json.loads(snap)
                            stt_m = get_model_word_multiplier(snap.get("stt_model", "whisper_medium"), default_multiplier=1)
                            trans_m = get_model_word_multiplier(snap.get("translation_model", "nllb_200_1.3b"), default_multiplier=1)
                            tts_m = get_model_word_multiplier(snap.get("tts_model", "coqui_xtts_v2"), default_multiplier=1)
                            pipe_mult = max(1, stt_m + trans_m + tts_m)
                            w_refund = TokenizerService.estimate_video_words(dur) * pipe_mult
                            refund_user_words(
                                user_id=user_id,
                                words_amount=w_refund,
                                description=f"Hoàn hạn mức từ cho video #{v_id} (Huỷ Batch {batch_id[:8]})",
                                video_id=v_id,
                            )
                    except Exception as ref_e:
                        logger.warning(f"Could not refund words on batch cancellation: {ref_e}")

                return updated
        except Exception as e:
            conn.rollback()
            logger.error(f"[BatchService] Error cancelling batch {batch_id}: {e}", exc_info=True)
            return False
        finally:
            conn.close()

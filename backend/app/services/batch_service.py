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
                    SELECT id FROM videos
                    WHERE id = ANY(%s) AND project_id = %s;
                    """,
                    (video_ids, project_id),
                )
                valid_video_ids = [r[0] for r in cur.fetchall()]
                if not valid_video_ids:
                    raise ValueError("None of the specified videos belong to this project.")

                # Create batch_job
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

                # Query item details joined with videos
                cur.execute(
                    """
                    SELECT i.id, i.batch_id, i.video_id, i.job_id, i.status, i.progress,
                           i.error_message, i.started_at, i.finished_at,
                           v.title, v.duration, v.thumbnail_path, v.output_path
                    FROM batch_job_items i
                    JOIN videos v ON i.video_id = v.id
                    WHERE i.batch_id = %s
                    ORDER BY i.id ASC;
                    """,
                    (batch_id,),
                )
                item_rows = cur.fetchall()
                items = []
                total_item_progress = 0
                for ir in item_rows:
                    i_prog = ir[5] or 0
                    total_item_progress += i_prog
                    items.append({
                        "id": ir[0],
                        "batch_id": str(ir[1]),
                        "video_id": ir[2],
                        "job_id": str(ir[3]) if ir[3] else None,
                        "status": ir[4],
                        "progress": i_prog,
                        "error_message": ir[6],
                        "started_at": ir[7].isoformat() if ir[7] else None,
                        "finished_at": ir[8].isoformat() if ir[8] else None,
                        "video_title": ir[9],
                        "duration": ir[10],
                        "thumbnail": ir[11],
                        "output_path": ir[12],
                    })

                # Mathematical aggregate progress: 1/N * sum(Progress(V_i))
                item_count = len(items) if items else total
                if item_count > 0:
                    progress = round(total_item_progress / item_count)
                else:
                    progress = round(((completed + failed) / total) * 100) if total > 0 else 0

                return {
                    "id": str(row[0]),
                    "project_id": row[1],
                    "user_id": row[2],
                    "preset_id": row[3],
                    "name": row[4],
                    "status": row[5],
                    "total_videos": total,
                    "completed_videos": completed,
                    "failed_videos": failed,
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
                           COALESCE(AVG(i.progress), 0) as avg_progress
                    FROM batch_jobs b
                    LEFT JOIN batch_job_items i ON b.id = i.batch_id
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

                cur.execute(
                    """
                    UPDATE batch_job_items
                    SET status = 'cancelled', finished_at = NOW(), updated_at = NOW()
                    WHERE batch_id = %s AND status IN ('queued', 'processing');
                    """,
                    (batch_id,),
                )
                conn.commit()
                return updated
        except Exception as e:
            conn.rollback()
            logger.error(f"[BatchService] Error cancelling batch {batch_id}: {e}", exc_info=True)
            return False
        finally:
            conn.close()

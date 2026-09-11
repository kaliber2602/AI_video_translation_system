import logging
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

from app.core.database import get_connection

logger = logging.getLogger(__name__)


def get_project_folders(project_id: int, parent_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """
    Returns all folders for a given project, optionally filtered by parent_id.
    Also includes video_count for each folder.
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            if parent_id is not None:
                cur.execute(
                    """
                    SELECT pf.id, pf.project_id, pf.parent_id, pf.name, pf.created_at, pf.updated_at,
                           (SELECT COUNT(*) FROM videos v WHERE v.folder_id = pf.id AND v.deleted_at IS NULL) as video_count
                    FROM project_folders pf
                    WHERE pf.project_id = %s AND pf.parent_id = %s
                    ORDER BY pf.name ASC
                    """,
                    (project_id, parent_id),
                )
            else:
                cur.execute(
                    """
                    SELECT pf.id, pf.project_id, pf.parent_id, pf.name, pf.created_at, pf.updated_at,
                           (SELECT COUNT(*) FROM videos v WHERE v.folder_id = pf.id AND v.deleted_at IS NULL) as video_count
                    FROM project_folders pf
                    WHERE pf.project_id = %s
                    ORDER BY pf.name ASC
                    """,
                    (project_id,),
                )
            rows = cur.fetchall()
            return [
                {
                    "id": r[0],
                    "project_id": r[1],
                    "parent_id": r[2],
                    "name": r[3],
                    "created_at": r[4],
                    "updated_at": r[5],
                    "video_count": r[6],
                }
                for r in rows
            ]
    finally:
        conn.close()


def get_folder_by_id(folder_id: int) -> Optional[Dict[str, Any]]:
    """
    Retrieves a single folder by ID.
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT pf.id, pf.project_id, pf.parent_id, pf.name, pf.created_at, pf.updated_at,
                       (SELECT COUNT(*) FROM videos v WHERE v.folder_id = pf.id AND v.deleted_at IS NULL) as video_count
                FROM project_folders pf
                WHERE pf.id = %s
                """,
                (folder_id,),
            )
            r = cur.fetchone()
            if not r:
                return None
            return {
                "id": r[0],
                "project_id": r[1],
                "parent_id": r[2],
                "name": r[3],
                "created_at": r[4],
                "updated_at": r[5],
                "video_count": r[6],
            }
    finally:
        conn.close()


def create_folder(project_id: int, name: str, parent_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Creates a new folder in a project.
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            now = datetime.now(timezone.utc)
            cur.execute(
                """
                INSERT INTO project_folders (project_id, parent_id, name, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, project_id, parent_id, name, created_at, updated_at
                """,
                (project_id, parent_id, name.strip(), now, now),
            )
            r = cur.fetchone()
        conn.commit()
        return {
            "id": r[0],
            "project_id": r[1],
            "parent_id": r[2],
            "name": r[3],
            "created_at": r[4],
            "updated_at": r[5],
            "video_count": 0,
        }
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def update_folder(folder_id: int, name: Optional[str] = None, parent_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
    """
    Updates folder name and/or parent folder.
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            updates = []
            params = []
            if name is not None:
                updates.append("name = %s")
                params.append(name.strip())
            if parent_id is not None:
                updates.append("parent_id = %s")
                params.append(parent_id if parent_id > 0 else None)
            
            if not updates:
                return get_folder_by_id(folder_id)
            
            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(folder_id)

            cur.execute(
                f"""
                UPDATE project_folders
                SET {", ".join(updates)}
                WHERE id = %s
                RETURNING id, project_id, parent_id, name, created_at, updated_at
                """,
                tuple(params),
            )
            r = cur.fetchone()
            if not r:
                return None
        conn.commit()
        return {
            "id": r[0],
            "project_id": r[1],
            "parent_id": r[2],
            "name": r[3],
            "created_at": r[4],
            "updated_at": r[5],
            "video_count": 0,
        }
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def delete_folder(folder_id: int) -> bool:
    """
    Deletes a folder. Videos within the folder will have folder_id set to NULL.
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Unlink videos first (set folder_id = NULL)
            cur.execute("UPDATE videos SET folder_id = NULL WHERE folder_id = %s", (folder_id,))
            # Delete folder (subfolders cascade via FK)
            cur.execute("DELETE FROM project_folders WHERE id = %s", (folder_id,))
            deleted = cur.rowcount > 0
        conn.commit()
        return deleted
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

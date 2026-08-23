from typing import Any

import psycopg2

from app.core.database import get_connection


# =========================================================
# Helper: Format Duration (seconds to mm:ss)
# =========================================================

def _format_duration(duration_seconds: float | None) -> str | None:
    if duration_seconds is None:
        return None
    minutes = int(duration_seconds // 60)
    seconds = int(duration_seconds % 60)
    return f"{minutes:02d}:{seconds:02d}"


# =========================================================
# Create Project
# =========================================================

def create_project(
    owner_id: int,
    name: str,
    description: str | None = None,
    cover_path: str | None = None,
    tag_ids: list[int] | None = None,
) -> dict[str, Any]:
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            # 1. Insert Project
            cursor.execute(
                """
                INSERT INTO projects (
                    owner_id,
                    name,
                    description,
                    cover_path,
                    status
                )
                VALUES (%s, %s, %s, %s, 'active')
                RETURNING
                    id,
                    owner_id,
                    name,
                    description,
                    cover_path,
                    status,
                    created_at,
                    updated_at
                """,
                (
                    owner_id,
                    name,
                    description,
                    cover_path,
                ),
            )
            row = cursor.fetchone()
            project_id = row[0]

            # 2. Attach Tags if provided
            assigned_tags: list[dict[str, Any]] = []
            if tag_ids:
                # Validate that tags belong to the user
                cursor.execute(
                    """
                    SELECT id, user_id, name, color, created_at, updated_at
                    FROM tags
                    WHERE id = ANY(%s) AND user_id = %s
                    """,
                    (tag_ids, owner_id),
                )
                valid_tags = cursor.fetchall()
                for tag_row in valid_tags:
                    cursor.execute(
                        """
                        INSERT INTO project_tags (project_id, tag_id)
                        VALUES (%s, %s)
                        ON CONFLICT DO NOTHING
                        """,
                        (project_id, tag_row[0]),
                    )
                    assigned_tags.append(
                        {
                            "id": tag_row[0],
                            "user_id": tag_row[1],
                            "name": tag_row[2],
                            "color": tag_row[3],
                            "created_at": tag_row[4],
                            "updated_at": tag_row[5],
                        }
                    )

        connection.commit()

        return {
            "id": row[0],
            "owner_id": row[1],
            "name": row[2],
            "description": row[3],
            "cover_path": row[4],
            "status": row[5],
            "created_at": row[6],
            "updated_at": row[7],
            "tags": assigned_tags,
            "video_count": 0,
            "recent_project": None,
            "duration": None,
            "size": None,
        }

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


# =========================================================
# Get All Projects for Owner
# =========================================================

def get_projects(
    owner_id: int,
    tag_id: int | None = None,
    search: str | None = None,
) -> list[dict[str, Any]]:
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            # Build query
            query = """
                SELECT DISTINCT
                    p.id,
                    p.owner_id,
                    p.name,
                    p.description,
                    p.cover_path,
                    p.status,
                    p.created_at,
                    p.updated_at
                FROM projects p
            """
            params: list[Any] = []

            if tag_id is not None:
                query += " JOIN project_tags pt ON pt.project_id = p.id AND pt.tag_id = %s "
                params.append(tag_id)

            query += " WHERE p.owner_id = %s "
            params.append(owner_id)

            if search and search.strip():
                search_term = f"%{search.strip()}%"
                query += " AND (p.name ILIKE %s OR p.description ILIKE %s) "
                params.extend([search_term, search_term])

            query += " ORDER BY p.updated_at DESC "

            cursor.execute(query, tuple(params))
            project_rows = cursor.fetchall()

            if not project_rows:
                return []

            project_ids = [r[0] for r in project_rows]

            # Fetch tags for all these projects in a single query
            cursor.execute(
                """
                SELECT
                    pt.project_id,
                    t.id,
                    t.user_id,
                    t.name,
                    t.color,
                    t.created_at,
                    t.updated_at
                FROM project_tags pt
                JOIN tags t ON t.id = pt.tag_id
                WHERE pt.project_id = ANY(%s)
                ORDER BY t.name ASC
                """,
                (project_ids,),
            )
            tag_rows = cursor.fetchall()
            tags_by_project: dict[int, list[dict[str, Any]]] = {pid: [] for pid in project_ids}
            for tr in tag_rows:
                tags_by_project[tr[0]].append(
                    {
                        "id": tr[1],
                        "user_id": tr[2],
                        "name": tr[3],
                        "color": tr[4],
                        "created_at": tr[5],
                        "updated_at": tr[6],
                    }
                )

            # Fetch video count and latest video for each project
            cursor.execute(
                """
                SELECT
                    v.project_id,
                    COUNT(v.id) AS video_count,
                    (
                        SELECT v2.title
                        FROM videos v2
                        WHERE v2.project_id = v.project_id
                        ORDER BY v2.updated_at DESC
                        LIMIT 1
                    ) AS recent_title,
                    (
                        SELECT v2.duration
                        FROM videos v2
                        WHERE v2.project_id = v.project_id
                        ORDER BY v2.updated_at DESC
                        LIMIT 1
                    ) AS recent_duration
                FROM videos v
                WHERE v.project_id = ANY(%s)
                GROUP BY v.project_id
                """,
                (project_ids,),
            )
            video_rows = cursor.fetchall()
            video_info_by_project: dict[int, dict[str, Any]] = {
                vr[0]: {
                    "video_count": vr[1],
                    "recent_title": vr[2],
                    "recent_duration": _format_duration(vr[3]),
                }
                for vr in video_rows
            }

            result: list[dict[str, Any]] = []
            for r in project_rows:
                pid = r[0]
                vinfo = video_info_by_project.get(pid, {"video_count": 0, "recent_title": None, "recent_duration": None})
                result.append(
                    {
                        "id": r[0],
                        "owner_id": r[1],
                        "name": r[2],
                        "description": r[3],
                        "cover_path": r[4],
                        "status": r[5],
                        "created_at": r[6],
                        "updated_at": r[7],
                        "tags": tags_by_project.get(pid, []),
                        "video_count": vinfo["video_count"],
                        "recent_project": vinfo["recent_title"],
                        "duration": vinfo["recent_duration"],
                        "size": None,
                    }
                )

            return result

    finally:
        connection.close()


# =========================================================
# Get Project By ID
# =========================================================

def get_project(
    owner_id: int,
    project_id: int,
) -> dict[str, Any] | None:
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id,
                    owner_id,
                    name,
                    description,
                    cover_path,
                    status,
                    created_at,
                    updated_at
                FROM projects
                WHERE id = %s AND owner_id = %s
                """,
                (project_id, owner_id),
            )
            row = cursor.fetchone()

            if row is None:
                return None

            # Fetch tags
            cursor.execute(
                """
                SELECT
                    t.id,
                    t.user_id,
                    t.name,
                    t.color,
                    t.created_at,
                    t.updated_at
                FROM project_tags pt
                JOIN tags t ON t.id = pt.tag_id
                WHERE pt.project_id = %s
                ORDER BY t.name ASC
                """,
                (project_id,),
            )
            tag_rows = cursor.fetchall()
            tags = [
                {
                    "id": tr[0],
                    "user_id": tr[1],
                    "name": tr[2],
                    "color": tr[3],
                    "created_at": tr[4],
                    "updated_at": tr[5],
                }
                for tr in tag_rows
            ]

            # Fetch video stats
            cursor.execute(
                """
                SELECT
                    COUNT(id),
                    (
                        SELECT title
                        FROM videos
                        WHERE project_id = %s
                        ORDER BY updated_at DESC
                        LIMIT 1
                    ),
                    (
                        SELECT duration
                        FROM videos
                        WHERE project_id = %s
                        ORDER BY updated_at DESC
                        LIMIT 1
                    )
                FROM videos
                WHERE project_id = %s
                """,
                (project_id, project_id, project_id),
            )
            v_row = cursor.fetchone()
            video_count = v_row[0] if v_row else 0
            recent_title = v_row[1] if v_row else None
            recent_duration = _format_duration(v_row[2]) if v_row else None

            return {
                "id": row[0],
                "owner_id": row[1],
                "name": row[2],
                "description": row[3],
                "cover_path": row[4],
                "status": row[5],
                "created_at": row[6],
                "updated_at": row[7],
                "tags": tags,
                "video_count": video_count,
                "recent_project": recent_title,
                "duration": recent_duration,
                "size": None,
            }

    finally:
        connection.close()


# =========================================================
# Update Project
# =========================================================

def update_project(
    owner_id: int,
    project_id: int,
    name: str | None = None,
    description: str | None = None,
    cover_path: str | None = None,
    status: str | None = None,
) -> dict[str, Any] | None:
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            # Check ownership first
            cursor.execute(
                "SELECT id FROM projects WHERE id = %s AND owner_id = %s",
                (project_id, owner_id),
            )
            if cursor.fetchone() is None:
                return None

            updates: list[str] = ["updated_at = CURRENT_TIMESTAMP"]
            params: list[Any] = []

            if name is not None:
                updates.append("name = %s")
                params.append(name.strip())

            if description is not None:
                updates.append("description = %s")
                params.append(description)

            if cover_path is not None:
                updates.append("cover_path = %s")
                params.append(cover_path)

            if status is not None:
                updates.append("status = %s")
                params.append(status)

            params.extend([project_id, owner_id])

            query = f"""
                UPDATE projects
                SET {", ".join(updates)}
                WHERE id = %s AND owner_id = %s
                RETURNING
                    id,
                    owner_id,
                    name,
                    description,
                    cover_path,
                    status,
                    created_at,
                    updated_at
            """
            cursor.execute(query, tuple(params))
            row = cursor.fetchone()

            if row is None:
                connection.rollback()
                return None

            # Fetch tags
            cursor.execute(
                """
                SELECT
                    t.id,
                    t.user_id,
                    t.name,
                    t.color,
                    t.created_at,
                    t.updated_at
                FROM project_tags pt
                JOIN tags t ON t.id = pt.tag_id
                WHERE pt.project_id = %s
                ORDER BY t.name ASC
                """,
                (project_id,),
            )
            tags = [
                {
                    "id": tr[0],
                    "user_id": tr[1],
                    "name": tr[2],
                    "color": tr[3],
                    "created_at": tr[4],
                    "updated_at": tr[5],
                }
                for tr in cursor.fetchall()
            ]

        connection.commit()

        return {
            "id": row[0],
            "owner_id": row[1],
            "name": row[2],
            "description": row[3],
            "cover_path": row[4],
            "status": row[5],
            "created_at": row[6],
            "updated_at": row[7],
            "tags": tags,
            "video_count": 0,
            "recent_project": None,
            "duration": None,
            "size": None,
        }

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


# =========================================================
# Delete Project
# =========================================================

def delete_project(
    owner_id: int,
    project_id: int,
) -> bool:
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                DELETE FROM projects
                WHERE id = %s AND owner_id = %s
                """,
                (project_id, owner_id),
            )
            deleted = cursor.rowcount > 0

        connection.commit()
        return deleted

    finally:
        connection.close()


# =========================================================
# Get Project Tags
# =========================================================

def get_project_tags(
    owner_id: int,
    project_id: int,
) -> list[dict[str, Any]] | None:
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            # Check project ownership
            cursor.execute(
                "SELECT id FROM projects WHERE id = %s AND owner_id = %s",
                (project_id, owner_id),
            )
            if cursor.fetchone() is None:
                return None

            cursor.execute(
                """
                SELECT
                    t.id,
                    t.user_id,
                    t.name,
                    t.color,
                    t.created_at,
                    t.updated_at
                FROM project_tags pt
                JOIN tags t ON t.id = pt.tag_id
                WHERE pt.project_id = %s
                ORDER BY t.name ASC
                """,
                (project_id,),
            )
            return [
                {
                    "id": tr[0],
                    "user_id": tr[1],
                    "name": tr[2],
                    "color": tr[3],
                    "created_at": tr[4],
                    "updated_at": tr[5],
                }
                for tr in cursor.fetchall()
            ]

    finally:
        connection.close()


# =========================================================
# Assign Tag to Project
# =========================================================

def add_project_tag(
    owner_id: int,
    project_id: int,
    tag_id: int,
) -> dict[str, Any] | None:
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            # Verify project ownership
            cursor.execute(
                "SELECT id FROM projects WHERE id = %s AND owner_id = %s",
                (project_id, owner_id),
            )
            if cursor.fetchone() is None:
                return None

            # Verify tag ownership
            cursor.execute(
                """
                SELECT id, user_id, name, color, created_at, updated_at
                FROM tags
                WHERE id = %s AND user_id = %s
                """,
                (tag_id, owner_id),
            )
            tag_row = cursor.fetchone()
            if tag_row is None:
                raise ValueError("Tag not found or does not belong to user.")

            cursor.execute(
                """
                INSERT INTO project_tags (project_id, tag_id)
                VALUES (%s, %s)
                ON CONFLICT (project_id, tag_id) DO NOTHING
                """,
                (project_id, tag_id),
            )

        connection.commit()

        return {
            "id": tag_row[0],
            "user_id": tag_row[1],
            "name": tag_row[2],
            "color": tag_row[3],
            "created_at": tag_row[4],
            "updated_at": tag_row[5],
        }

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


# =========================================================
# Remove Tag from Project
# =========================================================

def remove_project_tag(
    owner_id: int,
    project_id: int,
    tag_id: int,
) -> bool | None:
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            # Verify project ownership
            cursor.execute(
                "SELECT id FROM projects WHERE id = %s AND owner_id = %s",
                (project_id, owner_id),
            )
            if cursor.fetchone() is None:
                return None

            cursor.execute(
                """
                DELETE FROM project_tags
                WHERE project_id = %s AND tag_id = %s
                """,
                (project_id, tag_id),
            )
            deleted = cursor.rowcount > 0

        connection.commit()
        return deleted

    finally:
        connection.close()

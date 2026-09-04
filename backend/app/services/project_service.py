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
# Helper: Enrich Project Rows with Tags and Video Info
# =========================================================

def _enrich_projects_data(cursor, project_rows: list[tuple]) -> list[dict[str, Any]]:
    if not project_rows:
        return []

    project_ids = [r[0] for r in project_rows]

    # 1. Fetch tags for all projects in a single query
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

    # 2. Fetch video count and latest video for each project
    cursor.execute(
        """
        SELECT
            v.project_id,
            COUNT(v.id) AS video_count,
            (
                SELECT v2.title
                FROM videos v2
                WHERE v2.project_id = v.project_id
                  AND (v2.status != 'trash' AND v2.deleted_at IS NULL)
                ORDER BY v2.updated_at DESC
                LIMIT 1
            ) AS recent_title,
            (
                SELECT v2.duration
                FROM videos v2
                WHERE v2.project_id = v.project_id
                  AND (v2.status != 'trash' AND v2.deleted_at IS NULL)
                ORDER BY v2.updated_at DESC
                LIMIT 1
            ) AS recent_duration
        FROM videos v
        WHERE v.project_id = ANY(%s)
          AND (v.status != 'trash' AND v.deleted_at IS NULL)
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
        vinfo = video_info_by_project.get(
            pid, {"video_count": 0, "recent_title": None, "recent_duration": None}
        )
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
                "deleted_at": r[8],
                "is_favorite": bool(r[9]),
                "is_shared": bool(r[10]),
                "my_role": r[11] or "owner",
                "owner_name": r[12],
                "owner_email": r[13],
                "tags": tags_by_project.get(pid, []),
                "video_count": vinfo["video_count"],
                "recent_project": vinfo["recent_title"],
                "duration": vinfo["recent_duration"],
                "size": None,
            }
        )

    return result


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
                    updated_at,
                    deleted_at
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
            "deleted_at": row[8],
            "is_favorite": False,
            "is_shared": False,
            "my_role": "owner",
            "owner_name": None,
            "owner_email": None,
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
# Get All Projects by Scope (all, favorites, shared, trash)
# =========================================================

def get_projects(
    owner_id: int,
    tag_id: int | None = None,
    search: str | None = None,
    scope: str = "all",
) -> list[dict[str, Any]]:
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            params: list[Any] = []

            if scope == "trash":
                query = """
                    SELECT DISTINCT
                        p.id,
                        p.owner_id,
                        p.name,
                        p.description,
                        p.cover_path,
                        p.status,
                        p.created_at,
                        p.updated_at,
                        p.deleted_at,
                        (pf.user_id IS NOT NULL) AS is_favorite,
                        FALSE AS is_shared,
                        'owner' AS my_role,
                        NULL AS owner_name,
                        NULL AS owner_email
                    FROM projects p
                    LEFT JOIN project_favorites pf ON pf.project_id = p.id AND pf.user_id = %s
                """
                params.append(owner_id)

                if tag_id is not None:
                    query += " JOIN project_tags pt ON pt.project_id = p.id AND pt.tag_id = %s "
                    params.append(tag_id)

                query += " WHERE p.owner_id = %s AND (p.status = 'trash' OR p.deleted_at IS NOT NULL) "
                params.append(owner_id)

                if search and search.strip():
                    search_term = f"%{search.strip()}%"
                    query += " AND (p.name ILIKE %s OR p.description ILIKE %s) "
                    params.extend([search_term, search_term])

                query += " ORDER BY p.deleted_at DESC NULLS LAST, p.updated_at DESC "

            elif scope == "shared":
                query = """
                    SELECT DISTINCT
                        p.id,
                        p.owner_id,
                        p.name,
                        p.description,
                        p.cover_path,
                        p.status,
                        p.created_at,
                        p.updated_at,
                        p.deleted_at,
                        (pf.user_id IS NOT NULL) AS is_favorite,
                        TRUE AS is_shared,
                        pm.role AS my_role,
                        u.full_name AS owner_name,
                        u.email AS owner_email
                    FROM projects p
                    JOIN project_members pm ON pm.project_id = p.id
                    JOIN users u ON u.id = p.owner_id
                    LEFT JOIN project_favorites pf ON pf.project_id = p.id AND pf.user_id = %s
                """
                params.append(owner_id)

                if tag_id is not None:
                    query += " JOIN project_tags pt ON pt.project_id = p.id AND pt.tag_id = %s "
                    params.append(tag_id)

                query += """
                    WHERE (pm.user_id = %s OR pm.email = (SELECT email FROM users WHERE id = %s))
                      AND p.owner_id != %s
                      AND p.status != 'trash'
                      AND p.deleted_at IS NULL
                """
                params.extend([owner_id, owner_id, owner_id])

                if search and search.strip():
                    search_term = f"%{search.strip()}%"
                    query += " AND (p.name ILIKE %s OR p.description ILIKE %s) "
                    params.extend([search_term, search_term])

                query += " ORDER BY p.updated_at DESC "

            elif scope == "favorites":
                query = """
                    SELECT DISTINCT
                        p.id,
                        p.owner_id,
                        p.name,
                        p.description,
                        p.cover_path,
                        p.status,
                        p.created_at,
                        p.updated_at,
                        p.deleted_at,
                        TRUE AS is_favorite,
                        (p.owner_id != %s) AS is_shared,
                        COALESCE(pm.role, 'owner') AS my_role,
                        u.full_name AS owner_name,
                        u.email AS owner_email
                    FROM projects p
                    JOIN project_favorites pf ON pf.project_id = p.id AND pf.user_id = %s
                    JOIN users u ON u.id = p.owner_id
                    LEFT JOIN project_members pm ON pm.project_id = p.id AND (pm.user_id = %s OR pm.email = (SELECT email FROM users WHERE id = %s))
                """
                params.extend([owner_id, owner_id, owner_id, owner_id])

                if tag_id is not None:
                    query += " JOIN project_tags pt ON pt.project_id = p.id AND pt.tag_id = %s "
                    params.append(tag_id)

                query += """
                    WHERE (p.owner_id = %s OR pm.id IS NOT NULL)
                      AND p.status != 'trash'
                      AND p.deleted_at IS NULL
                """
                params.append(owner_id)

                if search and search.strip():
                    search_term = f"%{search.strip()}%"
                    query += " AND (p.name ILIKE %s OR p.description ILIKE %s) "
                    params.extend([search_term, search_term])

                query += " ORDER BY p.updated_at DESC "

            else:
                # scope == "all"
                query = """
                    SELECT DISTINCT
                        p.id,
                        p.owner_id,
                        p.name,
                        p.description,
                        p.cover_path,
                        p.status,
                        p.created_at,
                        p.updated_at,
                        p.deleted_at,
                        (pf.user_id IS NOT NULL) AS is_favorite,
                        FALSE AS is_shared,
                        'owner' AS my_role,
                        NULL AS owner_name,
                        NULL AS owner_email
                    FROM projects p
                    LEFT JOIN project_favorites pf ON pf.project_id = p.id AND pf.user_id = %s
                """
                params.append(owner_id)

                if tag_id is not None:
                    query += " JOIN project_tags pt ON pt.project_id = p.id AND pt.tag_id = %s "
                    params.append(tag_id)

                query += " WHERE p.owner_id = %s AND p.status != 'trash' AND p.deleted_at IS NULL "
                params.append(owner_id)

                if search and search.strip():
                    search_term = f"%{search.strip()}%"
                    query += " AND (p.name ILIKE %s OR p.description ILIKE %s) "
                    params.extend([search_term, search_term])

                query += " ORDER BY p.updated_at DESC "

            cursor.execute(query, tuple(params))
            project_rows = cursor.fetchall()

            return _enrich_projects_data(cursor, project_rows)

    finally:
        connection.close()


# =========================================================
# Get Project By ID
# =========================================================

def get_project(
    user_id: int | None = None,
    project_id: int | None = None,
    owner_id: int | None = None,
) -> dict[str, Any] | None:
    actual_user_id = user_id if user_id is not None else owner_id
    if actual_user_id is None or project_id is None:
        return None

    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    p.id,
                    p.owner_id,
                    p.name,
                    p.description,
                    p.cover_path,
                    p.status,
                    p.created_at,
                    p.updated_at,
                    p.deleted_at,
                    (pf.user_id IS NOT NULL) AS is_favorite,
                    (p.owner_id != %s) AS is_shared,
                    COALESCE(pm.role, 'owner') AS my_role,
                    u.full_name AS owner_name,
                    u.email AS owner_email
                FROM projects p
                JOIN users u ON u.id = p.owner_id
                LEFT JOIN project_favorites pf ON pf.project_id = p.id AND pf.user_id = %s
                LEFT JOIN project_members pm ON pm.project_id = p.id AND (pm.user_id = %s OR pm.email = (SELECT email FROM users WHERE id = %s))
                WHERE p.id = %s AND (p.owner_id = %s OR pm.id IS NOT NULL)
                """,
                (actual_user_id, actual_user_id, actual_user_id, actual_user_id, project_id, actual_user_id),
            )

            row = cursor.fetchone()

            if row is None:
                return None

            enriched = _enrich_projects_data(cursor, [row])
            return enriched[0] if enriched else None

    finally:
        connection.close()


# =========================================================
# Update Project
# =========================================================

def update_project(
    user_id: int,
    project_id: int,
    name: str | None = None,
    description: str | None = None,
    cover_path: str | None = None,
    status: str | None = None,
) -> dict[str, Any] | None:
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            # Check ownership or editor/admin permission
            cursor.execute(
                """
                SELECT p.id
                FROM projects p
                LEFT JOIN project_members pm ON pm.project_id = p.id AND (pm.user_id = %s OR pm.email = (SELECT email FROM users WHERE id = %s))
                WHERE p.id = %s AND (p.owner_id = %s OR pm.role IN ('editor', 'admin'))
                """,
                (user_id, user_id, project_id, user_id),
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

            params.append(project_id)

            query = f"""
                UPDATE projects
                SET {", ".join(updates)}
                WHERE id = %s
                RETURNING id
            """
            cursor.execute(query, tuple(params))
            if cursor.fetchone() is None:
                connection.rollback()
                return None

        connection.commit()
        return get_project(user_id, project_id)

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


# =========================================================
# Soft Delete Project (Move to Trash Queue)
# =========================================================

def soft_delete_project(
    owner_id: int,
    project_id: int,
) -> bool:
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE projects
                SET status = 'trash', deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND owner_id = %s AND status != 'trash'
                """,
                (project_id, owner_id),
            )
            deleted = cursor.rowcount > 0

            if deleted:
                cursor.execute(
                    """
                    UPDATE videos
                    SET status = 'trash', deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                    WHERE project_id = %s AND deleted_at IS NULL
                    """,
                    (project_id,),
                )

        connection.commit()
        return deleted

    finally:
        connection.close()


# Alias for backward compatibility
def delete_project(owner_id: int, project_id: int) -> bool:
    return soft_delete_project(owner_id, project_id)


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


# =========================================================
# Restore Project from Trash
# =========================================================

def restore_project(
    owner_id: int,
    project_id: int,
) -> dict[str, Any] | None:
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE projects
                SET status = 'active', deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND owner_id = %s
                """,
                (project_id, owner_id),
            )
            if cursor.rowcount == 0:
                return None

            cursor.execute(
                """
                UPDATE videos
                SET status = 'uploaded', deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
                WHERE project_id = %s AND status = 'trash'
                """,
                (project_id,),
            )

        connection.commit()
        return get_project(owner_id, project_id)

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


# =========================================================
# Permanently Delete Project (Hard Delete)
# =========================================================

def permanent_delete_project(
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
# Empty Trash (Permanently delete all trashed projects)
# =========================================================

def empty_trash(owner_id: int) -> int:
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                DELETE FROM projects
                WHERE owner_id = %s AND (status = 'trash' OR deleted_at IS NOT NULL)
                """,
                (owner_id,),
            )
            count = cursor.rowcount

        connection.commit()
        return count

    finally:
        connection.close()


# =========================================================
# Toggle Project Favorite
# =========================================================

def toggle_favorite(
    user_id: int,
    project_id: int,
) -> bool:
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            # 1. Verify access (owner or member)
            cursor.execute(
                """
                SELECT p.id
                FROM projects p
                LEFT JOIN project_members pm ON pm.project_id = p.id AND (pm.user_id = %s OR pm.email = (SELECT email FROM users WHERE id = %s))
                WHERE p.id = %s AND (p.owner_id = %s OR pm.id IS NOT NULL)
                """,
                (user_id, user_id, project_id, user_id),
            )
            if cursor.fetchone() is None:
                raise ValueError("Project not found or access denied.")

            # 2. Check if already favorited
            cursor.execute(
                "SELECT 1 FROM project_favorites WHERE user_id = %s AND project_id = %s",
                (user_id, project_id),
            )
            if cursor.fetchone():
                cursor.execute(
                    "DELETE FROM project_favorites WHERE user_id = %s AND project_id = %s",
                    (user_id, project_id),
                )
                is_fav = False
            else:
                cursor.execute(
                    "INSERT INTO project_favorites (user_id, project_id) VALUES (%s, %s)",
                    (user_id, project_id),
                )
                is_fav = True

        connection.commit()
        return is_fav

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


# =========================================================
# Project Members Management
# =========================================================

def get_project_members(
    user_id: int,
    project_id: int,
) -> list[dict[str, Any]] | None:
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            # Verify user has access to view members
            cursor.execute(
                """
                SELECT p.id
                FROM projects p
                LEFT JOIN project_members pm ON pm.project_id = p.id AND (pm.user_id = %s OR pm.email = (SELECT email FROM users WHERE id = %s))
                WHERE p.id = %s AND (p.owner_id = %s OR pm.id IS NOT NULL)
                """,
                (user_id, user_id, project_id, user_id),
            )
            if cursor.fetchone() is None:
                return None

            cursor.execute(
                """
                SELECT
                    pm.id,
                    pm.project_id,
                    pm.user_id,
                    pm.email,
                    pm.role,
                    pm.status,
                    pm.created_at,
                    u.full_name
                FROM project_members pm
                LEFT JOIN users u ON u.id = pm.user_id
                WHERE pm.project_id = %s
                ORDER BY pm.created_at ASC
                """,
                (project_id,),
            )
            return [
                {
                    "id": r[0],
                    "project_id": r[1],
                    "user_id": r[2],
                    "email": r[3],
                    "role": r[4],
                    "status": r[5],
                    "created_at": r[6],
                    "full_name": r[7],
                }
                for r in cursor.fetchall()
            ]

    finally:
        connection.close()


def add_project_member(
    owner_id: int,
    project_id: int,
    email: str,
    role: str = "viewer",
) -> dict[str, Any]:
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            # 1. Verify project ownership
            cursor.execute(
                "SELECT id FROM projects WHERE id = %s AND owner_id = %s",
                (project_id, owner_id),
            )
            if cursor.fetchone() is None:
                raise ValueError("Project not found or you are not the owner.")

            # 2. Check if trying to invite self
            cursor.execute("SELECT id, email FROM users WHERE id = %s", (owner_id,))
            owner_user = cursor.fetchone()
            cleaned_email = email.strip().lower()
            if owner_user and owner_user[1].lower() == cleaned_email:
                raise ValueError("You cannot share a project with yourself.")

            # 3. Check if user already exists
            cursor.execute(
                "SELECT id, full_name FROM users WHERE email = %s",
                (cleaned_email,),
            )
            target_user = cursor.fetchone()
            target_user_id = target_user[0] if target_user else None
            full_name = target_user[1] if target_user else None
            member_status = "accepted" if target_user else "pending"

            # 4. Insert or update member
            cursor.execute(
                """
                INSERT INTO project_members (
                    project_id,
                    user_id,
                    email,
                    role,
                    status,
                    invited_by
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (project_id, email)
                DO UPDATE SET
                    role = EXCLUDED.role,
                    user_id = COALESCE(EXCLUDED.user_id, project_members.user_id),
                    status = EXCLUDED.status,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id, project_id, user_id, email, role, status, created_at
                """,
                (
                    project_id,
                    target_user_id,
                    cleaned_email,
                    role,
                    member_status,
                    owner_id,
                ),
            )
            row = cursor.fetchone()

        connection.commit()

        return {
            "id": row[0],
            "project_id": row[1],
            "user_id": row[2],
            "email": row[3],
            "role": row[4],
            "status": row[5],
            "created_at": row[6],
            "full_name": full_name,
        }

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


def update_project_member_role(
    owner_id: int,
    project_id: int,
    member_id: int,
    role: str,
) -> dict[str, Any] | None:
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE project_members pm
                SET role = %s, updated_at = CURRENT_TIMESTAMP
                FROM projects p
                WHERE pm.id = %s
                  AND pm.project_id = p.id
                  AND p.id = %s
                  AND p.owner_id = %s
                RETURNING pm.id, pm.project_id, pm.user_id, pm.email, pm.role, pm.status, pm.created_at
                """,
                (role, member_id, project_id, owner_id),
            )
            row = cursor.fetchone()
            if row is None:
                return None

            cursor.execute("SELECT full_name FROM users WHERE id = %s", (row[2],))
            u_row = cursor.fetchone()
            full_name = u_row[0] if u_row else None

        connection.commit()

        return {
            "id": row[0],
            "project_id": row[1],
            "user_id": row[2],
            "email": row[3],
            "role": row[4],
            "status": row[5],
            "created_at": row[6],
            "full_name": full_name,
        }

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


def remove_project_member(
    user_id: int,
    project_id: int,
    member_id: int,
) -> bool:
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                DELETE FROM project_members pm
                WHERE pm.id = %s
                  AND pm.project_id = %s
                  AND (
                      EXISTS (SELECT 1 FROM projects p WHERE p.id = %s AND p.owner_id = %s)
                      OR pm.user_id = %s
                      OR pm.email = (SELECT email FROM users WHERE id = %s)
                  )
                """,
                (member_id, project_id, project_id, user_id, user_id, user_id),
            )
            deleted = cursor.rowcount > 0

        connection.commit()
        return deleted

    finally:
        connection.close()


from typing import Any

import psycopg2

from app.core.database import get_connection


# =========================================================
# Create Tag
# =========================================================

def create_tag(
    user_id: int,
    name: str,
    color: str | None = None,
) -> dict[str, Any]:

    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO tags (
                    user_id,
                    name,
                    color
                )
                VALUES (%s, %s, %s)
                RETURNING
                    id,
                    user_id,
                    name,
                    color,
                    created_at,
                    updated_at
                """,
                (
                    user_id,
                    name,
                    color,
                ),
            )

            row = cursor.fetchone()

        connection.commit()

        return {
            "id": row[0],
            "user_id": row[1],
            "name": row[2],
            "color": row[3],
            "created_at": row[4],
            "updated_at": row[5],
        }

    except psycopg2.errors.UniqueViolation:
        connection.rollback()

        raise ValueError(
            "A tag with this name already exists."
        )

    finally:
        connection.close()


# =========================================================
# Get All Tags
# =========================================================

def get_tags(
    user_id: int,
) -> list[dict[str, Any]]:

    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id,
                    user_id,
                    name,
                    color,
                    created_at,
                    updated_at
                FROM tags
                WHERE user_id = %s
                ORDER BY created_at DESC
                """,
                (user_id,),
            )

            rows = cursor.fetchall()

        return [
            {
                "id": row[0],
                "user_id": row[1],
                "name": row[2],
                "color": row[3],
                "created_at": row[4],
                "updated_at": row[5],
            }
            for row in rows
        ]

    finally:
        connection.close()


# =========================================================
# Get Tag By ID
# =========================================================

def get_tag(
    user_id: int,
    tag_id: int,
) -> dict[str, Any] | None:

    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id,
                    user_id,
                    name,
                    color,
                    created_at,
                    updated_at
                FROM tags
                WHERE id = %s
                  AND user_id = %s
                """,
                (
                    tag_id,
                    user_id,
                ),
            )

            row = cursor.fetchone()

        if row is None:
            return None

        return {
            "id": row[0],
            "user_id": row[1],
            "name": row[2],
            "color": row[3],
            "created_at": row[4],
            "updated_at": row[5],
        }

    finally:
        connection.close()


# =========================================================
# Update Tag
# =========================================================

def update_tag(
    user_id: int,
    tag_id: int,
    name: str,
    color: str | None = None,
) -> dict[str, Any] | None:

    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE tags
                SET
                    name = %s,
                    color = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                  AND user_id = %s
                RETURNING
                    id,
                    user_id,
                    name,
                    color,
                    created_at,
                    updated_at
                """,
                (
                    name,
                    color,
                    tag_id,
                    user_id,
                ),
            )

            row = cursor.fetchone()

        if row is None:
            connection.rollback()
            return None

        connection.commit()

        return {
            "id": row[0],
            "user_id": row[1],
            "name": row[2],
            "color": row[3],
            "created_at": row[4],
            "updated_at": row[5],
        }

    except psycopg2.errors.UniqueViolation:
        connection.rollback()

        raise ValueError(
            "A tag with this name already exists."
        )

    finally:
        connection.close()


# =========================================================
# Delete Tag
# =========================================================

def delete_tag(
    user_id: int,
    tag_id: int,
) -> bool:

    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                DELETE FROM tags
                WHERE id = %s
                  AND user_id = %s
                """,
                (
                    tag_id,
                    user_id,
                ),
            )

            deleted = cursor.rowcount > 0

        connection.commit()

        return deleted

    finally:
        connection.close()
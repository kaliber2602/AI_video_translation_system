import json
from app.core.database import get_connection

from app.schemas.user_settings import (
    UserSettingsPatch,
    UserSettingsUpdate,
)


DEFAULT_SETTINGS = {
    "theme": "default_theme",
    "language": "vi",
}


def _row_to_dict(row):
    if row is None:
        return None

    # row: (id, user_id, preferences)
    prefs = row[2] if len(row) > 2 else {}
    if isinstance(prefs, str):
        try:
            prefs = json.loads(prefs)
        except Exception:
            prefs = {}
    elif prefs is None:
        prefs = {}

    theme = prefs.get("theme", DEFAULT_SETTINGS["theme"])
    language = prefs.get("language", DEFAULT_SETTINGS["language"])

    return {
        "id": row[0],
        "user_id": row[1],
        "theme": theme,
        "language": language,
        "preferences": prefs,
    }


def get_user_settings(user_id: int):
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id,
                    user_id,
                    preferences
                FROM user_settings
                WHERE user_id = %s
                """,
                (user_id,),
            )
            row = cursor.fetchone()
            if not row:
                # Insert default if not exists
                cursor.execute(
                    """
                    INSERT INTO user_settings (user_id, preferences)
                    VALUES (%s, %s::jsonb)
                    ON CONFLICT (user_id) DO NOTHING
                    RETURNING id, user_id, preferences
                    """,
                    (user_id, json.dumps(DEFAULT_SETTINGS)),
                )
                row = cursor.fetchone()
                connection.commit()
                if not row:
                    cursor.execute(
                        "SELECT id, user_id, preferences FROM user_settings WHERE user_id = %s",
                        (user_id,),
                    )
                    row = cursor.fetchone()

            return _row_to_dict(row)
    finally:
        connection.close()


def update_user_settings(
    user_id: int,
    data: UserSettingsUpdate,
):
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            prefs = data.preferences or {}
            if data.theme:
                prefs["theme"] = data.theme
            if data.language:
                prefs["language"] = data.language

            cursor.execute(
                """
                UPDATE user_settings
                SET
                    preferences = %s::jsonb,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
                RETURNING
                    id,
                    user_id,
                    preferences
                """,
                (
                    json.dumps(prefs),
                    user_id,
                ),
            )

            row = cursor.fetchone()
            if row is None:
                cursor.execute(
                    """
                    INSERT INTO user_settings (user_id, preferences)
                    VALUES (%s, %s::jsonb)
                    RETURNING id, user_id, preferences
                    """,
                    (user_id, json.dumps(prefs)),
                )
                row = cursor.fetchone()

        connection.commit()
        return _row_to_dict(row)
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def patch_user_settings(
    user_id: int,
    data: UserSettingsPatch,
):
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return get_user_settings(user_id)

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            # fetch existing
            cursor.execute("SELECT preferences FROM user_settings WHERE user_id = %s", (user_id,))
            r = cursor.fetchone()
            existing_prefs = {}
            if r and r[0]:
                existing_prefs = r[0] if isinstance(r[0], dict) else json.loads(r[0])

            if "preferences" in update_data and isinstance(update_data["preferences"], dict):
                existing_prefs.update(update_data["preferences"])
            if "theme" in update_data and update_data["theme"]:
                existing_prefs["theme"] = update_data["theme"]
            if "language" in update_data and update_data["language"]:
                existing_prefs["language"] = update_data["language"]

            cursor.execute(
                """
                UPDATE user_settings
                SET
                    preferences = %s::jsonb,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
                RETURNING
                    id,
                    user_id,
                    preferences
                """,
                (json.dumps(existing_prefs), user_id),
            )
            row = cursor.fetchone()
            if row is None:
                cursor.execute(
                    """
                    INSERT INTO user_settings (user_id, preferences)
                    VALUES (%s, %s::jsonb)
                    RETURNING id, user_id, preferences
                    """,
                    (user_id, json.dumps(existing_prefs)),
                )
                row = cursor.fetchone()

        connection.commit()
        return _row_to_dict(row)
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def reset_user_settings(
    user_id: int,
):
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE user_settings
                SET
                    preferences = %s::jsonb,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
                RETURNING
                    id,
                    user_id,
                    preferences
                """,
                (
                    json.dumps(DEFAULT_SETTINGS),
                    user_id,
                ),
            )
            row = cursor.fetchone()
            if row is None:
                cursor.execute(
                    """
                    INSERT INTO user_settings (user_id, preferences)
                    VALUES (%s, %s::jsonb)
                    RETURNING id, user_id, preferences
                    """,
                    (user_id, json.dumps(DEFAULT_SETTINGS)),
                )
                row = cursor.fetchone()

        connection.commit()
        return _row_to_dict(row)
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

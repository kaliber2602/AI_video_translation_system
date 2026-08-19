from app.core.database import get_connection

from app.schemas.user_settings import (
    UserSettingsPatch,
    UserSettingsUpdate,
)


DEFAULT_SETTINGS = {
    "theme": "default_theme",
    "language": "en",
    "default_target_language": None,
    "default_translation_model": None,
    "default_tts_model": None,
}


def _row_to_dict(row):
    if row is None:
        return None

    return {
        "id": row[0],
        "user_id": row[1],
        "theme": row[2],
        "language": row[3],
        "default_target_language": row[4],
        "default_translation_model": row[5],
        "default_tts_model": row[6],
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
                    theme,
                    language,
                    default_target_language,
                    default_translation_model,
                    default_tts_model
                FROM user_settings
                WHERE user_id = %s
                """,
                (user_id,),
            )

            return _row_to_dict(
                cursor.fetchone()
            )

    finally:
        connection.close()


def update_user_settings(
    user_id: int,
    data: UserSettingsUpdate,
):

    connection = get_connection()

    try:
        with connection.cursor() as cursor:

            cursor.execute(
                """
                UPDATE user_settings
                SET
                    theme = %s,
                    language = %s,
                    default_target_language = %s,
                    default_translation_model = %s,
                    default_tts_model = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
                RETURNING
                    id,
                    user_id,
                    theme,
                    language,
                    default_target_language,
                    default_translation_model,
                    default_tts_model
                """,
                (
                    data.theme,
                    data.language,
                    data.default_target_language,
                    data.default_translation_model,
                    data.default_tts_model,
                    user_id,
                ),
            )

            row = cursor.fetchone()

            if row is None:
                connection.rollback()
                return None

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

    update_data = data.model_dump(
        exclude_unset=True
    )

    if not update_data:
        return get_user_settings(user_id)

    allowed_fields = {
        "theme",
        "language",
        "default_target_language",
        "default_translation_model",
        "default_tts_model",
    }

    fields = [
        field
        for field in update_data
        if field in allowed_fields
    ]

    connection = get_connection()

    try:

        set_clauses = []
        values = []

        for field in fields:

            set_clauses.append(
                f"{field} = %s"
            )

            values.append(
                update_data[field]
            )

        set_clauses.append(
            "updated_at = CURRENT_TIMESTAMP"
        )

        values.append(user_id)

        query = f"""
            UPDATE user_settings
            SET {", ".join(set_clauses)}
            WHERE user_id = %s
            RETURNING
                id,
                user_id,
                theme,
                language,
                default_target_language,
                default_translation_model,
                default_tts_model
        """

        with connection.cursor() as cursor:

            cursor.execute(
                query,
                tuple(values),
            )

            row = cursor.fetchone()

            if row is None:
                connection.rollback()
                return None

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
                    theme = %s,
                    language = %s,
                    default_target_language = %s,
                    default_translation_model = %s,
                    default_tts_model = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
                RETURNING
                    id,
                    user_id,
                    theme,
                    language,
                    default_target_language,
                    default_translation_model,
                    default_tts_model
                """,
                (
                    DEFAULT_SETTINGS["theme"],
                    DEFAULT_SETTINGS["language"],
                    DEFAULT_SETTINGS[
                        "default_target_language"
                    ],
                    DEFAULT_SETTINGS[
                        "default_translation_model"
                    ],
                    DEFAULT_SETTINGS[
                        "default_tts_model"
                    ],
                    user_id,
                ),
            )

            row = cursor.fetchone()

            if row is None:
                connection.rollback()
                return None

        connection.commit()

        return _row_to_dict(row)

    except Exception:

        connection.rollback()
        raise

    finally:

        connection.close()
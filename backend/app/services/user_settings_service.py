import json
from app.core.database import get_connection

from app.schemas.user_settings import (
    UserSettingsPatch,
    UserSettingsUpdate,
)


DEFAULT_SETTINGS = {
    "theme": "light",
    "language": "en",
    "default_target_language": "vi",
    "default_separation_model": "demucs_v4",
    "default_stt_model": "whisperx_large_v3",
    "default_diarization_model": "pyannote_3.1",
    "default_translation_model": "nllb_200_1.3b",
    "default_tts_model": "xtts_v2",
    "default_llm_model": "gpt_4o",
    "default_embedding_model": "qwen3_embedding",
}


def _row_to_dict(row):
    if row is None:
        return None

    prefs = row[12] if len(row) > 12 else {}
    if isinstance(prefs, str):
        try:
            prefs = json.loads(prefs)
        except Exception:
            prefs = {}
    elif prefs is None:
        prefs = {}

    return {
        "id": row[0],
        "user_id": row[1],
        "theme": row[2],
        "language": row[3],
        "default_target_language": row[4],
        "default_separation_model": row[5],
        "default_stt_model": row[6],
        "default_diarization_model": row[7],
        "default_translation_model": row[8],
        "default_tts_model": row[9],
        "default_llm_model": row[10],
        "default_embedding_model": row[11],
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
                    theme,
                    language,
                    default_target_language,
                    default_separation_model,
                    default_stt_model,
                    default_diarization_model,
                    default_translation_model,
                    default_tts_model,
                    default_llm_model,
                    default_embedding_model,
                    preferences
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
                    default_separation_model = %s,
                    default_stt_model = %s,
                    default_diarization_model = %s,
                    default_translation_model = %s,
                    default_tts_model = %s,
                    default_llm_model = %s,
                    default_embedding_model = %s,
                    preferences = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
                RETURNING
                    id,
                    user_id,
                    theme,
                    language,
                    default_target_language,
                    default_separation_model,
                    default_stt_model,
                    default_diarization_model,
                    default_translation_model,
                    default_tts_model,
                    default_llm_model,
                    default_embedding_model,
                    preferences
                """,
                (
                    data.theme,
                    data.language,
                    data.default_target_language,
                    data.default_separation_model,
                    data.default_stt_model,
                    data.default_diarization_model,
                    data.default_translation_model,
                    data.default_tts_model,
                    data.default_llm_model,
                    data.default_embedding_model,
                    json.dumps(data.preferences or {}),
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
        "default_separation_model",
        "default_stt_model",
        "default_diarization_model",
        "default_translation_model",
        "default_tts_model",
        "default_llm_model",
        "default_embedding_model",
        "preferences",
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
            if field == "preferences":
                set_clauses.append(
                    "preferences = COALESCE(preferences, '{}'::jsonb) || %s::jsonb"
                )
                values.append(
                    json.dumps(update_data["preferences"] or {})
                )
            else:
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
                default_separation_model,
                default_stt_model,
                default_diarization_model,
                default_translation_model,
                default_tts_model,
                default_llm_model,
                default_embedding_model,
                preferences
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
                    default_separation_model = %s,
                    default_stt_model = %s,
                    default_diarization_model = %s,
                    default_translation_model = %s,
                    default_tts_model = %s,
                    default_llm_model = %s,
                    default_embedding_model = %s,
                    preferences = '{}'::jsonb,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
                RETURNING
                    id,
                    user_id,
                    theme,
                    language,
                    default_target_language,
                    default_separation_model,
                    default_stt_model,
                    default_diarization_model,
                    default_translation_model,
                    default_tts_model,
                    default_llm_model,
                    default_embedding_model,
                    preferences
                """,
                (
                    DEFAULT_SETTINGS["theme"],
                    DEFAULT_SETTINGS["language"],
                    DEFAULT_SETTINGS["default_target_language"],
                    DEFAULT_SETTINGS["default_separation_model"],
                    DEFAULT_SETTINGS["default_stt_model"],
                    DEFAULT_SETTINGS["default_diarization_model"],
                    DEFAULT_SETTINGS["default_translation_model"],
                    DEFAULT_SETTINGS["default_tts_model"],
                    DEFAULT_SETTINGS["default_llm_model"],
                    DEFAULT_SETTINGS["default_embedding_model"],
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
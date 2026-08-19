import os

import psycopg2


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://ai_video:ai_video@db:5432/ai_video",
)


def get_connection():
    database_url = DATABASE_URL

    if database_url.startswith(
        "postgresql+psycopg://"
    ):
        database_url = database_url.replace(
            "postgresql+psycopg://",
            "postgresql://",
            1,
        )

    if database_url.startswith(
        "postgresql+psycopg2://"
    ):
        database_url = database_url.replace(
            "postgresql+psycopg2://",
            "postgresql://",
            1,
        )

    return psycopg2.connect(database_url)
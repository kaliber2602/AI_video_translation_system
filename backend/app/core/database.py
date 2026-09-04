import os

import psycopg2


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://ai_video:ai_video@db:5432/ai_video",
)


_RESOLVED_DATABASE_URL = None


def get_connection():
    global _RESOLVED_DATABASE_URL
    database_url = _RESOLVED_DATABASE_URL or os.getenv("DATABASE_URL", DATABASE_URL)

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

    try:
        conn = psycopg2.connect(database_url, connect_timeout=2)
        _RESOLVED_DATABASE_URL = database_url
        return conn
    except psycopg2.OperationalError as exc:
        if "@db:" in database_url or "@db/" in database_url:
            local_url = database_url.replace("@db:", "@localhost:").replace("@db/", "@localhost/")
            try:
                conn = psycopg2.connect(local_url, connect_timeout=2)
                _RESOLVED_DATABASE_URL = local_url
                return conn
            except Exception:
                pass
        raise exc
import os

import psycopg2
from psycopg2.extensions import connection


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://ai_video:ai_video@db:5432/ai_video",
)


def get_connection() -> connection:
    return psycopg2.connect(DATABASE_URL)
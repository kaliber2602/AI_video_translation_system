import os
import psycopg2
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://ai_video:ai_video@db:5432/ai_video",
)

# Clean the URL for SQLAlchemy (remove any +psycopg prefixes)
SQLALCHEMY_DATABASE_URL = DATABASE_URL
if SQLALCHEMY_DATABASE_URL.startswith("postgresql+psycopg://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgresql+psycopg://", "postgresql://", 1)
if SQLALCHEMY_DATABASE_URL.startswith("postgresql+psycopg2://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://", 1)

# SQLAlchemy engine and session
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# FastAPI dependency for database session
def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        
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

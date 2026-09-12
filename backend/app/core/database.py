# app/core/database.py - Standardized PostgreSQL connection pool & query engine (No SQLAlchemy)
import os
import logging
from contextlib import contextmanager
from typing import Any, Dict, List, Optional, Tuple, Union
import psycopg2
from psycopg2 import pool, extras

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://ai_video:ai_video@db:5432/ai_video",
)

_RESOLVED_DATABASE_URL: Optional[str] = None
_POOL: Optional[pool.ThreadedConnectionPool] = None
_LAST_CONNECT_FAILURE: float = 0.0
_LAST_CONNECT_ERROR: Optional[Exception] = None


def _clean_url(url: str) -> str:
    """Strip any SQLAlchemy specific dialect prefixes."""
    if url.startswith("postgresql+psycopg://"):
        url = url.replace("postgresql+psycopg://", "postgresql://", 1)
    if url.startswith("postgresql+psycopg2://"):
        url = url.replace("postgresql+psycopg2://", "postgresql://", 1)
    return url


def _init_pool() -> pool.ThreadedConnectionPool:
    global _POOL, _RESOLVED_DATABASE_URL, _LAST_CONNECT_FAILURE, _LAST_CONNECT_ERROR
    if _POOL is not None and not _POOL.closed:
        return _POOL

    import time
    if time.time() - _LAST_CONNECT_FAILURE < 5.0 and _LAST_CONNECT_ERROR is not None:
        raise _LAST_CONNECT_ERROR

    raw_url = _RESOLVED_DATABASE_URL or os.getenv("DATABASE_URL", DATABASE_URL)
    database_url = _clean_url(raw_url)

    # If running on host outside Docker container, immediately try localhost fallback
    if ("@db:" in database_url or "@db/" in database_url) and (os.name == "nt" or not os.path.exists("/.dockerenv")):
        database_url = database_url.replace("@db:", "@localhost:").replace("@db/", "@localhost/")

    try:
        _POOL = pool.ThreadedConnectionPool(1, 20, dsn=database_url, connect_timeout=1)
        _RESOLVED_DATABASE_URL = database_url
        try:
            extras.register_uuid()
        except Exception:
            pass
        logger.info("Initialized PostgreSQL ThreadedConnectionPool (min=1, max=20)")
        return _POOL
    except psycopg2.OperationalError as exc:
        _RESOLVED_DATABASE_URL = database_url
        _LAST_CONNECT_FAILURE = time.time()
        _LAST_CONNECT_ERROR = exc
        raise exc


class PooledConnectionWrapper:
    """
    Transparent proxy around psycopg2 connection.
    Intercepts close() to return connection back to ThreadedConnectionPool
    instead of terminating the underlying TCP socket.
    """
    def __init__(self, conn, p: pool.ThreadedConnectionPool):
        self._conn = conn
        self._pool = p
        self._returned = False

    def close(self):
        if not self._returned and self._pool is not None:
            self._returned = True
            try:
                if not self._conn.closed:
                    self._conn.rollback()
                self._pool.putconn(self._conn)
            except Exception as e:
                logger.warning(f"Error returning connection to pool: {e}")

    def __enter__(self):
        return self._conn.__enter__()

    def __exit__(self, exc_type, exc_val, exc_tb):
        return self._conn.__exit__(exc_type, exc_val, exc_tb)

    def __getattr__(self, name):
        return getattr(self._conn, name)


def get_connection():
    """
    Get a PostgreSQL connection from the centralized connection pool.
    Calling conn.close() safely returns the connection to the pool.
    """
    p = _init_pool()
    raw_conn = p.getconn()
    return PooledConnectionWrapper(raw_conn, p)


@contextmanager
def get_db_cursor(commit: bool = False):
    """Context manager for acquiring a cursor with automatic connection recycling."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            yield cur
        if commit:
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def close_pool():
    """Shut down all connections in the pool."""
    global _POOL
    if _POOL is not None and not _POOL.closed:
        _POOL.closeall()
        _POOL = None


def ensure_db_schema():
    """
    Ensure all required tables and columns exist in PostgreSQL.
    Idempotent and safe to run on startup.
    """
    try:
        with get_db_cursor(commit=True) as cur:
            # 1. user_settings.preferences JSONB
            cur.execute("ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;")

            # 2. refresh_tokens session columns
            cur.execute("ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS user_agent VARCHAR(500);")
            cur.execute("ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS ip_address VARCHAR(100);")
            cur.execute("ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE;")

            # 3. users table: is_deleted
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;")

            # 4. user_api_keys table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS user_api_keys (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    name VARCHAR(255) NOT NULL,
                    prefix VARCHAR(50) NOT NULL,
                    key_hash VARCHAR(255) NOT NULL,
                    environment VARCHAR(50) NOT NULL DEFAULT 'production',
                    last_used_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            """)

            # 5. user_integrations table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS user_integrations (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    app_id VARCHAR(100) NOT NULL,
                    is_connected BOOLEAN NOT NULL DEFAULT FALSE,
                    account_email VARCHAR(255),
                    config JSONB DEFAULT '{}'::jsonb,
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT uq_user_app UNIQUE (user_id, app_id)
                );
            """)
            # 6. videos language and snapshot columns
            cur.execute("ALTER TABLE videos ADD COLUMN IF NOT EXISTS target_language VARCHAR(20);")
            cur.execute("ALTER TABLE videos ADD COLUMN IF NOT EXISTS source_language VARCHAR(20);")
            cur.execute("ALTER TABLE videos ADD COLUMN IF NOT EXISTS snapshot_data JSONB DEFAULT '{}'::jsonb;")
            logger.info("Database schema verification and dynamic migration completed successfully.")
    except Exception as exc:
        logger.warning(f"Error checking/migrating DB schema: {exc}")


# ============================================================================
# LIGHTWEIGHT PSYCOPG2 QUERY & DATA ADAPTER
# ============================================================================

class Column:
    def __init__(self, name: str, table_name: str = ""):
        self.name = name
        self._table = table_name

    def __eq__(self, other: Any):
        return (self.name, "=", other)

    def __ne__(self, other: Any):
        return (self.name, "!=", other)

    def __gt__(self, other: Any):
        return (self.name, ">", other)

    def __lt__(self, other: Any):
        return (self.name, "<", other)

    def __ge__(self, other: Any):
        return (self.name, ">=", other)

    def __le__(self, other: Any):
        return (self.name, "<=", other)

    def in_(self, other: Any):
        return (self.name, "IN", other)

    def is_(self, other: Any):
        return (self.name, "=", other)

    def is_not(self, other: Any):
        return (self.name, "!=", other)

    def contains(self, other: Any):
        return (self.name, "CONTAINS", other)

    def like(self, other: Any):
        return (self.name, "LIKE", other)

    def ilike(self, other: Any):
        return (self.name, "ILIKE", other)

    def startswith(self, other: Any):
        return (self.name, "LIKE", f"{other}%")

    def endswith(self, other: Any):
        return (self.name, "LIKE", f"%{other}")

    def desc(self) -> str:
        return f"{self.name} DESC"

    def asc(self) -> str:
        return f"{self.name} ASC"


def desc(col: Union[Column, str]) -> str:
    if hasattr(col, "desc"):
        return col.desc()
    return f"{col} DESC"


def asc(col: Union[Column, str]) -> str:
    if hasattr(col, "asc"):
        return col.asc()
    return f"{col} ASC"


class RowRecord(dict):
    """Dictionary representing a database row with dot-notation attribute access and change tracking."""
    def __init__(self, table: str, data: Dict[str, Any], is_new: bool = False, session: Optional["DatabaseSession"] = None):
        super().__init__(data)
        self._table = table
        self._dirty: Dict[str, Any] = {}
        self._is_new = is_new
        self._session = session

    def __getattr__(self, name: str) -> Any:
        if name in self:
            return self[name]
        return None

    def __setattr__(self, name: str, value: Any):
        if name.startswith("_"):
            super().__setattr__(name, value)
        else:
            self[name] = value
            self._dirty[name] = value
            if self._session is not None:
                self._session._track_record(self)


class TableModel:
    """Lightweight metadata descriptor representing a database table."""
    def __init__(self, table_name: str):
        self.__tablename__ = table_name
        self.__table_name__ = table_name
        self.name = table_name

    def __str__(self) -> str:
        return self.__tablename__

    def __repr__(self) -> str:
        return f"<TableModel {self.__tablename__}>"

    def __getattr__(self, name: str) -> Column:
        return Column(name, self.__tablename__)

    def __call__(self, **kwargs) -> RowRecord:
        import uuid
        from datetime import datetime
        data = dict(kwargs)
        if "id" not in data and self.__tablename__ == "pipeline_jobs":
            data["id"] = uuid.uuid4()
        return RowRecord(self.__tablename__, data, is_new=True)


class DBQuery:
    """Fluent query builder executing parameterized queries directly via psycopg2."""
    def __init__(self, table_or_model: Any, session: "DatabaseSession"):
        if hasattr(table_or_model, "__tablename__"):
            self.table = table_or_model.__tablename__
            self.selected_col = "*"
        elif hasattr(table_or_model, "name") and hasattr(table_or_model, "_table"):
            self.table = table_or_model._table
            self.selected_col = table_or_model.name
        else:
            self.table = str(table_or_model)
            self.selected_col = "*"

        self.session = session
        self.filters: List[Any] = []
        self.order_by_clauses: List[str] = []
        self.limit_val: Optional[int] = None
        self.offset_val: Optional[int] = None

    def filter(self, *conditions) -> "DBQuery":
        for cond in conditions:
            if cond is not None:
                self.filters.append(cond)
        return self

    def filter_by(self, **kwargs) -> "DBQuery":
        for k, v in kwargs.items():
            self.filters.append((k, "=", v))
        return self

    def order_by(self, *clauses) -> "DBQuery":
        for c in clauses:
            if isinstance(c, str):
                self.order_by_clauses.append(c)
            elif hasattr(c, "desc") and callable(c.desc):
                self.order_by_clauses.append(c.desc())
            elif hasattr(c, "name"):
                self.order_by_clauses.append(c.name)
        return self

    def limit(self, val: int) -> "DBQuery":
        self.limit_val = val
        return self

    def offset(self, val: int) -> "DBQuery":
        self.offset_val = val
        return self

    def subquery(self) -> "DBQuery":
        return self

    def _build_sql(self) -> Tuple[str, List[Any]]:
        sql = f"SELECT {self.selected_col} FROM {self.table}"
        params: List[Any] = []
        where_parts: List[str] = []

        for f in self.filters:
            if isinstance(f, tuple) and len(f) == 3:
                col, op, val = f
                if op == "IN":
                    if isinstance(val, (list, tuple, set)):
                        val_list = list(val)
                        if len(val_list) == 0:
                            where_parts.append("1=0")
                        else:
                            placeholders = ", ".join(["%s"] * len(val_list))
                            where_parts.append(f"{col} IN ({placeholders})")
                            params.extend(val_list)
                    elif isinstance(val, DBQuery):
                        sub_sql, sub_params = val._build_sql()
                        where_parts.append(f"{col} IN ({sub_sql})")
                        params.extend(sub_params)
                elif op == "=" and val is None:
                    where_parts.append(f"{col} IS NULL")
                elif op == "!=" and val is None:
                    where_parts.append(f"{col} IS NOT NULL")
                elif op == "CONTAINS":
                    import json
                    if isinstance(val, (dict, list)):
                        where_parts.append(f"{col} @> %s::jsonb")
                        params.append(json.dumps(val))
                    else:
                        where_parts.append(f"{col} LIKE %s")
                        params.append(f"%{val}%")
                elif op in ("LIKE", "ILIKE"):
                    where_parts.append(f"{col} {op} %s")
                    params.append(val)
                else:
                    where_parts.append(f"{col} {op} %s")
                    params.append(val)
            elif isinstance(f, str):
                where_parts.append(f)

        if where_parts:
            sql += " WHERE " + " AND ".join(where_parts)
        if self.order_by_clauses:
            sql += " ORDER BY " + ", ".join(self.order_by_clauses)
        if self.limit_val is not None:
            sql += f" LIMIT {int(self.limit_val)}"
        if self.offset_val is not None:
            sql += f" OFFSET {int(self.offset_val)}"

        return sql, params

    def first(self) -> Optional[RowRecord]:
        self.limit_val = 1
        sql, params = self._build_sql()
        with self.session.conn.cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            if not row:
                return None
            col_names = [d[0] for d in cur.description]
            record = RowRecord(self.table, dict(zip(col_names, row)), session=self.session)
            self.session._track_record(record)
            return record

    def all(self) -> List[RowRecord]:
        sql, params = self._build_sql()
        with self.session.conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
            if not rows:
                return []
            col_names = [d[0] for d in cur.description]
            results = []
            for r in rows:
                rec = RowRecord(self.table, dict(zip(col_names, r)), session=self.session)
                self.session._track_record(rec)
                results.append(rec)
            return results

    def count(self) -> int:
        old_col = self.selected_col
        self.selected_col = "COUNT(*)"
        sql, params = self._build_sql()
        self.selected_col = old_col
        with self.session.conn.cursor() as cur:
            cur.execute(sql, params)
            res = cur.fetchone()
            return res[0] if res else 0

    def delete(self) -> int:
        """Execute DELETE on the queried table matching the filters."""
        sql = f"DELETE FROM {self.table}"
        where_parts: List[str] = []
        params: List[Any] = []

        for f in self.filters:
            if isinstance(f, tuple) and len(f) == 3:
                col, op, val = f
                if op == "IN":
                    if isinstance(val, (list, tuple, set)):
                        val_list = list(val)
                        if len(val_list) == 0:
                            where_parts.append("1=0")
                        else:
                            placeholders = ", ".join(["%s"] * len(val_list))
                            where_parts.append(f"{col} IN ({placeholders})")
                            params.extend(val_list)
                    elif isinstance(val, DBQuery):
                        sub_sql, sub_params = val._build_sql()
                        where_parts.append(f"{col} IN ({sub_sql})")
                        params.extend(sub_params)
                elif op == "=" and val is None:
                    where_parts.append(f"{col} IS NULL")
                elif op == "!=" and val is None:
                    where_parts.append(f"{col} IS NOT NULL")
                elif op == "CONTAINS":
                    import json
                    if isinstance(val, (dict, list)):
                        where_parts.append(f"{col} @> %s::jsonb")
                        params.append(json.dumps(val))
                    else:
                        where_parts.append(f"{col} LIKE %s")
                        params.append(f"%{val}%")
                elif op in ("LIKE", "ILIKE"):
                    where_parts.append(f"{col} {op} %s")
                    params.append(val)
                else:
                    where_parts.append(f"{col} {op} %s")
                    params.append(val)
            elif isinstance(f, str):
                where_parts.append(f)

        if where_parts:
            sql += " WHERE " + " AND ".join(where_parts)

        with self.session.conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.rowcount


class DatabaseSession:
    """
    Lightweight, transactional database session backed 100% by psycopg2.
    Replaces SQLAlchemy Session throughout the application.
    """
    def __init__(self, conn=None):
        self.conn = conn or get_connection()
        self._owns_conn = (conn is None)
        self._tracked_records: Dict[int, RowRecord] = {}
        self._pending_adds: List[RowRecord] = []
        self._pending_deletes: List[RowRecord] = []

    def _track_record(self, record: RowRecord):
        self._tracked_records[id(record)] = record

    def query(self, table_or_model: Any) -> DBQuery:
        return DBQuery(table_or_model, self)

    def add(self, entity: Any):
        if isinstance(entity, RowRecord):
            entity._session = self
            self._pending_adds.append(entity)

    def delete(self, entity: Any):
        if isinstance(entity, RowRecord):
            self._pending_deletes.append(entity)

    def flush(self):
        import json
        with self.conn.cursor() as cur:
            # 1. Process inserts
            for entity in self._pending_adds:
                cols = []
                vals = []
                for k, v in entity.items():
                    if k.startswith("_"):
                        continue
                    cols.append(k)
                    # Convert dicts/lists to JSON strings for JSONB columns if needed
                    if isinstance(v, (dict, list)):
                        vals.append(json.dumps(v))
                    else:
                        vals.append(v)

                if cols:
                    placeholders = ", ".join(["%s"] * len(cols))
                    col_str = ", ".join(cols)
                    cur.execute(
                        f"INSERT INTO {entity._table} ({col_str}) VALUES ({placeholders}) RETURNING *",
                        vals,
                    )
                    inserted = cur.fetchone()
                    if inserted:
                        col_names = [d[0] for d in cur.description]
                        entity.update(dict(zip(col_names, inserted)))
                    entity._is_new = False
                    entity._dirty.clear()
                    self._track_record(entity)
            self._pending_adds.clear()

            # 2. Process updates for dirty fields
            for entity in list(self._tracked_records.values()):
                if entity._dirty and "id" in entity:
                    set_clauses = []
                    vals = []
                    for k, v in entity._dirty.items():
                        set_clauses.append(f"{k} = %s")
                        if isinstance(v, (dict, list)):
                            vals.append(json.dumps(v))
                        else:
                            vals.append(v)
                    vals.append(entity["id"])
                    cur.execute(
                        f"UPDATE {entity._table} SET {', '.join(set_clauses)} WHERE id = %s",
                        vals,
                    )
                    entity._dirty.clear()

            # 3. Process deletes
            for entity in self._pending_deletes:
                if "id" in entity:
                    cur.execute(f"DELETE FROM {entity._table} WHERE id = %s", (entity["id"],))
            self._pending_deletes.clear()

    def commit(self):
        self.flush()
        self.conn.commit()

    def rollback(self):
        self._pending_adds.clear()
        self._pending_deletes.clear()
        for entity in self._tracked_records.values():
            entity._dirty.clear()
        self.conn.rollback()

    def refresh(self, entity: RowRecord):
        if "id" in entity:
            with self.conn.cursor() as cur:
                cur.execute(f"SELECT * FROM {entity._table} WHERE id = %s", (entity["id"],))
                row = cur.fetchone()
                if row:
                    col_names = [d[0] for d in cur.description]
                    entity.update(dict(zip(col_names, row)))
                    entity._dirty.clear()

    def close(self):
        if self._owns_conn and self.conn is not None:
            self.conn.close()
            self.conn = None


def get_db():
    """FastAPI dependency providing a clean, pooled DatabaseSession."""
    session = DatabaseSession()
    try:
        yield session
    finally:
        session.close()


# Type alias for route annotations
Session = DatabaseSession
Base = object()

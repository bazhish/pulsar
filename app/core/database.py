from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Iterator, Optional

import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool

from app.core.config import settings

logger = logging.getLogger("pulsar.database")

# In container mode a process-wide pool is reused across requests. In serverless
# mode (Vercel) there is no long-lived process to hold a pool, so each request
# opens a short connection against the Supabase transaction pooler (port 6543)
# and closes it. DATABASE_URL must point at the pooler when running on Vercel.
_db_pool: Optional[ThreadedConnectionPool] = None


def get_database_url() -> str:
    return settings.require_database_url()


def init_db_pool() -> None:
    global _db_pool
    if settings.is_serverless:
        return
    if _db_pool is not None:
        return
    _db_pool = ThreadedConnectionPool(minconn=2, maxconn=10, dsn=get_database_url())
    logger.info("Database pool initialized (container mode)")


def close_db_pool() -> None:
    global _db_pool
    if _db_pool is not None:
        _db_pool.closeall()
        _db_pool = None


def storage_available() -> bool:
    """Whether persistent Postgres storage is reachable.

    Serverless connects per request, so availability is decided by config; in
    container mode it depends on the pool having been initialized at startup.
    """
    if settings.is_serverless:
        try:
            return bool(settings.require_database_url())
        except RuntimeError:
            return False
    return _db_pool is not None


@contextmanager
def connection() -> Iterator["psycopg2.extensions.connection"]:
    """Yield a raw connection (used by migrations and multi-statement work)."""
    if settings.is_serverless:
        conn = psycopg2.connect(get_database_url())
        try:
            yield conn
        finally:
            conn.close()
        return

    if _db_pool is None:
        raise RuntimeError("Database pool is not initialized.")
    conn = _db_pool.getconn()
    try:
        yield conn
    finally:
        _db_pool.putconn(conn)


@contextmanager
def db_cursor(commit: bool = False):
    with connection() as conn:
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                yield cursor
            if commit:
                conn.commit()
        except Exception:
            if commit:
                conn.rollback()
            raise

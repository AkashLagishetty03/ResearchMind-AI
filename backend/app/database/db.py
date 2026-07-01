import asyncio
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import event, text
from sqlalchemy.pool import NullPool
from app.core.config import settings

logger = logging.getLogger(__name__)

# SQLite database URL
DATABASE_URL = settings.DATABASE_URL

# ─────────────────────────────────────────────────────────────────────────────
# Engine — NullPool forces every AsyncSession to open its own connection so
# concurrent LangGraph nodes never share a single SQLite connection handle.
#
# connect_args:
#   timeout=30   → aiosqlite will retry writes for up to 30 s before raising
#                  OperationalError (replaces the missing busy_timeout pragma
#                  at the driver level; WAL pragma below covers SQLite itself).
# ─────────────────────────────────────────────────────────────────────────────
engine = create_async_engine(
    DATABASE_URL,
    poolclass=NullPool,
    connect_args={"timeout": 30},
    echo=False,
)

# Apply SQLite PRAGMAs on every new connection so WAL mode, busy timeout and
# reduced fsync overhead are always active, regardless of which coroutine
# opened the connection.
@event.listens_for(engine.sync_engine, "connect")
def _set_sqlite_pragmas(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    # WAL: allows concurrent readers + one writer without blocking each other.
    cursor.execute("PRAGMA journal_mode=WAL;")
    # busy_timeout: SQLite-level retry window (ms) before giving up on a lock.
    cursor.execute("PRAGMA busy_timeout=5000;")
    # NORMAL: flush to OS buffer on every commit but do not wait for full disk
    # sync — safe with WAL and dramatically reduces contention.
    cursor.execute("PRAGMA synchronous=NORMAL;")
    # Keep temp tables and intermediate results in memory.
    cursor.execute("PRAGMA temp_store=MEMORY;")
    cursor.close()

# ─────────────────────────────────────────────────────────────────────────────
# Session factory
# expire_on_commit=False prevents SQLAlchemy from expiring ORM objects after
# commit so we can still read their attributes outside the session context.
# ─────────────────────────────────────────────────────────────────────────────
async_session = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Declarative base shared by all ORM models
Base = declarative_base()

# ─────────────────────────────────────────────────────────────────────────────
# Global write-serialiser lock
#
# SQLite (even in WAL mode) supports only ONE concurrent writer.  The parallel
# LangGraph branches (critic_node + trend_node) can both attempt to INSERT an
# ExecutionLog at exactly the same millisecond.  The busy_timeout pragma makes
# SQLite retry internally, but an asyncio-level lock ensures we never stack up
# more than one pending write at a time — keeping the busy window minimal.
#
# IMPORTANT: this lock is ONLY acquired around the short DB-write section of
# call_llm / log_execution.  All LLM HTTP calls still run fully in parallel.
# ─────────────────────────────────────────────────────────────────────────────
_db_write_lock: asyncio.Lock = asyncio.Lock()

async def get_write_lock() -> asyncio.Lock:
    """Return the process-wide asyncio write-serialiser lock."""
    return _db_write_lock

# ─────────────────────────────────────────────────────────────────────────────
# FastAPI dependency — yields an isolated session per HTTP request.
# ─────────────────────────────────────────────────────────────────────────────
async def get_db():
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

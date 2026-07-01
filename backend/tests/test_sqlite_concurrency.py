"""
Test: SQLite concurrent write safety under LangGraph parallel execution.

Simulates critic_node + trend_node firing simultaneous ExecutionLog inserts
(the exact scenario that was causing "database is locked" errors).
Also runs the full demo-mode workflow twice sequentially to confirm end-to-end
stability with logging, session history, and report generation.
"""
import asyncio
import pytest
import logging
import os
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean, ForeignKey, event
from sqlalchemy.pool import NullPool
from sqlalchemy.future import select

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Minimal in-memory schema mirroring production
# ─────────────────────────────────────────────────────────────────────────────
Base = declarative_base()

class ResearchSession(Base):
    __tablename__ = "research_sessions_ct"   # ct = concurrency test
    id = Column(Integer, primary_key=True, autoincrement=True)
    query = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class ExecutionLog(Base):
    __tablename__ = "execution_logs_ct"
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("research_sessions_ct.id", ondelete="CASCADE"), nullable=True)
    agent_name = Column(String(100), nullable=False)
    model_used = Column(String(100), nullable=False)
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    latency_ms = Column(Integer, default=0)
    fallback_triggered = Column(Boolean, default=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

# ─────────────────────────────────────────────────────────────────────────────
# Engine factory matching production (NullPool + WAL pragmas)
# ─────────────────────────────────────────────────────────────────────────────
TEST_DB_PATH = "./test_concurrency.db"
TEST_DB_URL = f"sqlite+aiosqlite:///{TEST_DB_PATH}"


def make_engine():
    eng = create_async_engine(TEST_DB_URL, poolclass=NullPool, connect_args={"timeout": 30})

    @event.listens_for(eng.sync_engine, "connect")
    def set_pragmas(dbapi_conn, _record):
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL;")
        cur.execute("PRAGMA busy_timeout=5000;")
        cur.execute("PRAGMA synchronous=NORMAL;")
        cur.execute("PRAGMA temp_store=MEMORY;")
        cur.close()

    return eng


async def write_log(session_factory, session_id: int, agent_name: str, lock: asyncio.Lock):
    """Mirrors _write_execution_log — own session + write lock."""
    log = ExecutionLog(
        session_id=session_id,
        agent_name=agent_name,
        model_used="test/model",
        prompt_tokens=100,
        completion_tokens=200,
        latency_ms=500,
        fallback_triggered=False,
        created_at=datetime.utcnow(),
    )
    async with lock:
        async with session_factory() as db:
            db.add(log)
            await db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# Tests — each is self-contained (creates its own engine to avoid state leaks)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_concurrent_log_writes_no_lock_error():
    """
    Simulates critic_node + trend_node firing simultaneous ExecutionLog inserts.
    With NullPool + WAL + busy_timeout + asyncio write lock this must complete
    with no OperationalError: database is locked.
    """
    engine = make_engine()
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    lock = asyncio.Lock()

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # Create a research session
        async with lock:
            async with session_factory() as db:
                sess = ResearchSession(query="concurrent test query", created_at=datetime.utcnow())
                db.add(sess)
                await db.commit()
                session_id = sess.id

        # 10 concurrent agents all writing logs simultaneously
        CONCURRENT_AGENTS = [
            "critic_agent", "trend_agent", "research_agent", "judge_agent",
            "fact_verifier_agent", "report_agent", "critic_agent", "trend_agent",
            "research_agent", "judge_agent",
        ]

        tasks = [write_log(session_factory, session_id, a, lock) for a in CONCURRENT_AGENTS]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        errors = [r for r in results if isinstance(r, Exception)]
        assert errors == [], f"Concurrent log writes raised exceptions: {errors}"

        # Verify all rows landed in DB
        async with session_factory() as db:
            result = await db.execute(
                select(ExecutionLog).where(ExecutionLog.session_id == session_id)
            )
            logs = result.scalars().all()

        assert len(logs) == len(CONCURRENT_AGENTS), (
            f"Expected {len(CONCURRENT_AGENTS)} logs, got {len(logs)}"
        )
        logger.info(f"✓ All {len(logs)} concurrent log writes persisted successfully.")

    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_repeated_concurrent_writes():
    """
    Run 3 rounds of concurrent writes to confirm no transient locking.
    """
    engine = make_engine()
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    lock = asyncio.Lock()

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        for round_num in range(3):
            async with lock:
                async with session_factory() as db:
                    sess = ResearchSession(
                        query=f"round {round_num} query",
                        created_at=datetime.utcnow()
                    )
                    db.add(sess)
                    await db.commit()
                    session_id = sess.id

            agents = ["critic_agent", "trend_agent", "research_agent", "judge_agent"]
            tasks = [write_log(session_factory, session_id, a, lock) for a in agents]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            errors = [r for r in results if isinstance(r, Exception)]
            assert errors == [], (
                f"Round {round_num}: concurrent writes raised exceptions: {errors}"
            )

        logger.info("✓ 3 rounds of concurrent writes completed without 'database is locked'.")

    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_full_workflow_demo_mode_twice():
    """
    Run the full LangGraph workflow in demo mode twice.
    Confirms: all agents execute, execution logs are stored, no rollback occurs.
    """
    from app.graph.workflow import research_graph
    from app.database.db import async_session as prod_session, _db_write_lock

    for run_num in range(2):
        query = f"Will AI replace software engineers? (run {run_num + 1})"

        # Create session via production session factory + write lock
        async with _db_write_lock:
            async with prod_session() as db:
                from app.services.db_service import create_session
                sess = await create_session(db, query)
                await db.commit()
                session_id = sess.id

        initial_state = {
            "query": query,
            "session_id": session_id,
            "use_demo": True,
            "debate": [],
            "research_output": {},
            "critic_output": {},
            "research_reply": {},
            "trend_output": {},
            "judge_output": {},
            "fact_verification_output": {},
            "confidence_metrics": {},
            "final_report": "",
            "confidence_score": 0,
        }

        final_state = await research_graph.ainvoke(initial_state)

        # Verify all agents executed
        assert final_state["research_output"],          f"Run {run_num+1}: research_output empty"
        assert final_state["critic_output"],            f"Run {run_num+1}: critic_output empty"
        assert final_state["research_reply"],           f"Run {run_num+1}: research_reply empty"
        assert final_state["trend_output"],             f"Run {run_num+1}: trend_output empty"
        assert final_state["judge_output"],             f"Run {run_num+1}: judge_output empty"
        assert final_state["fact_verification_output"],  f"Run {run_num+1}: fact_verification empty"
        assert final_state["final_report"],             f"Run {run_num+1}: final_report empty"
        assert final_state["confidence_score"] > 0,    f"Run {run_num+1}: confidence_score is 0"

        # Allow fire-and-forget log tasks to complete
        await asyncio.sleep(0.8)

        # Verify execution logs in DB
        from app.models.models import ExecutionLog as ProdLog
        async with prod_session() as db:
            result = await db.execute(
                select(ProdLog).where(ProdLog.session_id == session_id)
            )
            exec_logs = result.scalars().all()

        assert len(exec_logs) >= 5, (
            f"Run {run_num+1}: Expected ≥5 execution logs, got {len(exec_logs)}"
        )

        logger.info(
            f"✓ Run {run_num+1}: all nodes executed. "
            f"confidence_score={final_state['confidence_score']} "
            f"exec_logs={len(exec_logs)}"
        )

    logger.info("✓ Full workflow ran twice with no transaction rollback.")

from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.models import ResearchSession, AgentOutput, Report
from datetime import datetime

async def create_session(db: AsyncSession, query: str) -> ResearchSession:
    """Create a new research session."""
    session = ResearchSession(query=query, created_at=datetime.utcnow())
    db.add(session)
    await db.flush()
    return session

async def save_agent_output(db: AsyncSession, session_id: int, agent_name: str, output: str) -> AgentOutput:
    """Save output from an agent execution step."""
    agent_output = AgentOutput(
        session_id=session_id,
        agent_name=agent_name,
        output=output
    )
    db.add(agent_output)
    await db.flush()
    return agent_output

async def save_report(
    db: AsyncSession, 
    session_id: int, 
    final_report: str, 
    confidence_score: int,
    fact_check_status: str = None,
    confidence_metrics: str = None
) -> Report:
    """Save the final generated report."""
    report = Report(
        session_id=session_id,
        final_report=final_report,
        confidence_score=confidence_score,
        fact_check_status=fact_check_status,
        confidence_metrics=confidence_metrics
    )
    db.add(report)
    await db.flush()
    return report

async def get_session_by_id(db: AsyncSession, session_id: int):
    """Retrieve a session with all its associated agent outputs and the final report."""
    result = await db.execute(
        select(ResearchSession)
        .where(ResearchSession.id == session_id)
        .options(selectinload(ResearchSession.outputs), selectinload(ResearchSession.report))
    )
    return result.scalar_one_or_none()

import json

async def get_history(db: AsyncSession):
    """Retrieve all historical sessions ordered by created_at descending."""
    result = await db.execute(
        select(ResearchSession)
        .options(selectinload(ResearchSession.report))
        .order_by(ResearchSession.created_at.desc())
    )
    sessions = result.scalars().all()
    
    # Format list
    history = []
    for s in sessions:
        metrics = None
        if s.report and s.report.confidence_metrics:
            try:
                metrics = json.loads(s.report.confidence_metrics)
            except Exception:
                metrics = None
                
        history.append({
            "id": s.id,
            "query": s.query,
            "created_at": s.created_at.isoformat(),
            "confidence_score": s.report.confidence_score if s.report else None,
            "fact_check_status": s.report.fact_check_status if s.report else None,
            "confidence_metrics": metrics
        })
    return history

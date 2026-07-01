import json
import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.sql import func
from typing import Dict, Any, List
from datetime import datetime

from app.database.db import get_db, async_session, _db_write_lock
from app.graph.workflow import research_graph
from app.services.db_service import (
    create_session,
    save_agent_output,
    save_report,
    get_session_by_id,
    get_history
)
from app.models.models import ResearchSession, AgentConfiguration, PromptTemplate, ExecutionLog, Report
from app.services.stream_manager import StreamManager
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

from pydantic import BaseModel

class PydanticEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, BaseModel):
            return obj.model_dump()
        return super().default(obj)

# Helper to serialize agent outputs for storage and transmission
def serialize_output(data: Any) -> str:
    if isinstance(data, str):
        return data
    return json.dumps(data, cls=PydanticEncoder)

@router.post("/research")
async def execute_research(request_data: Dict[str, str], db: AsyncSession = Depends(get_db)):
    """Standard POST route to run research synchronously."""
    query = request_data.get("query")
    if not query:
        raise HTTPException(status_code=400, detail="Query is required")
        
    use_demo = request_data.get("demo", "false").lower() == "true"
    
    try:
        # Create session
        session = await create_session(db, query)
        await db.commit()
        
        # Execute workflow
        initial_state = {
            "query": query,
            "session_id": session.id,
            "use_demo": use_demo,
            "debate": [],
            "research_output": {},
            "critic_output": {},
            "research_reply": {},
            "trend_output": {},
            "judge_output": {},
            "fact_verification_output": {},
            "confidence_metrics": {},
            "final_report": "",
            "confidence_score": 0
        }
        
        final_state = await research_graph.ainvoke(initial_state)
        
        # Save Agent Outputs
        await save_agent_output(db, session.id, "Research Agent", serialize_output(final_state["research_output"]))
        await save_agent_output(db, session.id, "Critic Agent", serialize_output(final_state["critic_output"]))
        await save_agent_output(db, session.id, "Research Agent (Reply)", serialize_output(final_state["research_reply"]))
        await save_agent_output(db, session.id, "Trend Analyst Agent", serialize_output(final_state["trend_output"]))
        await save_agent_output(db, session.id, "Judge Agent", serialize_output(final_state["judge_output"]))
        await save_agent_output(db, session.id, "Fact Verification Agent", serialize_output(final_state["fact_verification_output"]))
        await save_agent_output(db, session.id, "debate_log", serialize_output(final_state["debate"]))
        
        # Save Report
        await save_report(
            db, 
            session.id, 
            final_state["final_report"], 
            final_state["confidence_score"],
            final_state["fact_verification_output"].get("status", "Verified"),
            json.dumps(final_state["confidence_metrics"])
        )
        
        return {
            "id": session.id,
            "query": query,
            "research_agent": serialize_output(final_state["research_output"]),
            "critic_agent": serialize_output(final_state["critic_output"]),
            "trend_agent": serialize_output(final_state["trend_output"]),
            "judge_agent": serialize_output(final_state["judge_output"]),
            "fact_verification_agent": serialize_output(final_state["fact_verification_output"]),
            "final_report": final_state["final_report"],
            "confidence_score": final_state["confidence_score"],
            "confidence_metrics": final_state["confidence_metrics"]
        }
    except Exception as e:
        logger.error(f"Error executing synchronous research: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/research/stream")
async def stream_research(
    query: str = Query(..., description="The query to research"),
    demo: bool = Query(False, description="Enable recruiter demo mode"),
    db: AsyncSession = Depends(get_db)
):
    """Server-Sent Events (SSE) route to stream LangGraph execution in real time."""

    async def event_generator():
        # ── 1. Create research session in its own committed transaction ────────
        async with _db_write_lock:
            async with async_session() as sess:
                session = await create_session(sess, query)
                await sess.commit()
                session_id = session.id

        # Ensure SSE queue exists for this session
        queue = StreamManager.get_queue(session_id)

        yield f"event: session_created\ndata: {json.dumps({'id': session_id, 'query': query})}\n\n"
        await asyncio.sleep(0.1)

        initial_state = {
            "query": query,
            "session_id": session_id,
            "use_demo": demo,
            "debate": [],
            "research_output": {},
            "critic_output": {},
            "research_reply": {},
            "trend_output": {},
            "judge_output": {},
            "fact_verification_output": {},
            "confidence_metrics": {},
            "final_report": "",
            "confidence_score": 0
        }

        # ── 2. Run graph invoke in background — does NOT share any DB session ──
        task = asyncio.create_task(research_graph.ainvoke(initial_state))

        try:
            # Drain SSE queue while graph is running
            while not task.done() or not queue.empty():
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=0.2)
                    yield f"event: {item['event']}\ndata: {json.dumps(item['data'], cls=PydanticEncoder)}\n\n"
                except asyncio.TimeoutError:
                    continue
                except Exception as e:
                    logger.error(f"Error reading stream queue: {e}")

            # Check for graph failure
            if task.done():
                exc = task.exception()
                if exc:
                    logger.error(f"Graph execution failed: {exc}", exc_info=True)
                    yield f"event: error\ndata: {json.dumps({'error': str(exc)})}\n\n"
                    return

                final_state = task.result()

                # ── 3. Persist final results — each write is its own transaction
                #    protected by the write lock so it never races with the log
                #    tasks that were fire-and-forgotten by call_llm. ────────────
                async with _db_write_lock:
                    async with async_session() as sess:
                        await save_agent_output(sess, session_id, "Research Agent",        serialize_output(final_state["research_output"]))
                        await save_agent_output(sess, session_id, "Critic Agent",           serialize_output(final_state["critic_output"]))
                        await save_agent_output(sess, session_id, "Research Agent (Reply)", serialize_output(final_state["research_reply"]))
                        await save_agent_output(sess, session_id, "Trend Analyst Agent",    serialize_output(final_state["trend_output"]))
                        await save_agent_output(sess, session_id, "Judge Agent",            serialize_output(final_state["judge_output"]))
                        await save_agent_output(sess, session_id, "Fact Verification Agent",serialize_output(final_state["fact_verification_output"]))
                        await save_agent_output(sess, session_id, "debate_log",             serialize_output(final_state["debate"]))
                        await save_report(
                            sess,
                            session_id,
                            final_state["final_report"],
                            final_state["confidence_score"],
                            final_state["fact_verification_output"].get("status", "Verified"),
                            json.dumps(final_state["confidence_metrics"])
                        )
                        await sess.commit()

                # Compile final SSE payload
                final_response = {
                    "id": session_id,
                    "query": query,
                    "research_agent": serialize_output(final_state["research_output"]),
                    "critic_agent":   serialize_output(final_state["critic_output"]),
                    "trend_agent":    serialize_output(final_state["trend_output"]),
                    "judge_agent":    serialize_output(final_state["judge_output"]),
                    "fact_verification_agent": serialize_output(final_state["fact_verification_output"]),
                    "final_report":   final_state["final_report"],
                    "confidence_score":   final_state["confidence_score"],
                    "confidence_metrics": final_state["confidence_metrics"],
                    "debate":         final_state["debate"]
                }

                yield f"event: execution_complete\ndata: {json.dumps(final_response, cls=PydanticEncoder)}\n\n"

        except Exception as e:
            logger.error(f"Error in SSE stream loop: {e}", exc_info=True)
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
        finally:
            StreamManager.remove_queue(session_id)

    return StreamingResponse(event_generator(), media_type="text/event-stream")



@router.get("/history")
async def get_report_history(db: AsyncSession = Depends(get_db)):
    """Fetch history of all research sessions."""
    try:
        history = await get_history(db)
        return history
    except Exception as e:
        logger.error(f"Error fetching history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/report/{session_id}")
async def get_report(session_id: int, db: AsyncSession = Depends(get_db)):
    """Get full details of a specific report session by database ID."""
    try:
        session = await get_session_by_id(db, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Report session not found")
            
        outputs_dict = {}
        debate_log = []
        
        for out in session.outputs:
            if out.agent_name == "debate_log":
                try:
                    debate_log = json.loads(out.output)
                except Exception:
                    debate_log = []
            else:
                try:
                    outputs_dict[out.agent_name] = json.loads(out.output)
                except Exception:
                    outputs_dict[out.agent_name] = out.output
                    
        confidence_metrics = None
        fact_check_status = "Verified"
        
        if session.report:
            fact_check_status = session.report.fact_check_status or "Verified"
            if session.report.confidence_metrics:
                try:
                    confidence_metrics = json.loads(session.report.confidence_metrics)
                except Exception:
                    confidence_metrics = None
                    
        return {
            "id": session.id,
            "query": session.query,
            "created_at": session.created_at.isoformat(),
            "research_agent": outputs_dict.get("Research Agent", {}),
            "critic_agent": outputs_dict.get("Critic Agent", {}),
            "research_reply": outputs_dict.get("Research Agent (Reply)", {}),
            "trend_agent": outputs_dict.get("Trend Analyst Agent", {}),
            "judge_agent": outputs_dict.get("Judge Agent", {}),
            "fact_verification_agent": outputs_dict.get("Fact Verification Agent", {}),
            "debate": debate_log,
            "final_report": session.report.final_report if session.report else "",
            "confidence_score": session.report.confidence_score if session.report else 0,
            "fact_check_status": fact_check_status,
            "confidence_metrics": confidence_metrics
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching report: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/report/{session_id}")
async def delete_report(session_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a research session and its cascades."""
    try:
        session = await get_session_by_id(db, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Report session not found")
            
        await db.delete(session)
        await db.commit()
        return {"status": "success", "message": f"Session {session_id} deleted."}
    except Exception as e:
        logger.error(f"Error deleting report session: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ========================================================
# AGENT CONFIGURATION SETTINGS
# ========================================================

@router.get("/settings")
async def get_all_settings(db: AsyncSession = Depends(get_db)):
    """Fetch configuration profiles of all agents."""
    try:
        result = await db.execute(select(AgentConfiguration))
        configs = result.scalars().all()
        return configs
    except Exception as e:
        logger.error(f"Error loading agent settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/settings")
async def save_agent_settings(cfg_data: Dict[str, Any], db: AsyncSession = Depends(get_db)):
    """Update settings parameters for a specific agent key."""
    agent_key = cfg_data.get("agent_key")
    if not agent_key:
        raise HTTPException(status_code=400, detail="agent_key is required")
        
    try:
        result = await db.execute(select(AgentConfiguration).where(AgentConfiguration.agent_key == agent_key))
        cfg = result.scalar_one_or_none()
        if not cfg:
            raise HTTPException(status_code=404, detail="Agent configuration not found")
            
        # Update fields
        if "model_name" in cfg_data:
            cfg.model_name = cfg_data["model_name"]
        if "fallback_model" in cfg_data:
            cfg.fallback_model = cfg_data["fallback_model"]
        if "temperature" in cfg_data:
            cfg.temperature = float(cfg_data["temperature"])
        if "max_tokens" in cfg_data:
            cfg.max_tokens = int(cfg_data["max_tokens"])
        if "timeout" in cfg_data:
            cfg.timeout = int(cfg_data["timeout"])
            
        await db.commit()
        return {"status": "success", "config": cfg}
    except Exception as e:
        logger.error(f"Failed to update setting: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ========================================================
# PROMPT MANAGER VERSION CONTROL
# ========================================================

@router.get("/settings/prompts")
async def get_prompts(db: AsyncSession = Depends(get_db)):
    """Fetch the latest version of all agent prompts."""
    try:
        # Group by agent_key, load latest updated row
        result = await db.execute(
            select(PromptTemplate)
            .order_by(PromptTemplate.agent_key, PromptTemplate.version.desc())
        )
        all_templates = result.scalars().all()
        
        # Filter latest versions in python to preserve order
        latest = {}
        for p in all_templates:
            if p.agent_key not in latest:
                latest[p.agent_key] = p
                
        return list(latest.values())
    except Exception as e:
        logger.error(f"Failed to load prompts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/settings/prompts")
async def save_prompt(prompt_data: Dict[str, Any], db: AsyncSession = Depends(get_db)):
    """Create a new version record for an agent's system prompt."""
    agent_key = prompt_data.get("agent_key")
    prompt_text = prompt_data.get("prompt_text")
    description = prompt_data.get("description", "Updated prompt template from UI editor.")
    
    if not agent_key or not prompt_text:
        raise HTTPException(status_code=400, detail="agent_key and prompt_text are required")
        
    try:
        # Fetch current latest template to identify version number
        result = await db.execute(
            select(PromptTemplate)
            .where(PromptTemplate.agent_key == agent_key)
            .order_by(PromptTemplate.version.desc())
        )
        current = result.scalars().first()
        
        # Calculate bumped version number: 1.0.0 -> 1.1.0 -> 1.2.0
        new_version = "1.0.0"
        if current:
            parts = current.version.split(".")
            if len(parts) >= 2:
                minor = int(parts[1]) + 1
                new_version = f"{parts[0]}.{minor}.0"
            else:
                new_version = "1.1.0"
                
        new_prompt = PromptTemplate(
            agent_key=agent_key,
            prompt_text=prompt_text,
            version=new_version,
            description=description,
            updated_at=datetime.utcnow()
        )
        db.add(new_prompt)
        await db.commit()
        return {"status": "success", "prompt": new_prompt}
    except Exception as e:
        logger.error(f"Failed to save prompt template: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ========================================================
# PIPELINE DIAGNOSTICS & LOG MONITOR
# ========================================================

@router.get("/logs")
async def get_execution_logs(
    session_id: int = Query(None, description="Filter logs by session ID"),
    limit: int = Query(50, description="Max logs to fetch"),
    db: AsyncSession = Depends(get_db)
):
    """Fetch the latest execution logs from LLM actions."""
    try:
        query = select(ExecutionLog)
        if session_id:
            query = query.where(ExecutionLog.session_id == session_id)
        query = query.order_by(ExecutionLog.created_at.desc()).limit(limit)
        
        result = await db.execute(query)
        logs = result.scalars().all()
        return logs
    except Exception as e:
        logger.error(f"Failed to fetch execution logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/logs/metrics")
async def get_model_metrics(db: AsyncSession = Depends(get_db)):
    """Fetch model aggregates for comparison graphs (latency, success, tokens)."""
    try:
        result = await db.execute(select(ExecutionLog))
        logs = result.scalars().all()
        
        # Aggregate in Python
        model_stats = {}
        for log in logs:
            model = log.model_used
            if not model:
                continue
            if model not in model_stats:
                model_stats[model] = {
                    "model_name": model,
                    "latencies": [],
                    "total_tokens": 0,
                    "total_calls": 0,
                    "success_calls": 0
                }
            
            stats = model_stats[model]
            stats["total_calls"] += 1
            stats["latencies"].append(log.latency_ms)
            stats["total_tokens"] += (log.prompt_tokens + log.completion_tokens)
            
            # Check success: no error AND no fallback triggered
            is_success = (log.error_message is None) and (not log.fallback_triggered)
            if is_success:
                stats["success_calls"] += 1
                
        metrics = []
        for model, stats in model_stats.items():
            avg_latency = int(sum(stats["latencies"]) / len(stats["latencies"])) if stats["latencies"] else 0
            success_rate = int((stats["success_calls"] / stats["total_calls"]) * 100) if stats["total_calls"] else 100
            
            metrics.append({
                "model_name": model,
                "avg_latency_ms": avg_latency,
                "total_tokens": stats["total_tokens"],
                "total_calls": stats["total_calls"],
                "success_rate": success_rate
            })
            
        return metrics
    except Exception as e:
        logger.error(f"Failed to load metrics aggregates: {e}")
        raise HTTPException(status_code=500, detail=str(e))

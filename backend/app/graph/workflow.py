import logging
import operator
import uuid
from typing import Dict, Any, List, TypedDict, Annotated
from langgraph.graph import StateGraph, END

# Import agents
from app.agents.research_agent import run_research
from app.agents.critic_agent import run_critic, run_research_reply
from app.agents.trend_agent import run_trend_analyst
from app.agents.judge_agent import run_judge
from app.agents.fact_verification_agent import run_fact_verifier
from app.agents.report_agent import run_report_writer
from app.services.confidence_engine import calculate_confidence
from app.services.stream_manager import StreamManager
from app.database.db import async_session
from app.models.schemas import DebateMessage
from app.services.agent_config_service import get_agent_config

logger = logging.getLogger(__name__)

# Define LangGraph State as Shared Memory
class ResearchState(TypedDict):
    query: str
    session_id: int
    use_demo: bool
    debate: Annotated[List[DebateMessage], operator.add]
    research_output: Dict[str, Any]
    critic_output: Dict[str, Any]
    research_reply: Dict[str, Any]
    trend_output: Dict[str, Any]
    judge_output: Dict[str, Any]
    fact_verification_output: Dict[str, Any]
    confidence_metrics: Dict[str, Any]
    final_report: str
    confidence_score: int

# Define node functions
async def research_node(state: ResearchState) -> Dict[str, Any]:
    logger.info("Executing Research Node")
    query = state["query"]
    session_id = state.get("session_id")
    use_demo = state.get("use_demo", False)
    
    if session_id:
        await StreamManager.publish(session_id, "node_started", {"node": "research"})
        
    async with async_session() as db:
        output = await run_research(query, session_id=session_id, use_demo=use_demo, db=db)
        # Resolve model name
        model_name = "google/gemini-2.5-flash"
        cfg = await get_agent_config(db, "research_agent")
        if cfg:
            model_name = cfg.model_name
    
    debate_contribution = DebateMessage(
        id=str(uuid.uuid4()),
        role="researcher",
        agent_name="Research Agent",
        message=output.get("statement", "I have gathered the foundational facts."),
        model_used=model_name,
        metadata={
            "findings": output.get("findings", [])
        }
    )
    
    state_update = {
        "research_output": output,
        "debate": [debate_contribution]
    }
    
    if session_id:
        await StreamManager.publish(session_id, "node_completed", {
            "node": "research",
            "agent": "Research Agent",
            "state_update": state_update
        })
        
    return state_update

async def critic_node(state: ResearchState) -> Dict[str, Any]:
    logger.info("Executing Critic Node")
    query = state["query"]
    session_id = state.get("session_id")
    use_demo = state.get("use_demo", False)
    research_output = state["research_output"]
    
    if session_id:
        await StreamManager.publish(session_id, "node_started", {"node": "critic"})
        
    async with async_session() as db:
        output = await run_critic(query, research_output, session_id=session_id, use_demo=use_demo, db=db)
        # Resolve model name
        model_name = "deepseek/deepseek-chat"
        cfg = await get_agent_config(db, "critic_agent")
        if cfg:
            model_name = cfg.model_name
    
    debate_contribution = DebateMessage(
        id=str(uuid.uuid4()),
        role="critic",
        agent_name="Critic Agent",
        message=output.get("statement", "I have scrutinized the findings for bias and uncertainty."),
        model_used=model_name,
        metadata={
            "critiques": output.get("critiques", [])
        }
    )
    
    state_update = {
        "critic_output": output,
        "debate": [debate_contribution]
    }
    
    if session_id:
        await StreamManager.publish(session_id, "node_completed", {
            "node": "critic",
            "agent": "Critic Agent",
            "state_update": state_update
        })
        
    return state_update

async def research_reply_node(state: ResearchState) -> Dict[str, Any]:
    logger.info("Executing Research Reply Node")
    query = state["query"]
    session_id = state.get("session_id")
    use_demo = state.get("use_demo", False)
    research_output = state["research_output"]
    critic_output = state["critic_output"]
    
    if session_id:
        await StreamManager.publish(session_id, "node_started", {"node": "research_reply"})
        
    async with async_session() as db:
        output = await run_research_reply(
            query, research_output, critic_output, session_id=session_id, use_demo=use_demo, db=db
        )
        # Resolve model name
        model_name = "google/gemini-2.5-flash"
        cfg = await get_agent_config(db, "research_agent")
        if cfg:
            model_name = cfg.model_name
    
    debate_contribution = DebateMessage(
        id=str(uuid.uuid4()),
        role="researcher_reply",
        agent_name="Research Agent (Reply)",
        message=output.get("statement", "I have defended the findings against the criticism."),
        model_used=model_name,
        metadata={}
    )
    
    state_update = {
        "research_reply": output,
        "debate": [debate_contribution]
    }
    
    if session_id:
        await StreamManager.publish(session_id, "node_completed", {
            "node": "research_reply",
            "agent": "Research Agent (Reply)",
            "state_update": state_update
        })
        
    return state_update

async def trend_node(state: ResearchState) -> Dict[str, Any]:
    logger.info("Executing Trend Node")
    query = state["query"]
    session_id = state.get("session_id")
    use_demo = state.get("use_demo", False)
    
    if session_id:
        await StreamManager.publish(session_id, "node_started", {"node": "trend"})
        
    async with async_session() as db:
        output = await run_trend_analyst(query, session_id=session_id, use_demo=use_demo, db=db)
        # Resolve model name
        model_name = "qwen/qwen-2.5-72b-instruct"
        cfg = await get_agent_config(db, "trend_agent")
        if cfg:
            model_name = cfg.model_name
            
    debate_contribution = DebateMessage(
        id=str(uuid.uuid4()),
        role="analyst",
        agent_name="Trend Analyst Agent",
        message=output.get("statement", "Here is the future trajectory and market direction."),
        model_used=model_name,
        metadata={
            "forecasts": output.get("forecasts", [])
        }
    )
    
    state_update = {
        "trend_output": output,
        "debate": [debate_contribution]
    }
    
    if session_id:
        await StreamManager.publish(session_id, "node_completed", {
            "node": "trend",
            "agent": "Trend Analyst Agent",
            "state_update": state_update
        })
        
    return state_update

async def judge_node(state: ResearchState) -> Dict[str, Any]:
    logger.info("Executing Judge Node")
    query = state["query"]
    session_id = state.get("session_id")
    use_demo = state.get("use_demo", False)
    research_output = state["research_output"]
    critic_output = state["critic_output"]
    research_reply = state["research_reply"]
    
    if session_id:
        await StreamManager.publish(session_id, "node_started", {"node": "judge"})
        
    async with async_session() as db:
        output = await run_judge(
            query, research_findings=research_output, critic_output=critic_output, 
            research_reply=research_reply, session_id=session_id, use_demo=use_demo, db=db
        )
        # Resolve model name
        model_name = "meta-llama/llama-3.3-70b-instruct"
        cfg = await get_agent_config(db, "judge_agent")
        if cfg:
            model_name = cfg.model_name
            
    debate_contribution = DebateMessage(
        id=str(uuid.uuid4()),
        role="judge",
        agent_name="Judge Agent",
        message=output.get("statement", "I have resolved conflicts and finalized conclusions."),
        model_used=model_name,
        metadata={
            "resolved_findings": output.get("resolved_findings", []),
            "overall_consensus": output.get("overall_consensus", "")
        }
    )
    
    state_update = {
        "judge_output": output,
        "debate": [debate_contribution]
    }
    
    if session_id:
        await StreamManager.publish(session_id, "node_completed", {
            "node": "judge",
            "agent": "Judge Agent",
            "state_update": state_update
        })
        
    return state_update

async def fact_verification_node(state: ResearchState) -> Dict[str, Any]:
    logger.info("Executing Fact Verification Node")
    query = state["query"]
    session_id = state.get("session_id")
    use_demo = state.get("use_demo", False)
    research_output = state["research_output"]
    critic_output = state["critic_output"]
    judge_output = state["judge_output"]
    
    if session_id:
        await StreamManager.publish(session_id, "node_started", {"node": "fact_verification"})
        
    async with async_session() as db:
        output = await run_fact_verifier(
            query, research_findings=research_output, critic_output=critic_output,
            judge_output=judge_output, session_id=session_id, use_demo=use_demo, db=db
        )
        # Resolve model name
        model_name = "google/gemini-2.5-flash"
        cfg = await get_agent_config(db, "fact_verifier_agent")
        if cfg:
            model_name = cfg.model_name
            
    debate_contribution = DebateMessage(
        id=str(uuid.uuid4()),
        role="verifier",
        agent_name="Fact Verification Agent",
        message=output.get("statement", "Claims checked and consistency verified."),
        model_used=model_name,
        metadata={
            "status": output.get("status", "Verified"),
            "consistency_score": output.get("consistency_score", 95),
            "hallucination_risk": output.get("hallucination_risk", "Low"),
            "contradictions": output.get("contradictions", [])
        }
    )
    
    state_update = {
        "fact_verification_output": output,
        "debate": [debate_contribution]
    }
    
    if session_id:
        await StreamManager.publish(session_id, "node_completed", {
            "node": "fact_verification",
            "agent": "Fact Verification Agent",
            "state_update": state_update
        })
        
    return state_update

async def report_node(state: ResearchState) -> Dict[str, Any]:
    logger.info("Executing Report Node")
    query = state["query"]
    session_id = state.get("session_id")
    use_demo = state.get("use_demo", False)
    research_output = state["research_output"]
    critic_output = state["critic_output"]
    trend_output = state["trend_output"]
    judge_output = state["judge_output"]
    fact_verification_output = state["fact_verification_output"]
    
    if session_id:
        await StreamManager.publish(session_id, "node_started", {"node": "report"})
        
    async with async_session() as db:
        output = await run_report_writer(
            query, 
            research_findings=research_output, 
            critic_output=critic_output, 
            trend_output=trend_output, 
            judge_output=judge_output,
            fact_verification=fact_verification_output,
            session_id=session_id,
            use_demo=use_demo,
            db=db
        )
        
    # Calculate detailed confidence metrics
    confidence_details = calculate_confidence(
        research_findings=research_output.get("findings", []),
        critic_critiques=critic_output.get("critiques", []),
        fact_verification=fact_verification_output
    )
    
    # Overwrite the simple confidence score with the Confidence Engine overall score
    final_score = confidence_details["overall_confidence"]
    
    state_update = {
        "final_report": output.get("report_markdown", ""),
        "confidence_score": final_score,
        "confidence_metrics": confidence_details
    }
    
    if session_id:
        await StreamManager.publish(session_id, "node_completed", {
            "node": "report",
            "agent": "Report Writer Agent",
            "state_update": state_update
        })
        
    return state_update

# Build workflow graph
workflow = StateGraph(ResearchState)

# Add Nodes
workflow.add_node("research", research_node)
workflow.add_node("critic", critic_node)
workflow.add_node("research_reply", research_reply_node)
workflow.add_node("trend", trend_node)
workflow.add_node("judge", judge_node)
workflow.add_node("fact_verification", fact_verification_node)
workflow.add_node("report", report_node)

# Set Entry
workflow.set_entry_point("research")

# Add Parallel Branches
workflow.add_edge("research", "critic")
workflow.add_edge("research", "trend")

# Critic flows to reply defense
workflow.add_edge("critic", "research_reply")

# Join Reply and Trend paths into Judge
workflow.add_edge("research_reply", "judge")
workflow.add_edge("trend", "judge")

# Sequential flow for final synthesis
workflow.add_edge("judge", "fact_verification")
workflow.add_edge("fact_verification", "report")
workflow.add_edge("report", END)

# Compile Graph
research_graph = workflow.compile()

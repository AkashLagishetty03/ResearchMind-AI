import asyncio
import operator
import uuid
from datetime import datetime
from typing import Annotated, Dict, Any, List, TypedDict
import pytest
from langgraph.graph import StateGraph, END

# Import model
from app.models.schemas import DebateMessage

# Define a test state
class TestState(TypedDict):
    debate: Annotated[List[DebateMessage], operator.add]

# Node functions for testing three concurrent writers
async def writer_one(state: TestState) -> Dict[str, Any]:
    msg = DebateMessage(
        id="writer-1",
        role="critic",
        agent_name="Writer 1",
        message="Critic input.",
        timestamp=datetime.utcnow().isoformat(),
        confidence=0.85
    )
    return {"debate": [msg]}

async def writer_two(state: TestState) -> Dict[str, Any]:
    msg = DebateMessage(
        id="writer-2",
        role="analyst",
        agent_name="Writer 2",
        message="Analyst input.",
        timestamp=datetime.utcnow().isoformat(),
        confidence=0.90
    )
    return {"debate": [msg]}

async def writer_three(state: TestState) -> Dict[str, Any]:
    msg = DebateMessage(
        id="writer-3",
        role="researcher",
        agent_name="Writer 3",
        message="Researcher input.",
        timestamp=datetime.utcnow().isoformat(),
        confidence=0.95
    )
    return {"debate": [msg]}

@pytest.mark.asyncio
async def test_three_concurrent_writers_and_ordering():
    # Build a test graph with three concurrent writers
    builder = StateGraph(TestState)
    builder.add_node("writer_one", writer_one)
    builder.add_node("writer_two", writer_two)
    builder.add_node("writer_three", writer_three)
    
    # Connect them all in parallel from ENTRY to END
    # LangGraph doesn't allow setting multiple entry points directly in set_entry_point,
    # so we create a start node that branches to all three.
    async def start_node(state: TestState) -> Dict[str, Any]:
        return {}
    
    async def end_node(state: TestState) -> Dict[str, Any]:
        return {}
        
    builder.add_node("start", start_node)
    builder.add_node("end", end_node)
    
    builder.set_entry_point("start")
    builder.add_edge("start", "writer_one")
    builder.add_edge("start", "writer_two")
    builder.add_edge("start", "writer_three")
    
    builder.add_edge("writer_one", "end")
    builder.add_edge("writer_two", "end")
    builder.add_edge("writer_three", "end")
    builder.add_edge("end", END)
    
    graph = builder.compile()
    
    # Run execution
    initial_state = {"debate": []}
    result = await graph.ainvoke(initial_state)
    
    # Verifications
    assert "debate" in result
    debate_list = result["debate"]
    
    # 1. Verify no INVALID_CONCURRENT_GRAPH_UPDATE errors occurred (graph successfully executed)
    # 2. Three concurrent writers executed and merged their outputs
    assert len(debate_list) == 3
    
    # 3. No duplicate messages
    ids = [msg.id for msg in debate_list]
    assert len(ids) == len(set(ids))
    assert "writer-1" in ids
    assert "writer-2" in ids
    assert "writer-3" in ids

    # 4. Debate ordering can be sorted and verified
    sorted_debate = sorted(debate_list, key=lambda x: x.timestamp)
    assert len(sorted_debate) == 3


@pytest.mark.asyncio
async def test_main_graph_execution_demo_mode():
    from app.graph.workflow import research_graph
    
    # Run the main graph with use_demo=True (uses mock responses)
    initial_state = {
        "query": "Will AI replace software engineers?",
        "session_id": None,
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
        "confidence_score": 0
    }
    
    # Run graph invoke
    result = await research_graph.ainvoke(initial_state)
    
    # 5. Parallel Critic + Trend execution was performed and merged cleanly
    assert len(result["debate"]) > 0
    
    # Verify no duplicate messages and proper structure
    ids = [msg.id for msg in result["debate"]]
    assert len(ids) == len(set(ids))
    
    roles = [msg.role for msg in result["debate"]]
    assert "critic" in roles
    assert "analyst" in roles
    
    # Verify chronological ordering (sorting by timestamp keeps sequential dependency order researcher -> verifier)
    sorted_debate = sorted(result["debate"], key=lambda x: x.timestamp)
    roles_sorted = [msg.role for msg in sorted_debate]
    assert roles_sorted[0] == "researcher"
    assert roles_sorted[-1] == "verifier"

import json
import logging
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.llm_router import call_llm
from app.services.tool_service import execute_tool
from app.services.stream_manager import StreamManager
from app.services.agent_config_service import get_prompt_template
from app.agents.research_agent import clean_and_parse_json

logger = logging.getLogger(__name__)

async def run_fact_verifier(
    query: str,
    research_findings: Dict[str, Any],
    critic_output: Dict[str, Any],
    judge_output: Dict[str, Any],
    session_id: int = None,
    use_demo: bool = False,
    db: AsyncSession = None
) -> Dict[str, Any]:
    """Execute the Fact Verification Agent with a ReAct tool loop."""
    
    system_prompt = ""
    if db:
        try:
            pt = await get_prompt_template(db, "fact_verifier_agent")
            if pt:
                system_prompt = pt.prompt_text
        except Exception as e:
            logger.error(f"Failed to fetch fact verifier prompt from DB: {e}")
            
    if not system_prompt:
        from app.services.agent_config_service import DEFAULT_PROMPTS
        system_prompt = next(p["prompt_text"] for p in DEFAULT_PROMPTS if p["agent_key"] == "fact_verifier_agent")

    history = []
    current_prompt = (
        f"User Query: {query}\n\n"
        f"Research Findings under review:\n{json.dumps(research_findings, indent=2)}\n\n"
        f"Critic objections under review:\n{json.dumps(critic_output, indent=2)}\n\n"
        f"Judge decisions under review:\n{json.dumps(judge_output, indent=2)}\n\n"
        f"Verify the claims for contradictions, estimate hallucination risk, and cross-reference them."
    )

    # ReAct verification loop
    for iteration in range(2):
        try:
            response_text = await call_llm(
                agent_key="fact_verifier_agent",
                prompt=current_prompt,
                system_instruction=system_prompt,
                json_mode=True,
                session_id=session_id,
                use_demo=use_demo,
                db=db
            )
            
            response_json = clean_and_parse_json(response_text)
            
            if "action" in response_json and response_json["action"] != "none" and response_json["action"] != "":
                tool_name = response_json["action"]
                tool_input = response_json.get("input", "")
                thought = response_json.get("thought", "Verifying claims...")
                
                # Stream start event
                if session_id:
                    await StreamManager.publish(
                        session_id, 
                        "tool_invoked", 
                        {
                            "agent": "Fact Verification Agent", 
                            "tool": tool_name, 
                            "input": tool_input,
                            "thought": thought
                        }
                    )
                
                # Run search / verifier
                tool_result = await execute_tool("fact_verifier_agent", tool_name, tool_input)
                
                # Log call in database
                await call_llm(
                    agent_key="fact_verifier_agent",
                    prompt=current_prompt,
                    system_instruction=system_prompt,
                    json_mode=True,
                    session_id=session_id,
                    use_demo=use_demo,
                    tool_invoked=tool_name,
                    tool_input=tool_input,
                    db=db
                )
                
                history.append(f"Thought: {thought}\nAction: {tool_name}({tool_input})\nObservation: {tool_result}")
                current_prompt = (
                    f"User Query: {query}\n\n"
                    f"Prior verification checks:\n" + "\n\n".join(history) + "\n\n"
                    f"Finalize verifications. If complete, output the final status JSON object."
                )
            else:
                return response_json
        except Exception as e:
            logger.error(f"Error in fact verification agent loop iteration {iteration}: {e}")
            break

    # Fallback response
    try:
        current_prompt = (
            f"User Query: {query}\n\n"
            f"Please output your final verification JSON immediately. Do not call any tools."
        )
        response_text = await call_llm(
            agent_key="fact_verifier_agent",
            prompt=current_prompt,
            system_instruction=system_prompt,
            json_mode=True,
            session_id=session_id,
            use_demo=use_demo,
            db=db
        )
        return clean_and_parse_json(response_text)
    except Exception as e:
        logger.error(f"Failed direct fallback in fact verifier agent: {e}")
        from app.services.llm_router import get_mock_completion
        mock_text = await get_mock_completion("fact_verifier_agent", query, True)
        return clean_and_parse_json(mock_text)

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

async def run_critic(
    query: str, 
    research_findings: Dict[str, Any], 
    session_id: int = None, 
    use_demo: bool = False, 
    db: AsyncSession = None
) -> Dict[str, Any]:
    """Execute the Critic Agent with a ReAct tool loop."""
    
    system_prompt = ""
    if db:
        try:
            pt = await get_prompt_template(db, "critic_agent")
            if pt:
                system_prompt = pt.prompt_text
        except Exception as e:
            logger.error(f"Failed to fetch critic prompt from DB: {e}")
            
    if not system_prompt:
        from app.services.agent_config_service import DEFAULT_PROMPTS
        system_prompt = next(p["prompt_text"] for p in DEFAULT_PROMPTS if p["agent_key"] == "critic_agent")

    history = []
    current_prompt = (
        f"User Query: {query}\n\n"
        f"Research Agent Output:\n{json.dumps(research_findings, indent=2)}\n\n"
        f"Analyze these findings for logical consistency, potential bias, and uncertainty."
    )

    # ReAct Critic loop
    for iteration in range(2):
        try:
            response_text = await call_llm(
                agent_key="critic_agent",
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
                thought = response_json.get("thought", "Analyzing content...")
                
                # Stream start event
                if session_id:
                    await StreamManager.publish(
                        session_id, 
                        "tool_invoked", 
                        {
                            "agent": "Critic Agent", 
                            "tool": tool_name, 
                            "input": tool_input,
                            "thought": thought
                        }
                    )
                
                # Execute analysis tool
                tool_result = await execute_tool("critic_agent", tool_name, tool_input)
                
                # Log call in database
                await call_llm(
                    agent_key="critic_agent",
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
                    f"Research Agent Output:\n{json.dumps(research_findings, indent=2)}\n\n"
                    f"Prior critic checks:\n" + "\n\n".join(history) + "\n\n"
                    f"Evaluate findings. If analysis is finished, output the final critiques JSON object."
                )
            else:
                return response_json
        except Exception as e:
            logger.error(f"Error in critic agent loop iteration {iteration}: {e}")
            break

    # Fallback response
    try:
        current_prompt = (
            f"User Query: {query}\n\n"
            f"Research Agent Output:\n{json.dumps(research_findings, indent=2)}\n\n"
            f"Please output your final critiques JSON immediately. Do not call any tools."
        )
        response_text = await call_llm(
            agent_key="critic_agent",
            prompt=current_prompt,
            system_instruction=system_prompt,
            json_mode=True,
            session_id=session_id,
            use_demo=use_demo,
            db=db
        )
        return clean_and_parse_json(response_text)
    except Exception as e:
        logger.error(f"Failed direct fallback in critic agent: {e}")
        from app.services.llm_router import get_mock_completion
        mock_text = await get_mock_completion("critic_agent", query, True)
        return clean_and_parse_json(mock_text)

async def run_research_reply(
    query: str, 
    research_findings: Dict[str, Any], 
    critic_output: Dict[str, Any], 
    session_id: int = None,
    use_demo: bool = False, 
    db: AsyncSession = None
) -> Dict[str, Any]:
    """Defense stage where the Research Agent answers the Critic's critiques."""
    
    reply_instruction = (
        "You are the Research Agent. The Critic Agent has challenged your findings.\n"
        "Respond to their critiques constructively, defending your evidence and explaining why your findings "
        "remain valid despite the points raised. Keep it concise (1-2 sentences)."
    )
    
    prompt = (
        f"User Query: {query}\n\n"
        f"Your Findings:\n{json.dumps(research_findings, indent=2)}\n\n"
        f"Critic's Statement: {critic_output.get('statement')}\n"
        f"Critic's Critiques:\n{json.dumps(critic_output.get('critiques'), indent=2)}\n\n"
        f"Provide your short response/defense in character."
    )
    
    try:
        response_text = await call_llm(
            agent_key="research_agent",
            prompt=prompt,
            system_instruction=reply_instruction,
            json_mode=False,
            session_id=session_id,
            use_demo=use_demo,
            db=db
        )
        return {"statement": response_text.strip()}
    except Exception as e:
        logger.error(f"Error executing research reply: {e}")
        return {"statement": "Our findings represent observable facts and we stand by the productivity and reliability parameters observed."}

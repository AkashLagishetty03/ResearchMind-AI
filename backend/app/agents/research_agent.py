import json
import logging
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.llm_router import call_llm
from app.services.tool_service import execute_tool
from app.services.stream_manager import StreamManager
from app.services.agent_config_service import get_prompt_template

logger = logging.getLogger(__name__)

def clean_and_parse_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()
    return json.loads(text)

async def run_research(query: str, session_id: int = None, use_demo: bool = False, db: AsyncSession = None) -> Dict[str, Any]:
    """Execute the Research Agent with a ReAct tool loop."""
    
    # 1. Fetch prompt template
    system_prompt = ""
    if db:
        try:
            pt = await get_prompt_template(db, "research_agent")
            if pt:
                system_prompt = pt.prompt_text
        except Exception as e:
            logger.error(f"Failed to fetch research prompt from DB: {e}")
            
    if not system_prompt:
        # Fallback to local default
        from app.services.agent_config_service import DEFAULT_PROMPTS
        system_prompt = next(p["prompt_text"] for p in DEFAULT_PROMPTS if p["agent_key"] == "research_agent")

    history = []
    current_prompt = f"User Query: {query}\nPerform structured research and gather evidence on this query."

    # ReAct execution loop (max 3 tool iterations)
    for iteration in range(3):
        try:
            response_text = await call_llm(
                agent_key="research_agent",
                prompt=current_prompt,
                system_instruction=system_prompt,
                json_mode=True,
                session_id=session_id,
                use_demo=use_demo,
                db=db
            )
            
            response_json = clean_and_parse_json(response_text)
            
            # If the LLM returned a tool action, execute it
            if "action" in response_json and response_json["action"] != "none" and response_json["action"] != "":
                tool_name = response_json["action"]
                tool_input = response_json.get("input", "")
                thought = response_json.get("thought", "Searching information...")
                
                # Stream start event
                if session_id:
                    await StreamManager.publish(
                        session_id, 
                        "tool_invoked", 
                        {
                            "agent": "Research Agent", 
                            "tool": tool_name, 
                            "input": tool_input,
                            "thought": thought
                        }
                    )
                
                # Run tool
                tool_result = await execute_tool("research_agent", tool_name, tool_input)
                
                # Log execution in LLM router as a tool call log
                await call_llm(
                    agent_key="research_agent",
                    prompt=current_prompt,
                    system_instruction=system_prompt,
                    json_mode=True,
                    session_id=session_id,
                    use_demo=use_demo,
                    tool_invoked=tool_name,
                    tool_input=tool_input,
                    db=db
                )
                
                # Append to history and re-prompt
                history.append(f"Thought: {thought}\nAction: {tool_name}({tool_input})\nObservation: {tool_result}")
                current_prompt = (
                    f"User Query: {query}\n\n"
                    f"Prior actions:\n" + "\n\n".join(history) + "\n\n"
                    f"Analyze the prior observations and continue. If you have gathered sufficient findings, output your final findings JSON object now."
                )
            else:
                # If no tool action, this is the final structured output!
                return response_json
        except Exception as e:
            logger.error(f"Error in research agent loop iteration {iteration}: {e}")
            break

    # If loop terminates without JSON resolution, request a direct final format call
    try:
        current_prompt = (
            f"User Query: {query}\n\n"
            f"Please output your final research findings immediately in the specified JSON format. "
            f"Do not invoke any more tools."
        )
        response_text = await call_llm(
            agent_key="research_agent",
            prompt=current_prompt,
            system_instruction=system_prompt,
            json_mode=True,
            session_id=session_id,
            use_demo=use_demo,
            db=db
        )
        return clean_and_parse_json(response_text)
    except Exception as e:
        logger.error(f"Failed direct fallback in research agent: {e}")
        # Default safety fallback
        from app.services.llm_router import get_mock_completion
        mock_text = await get_mock_completion("research_agent", query, True)
        return clean_and_parse_json(mock_text)

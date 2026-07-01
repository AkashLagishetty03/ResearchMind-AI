import json
import logging
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.llm_router import call_llm
from app.services.agent_config_service import get_prompt_template
from app.agents.research_agent import clean_and_parse_json

logger = logging.getLogger(__name__)

async def run_judge(
    query: str, 
    research_findings: Dict[str, Any], 
    critic_output: Dict[str, Any], 
    research_reply: Dict[str, Any], 
    session_id: int = None,
    use_demo: bool = False, 
    db: AsyncSession = None
) -> Dict[str, Any]:
    """Execute the Judge Agent to arbitrate agent debates."""
    
    system_prompt = ""
    if db:
        try:
            pt = await get_prompt_template(db, "judge_agent")
            if pt:
                system_prompt = pt.prompt_text
        except Exception as e:
            logger.error(f"Failed to fetch judge prompt from DB: {e}")
            
    if not system_prompt:
        from app.services.agent_config_service import DEFAULT_PROMPTS
        system_prompt = next(p["prompt_text"] for p in DEFAULT_PROMPTS if p["agent_key"] == "judge_agent")

    prompt = (
        f"User Query: {query}\n\n"
        f"Research Findings:\n{json.dumps(research_findings, indent=2)}\n\n"
        f"Critic Feedback:\n{json.dumps(critic_output, indent=2)}\n\n"
        f"Research Response:\n{json.dumps(research_reply, indent=2)}\n\n"
        f"Arbitrate these claims. Resolve conflicts, identify confirmation bias, and output balanced resolved findings."
    )

    try:
        response_text = await call_llm(
            agent_key="judge_agent",
            prompt=prompt,
            system_instruction=system_prompt,
            json_mode=True,
            session_id=session_id,
            use_demo=use_demo,
            db=db
        )
        return clean_and_parse_json(response_text)
    except Exception as e:
        logger.error(f"Error in judge agent execution: {e}")
        from app.services.llm_router import get_mock_completion
        mock_text = await get_mock_completion("judge_agent", query, True)
        return clean_and_parse_json(mock_text)

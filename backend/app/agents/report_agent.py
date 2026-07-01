import json
import logging
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.llm_router import call_llm
from app.services.agent_config_service import get_prompt_template
from app.agents.research_agent import clean_and_parse_json

logger = logging.getLogger(__name__)

async def run_report_writer(
    query: str, 
    research_findings: Dict[str, Any], 
    critic_output: Dict[str, Any], 
    trend_output: Dict[str, Any], 
    judge_output: Dict[str, Any], 
    fact_verification: Dict[str, Any],
    session_id: int = None,
    use_demo: bool = False, 
    db: AsyncSession = None
) -> Dict[str, Any]:
    """Execute the Report Writer Agent to compile a professional consulting-grade Markdown report."""
    
    system_prompt = ""
    if db:
        try:
            pt = await get_prompt_template(db, "report_agent")
            if pt:
                system_prompt = pt.prompt_text
        except Exception as e:
            logger.error(f"Failed to fetch report prompt from DB: {e}")
            
    if not system_prompt:
        from app.services.agent_config_service import DEFAULT_PROMPTS
        system_prompt = next(p["prompt_text"] for p in DEFAULT_PROMPTS if p["agent_key"] == "report_agent")

    prompt = (
        f"User Query: {query}\n\n"
        f"Research Findings: {json.dumps(research_findings, indent=2)}\n\n"
        f"Critic Feedback: {json.dumps(critic_output, indent=2)}\n\n"
        f"Trend Analyst Output: {json.dumps(trend_output, indent=2)}\n\n"
        f"Judge Consensus: {json.dumps(judge_output, indent=2)}\n\n"
        f"Fact Verification Data: {json.dumps(fact_verification, indent=2)}\n\n"
        f"Please synthesize this information into a cohesive, structured markdown report."
    )

    try:
        response_text = await call_llm(
            agent_key="report_agent",
            prompt=prompt,
            system_instruction=system_prompt,
            json_mode=True,
            session_id=session_id,
            use_demo=use_demo,
            db=db
        )
        return clean_and_parse_json(response_text)
    except Exception as e:
        logger.error(f"Error in report agent execution: {e}")
        from app.services.llm_router import get_mock_completion
        mock_text = await get_mock_completion("report_agent", query, True)
        return clean_and_parse_json(mock_text)

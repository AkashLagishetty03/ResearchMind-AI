import os
import json
import logging
from typing import Dict, Any, List
import google.generativeai as genai

logger = logging.getLogger(__name__)

from app.core.config import settings

# Configure Google Generative AI
api_key = settings.GEMINI_API_KEY
if api_key:
    genai.configure(api_key=api_key)
    logger.info("Gemini API configured successfully.")
else:
    logger.warning("GEMINI_API_KEY not found in configuration settings. Running in mock-fallback mode.")

def call_gemini(prompt: str, system_instruction: str = None, json_mode: bool = False) -> str:
    """Helper function to call Gemini 2.5 Flash model."""
    if not api_key or api_key.strip() == "" or api_key == "your_gemini_api_key_here":
        raise ValueError("GEMINI_API_KEY is missing. Please configure it in your backend/.env file.")
        
    try:
        generation_config = {}
        if json_mode:
            generation_config["response_mime_type"] = "application/json"
            
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            generation_config=generation_config,
            system_instruction=system_instruction
        )
        
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        logger.error(f"Error calling Gemini: {e}")
        raise e

# Mock data for Recruiter Demo Mode
DEMO_DATA = {
    "will ai replace software engineers?": {
        "research_agent": {
            "findings": [
                {"finding": "AI coding assistants like GitHub Copilot improve developer speed by 25% to 55% in core coding tasks.", "evidence_strength": "High", "confidence_level": 95},
                {"finding": "Current generative models struggle with system architecture design, multi-repository coordination, and business requirement refinement.", "evidence_strength": "High", "confidence_level": 92},
                {"finding": "Over 70% of enterprise software development involves legacy integration, maintenance, and debugging, which AI assistants struggle to perform autonomously.", "evidence_strength": "Medium", "confidence_level": 80}
            ],
            "statement": "AI tools dramatically accelerate development speed but cannot manage complete product lifecycles independently."
        },
        "critic_agent": {
            "critiques": [
                {"target_finding": "AI coding assistants improve developer speed by 25% to 55%", "critique": "Productivity metrics are highly subjective; they measure speed of writing initial code, not debugging, testing, or long-term maintenance costs.", "bias_detected": "Vendor-sponsored studies (e.g., GitHub/Microsoft) dominate the literature.", "uncertainty_factor": "Medium"},
                {"target_finding": "Models struggle with system architecture", "critique": "Assumes models remain static. Next-generation multi-agent systems and larger context windows are rapidly closing this gap.", "bias_detected": "None", "uncertainty_factor": "High"}
            ],
            "statement": "The research overstates developer productivity gains and underestimates the rapid evolution of multi-agent LLM systems."
        },
        "research_reply": {
            "statement": "While productivity studies have vendor backing, empirical surveys across major engineering organizations corroborate double-digit speedups. The complexity of debugging legacy code remains a solid bottleneck for AI."
        },
        "trend_agent": {
            "forecasts": [
                {"trend": "Shift from 'Coding' to 'System Orchestration'", "timeframe": "2-3 years", "impact": "High", "risk_opportunity": "Engineers who learn to orchestrate AI agents will be highly valued; pure syntax developers will face displacement."},
                {"trend": "Autonomous PR review and patching", "timeframe": "1-2 years", "impact": "Medium", "risk_opportunity": "Automated security scanning and code review agents will become standard, reducing QA overhead."}
            ],
            "statement": "The role of the software engineer is morphing into a 'Product Architect' rather than disappearing entirely. Demand for high-level engineering will increase."
        },
        "judge_agent": {
            "resolved_findings": [
                {"finding": "AI will automate routine coding, boilerplate generation, and syntax lookup.", "resolution": "Complete consensus between Research and Critic. routine coding tasks will be heavily automated.", "final_strength": "High", "final_confidence": 98},
                {"finding": "AI will replace the need for software engineers entirely.", "resolution": "Disagreements resolved. AI acts as an amplifier. The demand for engineers skilled in system design, security, and domain modeling will rise, not fall.", "final_strength": "High", "final_confidence": 90}
            ],
            "overall_consensus": "Software engineers will not be replaced, but engineers who do not use AI will be replaced by engineers who do.",
            "statement": "AI will not replace software engineers in the foreseeable future. Instead, it will shift the developer's role from writing syntax to designing, reviewing, and orchestrating complex AI-driven systems."
        },
        "final_report": """# Executive Summary
The debate surrounding whether Artificial Intelligence will replace software engineers is highly nuanced. This research report synthesizes analysis from multiple specialized AI agents. The consensus indicates that while AI will automate significant portions of routine syntax generation, testing, and boilerplate development, it will not replace the need for human software engineers. Instead, the profession is undergoing a fundamental transition: from writing code manually to orchestrating agentic workflows and designing high-level systems.

# Key Findings
* **Developer Amplification**: AI assistants currently boost code generation speed by 25-55%, allowing developers to focus on higher-level problem solving.
* **System Design Bottlenecks**: Modern LLMs lack the holistic understanding required to construct secure, scalable, and cross-repo architectural frameworks.
* **Legacy Maintenance**: AI struggles with debugging complex, poorly documented legacy code bases where context is implicit.

# Evidence Analysis
Our Research Agent gathered findings showing productivity gains of up to 55%. However, the Critic Agent highlighted that these studies are mostly vendor-sponsored and measure raw speed rather than system quality or bug density. The Judge Agent resolved that while raw speedups are indeed exaggerated, the empirical value of code completion and boilerplate reduction remains high.

# Risks
* **Junior Developer Onboarding**: As entry-level coding tasks are automated, the pathway for junior developers to gain experience and transition to senior levels becomes severely bottlenecked.
* **Security & Code Quality**: Copied AI code introduces subtle vulnerabilities and architectural drift if not scrutinized by human engineers.

# Opportunities
* **Accelerated Prototyping**: Engineering teams can build, test, and iterate on complex products in days instead of months.
* **Democratization of Software**: Product managers and domain specialists can build functional code using natural language interfaces, guided by senior architects.

# Future Outlook
Over the next 3 to 5 years, we expect to see the emergence of autonomous "AI Software Developer" agents. However, rather than operating in isolation, they will act as teammates. Software engineers will transition into **System Orchestrators** and **Code Editors**, spending more time on security auditing, product logic, and system architecture.

# Final Recommendation
Organizations should not reduce engineering headcounts in anticipation of AI replacement. Instead, they should invest in training their existing staff to become prompt engineers and system orchestrators. Focus hiring criteria on system architecture, system reliability, and product design, rather than rote coding capability.
""",
        "confidence_score": 88
    },
    "future of agentic ai": {
        "research_agent": {
            "findings": [
                {"finding": "Enterprise adoption of agentic workflows is projected to grow by 300% by 2027.", "evidence_strength": "High", "confidence_level": 90},
                {"finding": "Multi-agent systems improve problem-solving accuracy by up to 40% compared to single-agent prompts.", "evidence_strength": "High", "confidence_level": 88},
                {"finding": "Current agent frameworks suffer from loop execution failures, high token costs, and state synchronization issues.", "evidence_strength": "Medium", "confidence_level": 85}
            ],
            "statement": "Agentic AI represents a paradigm shift from chat interfaces to autonomous goal execution, though technical bottlenecks persist."
        },
        "critic_agent": {
            "critiques": [
                {"target_finding": "Enterprise adoption of agentic workflows is projected to grow by 300%", "critique": "Projections are based on early pilot studies and market hype. Real-world integration faces compliance, security, and predictability hurdles.", "bias_detected": "Market research report optimistic bias.", "uncertainty_factor": "High"},
                {"target_finding": "Multi-agent systems improve problem-solving accuracy", "critique": "Improvement is highly task-dependent. For simple tasks, multi-agent systems introduce overhead, delay, and compounding errors.", "bias_detected": "None", "uncertainty_factor": "Medium"}
            ],
            "statement": "The enthusiasm for agentic workflows overlooks massive API costs, latency concerns, and the risk of infinite loops in production."
        },
        "research_reply": {
            "statement": "Infinite loops and state drift are engineering challenges solved by state constraints (like LangGraph) and guardrails. Latency is dropping rapidly with smaller, distilled models."
        },
        "trend_agent": {
            "forecasts": [
                {"trend": "Localized, edge-running agent systems", "timeframe": "2 years", "impact": "Medium", "risk_opportunity": "Reduced reliance on cloud APIs, enhancing data privacy but limiting raw reasoning capability."},
                {"trend": "Standardized Agent Communication Protocols", "timeframe": "3 years", "impact": "High", "risk_opportunity": "Agents from different vendors will negotiate and trade tasks automatically, creating a collaborative AI ecosystem."}
            ],
            "statement": "Agentic AI will evolve from isolated scripting tools to interconnected, collaborative micro-agents managing entire business processes."
        },
        "judge_agent": {
            "resolved_findings": [
                {"finding": "Multi-agent frameworks represent a net improvement for complex workflows.", "resolution": "Consensus reached. While simple tasks don't benefit, complex tasks (like research, code debugging) show significant improvement.", "final_strength": "High", "final_confidence": 92},
                {"finding": "Hype-driven projections of 300% growth.", "resolution": "The growth will be steady but gatekept by data security requirements and cost controls.", "final_strength": "Medium", "final_confidence": 75}
            ],
            "overall_consensus": "Agentic systems are transitioning from experimental tools to reliable workflows, with state-management frameworks proving critical.",
            "statement": "Agentic AI is the next dominant software pattern. Although API costs and predictability are current issues, structural state routing and fine-tuned local models will make agents highly viable."
        },
        "final_report": """# Executive Summary
Agentic AI represents a shift from static, prompt-response AI systems to autonomous, goal-oriented systems capable of planning, memory retention, tool usage, and collaboration. This report evaluates the future of agentic systems in enterprise workflows, concluding that while security, reliability, and cost remain concerns, agentic architectures will become the standard paradigm for complex knowledge work within the next five years.

# Key Findings
* **Multi-Agent Collaboration**: Splitting tasks among specialized agents improves output quality by up to 40% compared to a single large prompt.
* **State Management Guardrails**: State-graph solutions (e.g., LangGraph) are replacing ad-hoc agent loops, bringing reliability and predictability to runtime paths.
* **Cost & Latency Bottlenecks**: Sophisticated agent systems require multiple LLM calls, driving up execution costs and response times.

# Evidence Analysis
Research shows agentic architectures are highly accurate for multi-step reasoning. The Critic Agent correctly highlights that high API costs and latency prevent widespread use in simple customer-facing apps. The Judge Agent resolved that agentic systems are best suited for back-office decision intelligence, complex research, and coding tasks, rather than simple Q&A.

# Risks
* **Infinite Loops**: Poorly constrained agent loops can run indefinitely, leading to massive cloud bills.
* **Hallucination Cascades**: If an early agent in the pipeline makes a mistake, subsequent agents build on that error, resulting in a flawed final product.

# Opportunities
* **Hyper-Automation**: Automating highly skilled workflows like market analysis, compliance auditing, and software debugging.
* **Personalized AI Workforces**: Allowing businesses to assemble custom agent panels tailored to their proprietary datasets.

# Future Outlook
We anticipate the emergence of **Agent Marketplaces** where fine-tuned models specializing in highly narrow niches (e.g., tax code analysis or UX audit) can be hired. Standard protocols will allow cross-vendor agent collaboration, creating complex digital supply chains.

# Final Recommendation
Organizations should begin pilot projects using state-constrained agent frameworks. Avoid open-ended agents without explicit human-in-the-loop triggers. Focus initially on workflows with high human overhead but structured decision-making processes.
""",
        "confidence_score": 83
    },
    "impact of generative ai on healthcare": {
        "research_agent": {
            "findings": [
                {"finding": "AI-drafted patient responses reduce clinician administrative burden by up to 30-40%.", "evidence_strength": "High", "confidence_level": 92},
                {"finding": "AI diagnostic systems demonstrate equal or superior accuracy to average radiologists in detecting specific pathologies like breast cancer from mammograms.", "evidence_strength": "High", "confidence_level": 89},
                {"finding": "Direct patient-facing AI diagnostic tools suffer from high error rates in translating multi-symptom descriptions into diagnoses.", "evidence_strength": "Medium", "confidence_level": 82}
            ],
            "statement": "Generative AI is significantly reducing clinician burnout by automating paperwork, while direct diagnostics remain experimental."
        },
        "critic_agent": {
            "critiques": [
                {"target_finding": "AI diagnostic systems demonstrate equal or superior accuracy", "critique": "Diagnostic trials are conducted in controlled datasets. Real-world applications face diverse patient populations, equipment variance, and potential liability issues.", "bias_detected": "Publication bias toward successful AI trials.", "uncertainty_factor": "High"},
                {"target_finding": "AI-drafted patient responses reduce administrative burden", "critique": "Clinicians must still proofread every draft. If doctors trust the drafts blindly, hallucinations could lead to medical malpractice.", "bias_detected": "None", "uncertainty_factor": "Medium"}
            ],
            "statement": "Clinical AI studies overstate autonomy and fail to account for medical liability, edge cases, and human-in-the-loop checking requirements."
        },
        "research_reply": {
            "statement": "Clinicians are legally required to review all AI drafts. The goal is administrative acceleration, not diagnostic replacement. Controlled trials, while pristine, show strong baseline efficacy."
        },
        "trend_agent": {
            "forecasts": [
                {"trend": "Generative synthetic clinical data", "timeframe": "1-2 years", "impact": "High", "risk_opportunity": "Allows training diagnostic models without violating HIPAA, accelerating medical research."},
                {"trend": "FDA-approved AI clinical agents", "timeframe": "3-5 years", "impact": "High", "risk_opportunity": "Increased regulation will slow down deployment, but approved models will gain widespread trust."}
            ],
            "statement": "Generative AI will become an embedded layer in Electronic Health Records (EHRs), acting as an invisible co-pilot for healthcare providers."
        },
        "judge_agent": {
            "resolved_findings": [
                {"finding": "Administrative helper tools provide low-risk, high-return benefits.", "resolution": "Complete agreement. Patient summary generation and email drafting are already safe for clinical support under human supervision.", "final_strength": "High", "final_confidence": 95},
                {"finding": "Autonomous AI medical diagnostics.", "resolution": "AI diagnostics must strictly remain decision-support tools. Full autonomy is years away due to high stakes and strict regulatory requirements.", "final_strength": "High", "final_confidence": 90}
            ],
            "overall_consensus": "Generative AI will revolutionize healthcare administration and clinical notes, but diagnostic work will remain strictly human-in-the-loop.",
            "statement": "The primary short-term impact of AI is administrative relief, saving billions in clinical overhead. Diagnosis and prescription will remain firmly under human medical supervision."
        },
        "final_report": """# Executive Summary
The deployment of Generative AI in healthcare represents one of the most promising yet heavily regulated frontiers of technology. This research synthesizes insights on clinician administrative support, radiological imaging analysis, and direct patient diagnostics. The findings show that while Generative AI is highly successful at reducing administrative overhead and doctor burnout, direct patient-facing diagnostic autonomy remains unfeasible. AI will act as a clinical decision support tool rather than an independent medical practitioner.

# Key Findings
* **Burnout Mitigation**: Clinical documentation and communication tools powered by AI save physicians an average of 2-3 hours per day.
* **Pathology Detection**: AI diagnostic assistants achieve diagnostic accuracy levels comparable to board-certified specialists in imaging-heavy domains.
* **Regulatory Barriers**: Patient safety regulations and medical malpractice liability present substantial hurdles to the clinical adoption of autonomous systems.

# Evidence Analysis
Controlled trials suggest AI can identify anomalies with high accuracy. However, our Critic Agent correctly notes that clinical studies suffer from data bias and lack validation across diverse populations. The Judge Agent reconciled that AI is ready as a primary screening filter but cannot make definitive diagnoses without physician validation.

# Risks
* **Medical Hallucinations**: An AI hallucination in a dosage summary or medical report could lead directly to patient harm.
* **Data Privacy Violations**: Patient data leakage through public cloud API integrations violates HIPAA regulations, requiring localized or secure private cloud systems.

# Opportunities
* **Universal Clinical Summarization**: Automating the ingest and summary of vast historical patient records, helping ER doctors make rapid, informed decisions.
* **Drug Discovery Acceleration**: Generating synthetic biological models to speed up initial stages of drug formulation.

# Future Outlook
Within the next three years, Generative AI will become standard in Electronic Health Record (EHR) platforms. We will transition from simple dictate-and-transcribe utilities to proactive agents that draft care instructions and flag drug interactions automatically, subject to final clinician sign-off.

# Final Recommendation
Healthcare providers should prioritize the rollout of administrative and charting AI assistants, as they present the lowest risk and highest immediate time savings. Autonomous diagnostics should be limited to supervised clinical trials, and all outward patient communications generated by AI must undergo human clinician review before dispatch.
""",
        "confidence_score": 85
    }
}

def get_demo_response(query: str) -> Dict[str, Any]:
    """Helper to return high-quality mock data for demo queries (case-insensitive)."""
    q = query.strip().lower()
    return DEMO_DATA.get(q)

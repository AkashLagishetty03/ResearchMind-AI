import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

def calculate_confidence(
    research_findings: List[Dict[str, Any]],
    critic_critiques: List[Dict[str, Any]],
    fact_verification: Dict[str, Any]
) -> Dict[str, Any]:
    """Calculate multi-factor confidence and certainty scores.
    
    Factors:
    1. Evidence Quality (20 pts): Based on findings strength (High=5, Medium=3, Low=1).
    2. Agent Agreement (20 pts): Starting at 20, penalizing for Critic objections.
    3. Fact Verification (30 pts): Score based on verifier's consistency score & status.
    4. Hallucination Risk (30 pts): 30 pts minus verifier's risk score.
    """
    # 1. Evidence Quality (max 20)
    findings_count = len(research_findings)
    if findings_count == 0:
        evidence_quality = 0
        avg_finding_confidence = 0
    else:
        # Sum strength points
        strength_points = 0
        conf_sum = 0
        for f in research_findings:
            strength = f.get("evidence_strength", "Medium")
            if strength == "High":
                strength_points += 5
            elif strength == "Medium":
                strength_points += 3
            else:
                strength_points += 1
            conf_sum += f.get("confidence_level", 70)
            
        avg_strength = strength_points / findings_count
        avg_finding_confidence = int(conf_sum / findings_count)
        
        # Scale to max 20: count weight (10) + strength weight (10)
        count_score = min(findings_count * 3, 10)
        strength_score = min((avg_strength / 5) * 10, 10)
        evidence_quality = int(count_score + strength_score)

    # 2. Agent Agreement (max 20)
    # Starts at 20, subtract 4 pts for each critique target
    critiques_count = len(critic_critiques)
    agreement_score = max(20 - (critiques_count * 4), 5)
    
    # 3. Fact Verification (max 30)
    verifier_consistency = fact_verification.get("consistency_score", 90)
    status = fact_verification.get("status", "Verified")
    
    # Scale consistency to 20 pts
    verification_base = (verifier_consistency / 100) * 20
    
    # Status weights (10 pts)
    status_score = 10
    if status == "Needs Review":
        status_score = 5
    elif status == "Conflicting Evidence":
        status_score = 0
        
    fact_verification_score = int(verification_base + status_score)

    # 4. Hallucination Risk Penalty (max 30)
    risk_score = fact_verification.get("hallucination_risk_score", 10)
    # Scale risk score (0 to 100) to 30 pts penalty
    risk_penalty = (risk_score / 100) * 30
    hallucination_score = int(30 - risk_penalty)

    # Sum totals
    overall_confidence = evidence_quality + agreement_score + fact_verification_score + hallucination_score
    overall_confidence = min(max(overall_confidence, 10), 100)

    evidence_strength_score = int(min((strength_points / max(findings_count * 5, 1)) * 100, 100)) if findings_count > 0 else 50

    return {
        "overall_confidence": overall_confidence,
        "finding_confidence": avg_finding_confidence,
        "evidence_strength_score": evidence_strength_score,
        "hallucination_risk_score": risk_score,
        "fact_verification_status": status,
        "evidence_quality_score": evidence_quality,
        "agent_agreement_score": agreement_score,
        "details": {
            "num_findings": findings_count,
            "num_critiques": critiques_count,
            "verifier_consistency": verifier_consistency
        }
    }

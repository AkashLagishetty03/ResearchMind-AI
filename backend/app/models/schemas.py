from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime

class DebateMessage(BaseModel):
    id: str = Field(..., description="Unique message ID")
    role: str = Field(..., description="Agent role (researcher, critic, analyst, judge, verifier, etc.)")
    agent_name: str = Field(..., description="Name of the agent")
    message: str = Field(..., description="The main message content")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat(), description="ISO Timestamp")
    confidence: Optional[float] = Field(None, description="Confidence score if applicable")
    model_used: Optional[str] = Field(None, description="Model used to generate the message")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional structured metadata (e.g. findings, critiques, forecasts, etc.)")

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean
from sqlalchemy.orm import relationship
from app.database.db import Base


# ─────────────────────────────────────────────────────────────────────────────
# AUTH — Users
# ─────────────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    sessions = relationship("ResearchSession", back_populates="user", cascade="all, delete-orphan")


# ─────────────────────────────────────────────────────────────────────────────
# Research Session  (user_id nullable so existing rows stay valid)
# ─────────────────────────────────────────────────────────────────────────────
class ResearchSession(Base):
    __tablename__ = "research_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    query = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)

    # Relationships
    user = relationship("User", back_populates="sessions")
    outputs = relationship("AgentOutput", back_populates="session", cascade="all, delete-orphan")
    report = relationship("Report", back_populates="session", uselist=False, cascade="all, delete-orphan")
    logs = relationship("ExecutionLog", back_populates="session", cascade="all, delete-orphan")


class AgentOutput(Base):
    __tablename__ = "agent_outputs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("research_sessions.id", ondelete="CASCADE"), nullable=False)
    agent_name = Column(String(100), nullable=False)
    output = Column(Text, nullable=False)  # Serialized JSON or plain text

    session = relationship("ResearchSession", back_populates="outputs")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("research_sessions.id", ondelete="CASCADE"), nullable=False)
    final_report = Column(Text, nullable=False)
    confidence_score = Column(Integer, nullable=False)
    fact_check_status = Column(String(50), nullable=True)
    confidence_metrics = Column(Text, nullable=True)

    session = relationship("ResearchSession", back_populates="report")


class ExecutionLog(Base):
    __tablename__ = "execution_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("research_sessions.id", ondelete="CASCADE"), nullable=True)
    agent_name = Column(String(100), nullable=False)
    model_used = Column(String(100), nullable=False)
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    latency_ms = Column(Integer, default=0)
    fallback_triggered = Column(Boolean, default=False)
    error_message = Column(Text, nullable=True)
    tool_invoked = Column(String(100), nullable=True)
    tool_input = Column(Text, nullable=True)
    prompt_version = Column(String(20), default="1.0.0")
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, default=2000)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("ResearchSession", back_populates="logs")


class AgentConfiguration(Base):
    __tablename__ = "agent_configurations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    agent_key = Column(String(100), unique=True, index=True, nullable=False)
    agent_name = Column(String(100), nullable=False)
    model_name = Column(String(100), nullable=False)
    fallback_model = Column(String(100), nullable=False)
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, default=2000)
    timeout = Column(Integer, default=30)


class PromptTemplate(Base):
    __tablename__ = "prompt_templates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    agent_key = Column(String(100), index=True, nullable=False)
    prompt_text = Column(Text, nullable=False)
    version = Column(String(20), default="1.0.0", nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

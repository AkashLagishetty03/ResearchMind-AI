export interface HistoryItem {
  id: number;
  query: string;
  created_at: string;
  confidence_score: number | null;
  fact_check_status?: string | null;
  confidence_metrics?: any | null;
}

export interface FindingsItem {
  finding: string;
  evidence_strength: "High" | "Medium" | "Low";
  confidence_level: number;
}

export interface CritiqueItem {
  target_finding: string;
  critique: string;
  bias_detected: string;
  uncertainty_factor: string;
}

export interface ForecastItem {
  trend: string;
  timeframe: string;
  impact: "High" | "Medium" | "Low";
  risk_opportunity: string;
}

export interface ResolvedFindingItem {
  finding: string;
  resolution: string;
  final_strength: "High" | "Medium" | "Low";
  final_confidence: number;
}

export interface DebateMessage {
  id: string;
  role: string;
  agent_name: string;
  message: string;
  timestamp: string;
  confidence?: number | null;
  model_used?: string | null;
  metadata: {
    findings?: FindingsItem[];
    critiques?: CritiqueItem[];
    forecasts?: ForecastItem[];
    resolved_findings?: ResolvedFindingItem[];
    overall_consensus?: string;
    status?: string;
    consistency_score?: number;
    hallucination_risk?: string;
    contradictions?: string[];
  };
}

export interface ReportDetails {
  id: number;
  query: string;
  created_at: string;
  research_agent: { findings?: FindingsItem[]; statement?: string } | any;
  critic_agent: { critiques?: CritiqueItem[]; statement?: string } | any;
  research_reply: { statement?: string } | any;
  trend_agent: { forecasts?: ForecastItem[]; statement?: string } | any;
  judge_agent: { resolved_findings?: ResolvedFindingItem[]; overall_consensus?: string; statement?: string } | any;
  fact_verification_agent?: any;
  debate: DebateMessage[];
  final_report: string;
  confidence_score: number;
  fact_check_status?: string;
  confidence_metrics?: any;
}

export interface AgentConfig {
  id: number;
  agent_key: string;
  agent_name: string;
  model_name: string;
  fallback_model: string;
  temperature: number;
  max_tokens: number;
  timeout: number;
}

export interface PromptTemplate {
  id: number;
  agent_key: string;
  prompt_text: string;
  version: string;
  description: string;
  updated_at: string;
}

export interface ExecutionLog {
  id: number;
  session_id: number | null;
  agent_name: string;
  model_used: string;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number;
  fallback_triggered: boolean;
  error_message: string | null;
  tool_invoked: string | null;
  tool_input: string | null;
  prompt_version: string;
  temperature: number;
  max_tokens: number;
  created_at: string;
}

export interface ModelMetrics {
  model_name: string;
  avg_latency_ms: number;
  total_tokens: number;
  total_calls: number;
  success_rate: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export async function fetchHistory(): Promise<HistoryItem[]> {
  const response = await fetch(`${API_BASE_URL}/history`);
  if (!response.ok) {
    throw new Error("Failed to fetch history");
  }
  return response.json();
}

export async function fetchReport(id: number): Promise<ReportDetails> {
  const response = await fetch(`${API_BASE_URL}/report/${id}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Report not found");
    }
    throw new Error("Failed to fetch report details");
  }
  return response.json();
}

export async function deleteReport(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/report/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete report");
  }
}

// Settings API
export async function fetchSettings(): Promise<AgentConfig[]> {
  const response = await fetch(`${API_BASE_URL}/settings`);
  if (!response.ok) {
    throw new Error("Failed to load agent settings");
  }
  return response.json();
}

export async function updateSettings(config: Partial<AgentConfig>): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    throw new Error("Failed to update agent configuration");
  }
}

// Prompts API
export async function fetchPrompts(): Promise<PromptTemplate[]> {
  const response = await fetch(`${API_BASE_URL}/settings/prompts`);
  if (!response.ok) {
    throw new Error("Failed to load prompts");
  }
  return response.json();
}

export async function updatePrompt(prompt: Partial<PromptTemplate>): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/settings/prompts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prompt),
  });
  if (!response.ok) {
    throw new Error("Failed to save prompt");
  }
}

// Logs API
export async function fetchLogs(sessionId?: number): Promise<ExecutionLog[]> {
  const url = sessionId ? `${API_BASE_URL}/logs?session_id=${sessionId}` : `${API_BASE_URL}/logs`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch execution logs");
  }
  return response.json();
}

export async function fetchModelMetrics(): Promise<ModelMetrics[]> {
  const response = await fetch(`${API_BASE_URL}/logs/metrics`);
  if (!response.ok) {
    throw new Error("Failed to fetch model metrics");
  }
  return response.json();
}

export function streamResearch(
  query: string,
  demo: boolean,
  handlers: {
    onSessionCreated?: (sessionData: { id: number; query: string }) => void;
    onNodeStarted: (node: string) => void;
    onNodeCompleted: (node: string, agent: string, stateUpdate: any) => void;
    onToolInvoked?: (agent: string, tool: string, input: string, thought: string) => void;
    onComplete: (finalData: ReportDetails) => void;
    onError: (error: string) => void;
  }
): EventSource {
  const url = `${API_BASE_URL}/research/stream?query=${encodeURIComponent(query)}&demo=${demo}`;
  const eventSource = new EventSource(url);

  eventSource.addEventListener("session_created", (event) => {
    try {
      const data = JSON.parse(event.data);
      if (handlers.onSessionCreated) {
        handlers.onSessionCreated(data);
      }
    } catch (e) {
      console.error("Failed to parse session_created data:", e);
    }
  });

  eventSource.addEventListener("node_started", (event) => {
    try {
      const data = JSON.parse(event.data);
      handlers.onNodeStarted(data.node);
    } catch (e) {
      console.error("Failed to parse node_started data:", e);
    }
  });

  eventSource.addEventListener("node_completed", (event) => {
    try {
      const data = JSON.parse(event.data);
      handlers.onNodeCompleted(data.node, data.agent, data.state_update);
    } catch (e) {
      console.error("Failed to parse node_completed data:", e);
    }
  });

  eventSource.addEventListener("tool_invoked", (event) => {
    try {
      const data = JSON.parse(event.data);
      if (handlers.onToolInvoked) {
        handlers.onToolInvoked(data.agent, data.tool, data.input, data.thought);
      }
    } catch (e) {
      console.error("Failed to parse tool_invoked data:", e);
    }
  });

  eventSource.addEventListener("execution_complete", (event) => {
    try {
      const data = JSON.parse(event.data);
      handlers.onComplete(data);
      eventSource.close();
    } catch (e) {
      console.error("Failed to parse execution_complete data:", e);
      handlers.onError("Failed to compile final report payload.");
      eventSource.close();
    }
  });

  eventSource.addEventListener("error", (event: any) => {
    try {
      const data = JSON.parse(event.data);
      handlers.onError(data.error || "An error occurred during multi-agent analysis.");
    } catch (e) {
      handlers.onError("Server connection failure or execution error.");
    }
    eventSource.close();
  });

  eventSource.onerror = (err) => {
    console.error("SSE stream encountered connection issues:", err);
    handlers.onError("Failed to connect to the research server. Please ensure the backend is running on port 8000.");
    eventSource.close();
  };

  return eventSource;
}

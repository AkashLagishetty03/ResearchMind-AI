import React, { useState, useEffect } from "react";
import { Activity, RefreshCw, AlertCircle, CheckCircle2, ShieldAlert, Cpu, Terminal } from "lucide-react";
import { fetchLogs } from "../services/api";
import type { ExecutionLog } from "../services/api";

export const MonitorView: React.FC = () => {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadLogs = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setErrorMsg(null);
    try {
      const data = await fetchLogs();
      setLogs(data);
    } catch (e) {
      console.error("Failed to load logs:", e);
      setErrorMsg("Failed to fetch execution logs. Ensure backend is active.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString("en-US", { hour12: false }) + "." + String(d.getMilliseconds()).padStart(3, '0');
    } catch (e) {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-brand-bg text-brand-text-primary">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-10 h-10 text-brand-primary animate-spin" />
          <p className="text-sm text-brand-text-secondary font-semibold">Loading pipeline logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-brand-bg p-6 md:p-8 flex flex-col gap-6 font-sans">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-gray-200/40 pb-5">
        <div>
          <h2 className="text-xl font-black text-brand-text-primary flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-primary" />
            Agent Telemetry Monitor
          </h2>
          <p className="text-xs text-brand-text-secondary mt-1">
            Real-time pipeline diagnostics monitoring LLM call latency, token volume, error bounds, and tool executions.
          </p>
        </div>
        <button
          onClick={() => loadLogs(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-brand-secondary text-brand-text-secondary hover:text-brand-text-primary text-xs font-bold transition-all shadow-premium hover:shadow-premium-lg cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh logs"}
        </button>
      </div>

      {/* Error notification */}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 flex items-center gap-3 text-rose-600 text-sm font-bold shadow-premium">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white border border-gray-200/50 overflow-hidden rounded-2xl shadow-premium">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-brand-secondary/80 border-b border-gray-200/60 text-brand-text-primary uppercase tracking-wider font-bold">
              <tr>
                <th className="px-4 py-3.5">Time</th>
                <th className="px-4 py-3.5">Agent</th>
                <th className="px-4 py-3.5">Model Used</th>
                <th className="px-4 py-3.5">Latency</th>
                <th className="px-4 py-3.5">Tokens</th>
                <th className="px-4 py-3.5">Tool Invoked</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Ver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-semibold">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-brand-text-secondary/60 text-xs">
                    No execution logs available in database. Launch a research query to start monitoring.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const hasError = !!log.error_message;
                  const isFallback = log.fallback_triggered;
                  
                  let statusBadge = (
                    <span className="flex items-center gap-1 py-0.5 px-2.5 rounded-full text-[10px] font-bold text-brand-success bg-emerald-50 border border-brand-success/20">
                      <CheckCircle2 className="w-3 h-3" />
                      Success
                    </span>
                  );
                  if (hasError) {
                    statusBadge = (
                      <span className="flex items-center gap-1 py-0.5 px-2.5 rounded-full text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200/50" title={log.error_message || ""}>
                        <AlertCircle className="w-3 h-3" />
                        Failed
                      </span>
                    );
                  } else if (isFallback) {
                    statusBadge = (
                      <span className="flex items-center gap-1 py-0.5 px-2.5 rounded-full text-[10px] font-bold text-brand-warning bg-amber-50 border border-brand-warning/20">
                        <ShieldAlert className="w-3 h-3" />
                        Fallback
                      </span>
                    );
                  }

                  // Human readable agent name mapping
                  const agentName = log.agent_name.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

                  return (
                    <tr key={log.id} className="hover:bg-brand-secondary/40 transition-colors text-brand-text-primary">
                      {/* Timestamp */}
                      <td className="px-4 py-3.5 font-mono text-[11px] text-brand-text-secondary">
                        {formatDate(log.created_at)}
                      </td>
                      {/* Agent Display */}
                      <td className="px-4 py-3.5 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-brand-primary" />
                        <span className="font-bold text-brand-text-primary">{agentName}</span>
                      </td>
                      {/* Model Used */}
                      <td className="px-4 py-3.5 font-mono text-[11px] text-brand-text-secondary">
                        {log.model_used}
                      </td>
                      {/* Latency */}
                      <td className="px-4 py-3.5 text-brand-text-primary">
                        {(log.latency_ms / 1000).toFixed(2)}s
                      </td>
                      {/* Token total */}
                      <td className="px-4 py-3.5 font-mono text-brand-text-secondary">
                        {log.prompt_tokens + log.completion_tokens > 0 ? (
                          <span title={`Prompt: ${log.prompt_tokens} | Completion: ${log.completion_tokens}`}>
                            {log.prompt_tokens + log.completion_tokens}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      {/* Tool name */}
                      <td className="px-4 py-3.5">
                        {log.tool_invoked ? (
                          <span className="flex items-center gap-1 font-mono text-[10px] text-brand-primary bg-indigo-50/50 border border-brand-primary/20 px-2 py-0.5 rounded-lg" title={log.tool_input || ""}>
                            <Terminal className="w-3 h-3" />
                            {log.tool_invoked}
                          </span>
                        ) : (
                          <span className="text-brand-text-secondary/50">-</span>
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {statusBadge}
                      </td>
                      {/* Prompt template version */}
                      <td className="px-4 py-3.5 font-mono text-[10px] text-brand-text-secondary">
                        v{log.prompt_version}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { RefreshCw, AlertCircle, TrendingUp, Clock, FileJson, Gauge } from "lucide-react";
import { fetchModelMetrics } from "../services/api";
import type { ModelMetrics } from "../services/api";

export const MetricsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<ModelMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadMetrics = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setErrorMsg(null);
    try {
      const data = await fetchModelMetrics();
      setMetrics(data);
    } catch (e) {
      console.error("Failed to load metrics:", e);
      setErrorMsg("Failed to fetch model analytics. Make sure backend is active.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-brand-bg text-brand-text-primary">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-10 h-10 text-brand-primary animate-spin" />
          <p className="text-sm text-brand-text-secondary font-semibold">Aggregating model analytics...</p>
        </div>
      </div>
    );
  }

  // Calculate coordinates for SVG charts
  const maxLatency = Math.max(...metrics.map(m => m.avg_latency_ms), 1000);

  return (
    <div className="flex-1 overflow-y-auto bg-brand-bg p-6 md:p-8 flex flex-col gap-6 font-sans">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-gray-200/40 pb-5">
        <div>
          <h2 className="text-xl font-black text-brand-text-primary flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-primary" />
            Model Performance Analytics
          </h2>
          <p className="text-xs text-brand-text-secondary mt-1">
            Aggregated analytical comparison profiling execution latencies, success rates, and token densities across providers.
          </p>
        </div>
        <button
          onClick={() => loadMetrics(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-brand-secondary text-brand-text-secondary hover:text-brand-text-primary text-xs font-bold transition-all shadow-premium hover:shadow-premium-lg cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh data"}
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 flex items-center gap-3 text-rose-600 text-sm font-bold shadow-premium">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200/50 p-5 rounded-2xl flex items-center gap-4 shadow-premium hover:shadow-premium-lg transition-all">
          <div className="w-10 h-10 rounded-xl bg-indigo-50/50 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-brand-text-secondary uppercase tracking-wider font-bold font-mono">
              Avg Pipeline Latency
            </span>
            <h4 className="text-xl font-black text-brand-text-primary mt-0.5">
              {metrics.length > 0
                ? (metrics.reduce((acc, curr) => acc + curr.avg_latency_ms, 0) / metrics.length / 1000).toFixed(2)
                : 0}s
            </h4>
          </div>
        </div>

        <div className="bg-white border border-gray-200/50 p-5 rounded-2xl flex items-center gap-4 shadow-premium hover:shadow-premium-lg transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-50/50 border border-brand-success/20 flex items-center justify-center text-brand-success">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-brand-text-secondary uppercase tracking-wider font-bold font-mono">
              Target Success Rate
            </span>
            <h4 className="text-xl font-black text-brand-text-primary mt-0.5">
              {metrics.length > 0
                ? Math.round(metrics.reduce((acc, curr) => acc + curr.success_rate, 0) / metrics.length)
                : 100}%
            </h4>
          </div>
        </div>

        <div className="bg-white border border-gray-200/50 p-5 rounded-2xl flex items-center gap-4 shadow-premium hover:shadow-premium-lg transition-all">
          <div className="w-10 h-10 rounded-xl bg-amber-50/50 border border-brand-warning/20 flex items-center justify-center text-brand-warning">
            <FileJson className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-brand-text-secondary uppercase tracking-wider font-bold font-mono">
              Total Tokens Ingested
            </span>
            <h4 className="text-xl font-black text-brand-text-primary mt-0.5">
              {metrics.reduce((acc, curr) => acc + curr.total_tokens, 0).toLocaleString()}
            </h4>
          </div>
        </div>
      </div>

      {metrics.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 border border-gray-200/40 rounded-3xl bg-white shadow-premium text-brand-text-secondary">
          <TrendingUp className="w-12 h-12 mb-3 text-brand-text-secondary/30 animate-pulse" />
          <p className="font-bold">No telemetry metrics recorded yet.</p>
          <p className="text-xs text-brand-text-secondary mt-1 max-w-sm text-center">
            Once agents run queries and call OpenRouter APIs, their statistics (latency and token volumes) will populate here.
          </p>
        </div>
      ) : (
        /* SVG CHARTS PANEL */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Latency Profile */}
          <div className="bg-white border border-gray-200/50 p-6 rounded-2xl shadow-premium">
            <h3 className="text-xs font-bold text-brand-text-secondary uppercase tracking-wider mb-6">
              Average Inference Latency (ms)
            </h3>
            
            {/* Custom SVG Bar Chart */}
            <div className="relative flex flex-col gap-5">
              {metrics.map((m, idx) => {
                const percentage = (m.avg_latency_ms / maxLatency) * 100;
                return (
                  <div key={idx} className="flex flex-col gap-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-brand-text-primary font-mono text-[11px]">{m.model_name.split("/").pop()}</span>
                      <span className="text-brand-primary font-mono">{m.avg_latency_ms.toLocaleString()} ms</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 border border-gray-200/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-primary to-brand-accent rounded-full transition-all duration-1000"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 2: Success Rates & Total Calls */}
          <div className="bg-white border border-gray-200/50 p-6 rounded-2xl shadow-premium">
            <h3 className="text-xs font-bold text-brand-text-secondary uppercase tracking-wider mb-6">
              Model Success Rates & API Hits
            </h3>

            {/* Custom SVG Success Rate Chart */}
            <div className="relative flex flex-col gap-5">
              {metrics.map((m, idx) => {
                const color = m.success_rate >= 90 ? "from-brand-success to-teal-500" :
                              m.success_rate >= 75 ? "from-brand-warning to-orange-500" : "from-rose-500 to-red-500";
                return (
                  <div key={idx} className="flex flex-col gap-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-brand-text-primary font-mono text-[11px]">{m.model_name.split("/").pop()}</span>
                      <span className="text-brand-text-secondary font-mono">
                        {m.success_rate}% success <span className="text-brand-text-secondary/50">({m.total_calls} calls)</span>
                      </span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 border border-gray-200/20 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-1000`}
                        style={{ width: `${m.success_rate}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { Sliders, Save, RefreshCw, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import { fetchSettings, updateSettings } from "../services/api";
import type { AgentConfig } from "../services/api";

const PRESET_MODELS = [
  "google/gemini-2.5-flash",
  "deepseek/deepseek-chat",
  "qwen/qwen-2.5-72b-instruct",
  "meta-llama/llama-3.3-70b-instruct",
  "mistralai/mistral-small"
];

export const SettingsView: React.FC = () => {
  const [configs, setConfigs] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadAllSettings = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchSettings();
      // Sort configurations to make them appear in graph execution order
      const order = ["research_agent", "critic_agent", "trend_agent", "judge_agent", "fact_verifier_agent", "report_agent"];
      const sorted = [...data].sort((a, b) => order.indexOf(a.agent_key) - order.indexOf(b.agent_key));
      setConfigs(sorted);
    } catch (e) {
      console.error("Failed to load settings:", e);
      setErrorMsg("Failed to load configurations from database. Make sure backend is active.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllSettings();
  }, []);

  const handleChange = (agentKey: string, field: keyof AgentConfig, value: any) => {
    setConfigs(prev =>
      prev.map(c => (c.agent_key === agentKey ? { ...c, [field]: value } : c))
    );
  };

  const handleSave = async (cfg: AgentConfig) => {
    setSavingKey(cfg.agent_key);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await updateSettings(cfg);
      setSuccessMsg(`Successfully saved configurations for ${cfg.agent_name}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      console.error("Failed to update config:", e);
      setErrorMsg(`Failed to save settings for ${cfg.agent_name}.`);
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-brand-bg text-brand-text-primary">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-10 h-10 text-brand-primary animate-spin" />
          <p className="text-sm text-brand-text-secondary font-semibold">Loading agent settings...</p>
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
            <Sliders className="w-5 h-5 text-brand-primary" />
            Agent Control Panel
          </h2>
          <p className="text-xs text-brand-text-secondary mt-1">
            Customize AI models, generation temperature constraints, execution limits, and recovery paths.
          </p>
        </div>
        <button
          onClick={loadAllSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-brand-secondary text-brand-text-secondary hover:text-brand-text-primary text-xs font-bold transition-all shadow-premium hover:shadow-premium-lg cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sync settings
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl border border-brand-success/20 bg-emerald-50/50 flex items-center gap-3 text-brand-success text-sm font-bold animate-fadeIn shadow-premium">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 flex items-center gap-3 text-rose-600 text-sm font-bold shadow-premium">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Settings Grid Card Lists */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {configs.map((cfg) => (
          <div
            key={cfg.agent_key}
            className="bg-white border border-gray-200/50 p-6 rounded-2xl flex flex-col justify-between gap-6 shadow-premium hover:shadow-premium-lg hover:border-gray-300 transition-all"
          >
            {/* Title Block */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-brand-text-primary">{cfg.agent_name}</h3>
                <span className="text-[10px] text-brand-text-secondary font-mono tracking-wider uppercase">
                  KEY: {cfg.agent_key}
                </span>
              </div>
              <span className="text-xs font-bold text-brand-primary bg-indigo-50 px-2.5 py-1 rounded-full border border-brand-primary/10 font-mono shadow-sm">
                {cfg.model_name.split("/").pop()}
              </span>
            </div>

            {/* Config Fields */}
            <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
              {/* Primary model */}
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className="text-brand-text-secondary">Primary Inference Model</label>
                <select
                  value={cfg.model_name}
                  onChange={(e) => handleChange(cfg.agent_key, "model_name", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-250 bg-brand-secondary/35 text-brand-text-primary focus:outline-none focus:border-brand-primary/45 focus:bg-white font-semibold transition-all"
                >
                  {PRESET_MODELS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                  {!PRESET_MODELS.includes(cfg.model_name) && (
                    <option value={cfg.model_name}>{cfg.model_name} (Custom)</option>
                  )}
                </select>
              </div>

              {/* Fallback model */}
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className="text-brand-text-secondary flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-brand-warning" />
                  Fallback Recovery Model
                </label>
                <select
                  value={cfg.fallback_model}
                  onChange={(e) => handleChange(cfg.agent_key, "fallback_model", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-250 bg-brand-secondary/35 text-brand-text-primary focus:outline-none focus:border-brand-primary/45 focus:bg-white font-semibold transition-all"
                >
                  {PRESET_MODELS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                  {!PRESET_MODELS.includes(cfg.fallback_model) && (
                    <option value={cfg.fallback_model}>{cfg.fallback_model} (Custom)</option>
                  )}
                </select>
              </div>

              {/* Temperature slider */}
              <div className="col-span-2 md:col-span-1 flex flex-col gap-1.5">
                <div className="flex justify-between text-brand-text-secondary font-bold">
                  <span>Temperature</span>
                  <span className="font-mono text-brand-primary">{cfg.temperature.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={cfg.temperature}
                  onChange={(e) => handleChange(cfg.agent_key, "temperature", parseFloat(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                />
              </div>

              {/* Max tokens input */}
              <div className="col-span-1 flex flex-col gap-1.5">
                <label className="text-brand-text-secondary">Max Generation Tokens</label>
                <input
                  type="number"
                  min="100"
                  max="10000"
                  step="100"
                  value={cfg.max_tokens}
                  onChange={(e) => handleChange(cfg.agent_key, "max_tokens", parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-250 bg-brand-secondary/35 text-brand-text-primary focus:outline-none focus:border-brand-primary/45 focus:bg-white font-mono font-semibold transition-all"
                />
              </div>

              {/* Timeout limit */}
              <div className="col-span-1 flex flex-col gap-1.5">
                <label className="text-brand-text-secondary">Timeout Ceiling (seconds)</label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={cfg.timeout}
                  onChange={(e) => handleChange(cfg.agent_key, "timeout", parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-250 bg-brand-secondary/35 text-brand-text-primary focus:outline-none focus:border-brand-primary/45 focus:bg-white font-mono font-semibold transition-all"
                />
              </div>
            </div>

            {/* Save trigger button */}
            <div className="flex justify-end pt-3 border-t border-gray-150">
              <button
                onClick={() => handleSave(cfg)}
                disabled={savingKey === cfg.agent_key}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-primary hover:bg-brand-primary/95 disabled:bg-indigo-300 text-white rounded-xl text-xs font-bold transition-all shadow-premium hover:shadow-premium-lg cursor-pointer active:scale-95"
              >
                {savingKey === cfg.agent_key ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Save agent settings
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

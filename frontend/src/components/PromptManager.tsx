import React, { useState, useEffect } from "react";
import { Save, RefreshCw, AlertCircle, CheckCircle2, FileCode, Calendar } from "lucide-react";
import { fetchPrompts, updatePrompt } from "../services/api";
import type { PromptTemplate } from "../services/api";

export const PromptManager: React.FC = () => {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("research_agent");
  const [promptText, setPromptText] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadAllPrompts = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchPrompts();
      setPrompts(data);
      // Select the current prompt for the selected agent
      const active = data.find(p => p.agent_key === selectedAgent);
      if (active) {
        setPromptText(active.prompt_text);
        setDescription("");
      }
    } catch (e) {
      console.error("Failed to fetch prompts:", e);
      setErrorMsg("Failed to load prompt templates from database. Make sure backend is active.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllPrompts();
  }, []);

  // Update editor inputs when active agent tab changes
  useEffect(() => {
    const active = prompts.find(p => p.agent_key === selectedAgent);
    if (active) {
      setPromptText(active.prompt_text);
      setDescription("");
    }
  }, [selectedAgent, prompts]);

  const handleSavePrompt = async () => {
    if (!promptText.trim()) return;

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const payload: Partial<PromptTemplate> = {
        agent_key: selectedAgent,
        prompt_text: promptText,
        description: description.trim() || `Bumped version of ${selectedAgent} instructions.`
      };
      await updatePrompt(payload);
      setSuccessMsg("Prompt template updated successfully. Bumped version details.");
      
      // Reload templates to see updated versions
      await loadAllPrompts();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      console.error("Failed to save prompt template:", e);
      setErrorMsg("Failed to save prompt template to database.");
    } finally {
      setSaving(false);
    }
  };

  const getActivePrompt = (): PromptTemplate | undefined => {
    return prompts.find(p => p.agent_key === selectedAgent);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-brand-bg text-brand-text-primary">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-10 h-10 text-brand-primary animate-spin" />
          <p className="text-sm text-brand-text-secondary font-semibold">Loading prompt templates...</p>
        </div>
      </div>
    );
  }

  const activePrompt = getActivePrompt();

  return (
    <div className="flex-1 overflow-y-auto bg-brand-bg p-6 md:p-8 flex flex-col gap-6 font-sans">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-gray-200/40 pb-5">
        <div>
          <h2 className="text-xl font-black text-brand-text-primary flex items-center gap-2">
            <FileCode className="w-5 h-5 text-brand-primary" />
            System Prompt Registry
          </h2>
          <p className="text-xs text-brand-text-secondary mt-1">
            Modify structural system prompt instructions, edit ReAct directives, and view prompt version control histories.
          </p>
        </div>
        <button
          onClick={loadAllPrompts}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-brand-secondary text-brand-text-secondary hover:text-brand-text-primary text-xs font-bold transition-all shadow-premium hover:shadow-premium-lg cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sync prompts
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

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left tabs: Select Agent */}
        <div className="lg:col-span-1 flex flex-col gap-2.5">
          <span className="text-[10px] font-bold text-brand-text-secondary/70 uppercase tracking-wider px-2 mb-1 block">
            Select Analyst Prompt
          </span>
          {prompts.map((p) => {
            const isSelected = selectedAgent === p.agent_key;
            return (
              <button
                key={p.agent_key}
                onClick={() => setSelectedAgent(p.agent_key)}
                className={`w-full text-left p-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex justify-between items-center ${
                  isSelected
                    ? "bg-white border-brand-primary/20 text-brand-primary shadow-premium"
                    : "bg-white/40 border-gray-200/40 hover:bg-white hover:border-gray-200 hover:shadow-premium text-brand-text-secondary hover:text-brand-text-primary"
                }`}
              >
                <span>{p.agent_key.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}</span>
                <span className="font-mono text-[10px] bg-brand-secondary px-2 py-0.5 rounded border border-gray-200 text-brand-text-secondary">
                  v{p.version}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Editor Area */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          {activePrompt && (
            <div className="bg-white border border-gray-200/50 p-5 rounded-2xl flex flex-col gap-4.5 shadow-premium">
              {/* Prompt Metadata Header */}
              <div className="flex flex-wrap gap-4 items-center justify-between border-b border-gray-200 pb-4 text-xs font-semibold">
                <div>
                  <h3 className="text-base font-extrabold text-brand-text-primary">
                    {activePrompt.agent_key.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                  </h3>
                  <span className="text-[10px] text-brand-text-secondary font-mono block mt-0.5">
                    UUID: prompt_{activePrompt.id}
                  </span>
                </div>
                
                <div className="flex gap-4 items-center text-brand-text-secondary">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-brand-primary" />
                    Modified: <span className="font-mono text-brand-text-primary">{formatDate(activePrompt.updated_at)}</span>
                  </span>
                  <span className="flex items-center gap-1 bg-brand-secondary px-2.5 py-1 rounded border border-gray-200 font-mono text-[10px] text-brand-primary font-bold shadow-inner">
                    ACTIVE_VER: v{activePrompt.version}
                  </span>
                </div>
              </div>

              {/* Text editor box */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-brand-text-primary font-bold">System Instructions Prompt</label>
                <div className="w-full relative border border-gray-250 rounded-xl overflow-hidden focus-within:border-brand-primary/45 bg-white shadow-inner">
                  {/* Top code editor toolbar */}
                  <div className="bg-brand-secondary border-b border-gray-200 px-4 py-2 flex items-center justify-between text-[10px] font-mono text-brand-text-secondary font-bold">
                    <span>SYSTEM_PROMPT_INSTRUCTION</span>
                    <span>UTF-8</span>
                  </div>
                  <textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    rows={12}
                    className="w-full px-4 py-3 bg-brand-secondary/35 text-brand-text-primary text-xs leading-relaxed font-mono focus:outline-none focus:bg-white resize-y transition-all"
                    placeholder="Enter prompt instructions..."
                  />
                </div>
              </div>

              {/* Description metadata */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-brand-text-primary font-bold">Version Change Notes</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Added ArXiv search directive to the Research Agent's toolbox."
                  className="w-full px-4 py-2 rounded-xl border border-gray-250 bg-brand-secondary/35 text-brand-text-primary text-xs focus:outline-none focus:border-brand-primary/45 focus:bg-white font-semibold transition-all"
                />
                <span className="text-[10px] text-brand-text-secondary font-medium">
                  Bumps the minor version number (e.g. 1.0.0 → 1.1.0) and persists a history log record.
                </span>
              </div>

              {/* Save trigger button */}
              <div className="flex justify-end pt-3 border-t border-gray-150 mt-2">
                <button
                  onClick={handleSavePrompt}
                  disabled={saving || !promptText.trim()}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-primary hover:bg-brand-primary/95 disabled:bg-indigo-300 text-white rounded-xl text-xs font-bold transition-all shadow-premium hover:shadow-premium-lg cursor-pointer active:scale-95"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving changes...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      Save & bump version
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

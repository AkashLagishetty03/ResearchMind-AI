import React from "react";
import { motion } from "framer-motion";
import { 
  Search, 
  ShieldAlert, 
  TrendingUp, 
  Scale, 
  CornerDownRight, 
  Info,
  CheckCircle,
  HelpCircle
} from "lucide-react";
import type { DebateMessage, FindingsItem, CritiqueItem, ForecastItem, ResolvedFindingItem } from "../services/api";

interface DebateViewProps {
  debate: DebateMessage[];
}

export const DebateView: React.FC<DebateViewProps> = ({ debate }) => {
  if (!debate || debate.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-brand-text-secondary border border-dashed border-gray-200/70 rounded-2xl bg-white shadow-premium">
        <HelpCircle className="w-10 h-10 mb-3 text-brand-text-secondary/40 animate-pulse" />
        <p className="text-sm font-semibold">Waiting for agents to begin debate...</p>
      </div>
    );
  }

  // Helper to determine styles for each agent
  const getAgentConfig = (role: string) => {
    switch (role) {
      case "researcher":
        return {
          title: "Research Agent",
          avatarBg: "bg-brand-primary",
          border: "border-brand-primary/10",
          textBg: "bg-indigo-50/20",
          accentText: "text-brand-primary",
          Icon: Search,
        };
      case "critic":
        return {
          title: "Critic Agent",
          avatarBg: "bg-rose-500",
          border: "border-rose-200/40",
          textBg: "bg-rose-50/20",
          accentText: "text-rose-600",
          Icon: ShieldAlert,
        };
      case "researcher_reply":
        return {
          title: "Research Agent (Reply)",
          avatarBg: "bg-brand-accent",
          border: "border-purple-200/40",
          textBg: "bg-purple-50/20",
          accentText: "text-brand-accent",
          Icon: CornerDownRight,
        };
      case "analyst":
        return {
          title: "Trend Analyst Agent",
          avatarBg: "bg-cyan-500",
          border: "border-cyan-200/40",
          textBg: "bg-cyan-50/20",
          accentText: "text-cyan-600",
          Icon: TrendingUp,
        };
      case "judge":
        return {
          title: "Judge Agent",
          avatarBg: "bg-brand-warning",
          border: "border-brand-warning/15",
          textBg: "bg-amber-50/20",
          accentText: "text-brand-warning",
          Icon: Scale,
        };
      default:
        return {
          title: "AI Agent",
          avatarBg: "bg-slate-400",
          border: "border-gray-200",
          textBg: "bg-gray-50/20",
          accentText: "text-brand-text-secondary",
          Icon: Info,
        };
    }
  };

  return (
    <div className="flex flex-col gap-8 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
      {debate.map((message, idx) => {
        const config = getAgentConfig(message.role);
        const AgentIcon = config.Icon;

        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.08 }}
            className="flex gap-4 relative z-10"
          >
            {/* Timeline Avatar Icon */}
            <div className={`flex-shrink-0 w-12 h-12 rounded-full ${config.avatarBg} flex items-center justify-center shadow-md border-2 border-white`}>
              <AgentIcon className="w-5 h-5 text-white" />
            </div>

            {/* Content card */}
            <div className={`flex-1 p-5 rounded-2xl border ${config.border} ${config.textBg} bg-white shadow-premium hover:shadow-premium-lg transition-all duration-300`}>
              <div className="flex items-center gap-2 mb-2.5">
                <span className={`text-sm font-extrabold ${config.accentText}`}>
                  {message.agent_name}
                </span>
                <span className="text-[10px] text-brand-text-secondary bg-brand-secondary border border-gray-200/50 px-2 py-0.5 rounded font-mono font-bold">
                  STEP {idx + 1}
                </span>
              </div>

              {/* Stance message */}
              <p className="text-brand-text-primary text-sm leading-relaxed mb-4 italic font-medium">
                "{message.message}"
              </p>

              {/* Render Evidence cards for Research Agent */}
              {message.metadata?.findings && message.metadata.findings.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="text-xs font-bold text-brand-primary uppercase tracking-wider mb-2.5">
                    Evidence Engine: Gained Findings
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {message.metadata.findings.map((f: FindingsItem, fIdx: number) => (
                      <div
                        key={fIdx}
                        className="p-4 rounded-xl border border-gray-200/40 bg-brand-secondary/30 flex flex-col justify-between gap-3 shadow-inner hover:border-brand-primary/20 transition-all duration-300"
                      >
                        <p className="text-brand-text-primary text-sm font-semibold">{f.finding}</p>
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200">
                          <span className="flex items-center gap-1.5">
                            <span className="text-brand-text-secondary font-medium">Strength:</span>
                            <span className={`font-bold ${
                              f.evidence_strength === "High" ? "text-brand-success" :
                              f.evidence_strength === "Medium" ? "text-brand-warning" : "text-rose-500"
                            }`}>
                              {f.evidence_strength}
                            </span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="text-brand-text-secondary font-medium">Conf:</span>
                            <span className="text-brand-primary font-mono font-bold">{f.confidence_level}%</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Render Critiques */}
              {message.metadata?.critiques && message.metadata.critiques.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2.5">
                    Critique Board: Vulnerability & Bias Analysis
                  </div>
                  <div className="flex flex-col gap-3">
                    {message.metadata.critiques.map((c: CritiqueItem, cIdx: number) => (
                      <div
                        key={cIdx}
                        className="p-4 rounded-xl border border-gray-200/40 bg-brand-secondary/30 shadow-inner"
                      >
                        <div className="text-xs text-rose-600 font-bold mb-1 flex items-start gap-1">
                          <span className="text-brand-text-secondary font-medium">Target finding:</span>
                          <span className="italic font-medium">"{c.target_finding}"</span>
                        </div>
                        <p className="text-brand-text-primary text-sm mb-3 font-semibold">
                          {c.critique}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-gray-200 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-brand-text-secondary font-medium">Detected Bias:</span>
                            <span className="text-rose-600 font-bold">{c.bias_detected}</span>
                          </div>
                          <div className="flex items-center gap-1 md:justify-end">
                            <span className="text-brand-text-secondary font-medium">Uncertainty Factor:</span>
                            <span className={`font-bold ${
                              c.uncertainty_factor === "High" ? "text-rose-600" :
                              c.uncertainty_factor === "Medium" ? "text-brand-warning" : "text-brand-success"
                            }`}>
                              {c.uncertainty_factor}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Render Forecasts */}
              {message.metadata?.forecasts && message.metadata.forecasts.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="text-xs font-bold text-cyan-600 uppercase tracking-wider mb-2.5">
                    Forecast Trends
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {message.metadata.forecasts.map((t: ForecastItem, tIdx: number) => (
                      <div
                        key={tIdx}
                        className="p-4 rounded-xl border border-gray-200/40 bg-brand-secondary/30 flex flex-col justify-between shadow-inner"
                      >
                        <div>
                          <span className="text-[10px] text-cyan-700 font-mono border border-cyan-200 px-1.5 py-0.5 rounded-full uppercase bg-cyan-50 font-bold mb-2 inline-block">
                            {t.timeframe}
                          </span>
                          <h4 className="text-brand-text-primary text-sm font-bold mb-1">{t.trend}</h4>
                          <p className="text-brand-text-secondary text-xs leading-relaxed mb-3">
                            {t.risk_opportunity}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs pt-2 border-t border-gray-200">
                          <span className="text-brand-text-secondary font-medium">Expected Impact:</span>
                          <span className={`font-bold ${
                            t.impact === "High" ? "text-cyan-600" :
                            t.impact === "Medium" ? "text-brand-warning" : "text-brand-text-secondary"
                          }`}>
                            {t.impact}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Render Resolved Findings */}
              {message.metadata?.resolved_findings && message.metadata.resolved_findings.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="text-xs font-bold text-brand-warning uppercase tracking-wider mb-2.5">
                    Arbitration Verdicts
                  </div>
                  <div className="flex flex-col gap-3">
                    {message.metadata.resolved_findings.map((rf: ResolvedFindingItem, rfIdx: number) => (
                      <div
                        key={rfIdx}
                        className="p-4 rounded-xl border border-gray-200/40 bg-brand-secondary/30 shadow-inner flex flex-col gap-2"
                      >
                        <div className="text-xs text-brand-warning font-bold flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-brand-warning" />
                          <span>RESOLVED CLAIM</span>
                        </div>
                        <p className="text-brand-text-primary text-sm font-bold">"{rf.finding}"</p>
                        <div className="p-3 bg-white rounded-lg border border-gray-200/60 text-brand-text-primary text-xs leading-relaxed shadow-sm">
                          <span className="font-bold text-brand-warning">Resolution:</span> {rf.resolution}
                        </div>
                        <div className="flex justify-between text-[11px] text-brand-text-secondary pt-1 font-semibold">
                          <span>Evidence Strength: <b className="text-brand-text-primary font-bold">{rf.final_strength}</b></span>
                          <span>Verdict confidence: <b className="text-brand-warning font-mono">{rf.final_confidence}%</b></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

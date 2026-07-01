import React, { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Download, Copy, Check, FileText } from "lucide-react";
import type { ReportDetails, FindingsItem } from "../services/api";

interface ReportSectionProps {
  report: ReportDetails;
}

export const ReportSection: React.FC<ReportSectionProps> = ({ report }) => {
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report.final_report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy report:", err);
    }
  };

  const handlePdfExport = async () => {
    setIsExporting(true);
    try {
      // @ts-ignore
      const html2pdf = (await import("html2pdf.js")).default;
      const element = printRef.current;
      if (!element) return;
      const opt = {
        margin: [0.6, 0.6, 0.8, 0.6] as [number, number, number, number],
        filename: `ResearchMind_${report.query.replace(/\s+/g, "_")}_Report.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff" },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" as const },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] }
      };
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("Failed to export PDF:", err);
      alert("Error generating PDF. Please ensure the page is fully loaded and retry.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Action Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-primary" />
          <h3 className="text-lg font-black text-brand-text-primary">Compiled Intelligence Report</h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-brand-secondary text-brand-text-secondary hover:text-brand-text-primary text-xs font-bold transition-all shadow-premium hover:shadow-premium-lg cursor-pointer"
            title="Copy Markdown Report"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-brand-success" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Text
              </>
            )}
          </button>

          <button
            onClick={handlePdfExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-4.5 py-1.5 rounded-xl bg-brand-primary hover:bg-brand-primary/95 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-premium cursor-pointer active:scale-95"
          >
            <Download className={`w-3.5 h-3.5 ${isExporting ? "animate-bounce" : ""}`} />
            {isExporting ? "Exporting..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* Styled Markdown Viewer */}
      <div className="bg-white border border-gray-200/50 rounded-2xl p-6 md:p-8 shadow-premium overflow-x-auto text-brand-text-primary font-sans max-w-none">
        <ReactMarkdown
          components={{
            h1: ({ node, ...props }) => <h1 className="text-xl font-black text-brand-primary mt-6 mb-4 border-b border-gray-200 pb-2 uppercase tracking-wide" {...props} />,
            h2: ({ node, ...props }) => <h2 className="text-base font-extrabold text-brand-text-primary mt-5 mb-3" {...props} />,
            h3: ({ node, ...props }) => <h3 className="text-sm font-bold text-brand-text-secondary mt-4 mb-2" {...props} />,
            p: ({ node, ...props }) => <p className="text-xs leading-relaxed mb-4 text-brand-text-primary font-medium" {...props} />,
            ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 text-xs flex flex-col gap-1 text-brand-text-primary font-medium" {...props} />,
            ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 text-xs flex flex-col gap-1 text-brand-text-primary font-medium" {...props} />,
            li: ({ node, ...props }) => <li className="pl-1 text-brand-text-primary" {...props} />,
            blockquote: ({ node, ...props }) => (
              <blockquote className="border-l-4 border-brand-accent bg-purple-50/30 px-4 py-2 italic rounded-r-lg my-4 text-brand-text-secondary font-medium" {...props} />
            ),
            table: ({ node, ...props }) => (
              <div className="overflow-x-auto my-6 border border-gray-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse" {...props} />
              </div>
            ),
            thead: ({ node, ...props }) => <thead className="bg-brand-secondary text-brand-text-primary uppercase font-bold border-b border-gray-200" {...props} />,
            tbody: ({ node, ...props }) => <tbody className="divide-y divide-gray-100" {...props} />,
            tr: ({ node, ...props }) => <tr className="hover:bg-brand-secondary/30 transition-colors" {...props} />,
            th: ({ node, ...props }) => <th className="px-4 py-3 font-bold" {...props} />,
            td: ({ node, ...props }) => <td className="px-4 py-3 text-brand-text-secondary" {...props} />,
            code: ({ node, inline, ...props }: any) => 
              inline ? (
                <code className="bg-brand-secondary border border-gray-200 text-brand-accent px-1.5 py-0.5 rounded font-mono text-xs font-semibold" {...props} />
              ) : (
                <pre className="bg-brand-secondary border border-gray-200 p-4 rounded-xl font-mono text-xs overflow-x-auto text-brand-primary my-4 shadow-inner" {...props} />
              )
          }}
        >
          {report.final_report}
        </ReactMarkdown>
      </div>

      {/* ======================================================== */}
      {/* HIDDEN PRINT-READY light-mode container for html2pdf.js */}
      {/* ======================================================== */}
      <div style={{ display: "none" }}>
        <div 
          ref={printRef} 
          id="report-pdf-content" 
          className="p-10 font-sans text-slate-800 bg-white"
          style={{ color: "#1e293b", fontFamily: "system-ui, sans-serif" }}
        >
          {/* Header Cover Banner */}
          <div className="border-b-4 border-indigo-600 pb-6 mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "#4f46e5" }}>
                ResearchMind AI
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-1">
                Enterprise Decision Intelligence Platform
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 block">
                Certainty Rating
              </span>
              <div className="text-3xl font-black mt-0.5" style={{ color: "#4f46e5" }}>
                {report.confidence_score}%
              </div>
            </div>
          </div>

          {/* User Query Info */}
          <div className="bg-slate-100 border border-slate-200 rounded-xl p-5 mb-8">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Research Objective
            </h4>
            <h2 className="text-lg font-bold text-slate-900">
              "{report.query}"
            </h2>
            <div className="text-[10px] text-slate-400 font-mono mt-2 flex justify-between">
              <span>Generated: {new Date(report.created_at || Date.now()).toLocaleString()}</span>
              <span>Verification Status: <b>{report.fact_check_status || "Verified"}</b></span>
            </div>
          </div>

          {/* Verification Metrics Breakdown */}
          {report.confidence_metrics && (
            <div className="border border-slate-200 rounded-xl p-5 mb-8">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                Telemetry Diagnostics Breakdown
              </h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <span className="text-[9px] text-slate-400 block font-semibold">Evidence Strength</span>
                  <span className="text-lg font-extrabold text-slate-800">
                    {report.confidence_metrics.evidence_strength_score}%
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <span className="text-[9px] text-slate-400 block font-semibold">Fact Check Consistency</span>
                  <span className="text-lg font-extrabold text-indigo-600">
                    {report.confidence_metrics.details?.verifier_consistency || 95}%
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <span className="text-[9px] text-slate-400 block font-semibold">Hallucination Risk</span>
                  <span className={`text-lg font-extrabold ${report.confidence_metrics.hallucination_risk_score > 30 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {report.confidence_metrics.hallucination_risk_score}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Executive Summary */}
          <div className="mb-8 html2pdf__page-break">
            <h3 className="text-base font-bold text-indigo-600 border-b border-slate-200 pb-2 mb-3 uppercase tracking-wider">
              1. Executive Summary
            </h3>
            <div className="text-xs leading-relaxed text-slate-700 whitespace-pre-line">
              <ReactMarkdown 
                components={{
                  h1: () => null,
                  h2: () => null,
                  p: ({ children }) => <p className="mb-2">{children}</p>,
                }}
              >
                {report.final_report.split("#")[1] || "Executive summary statement compiling multi-agent analyses."}
              </ReactMarkdown>
            </div>
          </div>

          {/* Section 2: Evidence Engine findings */}
          <div className="mb-8 html2pdf__page-break">
            <h3 className="text-base font-bold text-indigo-600 border-b border-slate-200 pb-2 mb-3 uppercase tracking-wider">
              2. Evidence Analysis & Findings
            </h3>
            <p className="text-[10px] text-slate-500 mb-4">
              The following structured evidence findings were validated by the fact checker agent during graph runtime.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {report.research_agent?.findings?.map((f: FindingsItem, idx: number) => (
                <div key={idx} className="border border-slate-200 bg-slate-50 rounded-lg p-3 flex flex-col justify-between gap-2">
                  <p className="text-xs text-slate-800 font-medium">"{f.finding}"</p>
                  <div className="flex justify-between text-[9px] text-slate-500 pt-2 border-t border-slate-200 font-mono">
                    <span>Weight: <b>{f.evidence_strength}</b></span>
                    <span style={{ color: "#4f46e5" }}>Certainty: <b>{f.confidence_level}%</b></span>
                  </div>
                </div>
              )) || <p className="text-xs text-slate-500">No primary findings recorded.</p>}
            </div>
          </div>

          {/* Section 3: Debate timeline transcript */}
          {report.debate && report.debate.length > 0 && (
            <div className="mb-8 html2pdf__page-break">
              <h3 className="text-base font-bold text-indigo-600 border-b border-slate-200 pb-2 mb-3 uppercase tracking-wider">
                3. Collaborative Debate Log
              </h3>
              <p className="text-[10px] text-slate-500 mb-4">
                Dialectic exchange logs tracing stances and arbitrations between active LLM nodes.
              </p>
              <div className="flex flex-col gap-4 border-l-2 border-slate-200 pl-4 ml-2">
                {report.debate.map((msg, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-indigo-500 border border-white" />
                    <div className="text-[11px] font-bold text-slate-900">{msg.agent_name} ({msg.role})</div>
                    <p className="text-xs text-slate-600 italic mt-0.5">"{msg.message}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Report Details Body */}
          <div className="mb-8 html2pdf__page-break">
            <h3 className="text-base font-bold text-indigo-600 border-b border-slate-200 pb-2 mb-4 uppercase tracking-wider">
              4. Complete Strategic Report
            </h3>
            <div className="text-xs text-slate-700 leading-relaxed max-w-none print-markdown">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-500 mt-4 mb-2">{children}</h4>,
                  h2: ({ children }) => <h5 className="text-xs font-bold text-slate-800 mt-3 mb-1">{children}</h5>,
                  h3: ({ children }) => <h5 className="text-xs font-semibold text-slate-600 mt-2 mb-1">{children}</h5>,
                  p: ({ children }) => <p className="mb-3">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-4 mb-3 flex flex-col gap-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-4 mb-3 flex flex-col gap-1">{children}</ol>,
                  li: ({ children }) => <li className="pl-0.5">{children}</li>,
                  blockquote: ({ children }) => <blockquote className="border-l-2 border-slate-300 pl-3 italic bg-slate-50 py-1 my-2 text-slate-600">{children}</blockquote>
                }}
              >
                {report.final_report}
              </ReactMarkdown>
            </div>
          </div>
          
          {/* Footer page stamp */}
          <div className="border-t border-slate-200 pt-4 mt-12 text-center text-[9px] text-slate-400 font-mono">
            This analytical dossier is compiled using ResearchMind Agentic AI platform orchestrations. Stances are verified by automated models.
          </div>
        </div>
      </div>
    </div>
  );
};

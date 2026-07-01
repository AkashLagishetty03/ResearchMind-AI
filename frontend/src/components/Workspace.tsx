import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  Sparkles, 
  AlertCircle, 
  BookOpen, 
  MessageSquare, 
  ShieldCheck, 
  ArrowRight,
  Terminal,
  Play,
  Pause,
  RotateCcw,
  SkipForward
} from "lucide-react";
import { DebateView } from "./DebateView";
import { ConfidenceChart } from "./ConfidenceChart";
import { ReportSection } from "./ReportSection";
import { streamResearch } from "../services/api";
import type { ReportDetails, DebateMessage, FindingsItem } from "../services/api";

interface WorkspaceProps {
  demoMode: boolean;
  selectedReport: ReportDetails | null;
  playbackReport: ReportDetails | null;
  onSessionComplete: () => void;
}

const DEMO_SUGGESTIONS = [
  "Future of Agentic AI",
  "Will AI Replace Developers?",
  "AI in Healthcare",
  "Autonomous Vehicles",
  "Climate Change",
  "Cybersecurity"
];

export const Workspace: React.FC<WorkspaceProps> = ({ 
  demoMode, 
  selectedReport,
  playbackReport,
  onSessionComplete
}) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentNode, setCurrentNode] = useState<string | null>(null);
  const [completedNodes, setCompletedNodes] = useState<string[]>([]);
  const [debate, setDebate] = useState<DebateMessage[]>([]);
  const [report, setReport] = useState<ReportDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toolLogs, setToolLogs] = useState<string[]>([]);
  
  // Tabs: "report" | "debate" | "evidence"
  const [activeTab, setActiveTab] = useState<"report" | "debate" | "evidence">("debate");
  
  // Playback States
  const [playbackActive, setPlaybackActive] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [playbackPlaying, setPlaybackPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.5); // seconds per node
  const timerRef = useRef<any>(null);

  // Clean state when active report changes (from history click)
  useEffect(() => {
    if (selectedReport) {
      setReport(selectedReport);
      const sortedDebate = (selectedReport.debate || []).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setDebate(sortedDebate);
      setCompletedNodes(["research", "critic", "research_reply", "trend", "judge", "fact_verification", "report"]);
      setCurrentNode(null);
      setIsLoading(false);
      setError(null);
      setToolLogs([]);
      setPlaybackActive(false);
      setActiveTab("report");
    }
  }, [selectedReport]);

  // Set up Playback mode
  useEffect(() => {
    if (playbackReport) {
      setPlaybackActive(true);
      setReport(null);
      setDebate([]);
      setCompletedNodes([]);
      setCurrentNode(null);
      setPlaybackIndex(0);
      setPlaybackPlaying(false);
      setToolLogs(["[System] Playback loaded. Press Play to step through the agent execution."]);
      setActiveTab("debate");
      setQuery(playbackReport.query);
    }
  }, [playbackReport]);

  // Playback execution loop
  useEffect(() => {
    if (playbackPlaying && playbackReport) {
      const stepInterval = playbackSpeed * 1000;
      
      timerRef.current = setInterval(() => {
        setPlaybackIndex(prev => {
          const next = prev + 1;
          const totalSteps = 7; // research, critic/trend, research_reply, judge, fact_verification, report, done
          
          if (next > totalSteps) {
            setPlaybackPlaying(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return prev;
          }
          return next;
        });
      }, stepInterval);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playbackPlaying, playbackReport, playbackSpeed]);

  // Sync playback index to node highlights and logs
  useEffect(() => {
    if (!playbackActive || !playbackReport) return;
    
    const steps = [
      { id: "idle", node: null, completed: [], log: "[System] Ready." },
      { id: "research", node: "research", completed: [], log: "[Research Agent] Gathers findings and evidence." },
      { id: "critic_trend", node: "critic", completed: ["research"], log: "[Critic & Trend Agents] Scrutinizing findings & projecting trend forecasts in parallel." },
      { id: "research_reply", node: "research_reply", completed: ["research", "critic", "trend"], log: "[Research Agent (Reply)] Formulates defense answering critic concerns." },
      { id: "judge", node: "judge", completed: ["research", "critic", "trend", "research_reply"], log: "[Judge Agent] Arbitrates disagreements and resolves consensus." },
      { id: "fact_verification", node: "fact_verification", completed: ["research", "critic", "trend", "research_reply", "judge"], log: "[Fact Verification Agent] Scanning claims, estimating risk, checking consistency." },
      { id: "report", node: "report", completed: ["research", "critic", "trend", "research_reply", "judge", "fact_verification"], log: "[Report Agent] Compiling strategic markdown report & metrics." },
      { id: "done", node: null, completed: ["research", "critic", "trend", "research_reply", "judge", "fact_verification", "report"], log: "[System] Playback complete. Final report loaded." }
    ];

    const currentStep = steps[playbackIndex];
    if (currentStep) {
      setCurrentNode(currentStep.node);
      setCompletedNodes(currentStep.completed);
      
      // Update logs
      setToolLogs(prev => [...prev, `${new Date().toLocaleTimeString()} ${currentStep.log}`]);
      
      // Load partial debate items
      if (playbackReport.debate) {
        const completedNodes = currentStep.completed;
        const allowedRoles = new Set<string>();
        completedNodes.forEach(node => {
          if (node === "research") allowedRoles.add("researcher");
          else if (node === "critic") allowedRoles.add("critic");
          else if (node === "trend") allowedRoles.add("analyst");
          else if (node === "research_reply") allowedRoles.add("researcher_reply");
          else if (node === "judge") allowedRoles.add("judge");
          else if (node === "fact_verification") allowedRoles.add("verifier");
        });

        let itemsToShow = playbackReport.debate;
        if (playbackIndex < 7) {
          itemsToShow = playbackReport.debate.filter(d => allowedRoles.has(d.role));
        }

        // Sort chronologically using timestamps
        itemsToShow = [...itemsToShow].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setDebate(itemsToShow);
      }

      // If finished, load final report
      if (playbackIndex === 7) {
        setReport(playbackReport);
        setActiveTab("report");
      }
    }
  }, [playbackIndex, playbackActive, playbackReport]);

  const handleStartAnalysis = (searchQuery?: string) => {
    const targetQuery = searchQuery || query;
    if (!targetQuery.trim()) return;

    setIsLoading(true);
    setReport(null);
    setDebate([]);
    setCompletedNodes([]);
    setCurrentNode("research");
    setError(null);
    setPlaybackActive(false);
    setToolLogs([`[System] Launching dynamic multi-agent workflow for query: "${targetQuery}"`]);
    setActiveTab("debate");

    streamResearch(targetQuery, demoMode, {
      onSessionCreated: (data) => {
        console.log("Session created ID:", data.id);
        setToolLogs(prev => [...prev, `[System] SQLite session record created (ID: ${data.id})`]);
      },
      onNodeStarted: (node) => {
        setCurrentNode(node);
        const nodeDisplay = node.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        setToolLogs(prev => [...prev, `[System] Node started: ${nodeDisplay}`]);
      },
      onNodeCompleted: (node, agent, stateUpdate) => {
        setCompletedNodes(prev => [...prev, node]);
        setToolLogs(prev => [...prev, `[System] Node completed: ${agent}`]);
        
        if (stateUpdate.debate) {
          setDebate(prev => {
            const merged = [...prev];
            stateUpdate.debate.forEach((newMsg: DebateMessage) => {
              const idx = merged.findIndex(m => m.id === newMsg.id);
              if (idx > -1) {
                merged[idx] = newMsg;
              } else {
                merged.push(newMsg);
              }
            });
            return merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          });
        }
      },
      onToolInvoked: (agent, tool, input, thought) => {
        const timestamp = new Date().toLocaleTimeString();
        setToolLogs(prev => [
          ...prev, 
          `[${timestamp}] ${agent} tool invocation:`,
          `  > Thought: "${thought}"`,
          `  > Action: ${tool}(${input})`
        ]);
      },
      onComplete: (finalData) => {
        setReport(finalData);
        const sortedDebate = (finalData.debate || []).sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        setDebate(sortedDebate);
        setCompletedNodes(["research", "critic", "research_reply", "trend", "judge", "fact_verification", "report"]);
        setCurrentNode(null);
        setIsLoading(false);
        setToolLogs(prev => [...prev, `[System] Executive report compilation complete.`]);
        setActiveTab("report");
        onSessionComplete();
      },
      onError: (errMessage) => {
        setError(errMessage);
        setIsLoading(false);
        setCurrentNode(null);
        setToolLogs(prev => [...prev, `[Error] Execution aborted: ${errMessage}`]);
      }
    });
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    handleStartAnalysis(suggestion);
  };

  const getAllFindings = (): FindingsItem[] => {
    if (!debate) return [];
    const researcherMsg = debate.find(d => d.role === "researcher");
    return researcherMsg?.metadata?.findings || [];
  };

  const handlePlaybackPlay = () => {
    if (playbackIndex >= 7) setPlaybackIndex(0);
    setPlaybackPlaying(true);
  };

  const handlePlaybackPause = () => {
    setPlaybackPlaying(false);
  };

  const handlePlaybackReset = () => {
    setPlaybackPlaying(false);
    setPlaybackIndex(0);
    setDebate([]);
    setCompletedNodes([]);
    setReport(null);
    setActiveTab("debate");
    setToolLogs(["[System] Playback reset."]);
  };

  // Node graph styling logic
  const isNodeActive = (id: string) => currentNode === id;
  const isNodeDone = (id: string) => completedNodes.includes(id);
  
  const getSvgNodeColors = (id: string) => {
    if (isNodeActive(id)) {
      return { border: "#4f46e5", bg: "#f5f3ff", text: "#4f46e5", glow: "rgba(79, 70, 229, 0.15)" };
    }
    if (isNodeDone(id)) {
      return { border: "#10b981", bg: "#f0fdf4", text: "#10b981", glow: "none" };
    }
    return { border: "#e5e7eb", bg: "#ffffff", text: "#6b7280", glow: "none" };
  };

  return (
    <div className="flex-1 overflow-y-auto bg-brand-bg p-6 md:p-8 flex flex-col gap-6 font-sans">
      
      {/* Top Banner Header */}
      <div className="flex items-center justify-between border-b border-gray-200/40 pb-5">
        <div>
          <h2 className="text-xl font-black text-brand-text-primary flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-primary" />
            Decision Intelligence Workspace
          </h2>
          <p className="text-xs text-brand-text-secondary mt-1">
            Specify a research objective to trigger the enterprise multi-agent workflow.
          </p>
        </div>
      </div>

      {/* Playback Controls Header */}
      {playbackActive && (
        <div className="border border-brand-primary/10 bg-indigo-50/30 p-4.5 rounded-2xl flex flex-wrap gap-4 items-center justify-between shadow-premium">
          <div className="flex items-center gap-2 text-xs font-bold text-brand-primary">
            <Play className="w-4 h-4 animate-pulse text-brand-primary" />
            Playback Replay Mode: <span className="font-mono text-brand-text-primary">"{playbackReport?.query}"</span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Speed slider */}
            <div className="flex items-center gap-1.5 text-xs text-brand-text-secondary font-semibold">
              <span>Step Speed:</span>
              <input
                type="range"
                min="0.5"
                max="4.0"
                step="0.5"
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="w-16 h-1 bg-gray-200 rounded appearance-none cursor-pointer accent-brand-primary"
              />
              <span className="font-mono text-brand-primary w-8">{playbackSpeed}s</span>
            </div>

            {/* Playback buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePlaybackReset}
                className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-brand-secondary text-brand-text-secondary transition-all cursor-pointer shadow-premium"
                title="Reset Replay"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              {playbackPlaying ? (
                <button
                  onClick={handlePlaybackPause}
                  className="px-3.5 py-2 bg-brand-warning hover:bg-brand-warning/90 text-white rounded-xl flex items-center gap-1 text-xs font-bold transition-all cursor-pointer shadow-premium"
                >
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </button>
              ) : (
                <button
                  onClick={handlePlaybackPlay}
                  className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl flex items-center gap-1 text-xs font-bold transition-all cursor-pointer shadow-premium active:scale-95"
                >
                  <Play className="w-3.5 h-3.5" />
                  Play
                </button>
              )}
              <button
                onClick={() => setPlaybackIndex(prev => Math.min(prev + 1, 7))}
                disabled={playbackIndex >= 7}
                className="p-2 rounded-lg bg-white border border-gray-200 disabled:opacity-40 text-brand-text-secondary hover:bg-brand-secondary transition-all cursor-pointer shadow-premium"
                title="Step Next"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Query Formulation Input Bar */}
      {!playbackActive && (
        <div className="bg-white border border-gray-200/50 rounded-2xl p-4.5 flex flex-col gap-3.5 shadow-premium">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-brand-text-secondary" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Will AI Replace Developers?"
                disabled={isLoading}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-brand-secondary/20 text-brand-text-primary text-sm focus:outline-none focus:border-brand-primary/45 focus:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleStartAnalysis();
                }}
              />
            </div>
            <button
              onClick={() => handleStartAnalysis()}
              disabled={isLoading || !query.trim()}
              className="px-6 py-3.5 rounded-xl bg-brand-primary hover:bg-brand-primary/95 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-premium cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              {isLoading ? "Running Pipeline..." : "Start Analysis"}
            </button>
          </div>

          {/* Suggestion list for Recruiter Mode */}
          {!isLoading && !report && (
            <div className="mt-2">
              <span className="text-[10px] font-bold text-brand-text-secondary/70 uppercase tracking-wider block mb-2.5">
                {demoMode ? "Recruiter Demo Topics (Fast execution simulation)" : "Suggested research topics"}
              </span>
              <div className="flex flex-wrap gap-2.5">
                {DEMO_SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-brand-text-secondary hover:text-brand-primary hover:border-brand-primary/30 text-xs font-bold shadow-premium transition-all hover:scale-[1.01] cursor-pointer"
                  >
                    {s}
                    <ArrowRight className="w-3 h-3 opacity-60" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Board Layout */}
      {(isLoading || report || error || playbackActive) ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* LEFT COLUMN: Node Graph SVG Visualization */}
          <div className="flex flex-col gap-6 lg:col-span-1">
            {/* SVG Visualizer */}
            <div className="bg-white border border-gray-200/50 p-5 rounded-2xl flex flex-col gap-4 shadow-premium">
              <h3 className="text-xs font-bold text-brand-text-secondary uppercase tracking-wider border-b border-gray-200/40 pb-2.5">
                LangGraph State Flow
              </h3>
              
              <div className="flex items-center justify-center bg-brand-secondary/30 rounded-xl p-3 border border-gray-250/20">
                <svg className="w-full h-[400px]" viewBox="0 0 350 430">
                  {/* Style for moving dashes */}
                  <style>
                    {`
                      @keyframes dash {
                        to { stroke-dashoffset: -20; }
                      }
                      .active-wire {
                        stroke-dasharray: 6 4;
                        animation: dash 0.8s linear infinite;
                      }
                    `}
                  </style>

                  {/* Connectors */}
                  {/* Research -> Critic */}
                  <line 
                    x1="175" y1="90" x2="90" y2="150" 
                    stroke={isNodeDone("research") ? "#10b981" : "#e5e7eb"} 
                    strokeWidth="2.5" 
                    className={isNodeActive("critic") ? "active-wire stroke-[#4F46E5]" : ""}
                  />
                  {/* Research -> Trend */}
                  <line 
                    x1="175" y1="90" x2="260" y2="150" 
                    stroke={isNodeDone("research") ? "#10b981" : "#e5e7eb"} 
                    strokeWidth="2.5" 
                    className={isNodeActive("trend") ? "active-wire stroke-[#4F46E5]" : ""}
                  />
                  {/* Critic -> Research Reply */}
                  <line 
                    x1="90" y1="180" x2="90" y2="240" 
                    stroke={isNodeDone("critic") ? "#10b981" : "#e5e7eb"} 
                    strokeWidth="2.5" 
                    className={isNodeActive("research_reply") ? "active-wire stroke-[#4F46E5]" : ""}
                  />
                  {/* Research Reply -> Judge */}
                  <line 
                    x1="90" y1="270" x2="175" y2="320" 
                    stroke={isNodeDone("research_reply") ? "#10b981" : "#e5e7eb"} 
                    strokeWidth="2.5" 
                    className={isNodeActive("judge") ? "active-wire stroke-[#4F46E5]" : ""}
                  />
                  {/* Trend -> Judge */}
                  <line 
                    x1="260" y1="180" x2="175" y2="320" 
                    stroke={isNodeDone("trend") ? "#10b981" : "#e5e7eb"} 
                    strokeWidth="2.5" 
                    className={isNodeActive("judge") ? "active-wire stroke-[#4F46E5]" : ""}
                  />
                  {/* Judge -> Fact Verification */}
                  <line 
                    x1="175" y1="350" x2="175" y2="380" 
                    stroke={isNodeDone("judge") ? "#10b981" : "#e5e7eb"} 
                    strokeWidth="2.5" 
                    className={isNodeActive("fact_verification") ? "active-wire stroke-[#4F46E5]" : ""}
                  />
                  {/* Fact Verification -> Report */}
                  <line 
                    x1="175" y1="410" x2="175" y2="440" 
                    stroke={isNodeDone("fact_verification") ? "#10b981" : "#e5e7eb"} 
                    strokeWidth="2.5" 
                    className={isNodeActive("report") ? "active-wire stroke-[#4F46E5]" : ""}
                  />

                  {/* Nodes */}
                  {/* Start / Query */}
                  <circle cx="175" cy="20" r="12" fill="#EEF2FF" stroke="#4f46e5" strokeWidth="2" />
                  <text x="175" y="24" fill="#4f46e5" fontSize="9" fontWeight="bold" textAnchor="middle">Q</text>
                  <text x="175" y="42" fill="#6b7280" fontSize="9" textAnchor="middle">Query Ingestion</text>

                  {/* Connector Query -> Research */}
                  <line x1="175" y1="32" x2="175" y2="60" stroke={isNodeDone("research") || isNodeActive("research") ? "#10b981" : "#e5e7eb"} strokeWidth="2" />

                  {/* Research Agent Node */}
                  <g className="cursor-pointer">
                    <rect 
                      x="110" y="60" width="130" height="30" rx="8" 
                      stroke={getSvgNodeColors("research").border}
                      fill={getSvgNodeColors("research").bg}
                      strokeWidth="2"
                      style={{ filter: getSvgNodeColors("research").glow !== "none" ? `drop-shadow(0 0 4px ${getSvgNodeColors("research").glow})` : "none" }}
                    />
                    <text x="175" y="78" fill={getSvgNodeColors("research").text} fontSize="10" fontWeight="bold" textAnchor="middle">Research Agent</text>
                  </g>

                  {/* Critic Node */}
                  <g>
                    <rect 
                      x="30" y="150" width="120" height="30" rx="8" 
                      stroke={getSvgNodeColors("critic").border}
                      fill={getSvgNodeColors("critic").bg}
                      strokeWidth="2"
                      style={{ filter: getSvgNodeColors("critic").glow !== "none" ? `drop-shadow(0 0 4px ${getSvgNodeColors("critic").glow})` : "none" }}
                    />
                    <text x="90" y="168" fill={getSvgNodeColors("critic").text} fontSize="10" fontWeight="bold" textAnchor="middle">Critic Agent</text>
                  </g>

                  {/* Trend Node */}
                  <g>
                    <rect 
                      x="200" y="150" width="120" height="30" rx="8" 
                      stroke={getSvgNodeColors("trend").border}
                      fill={getSvgNodeColors("trend").bg}
                      strokeWidth="2"
                      style={{ filter: getSvgNodeColors("trend").glow !== "none" ? `drop-shadow(0 0 4px ${getSvgNodeColors("trend").glow})` : "none" }}
                    />
                    <text x="260" y="168" fill={getSvgNodeColors("trend").text} fontSize="10" fontWeight="bold" textAnchor="middle">Trend Analyst</text>
                  </g>

                  {/* Research Reply Node */}
                  <g>
                    <rect 
                      x="30" y="240" width="120" height="30" rx="8" 
                      stroke={getSvgNodeColors("research_reply").border}
                      fill={getSvgNodeColors("research_reply").bg}
                      strokeWidth="2"
                      style={{ filter: getSvgNodeColors("research_reply").glow !== "none" ? `drop-shadow(0 0 4px ${getSvgNodeColors("research_reply").glow})` : "none" }}
                    />
                    <text x="90" y="258" fill={getSvgNodeColors("research_reply").text} fontSize="9" fontWeight="bold" textAnchor="middle">Research (Reply)</text>
                  </g>

                  {/* Judge Node */}
                  <g>
                    <rect 
                      x="110" y="320" width="130" height="30" rx="8" 
                      stroke={getSvgNodeColors("judge").border}
                      fill={getSvgNodeColors("judge").bg}
                      strokeWidth="2"
                      style={{ filter: getSvgNodeColors("judge").glow !== "none" ? `drop-shadow(0 0 4px ${getSvgNodeColors("judge").glow})` : "none" }}
                    />
                    <text x="175" y="338" fill={getSvgNodeColors("judge").text} fontSize="10" fontWeight="bold" textAnchor="middle">Judge Agent</text>
                  </g>

                  {/* Fact Verification Node */}
                  <g>
                    <rect 
                      x="110" y="380" width="130" height="30" rx="8" 
                      stroke={getSvgNodeColors("fact_verification").border}
                      fill={getSvgNodeColors("fact_verification").bg}
                      strokeWidth="2"
                      style={{ filter: getSvgNodeColors("fact_verification").glow !== "none" ? `drop-shadow(0 0 4px ${getSvgNodeColors("fact_verification").glow})` : "none" }}
                    />
                    <text x="175" y="398" fill={getSvgNodeColors("fact_verification").text} fontSize="9" fontWeight="bold" textAnchor="middle">Fact Verification</text>
                  </g>
                </svg>
              </div>
            </div>

            {/* Certainty Gauge */}
            {report && (
              <ConfidenceChart score={report.confidence_score} />
            )}

            {/* Error logs */}
            {error && (
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 flex gap-3 text-brand-text-primary">
                <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-rose-600">Analysis Halted</h4>
                  <p className="text-xs text-brand-text-secondary leading-relaxed mt-1">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Tab Panel Viewer */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Tabs Selector */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab("report")}
                disabled={!report}
                className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs tracking-wider uppercase transition-all cursor-pointer ${
                  activeTab === "report"
                    ? "border-brand-primary text-brand-primary bg-indigo-50/30"
                    : "border-transparent text-brand-text-secondary hover:text-brand-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Strategic Report
              </button>

              <button
                onClick={() => setActiveTab("debate")}
                className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs tracking-wider uppercase transition-all cursor-pointer ${
                  activeTab === "debate"
                    ? "border-brand-primary text-brand-primary bg-indigo-50/30"
                    : "border-transparent text-brand-text-secondary hover:text-brand-text-primary"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Agent Panel Debate
              </button>

              <button
                onClick={() => setActiveTab("evidence")}
                className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs tracking-wider uppercase transition-all cursor-pointer ${
                  activeTab === "evidence"
                    ? "border-brand-primary text-brand-primary bg-indigo-50/30"
                    : "border-transparent text-brand-text-secondary hover:text-brand-text-primary"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Evidence Panel
              </button>
            </div>

            {/* Tab contents */}
            <div className="flex flex-col w-full gap-6">
              {activeTab === "report" && report && (
                <ReportSection report={report} />
              )}

              {activeTab === "debate" && (
                <div className="flex flex-col gap-6">
                  {/* Chronological Debate Panel */}
                  <DebateView debate={debate} />
                  
                  {/* Console Log Terminal */}
                  <div className="border border-gray-200/60 bg-brand-secondary/40 p-4.5 rounded-2xl flex flex-col gap-2.5 shadow-premium">
                    <div className="flex items-center gap-2 text-xs font-mono text-brand-text-secondary border-b border-gray-200/40 pb-2">
                      <Terminal className="w-4 h-4 text-brand-primary animate-pulse" />
                      <span>Agent Tool Execution Console Log</span>
                    </div>
                    
                    <div className="h-44 overflow-y-auto font-mono text-[10px] text-brand-text-primary flex flex-col gap-1.5 p-3 bg-white rounded-xl border border-gray-200/50 shadow-inner">
                      {toolLogs.map((log, idx) => (
                        <div key={idx} className="leading-relaxed whitespace-pre-wrap">
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "evidence" && (
                <div className="flex flex-col gap-6">
                  <div className="border-b border-gray-200/40 pb-3">
                    <h3 className="text-sm font-bold text-brand-text-secondary uppercase tracking-wider">
                      Evidence Engine Audit Panel
                    </h3>
                    <p className="text-xs text-brand-text-secondary mt-1">
                      Extracts individual research evidence statements, listing evidence weights and calculated certainty scores.
                    </p>
                  </div>
                  
                  {getAllFindings().length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-brand-text-secondary border border-dashed border-gray-200/70 rounded-2xl bg-white shadow-premium">
                      <ShieldCheck className="w-10 h-10 mb-3 text-brand-text-secondary/50 animate-pulse" />
                      <p className="text-sm font-semibold">Waiting for Research Agent findings...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {getAllFindings().map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-white border border-gray-200/50 p-5 rounded-2xl hover:border-brand-primary/20 hover:shadow-premium-lg transition-all flex flex-col justify-between gap-4 shadow-premium"
                        >
                          <div>
                            <span className="text-[9px] font-mono text-brand-primary border border-brand-primary/20 px-2 py-0.5 rounded bg-indigo-50/50 mb-2 inline-block">
                              EVIDENCE_ITEM_0{idx + 1}
                            </span>
                            <p className="text-xs font-bold text-brand-text-primary leading-relaxed">
                              {item.finding}
                            </p>
                          </div>
                          <div className="flex items-center justify-between text-[11px] pt-3 border-t border-gray-100 font-semibold">
                            <span className="flex items-center gap-1">
                              <span className="text-brand-text-secondary">Weight:</span>
                              <span className={`font-bold ${
                                item.evidence_strength === "High" ? "text-brand-success" :
                                item.evidence_strength === "Medium" ? "text-brand-warning" : "text-rose-500"
                              }`}>
                                {item.evidence_strength}
                              </span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="text-brand-text-secondary">Certainty:</span>
                              <span className="text-brand-primary font-mono font-bold">{item.confidence_level}%</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Workspace Idle Showcase */
        <div className="flex-1 flex flex-col items-center justify-center p-10 border border-gray-200/40 rounded-3xl bg-white shadow-premium">
          <BookOpen className="w-16 h-16 text-brand-text-secondary/30 mb-4 animate-pulse" />
          <h3 className="text-lg font-black text-brand-text-primary">Formulate Research Objective</h3>
          <p className="text-sm text-brand-text-secondary max-w-md text-center mt-2 leading-relaxed font-semibold">
            Submit a query to trigger your research. Or choose a recruiter demo topic above to watch the dynamic execution instantly.
          </p>
        </div>
      )}
    </div>
  );
};

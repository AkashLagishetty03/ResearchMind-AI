import { CheckCircle2, Loader2, Circle, AlertCircle } from "lucide-react";

interface TimelineItem {
  id: string;
  name: string;
  description: string;
}

interface StatusTrackerProps {
  currentNode: string | null;
  completedNodes: string[];
  failed: boolean;
}

const TIMELINE_STEPS: TimelineItem[] = [
  { id: "research", name: "Research Agent", description: "Gathers facts, evidence, and structured findings." },
  { id: "critic", name: "Critic Agent", description: "Challenges assumptions, detects bias and uncertainty." },
  { id: "research_reply", name: "Research Agent (Reply)", description: "Formulates defense and answers critic's challenges." },
  { id: "trend", name: "Trend Analyst Agent", description: "Forecasts risks, opportunities, and trajectories." },
  { id: "judge", name: "Judge Agent", description: "Arbitrates claims and establishes balanced consensus." },
  { id: "fact_verification", name: "Fact Verification Agent", description: "Verifies consistency, estimates hallucination risk." },
  { id: "report", name: "Report Writer Agent", description: "Assembles final executive summary and report." },
];

export const StatusTracker: React.FC<StatusTrackerProps> = ({ currentNode, completedNodes, failed }) => {
  return (
    <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950/60 backdrop-blur-md shadow-xl flex flex-col gap-5">
      <div className="border-b border-slate-900 pb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Execution Progress
        </h3>
        {currentNode && !failed && (
          <span className="flex items-center gap-1.5 text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full font-medium">
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping" />
            Analyzing
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800/80">
        {TIMELINE_STEPS.map((step, idx) => {
          const isCompleted = completedNodes.includes(step.id);
          const isCurrent = currentNode === step.id;

          let statusIcon = <Circle className="w-5 h-5 text-slate-700" />;
          let textClass = "text-slate-500";
          let borderClass = "border-slate-800";
          let bgClass = "bg-slate-900/20";

          if (isCompleted) {
            statusIcon = <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-950/40" />;
            textClass = "text-slate-300";
            borderClass = "border-emerald-500/20";
            bgClass = "bg-emerald-500/5";
          } else if (isCurrent) {
            if (failed) {
              statusIcon = <AlertCircle className="w-5 h-5 text-rose-500" />;
              textClass = "text-rose-400";
              borderClass = "border-rose-500/20";
              bgClass = "bg-rose-500/5";
            } else {
              statusIcon = <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />;
              textClass = "text-slate-100 font-semibold";
              borderClass = "border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.15)]";
              bgClass = "bg-indigo-500/5";
            }
          }

          // Check if previous step was completed to highlight connection lines
          const nextStep = TIMELINE_STEPS[idx + 1];
          const hasActiveConnection = isCompleted && nextStep && (completedNodes.includes(nextStep.id) || currentNode === nextStep.id);

          return (
            <div key={step.id} className="flex gap-3.5 items-start relative z-10">
              {/* Node status bullet */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full border ${borderClass} ${bgClass} flex items-center justify-center transition-all duration-300`}>
                {statusIcon}
              </div>

              {/* Step info details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={`text-xs ${textClass} transition-colors duration-300`}>
                    {step.name}
                  </h4>
                  {isCurrent && !failed && (
                    <span className="text-[9px] text-indigo-400 font-mono animate-pulse">
                      RUNNING
                    </span>
                  )}
                  {isCompleted && (
                    <span className="text-[9px] text-emerald-500 font-mono">
                      DONE
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                  {step.description}
                </p>
              </div>

              {/* Dynamic connector line highlight overlay */}
              {hasActiveConnection && (
                <div 
                  className="absolute left-[15px] top-7.5 w-0.5 bg-gradient-to-b from-emerald-400 to-emerald-500 z-[-1]"
                  style={{ height: "26px" }}
                />
              )}
              {isCurrent && !isCompleted && !failed && (
                <div 
                  className="absolute left-[15px] top-7.5 w-0.5 bg-gradient-to-b from-indigo-500 to-slate-800 z-[-1] animate-pulse"
                  style={{ height: "26px" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

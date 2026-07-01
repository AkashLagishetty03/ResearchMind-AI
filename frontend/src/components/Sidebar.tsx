import React from "react";
import { 
  Plus, 
  History, 
  Scale, 
  Trash2, 
  PlayCircle,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  Activity,
  Sliders,
  FileCode,
  TrendingUp,
  Compass
} from "lucide-react";
import type { HistoryItem } from "../services/api";

interface SidebarProps {
  history: HistoryItem[];
  currentSessionId: number | null;
  onSelectSession: (id: number) => void;
  onReplaySession: (id: number) => void;
  onNewSession: () => void;
  onDeleteSession: (id: number) => void;
  demoMode: boolean;
  setDemoMode: (val: boolean) => void;
  activePage: string;
  setActivePage: (val: any) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  history,
  currentSessionId,
  onSelectSession,
  onReplaySession,
  onNewSession,
  onDeleteSession,
  demoMode,
  setDemoMode,
  activePage,
  setActivePage,
}) => {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateStr;
    }
  };

  const navItems = [
    { page: "workspace", name: "Workspace", icon: Compass },
    { page: "monitor", name: "Agent Monitor", icon: Activity },
    { page: "metrics", name: "Performance metrics", icon: TrendingUp },
    { page: "settings", name: "Agent Settings", icon: Sliders },
    { page: "prompts", name: "Prompt Manager", icon: FileCode },
  ];

  return (
    <aside className="w-80 border-r border-gray-200/60 bg-brand-secondary flex flex-col h-full overflow-hidden">
      {/* Top Banner Branding */}
      <div className="p-6 border-b border-gray-200/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActivePage("landing")}>
          <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center shadow-md">
            <Scale className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-extrabold text-brand-text-primary tracking-tight text-lg">
            Research<span className="text-brand-primary">Mind</span> AI
          </span>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="p-4">
        <button
          onClick={onNewSession}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-sm transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          New Research
        </button>
      </div>

      {/* Recruiter Demo Mode Toggler */}
      <div className="px-4 py-3 mx-4 rounded-2xl border border-gray-200/40 bg-white shadow-premium mb-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-brand-text-primary flex items-center gap-1">
              Recruiter Demo Mode
              <span title="Loads instant simulation findings without requiring OpenRouter API key configurations.">
                <HelpCircle className="w-3.5 h-3.5 text-brand-text-secondary cursor-help" />
              </span>
            </span>
            <span className="text-[10px] text-brand-text-secondary font-medium">Use predefined topics</span>
          </div>
          <button
            onClick={() => setDemoMode(!demoMode)}
            className="text-brand-text-secondary hover:text-brand-primary transition-colors cursor-pointer"
          >
            {demoMode ? (
              <ToggleRight className="w-8 h-8 text-brand-primary" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-gray-300" />
            )}
          </button>
        </div>
      </div>

      {/* SYSTEM NAVIGATION TABS */}
      <div className="px-4 mb-4 flex flex-col gap-1 border-b border-gray-200/40 pb-4">
        <span className="text-[10px] font-bold text-brand-text-secondary/70 uppercase tracking-wider px-2 mb-1.5 block">
          Control Center
        </span>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.page;
          return (
            <button
              key={item.page}
              onClick={() => {
                setActivePage(item.page);
              }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-white border border-gray-200/40 text-brand-primary shadow-premium"
                  : "bg-transparent border border-transparent text-brand-text-secondary hover:text-brand-text-primary hover:bg-gray-200/30"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.name}
            </button>
          );
        })}
      </div>

      {/* History Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-6 py-2 flex items-center gap-1.5 text-xs font-bold text-brand-text-secondary/70 uppercase tracking-wider">
          <History className="w-3.5 h-3.5 text-brand-text-secondary/60" />
          Research Archive
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-3 pb-6 flex flex-col gap-2">
          {history.length === 0 ? (
            <div className="text-center py-12 text-brand-text-secondary/60 text-xs px-4">
              No previous research sessions recorded.
            </div>
          ) : (
            history.map((item) => {
              const isSelected = currentSessionId === item.id;
              
              // Get certainty color indicators
              let certaintyColor = "bg-brand-warning/10 text-brand-warning border-brand-warning/20";
              if (item.confidence_score !== null) {
                if (item.confidence_score >= 71) {
                  certaintyColor = "bg-brand-success/10 text-brand-success border-brand-success/20";
                } else if (item.confidence_score <= 40) {
                  certaintyColor = "bg-rose-500/10 text-rose-600 border-rose-500/20";
                }
              }

              return (
                <div
                  key={item.id}
                  className={`group relative flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-white border-brand-primary/20 shadow-premium text-brand-primary"
                      : "bg-white/40 border-gray-200/30 hover:bg-white hover:border-gray-200 hover:shadow-premium"
                  }`}
                  onClick={() => onSelectSession(item.id)}
                >
                  <div className="flex-1 min-w-0 pr-12">
                    <h4 className={`text-xs font-bold truncate ${
                      isSelected ? "text-brand-primary" : "text-brand-text-primary"
                    }`}>
                      {item.query}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-brand-text-secondary/70 font-mono">
                        {formatDate(item.created_at)}
                      </span>
                      {item.confidence_score !== null && (
                        <span className={`text-[8px] font-bold font-mono border px-1 py-0.2 rounded ${certaintyColor}`}>
                          {item.confidence_score}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions overlay */}
                  <div className="absolute right-2 flex items-center gap-1">
                    {/* Play Replay button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onReplaySession(item.id);
                      }}
                      className={`p-1.5 rounded-lg text-brand-text-secondary hover:text-brand-primary bg-white border border-gray-200/60 hover:border-brand-primary/30 shadow-premium transition-all cursor-pointer ${
                        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}
                      title="Playback Replay Run"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this research report from the database?")) {
                          onDeleteSession(item.id);
                        }
                      }}
                      className={`p-1.5 rounded-lg text-brand-text-secondary hover:text-rose-600 bg-white border border-gray-200/60 hover:border-rose-500/30 shadow-premium transition-all cursor-pointer ${
                        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}
                      title="Delete Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
};

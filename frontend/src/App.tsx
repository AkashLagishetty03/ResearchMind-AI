import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { LandingPage } from "./components/LandingPage";
import { Workspace } from "./components/Workspace";
import { SettingsView } from "./components/SettingsView";
import { PromptManager } from "./components/PromptManager";
import { MonitorView } from "./components/MonitorView";
import { MetricsDashboard } from "./components/MetricsDashboard";
import { fetchHistory, fetchReport, deleteReport } from "./services/api";
import type { ReportDetails, HistoryItem } from "./services/api";

type PageType = "landing" | "workspace" | "settings" | "prompts" | "monitor" | "metrics";

function App() {
  const [activePage, setActivePage] = useState<PageType>("landing");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportDetails | null>(null);
  const [demoMode, setDemoMode] = useState(true); // Default to true for recruiters
  const [playbackSession, setPlaybackSession] = useState<ReportDetails | null>(null);

  // Fetch history list from SQLite database on mount
  const refreshHistory = async () => {
    try {
      const data = await fetchHistory();
      setHistory(data);
    } catch (e) {
      console.error("Failed to load historical reports:", e);
    }
  };

  useEffect(() => {
    refreshHistory();
  }, []);

  const handleStartResearch = () => {
    setActivePage("workspace");
    setSelectedReport(null);
    setPlaybackSession(null);
  };

  const handleStartDemo = () => {
    setDemoMode(true);
    setActivePage("workspace");
    setSelectedReport(null);
    setPlaybackSession(null);
  };

  const handleSelectSession = async (id: number) => {
    try {
      const details = await fetchReport(id);
      setSelectedReport(details);
      setPlaybackSession(null);
      setActivePage("workspace");
    } catch (e) {
      console.error("Failed to load report details:", e);
      alert("Error loading report. Ensure the backend is active.");
    }
  };

  const handleReplaySession = async (id: number) => {
    try {
      const details = await fetchReport(id);
      setPlaybackSession(details);
      setSelectedReport(null);
      setActivePage("workspace");
    } catch (e) {
      console.error("Failed to load playback data:", e);
      alert("Error loading replay data.");
    }
  };

  const handleDeleteSession = async (id: number) => {
    try {
      await deleteReport(id);
      if (selectedReport?.id === id || playbackSession?.id === id) {
        setSelectedReport(null);
        setPlaybackSession(null);
      }
      refreshHistory();
    } catch (e) {
      console.error("Failed to delete session:", e);
      alert("Error deleting report.");
    }
  };

  const handleNewSession = () => {
    setSelectedReport(null);
    setPlaybackSession(null);
    setActivePage("workspace");
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-brand-bg text-brand-text-primary font-sans">
      {/* Sidebar - Visible on all pages except Landing Page */}
      {activePage !== "landing" && (
        <Sidebar
          history={history}
          currentSessionId={selectedReport ? selectedReport.id : playbackSession ? playbackSession.id : null}
          onSelectSession={handleSelectSession}
          onReplaySession={handleReplaySession}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          demoMode={demoMode}
          setDemoMode={setDemoMode}
          activePage={activePage}
          setActivePage={setActivePage}
        />
      )}

      {/* Main View Container */}
      {activePage === "landing" ? (
        <LandingPage
          onStart={handleStartResearch}
          onDemoStart={handleStartDemo}
        />
      ) : activePage === "workspace" ? (
        <Workspace
          demoMode={demoMode}
          selectedReport={selectedReport}
          playbackReport={playbackSession}
          onSessionComplete={refreshHistory}
        />
      ) : activePage === "settings" ? (
        <SettingsView />
      ) : activePage === "prompts" ? (
        <PromptManager />
      ) : activePage === "monitor" ? (
        <MonitorView />
      ) : (
        <MetricsDashboard />
      )}
    </div>
  );
}

export default App;

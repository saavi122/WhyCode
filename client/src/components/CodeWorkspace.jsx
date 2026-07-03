import React, { useState, useEffect } from "react";
import { 
  Folder, FileCode, MessageSquare, Cpu, ShieldAlert, 
  Send, RefreshCw, Layers, CheckCircle2, ChevronRight, Play, Database
} from "lucide-react";
import { useSprint } from "../context/SprintContext";

export default function CodeWorkspace({ 
  repositories = [], 
  files = [], 
  selectedFile = null,
  onSelectFile,
  fileContent = "",
  fileLoading = false,
  onRunScan,
  scanLoading = false,
  scanResults = null
}) {
  const { 
    selectedRepoId, 
    setSelectedRepoId, 
    selectedRepo, 
    telemetry, 
    teammates, 
    chatThreads, 
    sendMessageToTeammate 
  } = useSprint();

  const [activeTeammateId, setActiveTeammateId] = useState("asha");
  const [chatInput, setChatInput] = useState("");
  const activeTeammate = teammates.find((t) => t.id === activeTeammateId);
  const activeThread = chatThreads[activeTeammateId] || [];

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendMessageToTeammate(activeTeammateId, chatInput);
    setChatInput("");
  };

  return (
    <div className="w-full h-[650px] rounded-2xl border border-os-border glassmorphism shadow-os-light dark:shadow-os-dark flex flex-col overflow-hidden font-sans">
      {/* Top IDE Toolbar */}
      <div className="px-5 py-3.5 bg-os-bg-secondary border-b border-os-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-brand-cyan animate-pulse"></span>
            <span className="font-extrabold text-sm text-os-text tracking-tight">WhyCode OS Workspace</span>
          </div>

          {/* Repo Selector dropdown */}
          <div className="flex items-center gap-2 bg-os-surface px-3 py-1.5 rounded-lg border border-os-border">
            <Database size={13} className="text-os-text-muted" />
            <select
              value={selectedRepoId || ""}
              onChange={(e) => setSelectedRepoId(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-os-text focus:outline-none cursor-pointer"
            >
              <option value="" disabled>Select Repository</option>
              {repositories.map((repo) => (
                <option key={repo._id} value={repo._id}>
                  {repo.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Telemetry panel */}
        <div className="hidden lg:flex items-center gap-6 text-xs font-semibold text-os-text-secondary select-none">
          <div className="flex items-center gap-1.5">
            <Cpu size={14} className="text-brand-cyan" />
            <span>CPU: <b className="text-os-text">{telemetry.cpu}%</b></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers size={14} className="text-brand-indigo" />
            <span>RAM: <b className="text-os-text">{telemetry.memory}%</b></span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-brand-mint" />
            <span>Test Coverage: <b className="text-os-text">{telemetry.coverage}%</b></span>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRunScan}
            disabled={scanLoading || !selectedRepoId}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-brand-cyan to-brand-blue disabled:opacity-40 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
          >
            {scanLoading ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
            <span>Run Scanner</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Body split into 3 parts: Explorer, Editor, Teammate Chat */}
      <div className="flex-grow flex h-0">
        
        {/* Left Sidebar: File Explorer */}
        <div className="w-[200px] border-r border-os-border bg-os-bg-secondary/50 flex flex-col h-full shrink-0">
          <div className="px-4 py-2.5 border-b border-os-border/50 text-[10px] font-bold text-os-text-muted uppercase tracking-wider select-none text-left">
            File Buffer Registry
          </div>
          <div className="flex-grow overflow-y-auto p-2 flex flex-col gap-1 text-left">
            {files.length === 0 ? (
              <div className="text-[11px] text-os-text-muted p-2 select-none">No active repo buffers loaded</div>
            ) : (
              files.map((file, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectFile?.(file)}
                  className={`w-full px-3 py-2 rounded-lg flex items-center gap-2.5 text-xs transition text-left ${
                    selectedFile === file
                      ? "bg-brand-blue/8 text-brand-blue dark:text-brand-cyan font-bold"
                      : "text-os-text-secondary hover:bg-os-border/30"
                  }`}
                >
                  <FileCode size={13} className="shrink-0" />
                  <span className="truncate">{file.split("/").pop()}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Center Panel: Code Viewer */}
        <div className="flex-grow flex flex-col h-full bg-os-surface/40 dark:bg-black/20 min-w-0">
          <div className="px-4 py-2 bg-os-bg-secondary/40 border-b border-os-border/50 flex items-center justify-between select-none">
            <span className="text-[11px] font-bold font-mono text-os-text-secondary truncate">
              {selectedFile ? `SRC_BUFFER: ${selectedFile}` : "IDE: Select a file buffer"}
            </span>
          </div>

          <div className="flex-grow p-4 overflow-auto font-mono text-xs md:text-sm text-left bg-os-surface/10 dark:bg-black/10 select-text">
            {fileLoading ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-os-text-muted">
                <RefreshCw size={24} className="animate-spin text-brand-cyan" />
                <span>Streaming buffer contents...</span>
              </div>
            ) : fileContent ? (
              <pre className="w-full h-full leading-relaxed overflow-x-auto text-os-text dark:text-gray-200">
                <code>
                  {fileContent.split("\n").map((line, idx) => (
                    <div key={idx} className="flex hover:bg-os-border/10 px-2 rounded">
                      <span className="w-8 text-os-text-muted/50 select-none text-right pr-4 font-normal">{idx + 1}</span>
                      <span className="whitespace-pre">{line}</span>
                    </div>
                  ))}
                </code>
              </pre>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-os-text-muted select-none text-center p-6">
                <FileCode size={40} className="text-os-border" />
                <div>
                  <h4 className="font-bold text-os-text text-sm">No File Buffer Open</h4>
                  <p className="text-xs text-os-text-muted mt-1 max-w-xs">
                    Choose a repository and click a file in the sidebar explorer to initialize the visualizer buffer.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Teammate Chat Panel */}
        <div className="w-[280px] border-l border-os-border bg-os-bg-secondary/30 flex flex-col h-full shrink-0">
          {/* Teammate selection list */}
          <div className="flex border-b border-os-border bg-os-bg-secondary/65 select-none overflow-x-auto">
            {teammates.map((teammate) => (
              <button
                key={teammate.id}
                onClick={() => setActiveTeammateId(teammate.id)}
                className={`px-3.5 py-3 flex-grow flex flex-col items-center justify-center gap-1 border-b-2 transition ${
                  activeTeammateId === teammate.id
                    ? "border-brand-blue text-brand-blue dark:border-brand-cyan dark:text-brand-cyan font-bold"
                    : "border-transparent text-os-text-muted hover:text-os-text"
                }`}
                title={teammate.role}
              >
                <span className="text-base">{teammate.avatar}</span>
                <span className="text-[10px] tracking-tight">{teammate.name}</span>
              </button>
            ))}
          </div>

          {/* Teammate Bio card info */}
          <div className="p-3 bg-os-bg-secondary border-b border-os-border flex flex-col text-left gap-1 select-none">
            <span className="text-xs font-extrabold text-os-text">{activeTeammate.name}</span>
            <span className="text-[10px] font-bold text-os-text-muted">{activeTeammate.role}</span>
            <p className="text-[10px] text-os-text-secondary leading-tight mt-1 bg-os-surface/40 p-2 rounded-lg border border-os-border/50">
              {activeTeammate.bio}
            </p>
          </div>

          {/* Chat message board */}
          <div className="flex-grow p-3 overflow-y-auto flex flex-col gap-2.5 bg-os-surface/10 dark:bg-black/5 select-text">
            {activeThread.map((msg, idx) => (
              <div
                key={idx}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-[11px] leading-snug text-left ${
                  msg.sender === "user"
                    ? "ml-auto bg-brand-blue text-white rounded-br-none"
                    : "mr-auto bg-os-bg-secondary border border-os-border text-os-text rounded-bl-none"
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>

          {/* Chat input form */}
          <form onSubmit={handleSendChat} className="p-2 bg-os-bg-secondary border-t border-os-border flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Ask ${activeTeammate.name}...`}
              className="flex-grow bg-os-surface border border-os-border rounded-xl px-3 py-1.5 text-xs text-os-text placeholder-os-text-muted focus:outline-none select-text"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="p-1.5 rounded-xl bg-brand-blue hover:bg-brand-indigo text-white disabled:opacity-40 hover:scale-105 active:scale-95 transition-all"
            >
              <Send size={12} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { Terminal as TermIcon, Play, RefreshCw, X, ChevronRight } from "lucide-react";

export default function Terminal({ onCommand, initialLogs = [] }) {
  const [logs, setLogs] = useState(initialLogs);
  const [inputVal, setInputVal] = useState("");
  const terminalEndRef = useRef(null);

  useEffect(() => {
    if (initialLogs.length > 0) {
      setLogs(initialLogs);
    }
  }, [initialLogs]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const cmd = inputVal.trim();
    // Log user command
    setLogs((prev) => [...prev, `user$ ${cmd}`]);
    setInputVal("");

    if (onCommand) {
      // Allow parent component to process and return response logs
      const response = onCommand(cmd);
      if (response) {
        if (Array.isArray(response)) {
          setLogs((prev) => [...prev, ...response]);
        } else {
          setLogs((prev) => [...prev, response]);
        }
      }
    } else {
      // Mock terminal evaluation
      setTimeout(() => {
        setLogs((prev) => [
          ...prev,
          `executing: '${cmd}'...`,
          `WhyCode Kernel: command not found: '${cmd}'. Type 'help' for support.`
        ]);
      }, 500);
    }
  };

  const clearLogs = () => {
    setLogs(["WhyCode OS Shell initialized. Type 'help' for list of commands."]);
  };

  return (
    <div className="w-full rounded-2xl overflow-hidden glassmorphism border border-os-border shadow-os-light dark:shadow-os-dark flex flex-col h-[320px] font-mono text-xs md:text-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-os-bg-secondary border-b border-os-border select-none">
        <div className="flex items-center gap-2">
          <TermIcon size={14} className="text-brand-cyan dark:text-[#00D9FF]" />
          <span className="font-bold text-os-text-secondary text-xs">WhyCode OS Terminal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            type="button" 
            onClick={clearLogs}
            className="p-1 rounded hover:bg-os-border/50 text-os-text-muted hover:text-os-text transition"
            title="Clear Terminal"
          >
            <RefreshCw size={12} />
          </button>
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
        </div>
      </div>

      {/* Terminal Screen log window */}
      <div className="flex-grow p-4 overflow-y-auto flex flex-col gap-1.5 text-left bg-black/60 dark:bg-black/80 text-[#00ffcc] scrollbar-thin scrollbar-thumb-os-border select-text">
        {logs.map((log, idx) => (
          <div key={idx} className="whitespace-pre-wrap break-all leading-relaxed">
            {log.startsWith("user$") ? (
              <span className="text-white font-bold">{log}</span>
            ) : log.startsWith("system:") ? (
              <span className="text-[#3b82f6]">{log}</span>
            ) : log.startsWith("error:") ? (
              <span className="text-red-400">{log}</span>
            ) : (
              <span>{log}</span>
            )}
          </div>
        ))}
        <div ref={terminalEndRef} />
      </div>

      {/* Console Input form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-2 bg-black/70 border-t border-os-border/20 text-[#00ffcc]">
        <ChevronRight size={14} className="shrink-0 animate-pulse" />
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="type 'help' or query AI..."
          className="flex-grow bg-transparent border-none focus:outline-none focus:ring-0 text-xs md:text-sm font-mono text-[#00ffcc] placeholder-[#00ffcc]/35"
        />
        <button type="submit" className="text-white hover:text-brand-cyan transition">
          <Play size={12} />
        </button>
      </form>
    </div>
  );
}

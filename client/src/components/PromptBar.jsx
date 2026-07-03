import React, { useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";

export default function PromptBar({ onSubmit }) {
  const [query, setQuery] = useState("");
  
  const pills = [
    { label: "Generate API", text: "Create a Express API router for user profile retrieval" },
    { label: "Fix Bug", text: "Fix database pool connection leaking issue in server config" },
    { label: "Write Tests", text: "Write Jest tests for the token authorization middleware" },
    { label: "Improve Code", text: "Refactor security helper to avoid timing attacks" },
    { label: "Add Feature", text: "Implement role-based invite links for workspace collaborators" }
  ];

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSubmit?.(query);
    setQuery("");
  };

  const handlePillClick = (text) => {
    setQuery(text);
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 px-4 z-10">
      {/* Search Bar Wrapper with glowing animated gradient borders */}
      <form 
        onSubmit={handleFormSubmit}
        className="relative w-full group rounded-2xl p-[1px] bg-gradient-to-r from-brand-cyan via-brand-blue to-brand-violet hover:shadow-[0_0_20px_rgba(0,217,255,0.4)] dark:hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all duration-500"
      >
        <div className="flex items-center gap-3 w-full bg-os-surface/85 dark:bg-[#070709]/85 backdrop-filter backdrop-blur-xl px-5 py-4 rounded-[15px] border border-os-border/50">
          <Sparkles className="text-brand-cyan dark:text-[#00D9FF] shrink-0 animate-pulse-glow" size={20} />
          
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask Anything. Build Everything."
            className="flex-grow bg-transparent border-none text-os-text placeholder-os-text-muted focus:outline-none focus:ring-0 text-sm md:text-base font-medium select-text"
          />

          <button
            type="submit"
            disabled={!query.trim()}
            className="p-2.5 rounded-xl bg-gradient-to-r from-brand-cyan to-brand-blue text-white disabled:opacity-40 hover:scale-105 active:scale-95 transition-all shadow-md"
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </form>

      {/* Suggestion pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 max-w-3xl">
        {pills.map((pill, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handlePillClick(pill.text)}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold glassmorphism border border-os-border text-os-text-secondary hover:text-brand-blue dark:hover:text-[#00D9FF] hover:border-brand-blue/30 dark:hover:border-[#00D9FF]/30 transition-all active:scale-95"
          >
            {pill.label}
          </button>
        ))}
      </div>
    </div>
  );
}

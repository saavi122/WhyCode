import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Cpu,
  Sparkles,
  Zap,
  Check,
  AlertTriangle,
  RefreshCw,
  Clock,
  ShieldCheck,
  Activity,
  ArrowRight,
  Info,
  X,
} from "lucide-react";
import API from "../services/api";
import { useToast } from "../context/ToastContext";

export default function AnswerEngineCard() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [confirmModalMode, setConfirmModalMode] = useState(null);
  const [testingPrimary, setTestingPrimary] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [primaryTestResult, setPrimaryTestResult] = useState(null);
  const [geminiTestResult, setGeminiTestResult] = useState(null);

  // Fetch live engine status
  const { data: statusData, isLoading, refetch } = useQuery({
    queryKey: ["engineStatus"],
    queryFn: async () => {
      const res = await API.get("/engine/status");
      return res.data;
    },
    refetchInterval: 15000,
  });

  // Mutation: change engine mode
  const modeMutation = useMutation({
    mutationFn: async (newMode) => {
      const res = await API.put("/engine/mode", { mode: newMode });
      return res.data;
    },
    onSuccess: (data) => {
      showToast(data.message || `Answer engine mode updated to ${data.mode}`, "success");
      queryClient.invalidateQueries(["engineStatus"]);
      setConfirmModalMode(null);
    },
    onError: (err) => {
      showToast(err.response?.data?.message || "Failed to update engine mode.", "error");
      setConfirmModalMode(null);
    },
  });

  const handleSelectMode = (targetMode) => {
    if (targetMode === currentMode) return;

    if (targetMode === "GEMINI_ONLY") {
      setConfirmModalMode(targetMode);
    } else {
      modeMutation.mutate(targetMode);
    }
  };

  const handleTestPrimary = async () => {
    setTestingPrimary(true);
    setPrimaryTestResult(null);
    try {
      const res = await API.post("/engine/test-primary");
      setPrimaryTestResult(res.data);
      if (res.data.success) {
        showToast(`Primary model responded in ${res.data.latencyMs}ms`, "success");
      } else {
        showToast(res.data.error || "Primary test failed", "error");
      }
    } catch (err) {
      setPrimaryTestResult({ success: false, error: err.message });
      showToast(err.message, "error");
    } finally {
      setTestingPrimary(false);
    }
  };

  const handleTestGemini = async () => {
    setTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const res = await API.post("/engine/test-gemini");
      setGeminiTestResult(res.data);
      if (res.data.success) {
        showToast(`Gemini responded in ${res.data.latencyMs}ms`, "success");
      } else {
        showToast(res.data.error || "Gemini test failed", "error");
      }
    } catch (err) {
      setGeminiTestResult({ success: false, error: err.message });
      showToast(err.message, "error");
    } finally {
      setTestingGemini(false);
    }
  };

  const currentMode = statusData?.mode || "AUTO";
  const primary = statusData?.primary || {};
  const gemini = statusData?.gemini || {};
  const recentEvents = statusData?.recentEvents || [];
  const activeIncident = statusData?.activeIncident;

  const isGeminiConfigured = Boolean(gemini.configured);

  return (
    <div className="glass-panel-premium p-6 rounded-2xl flex flex-col gap-6 text-left border border-white/10 bg-[#0c0c0e]/95 backdrop-blur-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[#00D9FF]/20 to-[#7C3AED]/20 border border-[#00D9FF]/30 text-[#00D9FF]">
            <Cpu size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-wider font-sans flex items-center gap-2">
              Answer Engine Management
              {activeIncident && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[9.5px] font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
                  <AlertTriangle size={10} /> Fallback Active
                </span>
              )}
            </h3>
            <p className="text-xs text-[#a1a1aa] mt-0.5">
              Control primary local inference (Ollama/vLLM) and autonomous Google Gemini fallback routing.
            </p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="p-2 rounded-xl text-[#a1a1aa] hover:text-white hover:bg-white/5 border border-white/5 transition flex items-center gap-1.5 text-xs font-semibold"
          title="Refresh status"
        >
          <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Active Incident Warning Banner */}
      {activeIncident && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-white">
              Primary RAG Model Offline (since {new Date(activeIncident.time || activeIncident.createdAt).toLocaleTimeString()})
            </span>
            <span className="text-[11px] text-amber-300/90 leading-relaxed">
              System is currently routing answers to <strong>{activeIncident.to === "gemini" ? "Google Gemini Fallback" : "Evidence-Only Mode"}</strong>. Reason: {activeIncident.reason}. {activeIncident.requestCount > 1 ? `(${activeIncident.requestCount} requests handled)` : ""}
            </span>
          </div>
        </div>
      )}

      {/* Dual Provider Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Primary Engine Card */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex flex-col justify-between gap-3 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[#00D9FF]/10 text-[#00D9FF]">
                <Cpu size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Primary RAG Model</span>
                <span className="text-[10px] text-[#71717a] font-mono">{primary.model || "qwen2.5-coder:3b"}</span>
              </div>
            </div>

            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border flex items-center gap-1 ${
              primary.online
                ? "bg-[#10b981]/15 border-[#10b981]/30 text-[#10b981]"
                : "bg-red-500/15 border-red-500/30 text-red-400"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${primary.online ? "bg-[#10b981]" : "bg-red-400"}`} />
              {primary.online ? "Online" : "Offline"}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#a1a1aa] pt-2 border-t border-white/5">
            <span>Latency: <strong className="text-white font-mono">{primary.latencyMs !== undefined ? `${primary.latencyMs}ms` : "-"}</strong></span>
            <span>Target: <strong className="text-white font-mono">Local / vLLM</strong></span>
          </div>

          <div className="flex items-center justify-between gap-2 mt-1">
            <button
              onClick={handleTestPrimary}
              disabled={testingPrimary}
              className="w-full py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[11px] font-bold border border-white/10 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {testingPrimary ? <RefreshCw size={11} className="animate-spin" /> : <Zap size={11} className="text-[#00D9FF]" />}
              <span>Test Primary</span>
            </button>
          </div>

          {primaryTestResult && (
            <div className={`p-2 rounded text-[10px] font-mono border ${
              primaryTestResult.success
                ? "bg-[#10b981]/10 border-[#10b981]/20 text-[#10b981]"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}>
              {primaryTestResult.success
                ? `● Test Passed: Response '${primaryTestResult.response}' in ${primaryTestResult.latencyMs}ms`
                : `▲ Test Failed: ${primaryTestResult.error}`}
            </div>
          )}
        </div>

        {/* Gemini Fallback Card */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex flex-col justify-between gap-3 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Sparkles size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Google Gemini Fallback</span>
                <span className="text-[10px] text-[#71717a] font-mono">{gemini.model || "gemini-2.5-flash"}</span>
              </div>
            </div>

            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border flex items-center gap-1 ${
              isGeminiConfigured
                ? "bg-purple-500/15 border-purple-500/30 text-purple-300"
                : "bg-zinc-800 border-zinc-700 text-zinc-400"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isGeminiConfigured ? "bg-purple-400" : "bg-zinc-500"}`} />
              {isGeminiConfigured ? "Configured" : "Not Configured"}
            </span>
          </div>

          {/* Daily Quota Tracker */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5">
            <div className="flex justify-between text-[11px]">
              <span className="text-[#a1a1aa]">Today's Usage:</span>
              <span className="text-white font-mono font-bold">
                {gemini.requestsToday ?? 0} / {gemini.dailyLimit ?? 200} requests
              </span>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-[#00D9FF] h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.round(((gemini.requestsToday || 0) / (gemini.dailyLimit || 200)) * 100))}%`,
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 mt-1">
            <button
              onClick={handleTestGemini}
              disabled={testingGemini || !isGeminiConfigured}
              className="w-full py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[11px] font-bold border border-white/10 transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {testingGemini ? <RefreshCw size={11} className="animate-spin" /> : <Zap size={11} className="text-purple-400" />}
              <span>Test Gemini</span>
            </button>
          </div>

          {geminiTestResult && (
            <div className={`p-2 rounded text-[10px] font-mono border ${
              geminiTestResult.success
                ? "bg-[#10b981]/10 border-[#10b981]/20 text-[#10b981]"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}>
              {geminiTestResult.success
                ? `● Test Passed: Response '${geminiTestResult.response}' in ${geminiTestResult.latencyMs}ms`
                : `▲ Test Failed: ${geminiTestResult.error}`}
            </div>
          )}
        </div>
      </div>

      {/* Engine Mode Selection */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck size={14} className="text-[#00D9FF]" />
            <span>Answer Engine Routing Policy</span>
          </label>
          <span className="text-[10px] text-[#71717a]">Changes are applied instantly & logged</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* AUTO Mode */}
          <button
            type="button"
            onClick={() => handleSelectMode("AUTO")}
            disabled={modeMutation.isPending}
            className={`p-3.5 rounded-xl border text-left flex flex-col justify-between gap-2 transition ${
              currentMode === "AUTO"
                ? "bg-[#00D9FF]/10 border-[#00D9FF]/50 shadow-[0_0_15px_rgba(0,217,255,0.1)]"
                : "bg-black/40 border-white/5 hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">AUTO (Default)</span>
              {currentMode === "AUTO" && <Check size={14} className="text-[#00D9FF]" />}
            </div>
            <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
              Primary model first; automatically switches to Google Gemini only if primary fails or is offline.
            </p>
          </button>

          {/* PRIMARY_ONLY Mode */}
          <button
            type="button"
            onClick={() => handleSelectMode("PRIMARY_ONLY")}
            disabled={modeMutation.isPending}
            className={`p-3.5 rounded-xl border text-left flex flex-col justify-between gap-2 transition ${
              currentMode === "PRIMARY_ONLY"
                ? "bg-[#00D9FF]/10 border-[#00D9FF]/50 shadow-[0_0_15px_rgba(0,217,255,0.1)]"
                : "bg-black/40 border-white/5 hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">PRIMARY ONLY</span>
              {currentMode === "PRIMARY_ONLY" && <Check size={14} className="text-[#00D9FF]" />}
            </div>
            <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
              Strictly routes to primary model. If primary fails, uses verified evidence-only mode (never calls Gemini).
            </p>
          </button>

          {/* GEMINI_ONLY Mode */}
          <button
            type="button"
            onClick={() => handleSelectMode("GEMINI_ONLY")}
            disabled={modeMutation.isPending || !isGeminiConfigured}
            className={`p-3.5 rounded-xl border text-left flex flex-col justify-between gap-2 transition ${
              currentMode === "GEMINI_ONLY"
                ? "bg-purple-500/15 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                : isGeminiConfigured
                ? "bg-black/40 border-white/5 hover:border-white/20"
                : "bg-black/20 border-white/5 opacity-40 cursor-not-allowed"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">GEMINI ONLY</span>
              {currentMode === "GEMINI_ONLY" && <Check size={14} className="text-purple-400" />}
            </div>
            <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
              Forces all repository queries through Google Gemini fallback engine (for maintenance or extended outages).
            </p>
            {!isGeminiConfigured && (
              <span className="text-[9.5px] text-amber-400 font-semibold mt-1">Requires server API key setup</span>
            )}
          </button>
        </div>
      </div>

      {/* Recent Model Switch Incidents */}
      <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Activity size={13} className="text-[#00D9FF]" />
            <span>Recent Failover & Switch Events (Last 10)</span>
          </span>
          <span className="text-[10px] text-[#71717a] font-mono">{recentEvents.length} recorded</span>
        </div>

        {recentEvents.length === 0 ? (
          <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-center text-xs text-[#71717a]">
            No fallback switch events recorded for this workspace. All services operating normally.
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
            {recentEvents.map((evt, idx) => (
              <div
                key={evt._id || idx}
                className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                    evt.to === "gemini" ? "bg-purple-500/10 text-purple-400" : "bg-amber-500/10 text-amber-400"
                  }`}>
                    <ArrowRight size={13} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white uppercase text-[10.5px]">
                        Primary ➔ {evt.to === "gemini" ? "Google Gemini" : "Evidence Mode"}
                      </span>
                      <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-white/5 text-[#71717a] font-mono">
                        {evt.mode || "AUTO"}
                      </span>
                      {evt.isOngoing && (
                        <span className="text-[9px] font-bold text-amber-400 px-1 rounded bg-amber-500/15 border border-amber-500/25">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[10.5px] text-[#a1a1aa] truncate mt-0.5">
                      Reason: <span className="font-mono text-[#cbd5e1]">{evt.reason}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 flex flex-col items-end gap-0.5 text-[10px] text-[#71717a]">
                  <span>{new Date(evt.time || evt.createdAt).toLocaleDateString()} {new Date(evt.time || evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="font-mono text-white/80">Duration: {evt.durationText}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal for GEMINI_ONLY */}
      {confirmModalMode && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-sans select-none animate-fadeIn">
          <div className="glass-panel-premium w-full max-w-[460px] p-6 border border-white/10 rounded-2xl flex flex-col gap-4 shadow-2xl bg-[#09090b]/95 backdrop-blur-2xl text-left">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-purple-400">
                <Sparkles size={18} />
                <h4 className="text-sm font-black text-white uppercase tracking-wider">Confirm Gemini Only Routing</h4>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModalMode(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-[#d1d5db] leading-relaxed">
              Are you sure you want to force <strong>GEMINI_ONLY</strong> mode? All future questions in this workspace will bypass your local primary model and query Google Gemini directly.
            </p>
            <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
              Note: Privacy rules still apply. Gemini will only process public allowlisted repositories and respect your daily quota limit ({gemini.dailyLimit || 200} requests/day).
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10 mt-1">
              <button
                type="button"
                onClick={() => setConfirmModalMode(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-300 border border-white/10 bg-white/5 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => modeMutation.mutate(confirmModalMode)}
                disabled={modeMutation.isPending}
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-purple-600 to-[#00D9FF] hover:opacity-90 shadow-lg disabled:opacity-50 flex items-center gap-2"
              >
                {modeMutation.isPending ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                <span>Confirm Gemini Only</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

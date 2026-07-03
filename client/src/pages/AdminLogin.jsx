import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Lock, Mail, Eye, EyeOff, ArrowLeft, ShieldAlert, RefreshCw } from "lucide-react";
import API from "../services/api";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setError("");
    setLoading(true);

    try {
      const res = await API.post("/auth/login", { email: email.toLowerCase(), password });
      
      if (res.data.user.role !== "admin") {
        setError("Access denied. Administrator privileges required.");
        setLoading(false);
        return;
      }

      login(res.data.token, res.data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid administrator credentials");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-os-bg text-os-text flex items-center justify-center p-6 relative font-sans transition-colors duration-300 select-none">
      {/* Decorative Blur Blobs */}
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-brand-cyan/6 blur-[60px] pointer-events-none -z-10 animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-brand-violet/5 blur-[70px] pointer-events-none -z-10 animate-pulse-glow" style={{ animationDelay: "2s" }} />

      {/* Back button */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-8 left-8 flex items-center gap-2 text-xs font-bold text-os-text-secondary hover:text-brand-blue dark:hover:text-brand-cyan transition"
      >
        <ArrowLeft size={14} />
        <span>Back to gateway</span>
      </button>

      {/* Login Card */}
      <div className="w-full max-w-[420px] rounded-3xl border border-os-border glassmorphism p-8 md:p-10 shadow-os-light dark:shadow-os-dark flex flex-col text-left">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-cyan via-brand-blue to-brand-violet flex items-center justify-center font-black text-white text-lg shadow-md mx-auto mb-4">
            W
          </div>
          <h2 className="text-xl font-black text-os-text tracking-tight">Admin OS Portal</h2>
          <p className="text-xs text-os-text-secondary mt-1">Authenticate with supervisor keys to manage workspaces.</p>
        </div>

        {/* Warning Banner */}
        <div className="mb-5 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-[11px] font-semibold leading-relaxed flex items-start gap-2">
          <ShieldAlert size={14} className="shrink-0 mt-0.5" />
          <span>Restricted system. Unauthorized login requests are recorded.</span>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold leading-relaxed">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Email field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-os-text-secondary uppercase tracking-wider">Supervisor Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 text-os-text-muted" size={14} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="supervisor@whycode.io"
                className="w-full bg-os-surface border border-os-border rounded-xl pl-10 pr-4 py-3 text-xs text-os-text placeholder-os-text-muted focus:outline-none focus:border-brand-blue/50 dark:focus:border-brand-cyan/50 select-text"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-os-text-secondary uppercase tracking-wider">Secret Key</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 text-os-text-muted" size={14} />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-os-surface border border-os-border rounded-xl pl-10 pr-10 py-3 text-xs text-os-text placeholder-os-text-muted focus:outline-none focus:border-brand-blue/50 dark:focus:border-brand-cyan/50 select-text"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-os-text-muted hover:text-os-text"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-brand-cyan via-brand-blue to-brand-violet text-white text-xs font-bold shadow-md hover:scale-[1.02] active:scale-98 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {loading ? <RefreshCw size={13} className="animate-spin" /> : <Lock size={13} />}
            <span>Unlock Admin Panel</span>
          </button>
        </form>

      </div>
    </div>
  );
}

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, Building, ArrowLeft, Sparkles, RefreshCw } from "lucide-react";
import API from "../services/api";

export default function EmployeeLogin() {
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !companyName) return;
    setError("");
    setLoading(true);

    try {
      const res = await API.post("/auth/employee-login", {
        email: email.toLowerCase(),
        companyName: companyName.trim(),
      });
      login(res.data.token, res.data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed. Ensure your email has an active invite matching this company name.");
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
          <h2 className="text-xl font-black text-os-text tracking-tight">Employee OS Console</h2>
          <p className="text-xs text-os-text-secondary mt-1">Access your assigned sprint rooms with passwordless SSO.</p>
        </div>

        {/* Info Banner */}
        <div className="mb-5 p-3 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-brand-blue dark:text-brand-cyan text-[11px] font-semibold leading-relaxed">
          🔐 Access requires a valid company invite accepted by your email node.
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
            <label className="text-[10px] font-bold text-os-text-secondary uppercase tracking-wider">Work Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 text-os-text-muted" size={14} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-os-surface border border-os-border rounded-xl pl-10 pr-4 py-3 text-xs text-os-text placeholder-os-text-muted focus:outline-none focus:border-brand-blue/50 dark:focus:border-brand-cyan/50 select-text"
              />
            </div>
          </div>

          {/* Company Name field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-os-text-secondary uppercase tracking-wider">Company Workspace Name</label>
            <div className="relative">
              <Building className="absolute left-3.5 top-3.5 text-os-text-muted" size={14} />
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full bg-os-surface border border-os-border rounded-xl pl-10 pr-4 py-3 text-xs text-os-text placeholder-os-text-muted focus:outline-none focus:border-brand-blue/50 dark:focus:border-brand-cyan/50 select-text"
              />
            </div>
            <span className="text-[10px] text-os-text-muted font-medium pl-1 mt-0.5">Enter the exact name of the company workspace.</span>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-brand-cyan via-brand-blue to-brand-violet text-white text-xs font-bold shadow-md hover:scale-[1.02] active:scale-98 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {loading ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
            <span>Sign In to Console</span>
          </button>
        </form>

        <div className="text-center mt-6 text-[11px] text-os-text-secondary font-semibold">
          Need to configure a new workspace?{" "}
          <button
            onClick={() => navigate("/company/signup")}
            className="text-brand-blue dark:text-brand-cyan hover:underline"
          >
            Register company
          </button>
        </div>

      </div>
    </div>
  );
}

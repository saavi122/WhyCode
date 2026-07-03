import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Sparkles, RefreshCw, GitBranch } from "lucide-react";
import API from "../services/api";

export default function CompanyLogin() {
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
      login(res.data.token, res.data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
      setLoading(false);
    }
  };

  return (
    <div className="dark min-h-screen bg-[#040404] text-[#e2e8f0] flex items-center justify-center p-6 relative font-sans select-none overflow-hidden">
      {/* Dynamic Glowing Ambient Blobs */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-[#00D9FF]/8 blur-[100px] pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[#7C3AED]/6 blur-[120px] pointer-events-none -z-10 animate-pulse" style={{ animationDelay: "2s" }} />

      {/* Back to landing button */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-8 left-8 flex items-center gap-2 text-xs font-bold text-[#71717a] hover:text-[#00D9FF] transition-all duration-300"
      >
        <ArrowLeft size={14} />
        <span>Back to gateway</span>
      </button>

      {/* Glassmorphic Login Card */}
      <div className="w-full max-w-[420px] rounded-3xl border border-white/5 bg-[#0c0c0e]/80 backdrop-blur-[24px] p-8 md:p-10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] flex flex-col text-left">
        
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2.5 mb-2 cursor-pointer" onClick={() => navigate("/")}>
            <GitBranch size={24} className="text-[#00D9FF]" />
            <span className="text-xl font-bold tracking-tight text-white">
              WhyCode<span className="text-[#00D9FF]">OS</span>
            </span>
          </div>
          <h2 className="text-sm font-bold text-[#a1a1aa] tracking-tight uppercase letter-spacing-[1px]">Company OS Login</h2>
          <p className="text-xs text-[#71717a] mt-1.5">Access your team dashboard & connect repository scopes.</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold leading-relaxed">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4.5">
          
          {/* Email field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 text-[#52525b]" size={14} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-[#16161a]/60 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-[#52525b] focus:outline-none focus:border-[#00D9FF]/40 focus:ring-1 focus:ring-[#00D9FF]/10 select-text transition-all duration-300"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 text-[#52525b]" size={14} />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#16161a]/60 border border-white/5 rounded-xl pl-10 pr-10 py-3 text-xs text-white placeholder-[#52525b] focus:outline-none focus:border-[#00D9FF]/40 focus:ring-1 focus:ring-[#00D9FF]/10 select-text transition-all duration-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-[#52525b] hover:text-[#a1a1aa] transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-[#00D9FF] via-[#4F46E5] to-[#7C3AED] text-white text-xs font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {loading ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
            <span>Sign In to WhyCode OS</span>
          </button>
        </form>

        <div className="text-center mt-6 text-[11px] text-[#71717a] font-semibold">
          Don't have a company account?{" "}
          <button
            onClick={() => navigate("/company/signup")}
            className="text-[#00D9FF] hover:underline"
          >
            Register workspace
          </button>
        </div>

      </div>
    </div>
  );
}

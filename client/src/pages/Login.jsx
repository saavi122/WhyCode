import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, Eye, EyeOff, Sparkles, RefreshCw, GitBranch } from "lucide-react";
import { motion } from "framer-motion";
import AuthLayout from "../components/AuthLayout";
import RepositoryCard from "../components/RepositoryCard";
import API from "../services/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
      if (rememberMe) {
        localStorage.setItem("remembered_email", email);
      } else {
        localStorage.removeItem("remembered_email");
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
      setLoading(false);
    }
  };

  const handleOAuthLogin = (provider) => {
    console.log(`Simulating SSO redirect for ${provider}`);
    setError(`OAuth ${provider} integration is active in enterprise build.`);
  };

  return (
    <AuthLayout
      headline="The memory system for high-performing tech teams."
      description="Connect your repositories to build automated visual maps, map internal code logic dependencies, and index engineering documentation in real time."
      illustration={<RepositoryCard />}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="glass-auth-card"
      >
        {/* Header branding inside card */}
        <div className="auth-card-header">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#00D9FF]/10 border border-[#00D9FF]/20 flex items-center justify-center">
              <GitBranch size={16} className="text-[#00D9FF]" />
            </div>
            <span className="text-md font-bold tracking-tight text-white">WhyCode</span>
          </div>
          <h2 className="auth-card-title">Welcome back</h2>
          <p className="auth-card-subtitle">Sign in to your developer workspace</p>
        </div>

        {/* OAuth Buttons */}
        <div className="oauth-row">
          <button
            type="button"
            onClick={() => handleOAuthLogin("GitHub")}
            className="btn-oauth-custom"
          >
            <GitBranch size={14} className="text-white" />
            <span>GitHub</span>
          </button>
          <button
            type="button"
            onClick={() => handleOAuthLogin("Google")}
            className="btn-oauth-custom"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.555 0-6.433-2.878-6.433-6.433s2.878-6.433 6.433-6.433c1.633 0 3.125.61 4.273 1.62l3.086-3.086C19.24 2.378 15.933 1 12.24 1 6.043 1 1 6.043 1 12.24s5.043 11.24 11.24 11.24c5.899 0 10.985-4.247 10.985-11.24 0-.742-.083-1.423-.227-1.955H12.24z" />
            </svg>
            <span>Google</span>
          </button>
        </div>

        {/* Divider */}
        <div className="auth-divider-custom">
          or use credentials
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold leading-relaxed">
            ⚠️ {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="form-flow-container">
          
          {/* Email Address */}
          <div className="field-group">
            <label className="field-label">Work Email</label>
            <div className="input-wrapper">
              <span className="input-icon-left">
                <Mail size={14} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@codememory.com"
                className="input-field-custom select-text"
              />
            </div>
          </div>

          {/* Password */}
          <div className="field-group">
            <label className="field-label">Password</label>
            <div className="input-wrapper">
              <span className="input-icon-left">
                <Lock size={14} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field-custom select-text"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="btn-toggle-password-custom"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Extra options */}
          <div className="remember-row">
            <label className="checkbox-label-custom">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="checkbox-input-custom"
              />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              onClick={() => setError("Password recovery link has been requested.")}
              className="btn-forgot-password"
            >
              Forgot password?
            </button>
          </div>

          {/* Sign In submit button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-auth-submit-custom"
          >
            {loading ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
            <span>Sign In</span>
          </button>
        </form>

        <div className="auth-card-footer">
          Don't have a workspace?{" "}
          <button
            onClick={() => navigate("/signup")}
            className="auth-card-footer-link"
          >
            Sign up
          </button>
        </div>
      </motion.div>
    </AuthLayout>
  );
}

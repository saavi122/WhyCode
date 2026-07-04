import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Mail, Lock, Eye, EyeOff, Sparkles, RefreshCw, GitBranch,
  Code2, Building2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AuthLayout from "../components/AuthLayout";
import RepositoryCard from "../components/RepositoryCard";
import API from "../services/api";

/* ─── Google SVG Icon ──────────────────────────────────────────────────── */
function GoogleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" fill="#4285F4"/>
      <path d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.615 24 12.255 24z" fill="#34A853"/>
      <path d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z" fill="#FBBC05"/>
      <path d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.64 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" fill="#EA4335"/>
    </svg>
  );
}

/* ─── Tab IDs ──────────────────────────────────────────────────────────── */
const TABS = ["developer", "company"];

export default function Login() {
  const location = useLocation();
  const navigate  = useNavigate();
  const { login } = useAuth();

  /* Detect initial tab from route */
  const initialTab = location.pathname.startsWith("/company") ? "company" : "developer";
  const [activeTab, setActiveTab] = useState(initialTab);

  /* Shared state preserved on tab switch */
  const [devEmail,    setDevEmail]    = useState("");
  const [devPassword, setDevPassword] = useState("");
  const [devRemember, setDevRemember] = useState(false);
  const [devShowPw,   setDevShowPw]   = useState(false);

  const [coEmail,    setCoEmail]    = useState("");
  const [coPassword, setCoPassword] = useState("");
  const [coRemember, setCoRemember] = useState(false);
  const [coShowPw,   setCoShowPw]   = useState(false);

  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  /* Sliding indicator width/offset */
  const tabRefs  = useRef([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const idx = TABS.indexOf(activeTab);
    const el  = tabRefs.current[idx];
    if (el) {
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [activeTab]);

  /* Sync route when tab changes */
  const switchTab = (tab) => {
    setError("");
    setActiveTab(tab);
  };

  /* ── Submit handler ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const email    = activeTab === "developer" ? devEmail    : coEmail;
    const password = activeTab === "developer" ? devPassword : coPassword;
    const remember = activeTab === "developer" ? devRemember : coRemember;

    if (!email || !password) return;
    setError("");
    setLoading(true);

    try {
      const res = await API.post("/auth/login", { email: email.toLowerCase(), password });
      login(res.data.token, res.data.user);
      if (remember) {
        localStorage.setItem("remembered_email", email);
      } else {
        localStorage.removeItem("remembered_email");
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials. Please try again.");
      setLoading(false);
    }
  };

  /* ── OAuth redirect ── */
  const API_BASE =
    typeof window !== "undefined" && window.location.hostname !== "localhost"
      ? "/api"
      : "http://localhost:5000/api";

  const handleOAuth = (provider) => {
    if (provider === "GitHub") {
      window.location.href = `${API_BASE}/auth/github/authorize`;
    } else if (provider === "Google") {
      window.location.href = `${API_BASE}/auth/google`;
    }
  };

  /* ── Animation config ── */
  const tabDirection = TABS.indexOf(activeTab) === 1 ? 1 : -1;
  const slideVariants = {
    enter: (dir) => ({ opacity: 0, x: dir * 28 }),
    center: { opacity: 1, x: 0 },
    exit:  (dir) => ({ opacity: 0, x: -dir * 28 }),
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
        {/* ── Branding ── */}
        <div className="auth-card-header">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#00D9FF]/10 border border-[#00D9FF]/20 flex items-center justify-center">
              <GitBranch size={16} className="text-[#00D9FF]" />
            </div>
            <span className="text-md font-bold tracking-tight text-white">WhyCode</span>
          </div>
        </div>

        {/* ── Segmented Tabs ── */}
        <div className="auth-tab-switcher" role="tablist" aria-label="Login type">
          {/* Sliding pill indicator */}
          <span
            className="auth-tab-indicator"
            style={{ left: indicator.left, width: indicator.width }}
          />
          {TABS.map((tab, i) => (
            <button
              key={tab}
              ref={(el) => (tabRefs.current[i] = el)}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => switchTab(tab)}
              className={`auth-tab-btn ${activeTab === tab ? "auth-tab-btn--active" : ""}`}
            >
              {tab === "developer"
                ? <><Code2 size={13} /><span>Developer</span></>
                : <><Building2 size={13} /><span>Company</span></>
              }
            </button>
          ))}
        </div>

        {/* ── Animated Tab Content ── */}
        <div className="auth-tab-content-wrapper">
          <AnimatePresence mode="wait" custom={tabDirection}>
            <motion.div
              key={activeTab}
              custom={tabDirection}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              className="auth-tab-content"
            >
              {/* ── Title block ── */}
              <div className="auth-tab-title-block">
                <h2 className="auth-card-title">Welcome back</h2>
                <p className="auth-card-subtitle">
                  {activeTab === "developer"
                    ? "Sign in to your developer workspace"
                    : "Sign in to your company workspace"}
                </p>
              </div>

              {/* ── OAuth Buttons ── */}
              {activeTab === "developer" ? (
                /* DEVELOPER — Google only, full-width primary */
                <button
                  type="button"
                  onClick={() => handleOAuth("Google")}
                  className="btn-oauth-primary"
                >
                  <GoogleIcon size={16} />
                  <span>Continue with Google</span>
                </button>
              ) : (
                /* COMPANY — Google only, full-width primary */
                <button
                  type="button"
                  onClick={() => handleOAuth("Google")}
                  className="btn-oauth-primary"
                >
                  <GoogleIcon size={16} />
                  <span>Continue with Google</span>
                </button>

              )}

              {/* ── Divider ── */}
              <div className="auth-divider-custom">or use email</div>

              {/* ── Error ── */}
              {error && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold leading-relaxed">
                  ⚠️ {error}
                </div>
              )}

              {/* ── Form ── */}
              <form onSubmit={handleSubmit} className="form-flow-container">
                {/* Email */}
                <div className="field-group">
                  <label className="field-label">
                    {activeTab === "developer" ? "Email" : "Company Email"}
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon-left"><Mail size={14} /></span>
                    <input
                      type="email"
                      required
                      value={activeTab === "developer" ? devEmail : coEmail}
                      onChange={(e) =>
                        activeTab === "developer"
                          ? setDevEmail(e.target.value)
                          : setCoEmail(e.target.value)
                      }
                      placeholder={
                        activeTab === "developer"
                          ? "dev@yourcompany.com"
                          : "hr@stripe.com"
                      }
                      className="input-field-custom select-text"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="field-group">
                  <label className="field-label">Password</label>
                  <div className="input-wrapper">
                    <span className="input-icon-left"><Lock size={14} /></span>
                    <input
                      type={
                        (activeTab === "developer" ? devShowPw : coShowPw)
                          ? "text"
                          : "password"
                      }
                      required
                      value={activeTab === "developer" ? devPassword : coPassword}
                      onChange={(e) =>
                        activeTab === "developer"
                          ? setDevPassword(e.target.value)
                          : setCoPassword(e.target.value)
                      }
                      placeholder="••••••••"
                      className="input-field-custom select-text"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        activeTab === "developer"
                          ? setDevShowPw(!devShowPw)
                          : setCoShowPw(!coShowPw)
                      }
                      className="btn-toggle-password-custom"
                    >
                      {(activeTab === "developer" ? devShowPw : coShowPw)
                        ? <EyeOff size={14} />
                        : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Remember + Forgot */}
                <div className="remember-row">
                  <label className="checkbox-label-custom">
                    <input
                      type="checkbox"
                      checked={activeTab === "developer" ? devRemember : coRemember}
                      onChange={(e) =>
                        activeTab === "developer"
                          ? setDevRemember(e.target.checked)
                          : setCoRemember(e.target.checked)
                      }
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

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-auth-submit-custom"
                >
                  {loading
                    ? <RefreshCw size={13} className="animate-spin" />
                    : <Sparkles size={13} />}
                  <span>Sign In</span>
                </button>
              </form>

              {/* ── Footer ── */}
              <div className="auth-card-footer">
                {activeTab === "developer" ? (
                  <>
                    Don't have a workspace?{" "}
                    <button
                      onClick={() => navigate("/signup")}
                      className="auth-card-footer-link"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Don't have a company account?{" "}
                    <button
                      onClick={() => navigate("/company/signup")}
                      className="auth-card-footer-link"
                    >
                      Create Company
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </AuthLayout>
  );
}

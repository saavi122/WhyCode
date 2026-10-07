import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  CheckCircle, AlertTriangle, User, Mail, Sparkles, Lock, Building,
  GitFork, ShieldCheck, ArrowRight, Clock, Ban, RefreshCw, Eye, EyeOff
} from "lucide-react";
import API from "../services/api";
import "./InviteOnboarding.css";

export default function EmployeeAcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { login } = useAuth();

  // Lifecycle states: 'loading' | 'valid' | 'invalid' | 'expired' | 'accepted' | 'revoked' | 'error'
  const [statusState, setStatusState] = useState("loading");
  const [statusMessage, setStatusMessage] = useState("");

  // Invite Metadata returned from backend
  const [inviteData, setInviteData] = useState({
    email: "",
    name: "",
    companyName: "",
    role: "Backend Engineer",
    invitedBy: "",
    assignedRepo: null,
  });

  // Form inputs
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [acceptedSuccess, setAcceptedSuccess] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatusState("invalid");
        setStatusMessage("No invitation security token was provided in the URL.");
        return;
      }
      try {
        const res = await API.get(`/invites/verify/${token}`);
        if (res.data.valid) {
          setStatusState("valid");
          setInviteData({
            email: res.data.email || "",
            name: res.data.name || "",
            companyName: res.data.companyName || "WhyCode Workspace",
            role: res.data.role || "Backend Engineer",
            invitedBy: res.data.invitedBy || res.data.companyName || "Company Admin",
            assignedRepo: res.data.assignedRepo || null,
          });
          if (res.data.name) {
            setName(res.data.name);
          }
        } else {
          setStatusState(res.data.reason || "invalid");
          setStatusMessage(res.data.message || "This invitation link is invalid.");
        }
      } catch (err) {
        const reason = err.response?.data?.reason || "invalid";
        const msg = err.response?.data?.message || "Unable to verify invitation link. Please check the URL or request a new invite.";
        setStatusState(reason);
        setStatusMessage(msg);
      }
    };
    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setSubmitError("Please enter your full name.");
      return;
    }
    if (!password) {
      setSubmitError("Please enter a password.");
      return;
    }
    if (password.length < 6) {
      setSubmitError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match. Please verify both fields.");
      return;
    }

    setSubmitError("");
    setSubmitting(true);

    try {
      const res = await API.post("/invites/accept", {
        token,
        name: name.trim(),
        password,
      });

      setAcceptedSuccess(true);

      // Auto login and navigate to dashboard after short success animation
      setTimeout(() => {
        login(res.data.token, res.data.user);
        navigate("/dashboard");
      }, 900);
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Failed to accept invitation. Please try again.");
      setSubmitting(false);
    }
  };

  // Helper for password strength calculation
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: "", colorClass: "" };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd) || /[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 1, label: "Weak", colorClass: "weak" };
    if (score === 2) return { score: 2, label: "Fair", colorClass: "fair" };
    if (score === 3) return { score: 3, label: "Good", colorClass: "good" };
    return { score: 4, label: "Strong", colorClass: "strong" };
  };

  const pwdStrength = getPasswordStrength(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const isFormValid = name.trim().length > 0 && password.length >= 6 && password === confirmPassword;

  // -------------------------------------------------------------
  // STATE 1: LOADING
  // -------------------------------------------------------------
  if (statusState === "loading") {
    return (
      <div className="wc-invite" style={{ justifyContent: "center" }}>
        <div className="wc-glow-1" />
        <div className="wc-glow-2" />
        <div className="wc-form-card" style={{ maxWidth: "420px", textAlign: "center", alignItems: "center" }}>
          <div className="wc-icon-chip cyan" style={{ width: "56px", height: "56px", marginBottom: "20px" }}>
            <RefreshCw size={24} className="animate-spin" />
          </div>
          <h3 className="wc-form-h2" style={{ fontSize: "22px", textTransform: "uppercase" }}>Verifying Invitation</h3>
          <p className="wc-form-sub" style={{ marginBottom: 0 }}>
            Validating invitation security token and matching workspace credentials...
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STATE: ACCEPTED SUCCESS ANIMATION
  // -------------------------------------------------------------
  if (acceptedSuccess) {
    return (
      <div className="wc-invite" style={{ justifyContent: "center" }}>
        <div className="wc-glow-1" />
        <div className="wc-glow-2" />
        <div className="wc-form-card" style={{ maxWidth: "440px", textAlign: "center", alignItems: "center" }}>
          <div className="wc-icon-chip emerald" style={{ width: "64px", height: "64px", borderRadius: "50%", marginBottom: "20px" }}>
            <CheckCircle size={32} />
          </div>
          <h3 className="wc-form-h2" style={{ fontSize: "24px", textTransform: "uppercase" }}>Invitation Accepted!</h3>
          <p className="wc-form-sub">
            Your account is now linked with <strong>{inviteData.companyName}</strong>. Setting up your workspace console...
          </p>
          <div style={{ display: "flex", itemsCenter: "center", gap: "8px", color: "var(--cyan)", fontWeight: 700, fontSize: "14px" }}>
            <RefreshCw size={16} className="animate-spin" />
            <span>Redirecting to WhyCode Dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STATES: EXPIRED / ACCEPTED / INVALID / REVOKED
  // -------------------------------------------------------------
  if (statusState !== "valid") {
    const errorConfigs = {
      expired: {
        icon: Clock,
        chipClass: "indigo",
        title: "Invitation Expired",
        buttonText: "Go to Employee Login",
        action: () => navigate("/employee/login"),
      },
      accepted: {
        icon: CheckCircle,
        chipClass: "emerald",
        title: "Invitation Already Accepted",
        buttonText: "Sign In to Workspace Console →",
        action: () => navigate("/employee/login"),
      },
      revoked: {
        icon: Ban,
        chipClass: "indigo",
        title: "Invitation Revoked",
        buttonText: "Back to Home Gateway",
        action: () => navigate("/"),
      },
      invalid: {
        icon: AlertTriangle,
        chipClass: "indigo",
        title: "Invalid Invitation Link",
        buttonText: "Back to Home Gateway",
        action: () => navigate("/"),
      },
    };

    const cfg = errorConfigs[statusState] || errorConfigs.invalid;
    const IconComp = cfg.icon;

    return (
      <div className="wc-invite" style={{ justifyContent: "center" }}>
        <div className="wc-glow-1" />
        <div className="wc-glow-2" />
        <div className="wc-form-card" style={{ maxWidth: "440px", textAlign: "center", alignItems: "center" }}>
          <div className={`wc-icon-chip ${cfg.chipClass}`} style={{ width: "56px", height: "56px", marginBottom: "20px" }}>
            <IconComp size={26} />
          </div>
          <h2 className="wc-form-h2" style={{ fontSize: "22px", textTransform: "uppercase" }}>{cfg.title}</h2>
          <p className="wc-form-sub">
            {statusMessage || "The invitation link you followed is no longer active or valid."}
          </p>
          <button onClick={cfg.action} className="wc-btn-primary" style={{ marginTop: "16px" }}>
            <span>{cfg.buttonText}</span>
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STATE 2: VALID INVITATION ONBOARDING FORM
  // Premium Enterprise SaaS Onboarding Experience (Linear + Vercel + Stripe tier):
  // Plain CSS scoped under .wc-invite in InviteOnboarding.css
  // -------------------------------------------------------------
  return (
    <div className="wc-invite">
      
      {/* Background Ambient Glows & Grid */}
      <div className="wc-glow-1" />
      <div className="wc-glow-2" />
      <div className="wc-grid-pattern" />

      {/* TOP HEADER */}
      <header className="wc-top-bar">
        <div className="wc-brand-logo" onClick={() => navigate("/")}>
          <div className="wc-logo-chip">W</div>
          <div className="wc-logo-meta">
            <span className="wc-logo-title">WHYCODE</span>
            <span className="wc-logo-subtitle">Enterprise workspace onboarding</span>
          </div>
        </div>

        {/* Secure SSL Badge */}
        <div className="wc-ssl-badge">
          <ShieldCheck size={14} />
          <span>256-BIT SSL ENCRYPTED INVITATION</span>
        </div>
      </header>

      {/* MAIN TWO-COLUMN GRID */}
      <main className="wc-grid">
        
        {/* LEFT COLUMN */}
        <div className="wc-left-col">
          <div>
            {/* Workspace Invitation Pill Badge */}
            <div className="wc-pill-badge">
              <Sparkles size={12} className="animate-pulse" />
              <span>Workspace invitation</span>
            </div>

            {/* Hero Heading */}
            <h1 className="wc-hero-h1">
              Join <span className="wc-gradient-text">{inviteData.companyName || "WhyCode Workspace"}</span>
              <br />
              on WhyCode
            </h1>

            {/* Inviter Subtext */}
            <p className="wc-hero-sub">
              {inviteData.invitedBy ? (
                <>
                  <strong>{inviteData.invitedBy}</strong> has granted you <strong className="wc-role-highlight">{inviteData.role || "developer"}</strong> access to their engineering workspace.
                </>
              ) : (
                "You've been invited to collaborate in this engineering workspace."
              )}
            </p>

            {/* Single Glass Details Card */}
            <div className="wc-details-card">
              
              {/* Row 1: Workspace */}
              <div className="wc-details-row">
                <div className="wc-avatar-chip">
                  {inviteData.companyName ? inviteData.companyName.charAt(0).toUpperCase() : "W"}
                </div>
                <div className="wc-details-info">
                  <span className="wc-details-label">WORKSPACE</span>
                  <span className="wc-details-val">{inviteData.companyName || "WhyCode Workspace"}</span>
                </div>
              </div>

              {/* Row 2: Invited Email */}
              <div className="wc-details-row">
                <div className="wc-icon-chip indigo">
                  <Mail size={18} />
                </div>
                <div className="wc-details-info">
                  <span className="wc-details-label">INVITED EMAIL</span>
                  <span className="wc-details-val mono">{inviteData.email}</span>
                </div>
              </div>

              {/* Row 3: Assigned Role */}
              <div className="wc-details-row">
                <div className="wc-icon-chip emerald">
                  <User size={18} />
                </div>
                <div className="wc-details-info">
                  <span className="wc-details-label">ASSIGNED ROLE</span>
                  <span className="wc-role-pill">{inviteData.role || "Developer"}</span>
                </div>
              </div>

              {/* Row 4: Target Code Repository */}
              <div className="wc-details-row">
                <div className="wc-icon-chip cyan">
                  <GitFork size={18} />
                </div>
                <div className="wc-details-info">
                  <span className="wc-details-label">TARGET CODE REPOSITORY</span>
                  <span className={`wc-details-val mono ${inviteData.assignedRepo ? "cyan" : ""}`} style={{ fontWeight: inviteData.assignedRepo ? 500 : 400, fontStyle: inviteData.assignedRepo ? "normal" : "italic" }}>
                    {inviteData.assignedRepo || "No repository assigned"}
                  </span>
                </div>
                {inviteData.assignedRepo && (
                  <span className="wc-branch-pill">MAIN</span>
                )}
              </div>

            </div>

            {/* Feature Benefit List */}
            <div className="wc-benefits">
              <div className="wc-benefit-item">
                <CheckCircle size={15} />
                <span>Answers grounded in connected repository with citations</span>
              </div>
              <div className="wc-benefit-item">
                <CheckCircle size={15} />
                <span>Understand why code changed & logical rationale</span>
              </div>
              <div className="wc-benefit-item">
                <CheckCircle size={15} />
                <span>Secure 256-bit encrypted workspace access</span>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN (FORM CARD) */}
        <div>
          <div className="wc-form-card">
            
            {/* Stepper */}
            <div className="wc-stepper">
              <div className="wc-step-item completed">
                <div className="wc-step-circle completed">✓</div>
                <span>Token verified</span>
              </div>
              <div className="wc-step-line" />
              <div className="wc-step-item">
                <div className="wc-step-circle active">2</div>
                <span>Complete profile</span>
              </div>
            </div>

            {/* Title & Helper Text */}
            <h2 className="wc-form-h2">Complete your profile</h2>
            <p className="wc-form-sub">
              Set up your credentials to activate access to your team's workspace.
            </p>

            {/* Error Alert */}
            {submitError && (
              <div role="alert" aria-live="polite" className="wc-error-alert">
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{submitError}</span>
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="wc-form-fields">
              
              {/* Field 1: Invitation email (Read-only) */}
              <div className="wc-field-group">
                <label htmlFor="invitation-email" className="wc-field-label">
                  Invitation email
                </label>
                <div className="wc-input-wrapper">
                  <Mail size={16} className="wc-input-icon" />
                  <input
                    id="invitation-email"
                    type="email"
                    disabled
                    value={inviteData.email}
                    className="wc-input"
                  />
                  <span className="wc-readonly-tag">READ ONLY</span>
                </div>
              </div>

              {/* Field 2: Full name Input */}
              <div className="wc-field-group">
                <label htmlFor="full-name" className="wc-field-label">
                  Full name
                </label>
                <div className="wc-input-wrapper">
                  <User size={16} className="wc-input-icon" />
                  <input
                    id="full-name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="wc-input"
                  />
                </div>
              </div>

              {/* Field 3: Create password Input */}
              <div className="wc-field-group">
                <div className="wc-field-header">
                  <label htmlFor="create-password" className="wc-field-label">
                    Create password
                  </label>
                  {password && (
                    <span className={`wc-pwd-match ${pwdStrength.colorClass === 'strong' ? 'pass' : ''}`}>
                      Strength: {pwdStrength.label}
                    </span>
                  )}
                </div>
                <div className="wc-input-wrapper">
                  <Lock size={16} className="wc-input-icon" />
                  <input
                    id="create-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="wc-input"
                    style={{ paddingRight: "44px" }}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="wc-eye-btn"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password Checklist & Strength bar */}
                {password.length > 0 && (
                  <div className="wc-pwd-checklist">
                    <div className="wc-strength-bars">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`wc-strength-bar ${step <= pwdStrength.score ? pwdStrength.colorClass : ""}`}
                        />
                      ))}
                    </div>
                    <div className={`wc-pwd-rule ${password.length >= 6 ? 'pass' : 'fail'}`}>
                      {password.length >= 6 ? "✓" : "○"} At least 6 characters
                    </div>
                  </div>
                )}
              </div>

              {/* Field 4: Confirm password Input */}
              <div className="wc-field-group">
                <div className="wc-field-header">
                  <label htmlFor="confirm-password" className="wc-field-label">
                    Confirm password
                  </label>
                  {confirmPassword.length > 0 && (
                    <span className={`wc-pwd-match ${passwordsMatch ? "pass" : "fail"}`}>
                      {passwordsMatch ? "Passwords match ✓" : "Passwords do not match"}
                    </span>
                  )}
                </div>
                <div className="wc-input-wrapper">
                  <Lock size={16} className="wc-input-icon" />
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    placeholder="Re-enter password to verify"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="wc-input"
                    style={{ paddingRight: "44px" }}
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="wc-eye-btn"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Primary CTA Button */}
              <button
                type="submit"
                disabled={submitting || !isFormValid}
                className="wc-btn-primary"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Creating workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Accept Invitation & Launch Workspace</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Sign-In Footer */}
            <div className="wc-signin-footer">
              <span>Already have an account?</span>
              <button
                onClick={() => navigate("/employee/login")}
                className="wc-signin-link"
              >
                <span>Sign in</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

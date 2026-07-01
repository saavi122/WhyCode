import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CheckCircle, AlertTriangle, User, Mail, Sparkles } from "lucide-react";
import API from "../services/api";
import "./Auth.css";

export default function EmployeeAcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { login } = useAuth();

  const [verifying, setVerifying] = useState(true);
  const [inviteValid, setInviteValid] = useState(false);
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [name, setName] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setErrorMsg("Missing invitation token.");
        setVerifying(false);
        return;
      }
      try {
        const res = await API.get(`/invites/verify/${token}`);
        setInviteValid(true);
        setEmail(res.data.email);
        setCompanyName(res.data.companyName);
      } catch (err) {
        setErrorMsg(err.response?.data?.message || "This invitation link is invalid or has expired.");
      } finally {
        setVerifying(false);
      }
    };
    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitError("");
    setSubmitting(true);
    try {
      const res = await API.post("/invites/accept", { token, name });
      login(res.data.token, res.data.user);
      navigate("/dashboard");
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Failed to complete registration.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderBackground = () => (
    <>
      <div className="bg-grid"></div>
      <div className="noise-overlay"></div>
      <div className="aurora-container">
        <div className="aurora-light-purple"></div>
        <div className="aurora-light-emerald"></div>
      </div>
    </>
  );

  if (verifying) {
    return (
      <div className="auth-split-container" style={{ justifyContent: "center", alignItems: "center" }}>
        {renderBackground()}
        <div style={{ textAlign: "center", zIndex: 10 }}>
          <div style={{ fontSize: "36px", marginBottom: "16px", animation: "spin 1s linear infinite", display: "inline-block" }}>⚡</div>
          <p style={{ fontSize: "14px", color: "#a1a1aa", fontWeight: "500" }}>Verifying your invitation link...</p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!inviteValid) {
    return (
      <div className="auth-split-container" style={{ justifyContent: "center", alignItems: "center" }}>
        {renderBackground()}
        <div className="glass-auth-card" style={{ zIndex: 10, textAlign: "center" }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            backgroundColor: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.15)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ef4444",
            marginBottom: "20px"
          }}>
            <AlertTriangle size={22} />
          </div>
          <h2 className="auth-title" style={{ color: "#ffffff" }}>Link Invalid or Expired</h2>
          <p className="auth-subtitle" style={{ marginBottom: "28px" }}>{errorMsg}</p>
          <button
            onClick={() => navigate("/employee/login")}
            className="btn-auth-submit"
            style={{ fontWeight: "700" }}
          >
            Go to Employee Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-split-container" style={{ justifyContent: "center", alignItems: "center" }}>
      {renderBackground()}
      
      <div className="glass-auth-card" style={{ zIndex: 10 }}>
        <div className="auth-header">
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            backgroundColor: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.15)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#10b981",
            marginBottom: "20px"
          }}>
            <CheckCircle size={22} />
          </div>
          <h2 className="auth-title" style={{ fontSize: "26px", fontWeight: "800", color: "#ffffff" }}>
            You're Invited!
          </h2>
          <p className="auth-subtitle">
            Join <strong style={{ color: "#ffffff" }}>{companyName}</strong> on CodeMemory
          </p>
        </div>

        {/* No password info banner */}
        <div style={{
          backgroundColor: "rgba(16, 185, 129, 0.04)",
          border: "1px solid rgba(16, 185, 129, 0.1)",
          borderRadius: "14px",
          padding: "14px 16px",
          marginBottom: "28px",
          fontSize: "12px",
          color: "#10b981",
          lineHeight: "1.6",
          display: "flex",
          gap: "8px",
          alignItems: "flex-start"
        }}>
          <Sparkles size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
          <span>No password required. You'll sign in anytime with just your email and company name.</span>
        </div>

        {submitError && (
          <div style={{
            backgroundColor: "rgba(239, 68, 68, 0.06)",
            border: "1px solid rgba(239, 68, 68, 0.15)",
            borderRadius: "12px",
            padding: "12px",
            color: "#ef4444",
            fontSize: "12px",
            marginBottom: "20px",
            textAlign: "center"
          }}>
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Email (read-only) */}
          <div className="form-group">
            <label className="form-label">
              Email Address
            </label>
            <div className="input-container">
              <Mail size={16} className="input-icon" />
              <input
                type="text"
                value={email}
                disabled
                className="input-field"
                style={{
                  color: "#6b7280",
                  cursor: "not-allowed",
                  borderColor: "rgba(255, 255, 255, 0.03)",
                  background: "rgba(255, 255, 255, 0.005)"
                }}
              />
            </div>
          </div>

          {/* Full Name */}
          <div className="form-group">
            <label className="form-label">
              Your Full Name
            </label>
            <div className="input-container">
              <User size={16} className="input-icon" />
              <input
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="input-field"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-auth-submit"
          >
            {submitting ? "Joining Workspace..." : "Join CodeMemory →"}
          </button>
        </form>
      </div>
    </div>
  );
}

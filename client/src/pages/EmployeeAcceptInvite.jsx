import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CheckCircle, AlertTriangle, User } from "lucide-react";
import API from "../services/api";

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

  if (verifying) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        backgroundColor: "#0a0f1e", color: "#f9fafb", fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{ fontSize: "32px", marginBottom: "16px", animation: "spin 1s linear infinite", display: "inline-block" }}>⚡</div>
        <p style={{ fontSize: "14px", color: "#6b7280" }}>Verifying your invitation link...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!inviteValid) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        backgroundColor: "#0a0f1e", color: "#f9fafb", fontFamily: "'Inter', sans-serif", padding: "24px"
      }}>
        <div style={{
          width: "100%", maxWidth: "420px", backgroundColor: "#111827",
          border: "1px solid #1f2937", borderRadius: "16px", padding: "40px",
          boxShadow: "0 20px 40px -15px rgba(0,0,0,0.7)", textAlign: "center"
        }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "50%",
            backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            color: "#ef4444", marginBottom: "16px"
          }}>
            <AlertTriangle size={20} />
          </div>
          <h2 style={{ fontSize: "18px", fontWeight: "900", margin: "0 0 10px 0" }}>Link Invalid or Expired</h2>
          <p style={{ fontSize: "13px", color: "#6b7280", lineHeight: "1.6", margin: "0 0 24px 0" }}>{errorMsg}</p>
          <button
            onClick={() => navigate("/employee/login")}
            style={{
              width: "100%", backgroundColor: "#1f2937", border: "1px solid #374151",
              color: "#fff", padding: "12px", borderRadius: "8px",
              fontWeight: "700", fontSize: "13px", cursor: "pointer"
            }}
          >
            Go to Employee Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      backgroundColor: "#0a0f1e", color: "#f9fafb", fontFamily: "'Inter', sans-serif", padding: "24px"
    }}>
      <div style={{
        width: "100%", maxWidth: "440px", backgroundColor: "#111827",
        border: "1px solid #1f2937", borderRadius: "16px", padding: "40px",
        boxShadow: "0 20px 40px -15px rgba(0,0,0,0.7)"
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "50%",
            backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            color: "#10b981", marginBottom: "16px"
          }}>
            <CheckCircle size={20} />
          </div>
          <h2 style={{ fontSize: "18px", fontWeight: "900", margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>
            You're Invited!
          </h2>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
            Join <strong style={{ color: "#fff" }}>{companyName}</strong> on CodeMemory
          </p>
        </div>

        {/* No password info */}
        <div style={{
          backgroundColor: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)",
          borderRadius: "10px", padding: "12px 14px", marginBottom: "24px",
          fontSize: "12px", color: "#10b981", lineHeight: "1.6"
        }}>
          🔐 No password required. You'll sign in anytime with just your email and company name.
        </div>

        {submitError && (
          <div style={{
            backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: "10px", padding: "12px", color: "#ef4444",
            fontSize: "12px", marginBottom: "20px", textAlign: "center"
          }}>
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Email (read-only) */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#6b7280", display: "block", marginBottom: "6px" }}>
              Email Address
            </label>
            <input
              type="text"
              value={email}
              disabled
              style={{
                width: "100%", backgroundColor: "#1f2937", border: "1px solid #1f2937",
                borderRadius: "8px", padding: "10px 12px", color: "#6b7280",
                fontSize: "13px", cursor: "not-allowed", boxSizing: "border-box"
              }}
            />
          </div>

          {/* Full Name */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#6b7280", display: "block", marginBottom: "6px" }}>
              Your Full Name
            </label>
            <div style={{ position: "relative" }}>
              <User size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
              <input
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: "100%", backgroundColor: "#1f2937", border: "1px solid #374151",
                  borderRadius: "8px", padding: "10px 12px 10px 36px", color: "#fff",
                  fontSize: "13px", outline: "none", boxSizing: "border-box"
                }}
                onFocus={(e) => e.target.style.borderColor = "#10b981"}
                onBlur={(e) => e.target.style.borderColor = "#374151"}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              backgroundColor: "#10b981", border: "none", color: "#fff",
              padding: "12px", borderRadius: "8px", fontWeight: "700",
              fontSize: "13px", cursor: "pointer", marginTop: "12px",
              transition: "opacity 0.2s", opacity: submitting ? 0.7 : 1
            }}
          >
            {submitting ? "Joining Workspace..." : "Join CodeMemory →"}
          </button>
        </form>
      </div>
    </div>
  );
}

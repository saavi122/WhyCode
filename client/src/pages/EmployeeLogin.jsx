import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, Building2, ArrowRight, AlertTriangle } from "lucide-react";
import API from "../services/api";

export default function EmployeeLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await API.post("/auth/employee-login", { email, companyName });
      login(res.data.token, res.data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Check your email and company name.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0a0f1e",
      color: "#f9fafb",
      fontFamily: "'Inter', sans-serif",
      padding: "24px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Gradient blob */}
      <div style={{
        position: "absolute", top: "20%", left: "50%", transform: "translate(-50%,-50%)",
        width: "400px", height: "400px",
        background: "radial-gradient(circle, rgba(6,182,212,0.12) 0%, rgba(0,0,0,0) 70%)",
        filter: "blur(60px)", pointerEvents: "none"
      }} />

        <div className="glass-card-premium" style={{
          width: "100%", maxWidth: "420px", padding: "40px",
          position: "relative", zIndex: 10, border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 24px 48px -12px rgba(0,0,0,0.8), inset 0 2px 20px rgba(255,255,255,0.05)"
        }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{
              width: "48px", height: "48px", borderRadius: "14px",
              background: "linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: "22px", fontWeight: "900", color: "#fff", marginBottom: "16px",
              boxShadow: "0 4px 15px rgba(6,182,212,0.4)"
            }}>C</div>
            <h1 style={{ fontSize: "20px", fontWeight: "900", letterSpacing: "-0.03em", margin: "0 0 6px 0", color: "#f3f4f6" }}>
              Employee Sign In
            </h1>
            <p style={{ fontSize: "13px", color: "#9ca3af", margin: 0 }}>
              No password needed — just your email and company name.
            </p>
          </div>

          {/* Info Banner */}
          <div style={{
            backgroundColor: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)",
            borderRadius: "10px", padding: "12px 14px", marginBottom: "24px",
            fontSize: "12px", color: "#06b6d4", lineHeight: "1.6"
          }}>
            🔐 Access is granted only if your email has an accepted invitation from the company.
          </div>

          {/* Error */}
          {error && (
            <div style={{
              backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "10px", padding: "12px", color: "#ef4444",
              fontSize: "12px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px",
              boxShadow: "0 2px 10px rgba(239,68,68,0.1)"
            }}>
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Email */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#9ca3af", display: "block", marginBottom: "6px" }}>
                Work Email
              </label>
              <div style={{ position: "relative" }}>
                <Mail size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="glass-input"
                  style={{ padding: "11px 12px 11px 36px" }}
                />
              </div>
            </div>

            {/* Company Name */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#9ca3af", display: "block", marginBottom: "6px" }}>
                Company Name
              </label>
              <div style={{ position: "relative" }}>
                <Building2 size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                <input
                  type="text"
                  placeholder="e.g. Acme Corp"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  className="glass-input"
                  style={{ padding: "11px 12px 11px 36px" }}
                />
              </div>
              <p style={{ fontSize: "11px", color: "#6b7280", margin: "6px 0 0 0" }}>
                Enter the exact company name you were invited to
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-glass-primary"
              style={{
                padding: "13px", marginTop: "8px", display: "flex", alignItems: "center",
                justifyContent: "center", gap: "8px", opacity: loading ? 0.7 : 1,
                width: "100%", background: "linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(99,102,241,0.2) 100%)",
                borderColor: "rgba(6,182,212,0.3)"
              }}
            >
              {loading ? (
                <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⚡</span>
              ) : (
                <ArrowRight size={15} />
              )}
              <span>{loading ? "Signing in..." : "Sign In to Workspace"}</span>
            </button>
          </form>

          {/* Footer links */}
          <div style={{ marginTop: "24px", textAlign: "center", fontSize: "12px", color: "#9ca3af" }}>
            Not an employee?{" "}
            <Link to="/company/login" style={{ color: "#818cf8", fontWeight: "700", textDecoration: "none" }}>
              Company Login
            </Link>
            {" · "}
            <Link to="/" style={{ color: "#9ca3af", textDecoration: "none" }}>
              Back
            </Link>
          </div>
        </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

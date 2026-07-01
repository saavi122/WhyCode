import React, { useState } from "react";
import { X, Mail, User, Send, Check, GitBranch } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import API from "../services/api";

export default function InviteModal({ isOpen, onClose, onInviteSent }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [assignedRepo, setAssignedRepo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Fetch connected repos for assignment
  const { data: repos } = useQuery({
    queryKey: ["repositories"],
    queryFn: async () => {
      const res = await API.get("/repositories");
      return res.data;
    },
    enabled: isOpen,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !name) return;
    setError("");
    setLoading(true);

    try {
      await API.post("/invites/send", {
        email,
        name,
        assignedRepo: assignedRepo || null,
      });
      setSuccess(true);
      setEmail("");
      setName("");
      setAssignedRepo("");
      if (onInviteSent) onInviteSent();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send invitation.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, fontFamily: "'Inter', sans-serif"
    }}>
      <div className="glass-card-premium" style={{
        padding: "32px", width: "100%", maxWidth: "420px", position: "relative",
        boxShadow: "0 24px 48px -12px rgba(0,0,0,0.8), inset 0 2px 20px rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)"
      }}>
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: "20px", right: "20px",
            background: "none", border: "none", cursor: "pointer", color: "#6b7280"
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
          onMouseLeave={(e) => e.currentTarget.style.color = "#6b7280"}
        >
          <X size={18} />
        </button>

        <h3 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 4px 0" }}>Invite Team Member</h3>
        <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 24px 0" }}>
          Send a secure invitation. The employee will sign in with email + company name — no password needed.
        </p>

        {success && (
          <div style={{
            backgroundColor: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)",
            borderRadius: "10px", padding: "12px", color: "#10b981",
            fontSize: "12px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px", justifyContent: "center"
          }}>
            <Check size={16} />
            <span>Invitation sent! They'll receive an email shortly.</span>
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: "10px", padding: "12px", color: "#ef4444",
            fontSize: "12px", marginBottom: "20px", textAlign: "center"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Name */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#6b7280", display: "block", marginBottom: "6px" }}>
              Employee Name
            </label>
            <div style={{ position: "relative" }}>
              <User size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
              <input
                type="text"
                placeholder="Alex River"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="glass-input"
                style={{ paddingLeft: "36px" }}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#6b7280", display: "block", marginBottom: "6px" }}>
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <Mail size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
              <input
                type="email"
                placeholder="alex@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="glass-input"
                style={{ paddingLeft: "36px" }}
              />
            </div>
          </div>

          {/* Assign Repo (optional) */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#6b7280", display: "block", marginBottom: "6px" }}>
              Assign Repository <span style={{ fontWeight: "400", textTransform: "none", color: "#4b5563" }}>(optional)</span>
            </label>
            <div style={{ position: "relative" }}>
              <GitBranch size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
              <select
                value={assignedRepo}
                onChange={(e) => setAssignedRepo(e.target.value)}
                className="glass-input"
                style={{ paddingLeft: "36px", color: assignedRepo ? "#fff" : "#9ca3af", appearance: "none", cursor: "pointer" }}
              >
                <option value="">— No specific repo —</option>
                {repos?.map((repo) => (
                  <option key={repo._id} value={repo.fullName} style={{ color: "#fff", backgroundColor: "#111827" }}>
                    {repo.fullName}
                  </option>
                ))}
              </select>
            </div>
            <p style={{ fontSize: "11px", color: "#4b5563", margin: "4px 0 0 0" }}>
              The employee will be shown this repo in their dashboard.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="btn-glass-primary"
            style={{
              padding: "12px", marginTop: "8px", display: "flex", alignItems: "center",
              justifyContent: "center", gap: "8px",
              opacity: loading || success ? 0.7 : 1
            }}
          >
            {loading ? (
              <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⚡</span>
            ) : (
              <Send size={14} />
            )}
            <span>{loading ? "Sending Invite..." : "Send Invitation"}</span>
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

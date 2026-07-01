import React, { useState, useEffect } from "react";
import { X, GitBranch, AlertCircle, Search, Lock, Star, RefreshCw, CheckCircle, Mail, User, Send } from "lucide-react";
import API from "../services/api";

// ─────────────────────────────────────────────
// Main Modal — wraps two sub-flows:
//   1. Connect a repo (from GitHub or manual)
//   2. After connecting, invite employees to it
// ─────────────────────────────────────────────
export default function ConnectRepoModal({ isOpen, onClose, onConnected }) {
  const [mode, setMode] = useState("github"); // "github" | "manual"
  const [githubRepos, setGithubRepos] = useState([]);
  const [loadingGithub, setLoadingGithub] = useState(false);
  const [githubError, setGithubError] = useState("");
  const [notConnected, setNotConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Manual input
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // After connecting: show "Invite to Repo" mini-form
  const [justConnected, setJustConnected] = useState(null); // fullName of just-connected repo
  const [showInvite, setShowInvite] = useState(false);

  const fetchGithubRepos = async () => {
    setLoadingGithub(true);
    setGithubError("");
    setNotConnected(false);
    try {
      const res = await API.get("/github/repositories");
      setGithubRepos(res.data);
    } catch (err) {
      // If HTTP 400 or not connected property, show install redirect CTA
      setNotConnected(true);
      setGithubError(err.response?.data?.message || "GitHub App is not connected to this workspace.");
    } finally {
      setLoadingGithub(false);
    }
  };

  const initiateAppInstall = async () => {
    try {
      const res = await API.get("/github/install");
      if (res.data?.installUrl) {
        window.location.href = res.data.installUrl;
      }
    } catch (err) {
      showToast("Failed to initiate App installation link.", "error");
    }
  };

  useEffect(() => {
    if (isOpen && mode === "github") fetchGithubRepos();
  }, [isOpen, mode]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setJustConnected(null);
      setShowInvite(false);
      setError("");
      setFullName("");
      setSearchTerm("");
    }
  }, [isOpen]);

  const connectRepo = async (repoFullName) => {
    setError("");
    try {
      // Add repo to monitored list using select-repositories endpoint
      await API.post("/github/select-repositories", { selectedRepos: [repoFullName] });
      setJustConnected(repoFullName);
      if (onConnected) onConnected();
      fetchGithubRepos(); // refresh list to mark connected
    } catch (err) {
      setError(err.response?.data?.message || `Failed to connect ${repoFullName}`);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!fullName) return;
    if (!fullName.includes("/")) {
      setError("Please use owner/repo format e.g. facebook/react");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await API.post("/repositories", { fullName });
      setJustConnected(fullName);
      setFullName("");
      if (onConnected) onConnected();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to connect repository.");
    } finally {
      setLoading(false);
    }
  };

  const filteredRepos = githubRepos.filter((r) =>
    r.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  // ── After connecting: show success + option to invite ──
  if (justConnected && showInvite) {
    return (
      <div style={overlayStyle}>
        <div className="glass-card-premium" style={{ ...panelStyle, maxWidth: "440px" }}>
          <button onClick={onClose} style={closeBtn} onMouseEnter={(e) => e.currentTarget.style.color = "#fff"} onMouseLeave={(e) => e.currentTarget.style.color = "#6b7280"}>
            <X size={18} />
          </button>
          <InviteToRepoForm repoFullName={justConnected} onClose={onClose} onBack={() => setShowInvite(false)} />
        </div>
        <style>{keyframes}</style>
      </div>
    );
  }

  if (justConnected) {
    return (
      <div style={overlayStyle}>
        <div className="glass-card-premium" style={{ ...panelStyle, maxWidth: "440px" }}>
          <button onClick={onClose} style={closeBtn} onMouseEnter={(e) => e.currentTarget.style.color = "#fff"} onMouseLeave={(e) => e.currentTarget.style.color = "#6b7280"}>
            <X size={18} />
          </button>

          <div style={{ textAlign: "center", padding: "32px 0 16px" }}>
            <div style={{
              width: "52px", height: "52px", borderRadius: "50%",
              backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              color: "#10b981", marginBottom: "16px"
            }}>
              <CheckCircle size={24} />
            </div>
            <h3 style={{ fontSize: "16px", fontWeight: "900", margin: "0 0 6px 0" }}>Repository Connected!</h3>
            <code style={{ fontSize: "12px", color: "#6366f1", backgroundColor: "rgba(99,102,241,0.08)", padding: "3px 10px", borderRadius: "6px" }}>
              {justConnected}
            </code>
            <p style={{ fontSize: "12px", color: "#6b7280", margin: "14px 0 0 0", lineHeight: "1.6" }}>
              Now invite employees to collaborate in this repository.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "0 4px 8px" }}>
            <button
              onClick={() => setShowInvite(true)}
              style={{
                backgroundColor: "#6366f1", border: "none", color: "#fff",
                padding: "13px", borderRadius: "10px", fontWeight: "700", fontSize: "13px",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
              }}
            >
              <Mail size={14} />
              Invite Employees to This Repo
            </button>
            <button
              onClick={onClose}
              style={{
                backgroundColor: "transparent", border: "1px solid #374151", color: "#9ca3af",
                padding: "11px", borderRadius: "10px", fontWeight: "700", fontSize: "13px", cursor: "pointer"
              }}
            >
              Done
            </button>
          </div>
        </div>
        <style>{keyframes}</style>
      </div>
    );
  }

  // ── Main connect flow ──
  return (
    <div style={overlayStyle}>
      <div className="glass-card-premium" style={{ ...panelStyle, maxWidth: "580px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "24px 28px 20px", borderBottom: "1px solid #1f2937", flexShrink: 0 }}>
          <button onClick={onClose} style={closeBtn} onMouseEnter={(e) => e.currentTarget.style.color = "#fff"} onMouseLeave={(e) => e.currentTarget.style.color = "#6b7280"}>
            <X size={18} />
          </button>
          <h3 style={{ fontSize: "16px", fontWeight: "850", color: "#f9fafb", margin: "0 0 4px 0" }}>
            Connect GitHub Repository
          </h3>
          <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
            Select from your GitHub account or enter a path manually. Then invite employees to it.
          </p>

          {/* Mode Tabs */}
          <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            {[
              { key: "github", label: "From GitHub Account", icon: <GitBranch size={13} /> },
              { key: "manual", label: "Enter Manually", icon: <Search size={13} /> },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setMode(tab.key)}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "6px 14px", borderRadius: "6px", fontSize: "11px", fontWeight: "700",
                  cursor: "pointer", border: "1px solid",
                  backgroundColor: mode === tab.key ? "#6366f1" : "transparent",
                  borderColor: mode === tab.key ? "#6366f1" : "#374151",
                  color: mode === tab.key ? "#fff" : "#9ca3af",
                  transition: "all 0.2s"
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px 28px" }}>

          {/* Error banner */}
          {error && (
            <div style={{
              backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "8px", padding: "10px 14px", marginBottom: "16px",
              color: "#ef4444", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px"
            }}>
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {/* GITHUB MODE */}
          {mode === "github" && (
            <div>
              {notConnected ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <GitBranch size={36} style={{ color: "#6b7280", marginBottom: "16px" }} />
                  <h4 style={{ fontSize: "14px", fontWeight: "800", margin: "0 0 8px 0" }}>GitHub Not Connected</h4>
                  <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "20px", lineHeight: "1.6" }}>
                    {githubError}
                  </p>
                  <button
                    onClick={initiateAppInstall}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "8px",
                      backgroundColor: "#24292e", color: "#fff", padding: "10px 20px",
                      border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer"
                    }}
                  >
                    <GitBranch size={15} />
                    Connect GitHub App
                  </button>
                  <p style={{ fontSize: "11px", color: "#4b5563", marginTop: "12px" }}>
                    After connecting, return here to browse your repositories.
                  </p>
                </div>
              ) : loadingGithub ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} style={{ height: "64px", backgroundColor: "#1f2937", borderRadius: "8px", animation: "pulse 1.5s ease-in-out infinite" }} />
                  ))}
                </div>
              ) : githubError ? (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <p style={{ color: "#ef4444", fontSize: "12px", marginBottom: "12px" }}>{githubError}</p>
                  <button
                    onClick={fetchGithubRepos}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "6px",
                      backgroundColor: "#1f2937", border: "1px solid #374151",
                      color: "#fff", padding: "8px 16px", borderRadius: "6px",
                      fontSize: "11px", fontWeight: "700", cursor: "pointer"
                    }}
                  >
                    <RefreshCw size={12} /> Retry
                  </button>
                </div>
              ) : (
                <>
                  {/* Search */}
                  <div style={{ position: "relative", marginBottom: "16px" }}>
                    <Search size={13} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
                    <input
                      type="text"
                      placeholder="Search repositories..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="glass-input"
                      style={{ padding: "9px 36px 9px 34px" }}
                    />
                    <button onClick={fetchGithubRepos} title="Refresh" style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#6b7280", cursor: "pointer" }}>
                      <RefreshCw size={12} />
                    </button>
                  </div>

                  <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: "12px" }}>
                    {filteredRepos.length} repositories · click <strong>Connect</strong> then invite employees
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {filteredRepos.map((repo) => (
                      <div
                        key={repo.id}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          backgroundColor: "#0d1424",
                          border: `1px solid ${repo.isConnected ? "rgba(16,185,129,0.3)" : "#1f2937"}`,
                          borderRadius: "10px", padding: "12px 14px", gap: "12px"
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            {repo.private
                              ? <Lock size={11} style={{ color: "#6b7280", flexShrink: 0 }} />
                              : <GitBranch size={11} style={{ color: "#6b7280", flexShrink: 0 }} />
                            }
                            <span style={{ fontSize: "13px", fontWeight: "700", color: "#f3f4f6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {repo.fullName}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                            {repo.language && <span style={{ fontSize: "10px", color: "#6b7280" }}>● {repo.language}</span>}
                            {repo.stargazersCount > 0 && (
                              <span style={{ fontSize: "10px", color: "#6b7280", display: "flex", alignItems: "center", gap: "3px" }}>
                                <Star size={9} />{repo.stargazersCount}
                              </span>
                            )}
                            {repo.private && <span style={{ fontSize: "9px", backgroundColor: "#1f2937", color: "#9ca3af", padding: "1px 6px", borderRadius: "4px" }}>private</span>}
                          </div>
                        </div>

                        {repo.isConnected ? (
                          <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                            <span style={{
                              fontSize: "10px", fontWeight: "800", color: "#10b981",
                              backgroundColor: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
                              padding: "4px 10px", borderRadius: "6px"
                            }}>
                              ✓ Connected
                            </span>
                            <button
                              onClick={() => { setJustConnected(repo.fullName); setShowInvite(true); }}
                              style={{
                                backgroundColor: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
                                color: "#6366f1", padding: "4px 10px", borderRadius: "6px",
                                fontSize: "10px", fontWeight: "700", cursor: "pointer"
                              }}
                            >
                              Invite
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => connectRepo(repo.fullName)}
                            style={{
                              backgroundColor: "#6366f1", border: "none", color: "#fff",
                              padding: "6px 14px", borderRadius: "6px", fontSize: "11px",
                              fontWeight: "700", cursor: "pointer", flexShrink: 0, transition: "background-color 0.2s"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#4f46e5"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#6366f1"}
                          >
                            Connect
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* MANUAL MODE */}
          {mode === "manual" && (
            <form onSubmit={handleManualSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#6b7280", display: "block", marginBottom: "6px" }}>
                  Repository Path
                </label>
                <div style={{ position: "relative" }}>
                  <GitBranch size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
                  <input
                    type="text"
                    placeholder="owner/repo  e.g. facebook/react"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="glass-input"
                    style={{ paddingLeft: "36px" }}
                  />
                </div>
                <span style={{ fontSize: "11px", color: "#6b7280", display: "block", marginTop: "6px" }}>
                  Works for public repos. Private repos require a connected GitHub account.
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-glass-primary"
                style={{
                  padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⚡</span> : <GitBranch size={14} />}
                <span>{loading ? "Connecting..." : "Connect & Continue"}</span>
              </button>
            </form>
          )}
        </div>
      </div>
      <style>{keyframes}</style>
    </div>
  );
}

// ─────────────────────────────────────────────
// Inline "Invite employees to repo" sub-form
// ─────────────────────────────────────────────
function InviteToRepoForm({ repoFullName, onClose, onBack }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sentEmails, setSentEmails] = useState([]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!email || !name) return;
    setError("");
    setLoading(true);
    try {
      await API.post("/invites/send", {
        email,
        name,
        assignedRepo: repoFullName,
      });
      setSentEmails((prev) => [...prev, email]);
      setEmail("");
      setName("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send invitation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "8px 4px" }}>
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "12px", padding: "0 0 12px 0", display: "flex", alignItems: "center", gap: "4px" }}
        >
          ← Back
        </button>
        <h3 style={{ fontSize: "16px", fontWeight: "900", margin: "0 0 4px 0" }}>Invite to Repository</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <GitBranch size={12} style={{ color: "#6366f1" }} />
          <code style={{ fontSize: "11px", color: "#6366f1", backgroundColor: "rgba(99,102,241,0.08)", padding: "2px 8px", borderRadius: "4px" }}>
            {repoFullName}
          </code>
        </div>
      </div>

      {/* Info */}
      <div style={{
        backgroundColor: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)",
        borderRadius: "8px", padding: "10px 14px", marginBottom: "20px",
        fontSize: "11px", color: "#06b6d4", lineHeight: "1.6"
      }}>
        🔗 Employee will receive an invite email. Once accepted, this repo will appear in their dashboard. They sign in with email + company name — no password.
      </div>

      {/* Sent list */}
      {sentEmails.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <p style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "#6b7280", marginBottom: "6px" }}>
            Invites sent:
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {sentEmails.map((em) => (
              <span key={em} style={{
                fontSize: "11px", backgroundColor: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.2)", color: "#10b981",
                padding: "3px 10px", borderRadius: "20px"
              }}>
                ✓ {em}
              </span>
            ))}
          </div>
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)",
          borderRadius: "8px", padding: "10px 14px", marginBottom: "16px",
          color: "#10b981", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px"
        }}>
          <CheckCircle size={14} />
          <span>Invite sent! Add another or close.</span>
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: "8px", padding: "10px 14px", marginBottom: "16px",
          color: "#ef4444", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px"
        }}>
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#6b7280", display: "block", marginBottom: "6px" }}>
            Employee Name
          </label>
          <div style={{ position: "relative" }}>
            <User size={13} style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
            <input
              type="text"
              placeholder="Alex River"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="glass-input"
              style={{ paddingLeft: "32px" }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#6b7280", display: "block", marginBottom: "6px" }}>
            Email Address
          </label>
          <div style={{ position: "relative" }}>
            <Mail size={13} style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
            <input
              type="email"
              placeholder="alex@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="glass-input"
              style={{ paddingLeft: "32px" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
          <button
            type="submit"
            disabled={loading}
            className="btn-glass-primary"
            style={{
              flex: 1, padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading
              ? <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⚡</span>
              : <Send size={13} />
            }
            <span>{loading ? "Sending..." : "Send Invite"}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-glass-secondary"
            style={{ padding: "12px 16px" }}
          >
            Done
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Shared styles ───
const overlayStyle = {
  position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
  backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 9999, fontFamily: "'Inter', sans-serif", padding: "20px", boxSizing: "border-box"
};

const panelStyle = {
  width: "100%", position: "relative",
  boxShadow: "0 24px 48px -12px rgba(0,0,0,0.8), inset 0 2px 20px rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)"
};

const closeBtn = {
  position: "absolute", top: "20px", right: "20px",
  background: "none", border: "none", cursor: "pointer", color: "#6b7280", transition: "color 0.2s"
};

const keyframes = `
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 0.3; } 100% { opacity: 0.6; } }
`;

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, GitBranch, AlertCircle, Search, Lock, Star, RefreshCw, CheckCircle, Mail, User, Send, Unlink } from "lucide-react";
import API from "../services/api";

export default function ConnectRepoModal({ isOpen, onClose, onConnected }) {
  const [mode, setMode] = useState("github"); // "github" | "manual"
  const [githubRepos, setGithubRepos] = useState([]);
  const [loadingGithub, setLoadingGithub] = useState(false);
  const [githubError, setGithubError] = useState("");
  const [statusState, setStatusState] = useState("NOT_CONNECTED"); // NOT_CONNECTED | CONNECTING | CONNECTED | EXPIRED | ERROR
  const [githubUsername, setGithubUsername] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Manual input
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // After connecting: show "Invite to Repo" mini-form
  const [justConnected, setJustConnected] = useState(null);
  const [showInvite, setShowInvite] = useState(false);

  const fetchGithubStatus = useCallback(async () => {
    setLoadingGithub(true);
    setGithubError("");
    try {
      const statusRes = await API.get("/github/status");
      const data = statusRes.data;
      setStatusState(data.status || "NOT_CONNECTED");
      setGithubUsername(data.githubUsername || "");

      if (data.status === "CONNECTED") {
        const reposRes = await API.get("/github/repositories", {
          params: { search: searchTerm }
        });
        const repoList = Array.isArray(reposRes.data)
          ? reposRes.data
          : reposRes.data?.repositories || [];
        setGithubRepos(repoList);
      } else if (data.status === "EXPIRED") {
        setGithubError("GitHub App installation expired or was uninstalled. Please reconnect.");
      } else if (data.status === "ERROR") {
        setGithubError(data.message || "GitHub could not be reached. Please try again.");
      }
    } catch (err) {
      setStatusState("ERROR");
      setGithubError(err.response?.data?.message || "GitHub could not be reached. Please try again.");
    } finally {
      setLoadingGithub(false);
    }
  }, [searchTerm]);

  const initiateAppInstall = async () => {
    setStatusState("CONNECTING");
    setGithubError("");
    try {
      const res = await API.get("/github/connect");
      if (res.data?.installUrl) {
        const width = 600;
        const height = 750;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popup = window.open(
          res.data.installUrl,
          "github_install_popup",
          `width=${width},height=${height},top=${top},left=${left}`
        );

        const handleMessage = (event) => {
          if (event.origin === window.location.origin && event.data?.type === "GITHUB_CONNECTED") {
            window.removeEventListener("message", handleMessage);
            if (event.data?.error) {
              setStatusState("ERROR");
              setGithubError(event.data.message || "Connection cancelled or failed.");
            } else {
              fetchGithubStatus();
            }
          }
        };

        window.addEventListener("message", handleMessage);

        const timer = setInterval(() => {
          if (popup && popup.closed) {
            clearInterval(timer);
            window.removeEventListener("message", handleMessage);
            fetchGithubStatus();
          }
        }, 1000);
      } else {
        setStatusState("ERROR");
        setGithubError("Failed to generate installation URL.");
      }
    } catch (err) {
      setStatusState("ERROR");
      setGithubError(err.response?.data?.message || "Failed to initiate GitHub App installation link.");
    }
  };

  const handleDisconnect = async () => {
    try {
      await API.post("/github/disconnect");
      setStatusState("NOT_CONNECTED");
      setGithubUsername("");
      setGithubRepos([]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to disconnect GitHub.");
    }
  };

  useEffect(() => {
    if (isOpen && mode === "github") {
      fetchGithubStatus();
    }
  }, [isOpen, mode, fetchGithubStatus]);

  useEffect(() => {
    if (!isOpen) {
      setJustConnected(null);
      setShowInvite(false);
      setError("");
      setFullName("");
      setSearchTerm("");
    }
  }, [isOpen]);

  const connectRepo = async (repoId, repoFullName) => {
    setError("");
    try {
      const res = await API.post(`/github/repositories/${repoId}/connect`);
      setJustConnected(res.data || { id: repoId, fullName: repoFullName });
      if (onConnected) onConnected();
      fetchGithubStatus();
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

  if (justConnected && showInvite) {
    return createPortal(
      <div style={overlayStyle}>
        <div className="glass-card-premium" style={{ ...panelStyle, maxWidth: "440px" }}>
          <button onClick={onClose} style={closeBtn} onMouseEnter={(e) => e.currentTarget.style.color = "#fff"} onMouseLeave={(e) => e.currentTarget.style.color = "#6b7280"}>
            <X size={18} />
          </button>
          <InviteToRepoForm repoFullName={justConnected} onClose={onClose} onBack={() => setShowInvite(false)} />
        </div>
        <style>{keyframes}</style>
      </div>,
      document.body
    );
  }

  if (justConnected) {
    return createPortal(
      <div style={overlayStyle}>
        <div className="glass-card-premium" style={{ ...panelStyle, maxWidth: "480px" }}>
          <button onClick={onClose} style={closeBtn} onMouseEnter={(e) => e.currentTarget.style.color = "#fff"} onMouseLeave={(e) => e.currentTarget.style.color = "#6b7280"}>
            <X size={18} />
          </button>
          <SyncProgressCard repoId={justConnected.id || justConnected} repoFullName={justConnected.fullName || justConnected} onClose={onClose} onInvite={() => setShowInvite(true)} />
        </div>
        <style>{keyframes}</style>
      </div>,
      document.body
    );
  }

  return createPortal(
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
            Select from your GitHub account or enter a path manually.
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
                  backgroundColor: mode === tab.key ? "#00D9FF" : "transparent",
                  borderColor: mode === tab.key ? "#00D9FF" : "#374151",
                  color: mode === tab.key ? "#000000" : "#9ca3af",
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

          {mode === "github" && (
            <div>
              {statusState === "NOT_CONNECTED" || statusState === "EXPIRED" || statusState === "ERROR" ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <GitBranch size={36} style={{ color: "#6b7280", marginBottom: "16px" }} />
                  <h4 style={{ fontSize: "14px", fontWeight: "800", margin: "0 0 8px 0" }}>
                    {statusState === "EXPIRED" ? "GitHub App Connection Expired" : "GitHub Not Connected"}
                  </h4>
                  <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "20px", lineHeight: "1.6" }}>
                    {githubError || "Connect your organization's GitHub App to browse and index repositories."}
                  </p>
                  <button
                    onClick={initiateAppInstall}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "8px",
                      backgroundColor: "#00D9FF", color: "#000", padding: "10px 20px",
                      border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer"
                    }}
                  >
                    <GitBranch size={15} />
                    Connect GitHub App
                  </button>
                  <p style={{ fontSize: "11px", color: "#4b5563", marginTop: "12px" }}>
                    Opens GitHub authorization popup. Returns automatically when completed.
                  </p>
                </div>
              ) : statusState === "CONNECTING" || loadingGithub ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} style={{ height: "64px", backgroundColor: "#1f2937", borderRadius: "8px", animation: "pulse 1.5s ease-in-out infinite" }} />
                  ))}
                </div>
              ) : (
                <>
                  {/* GitHub Connected Header Banner */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    backgroundColor: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)",
                    borderRadius: "10px", padding: "12px 14px", marginBottom: "16px", flexWrap: "wrap", gap: "8px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <CheckCircle size={16} style={{ color: "#10b981" }} />
                      <span style={{ fontSize: "12px", fontWeight: "800", color: "#10b981", textTransform: "uppercase" }}>
                        ✓ GitHub Connected
                      </span>
                      {githubUsername && (
                        <span style={{ fontSize: "11px", fontWeight: "700", fontFamily: "monospace", color: "#00D9FF", backgroundColor: "rgba(0,217,255,0.1)", padding: "2px 8px", borderRadius: "4px", border: "1px solid rgba(0,217,255,0.2)" }}>
                          @{githubUsername}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={fetchGithubStatus}
                        style={{
                          display: "flex", alignItems: "center", gap: "6px",
                          backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                          color: "#fff", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer"
                        }}
                      >
                        <RefreshCw size={12} /> Refresh
                      </button>
                      <button
                        onClick={handleDisconnect}
                        style={{
                          display: "flex", alignItems: "center", gap: "6px",
                          backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                          color: "#ef4444", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer"
                        }}
                      >
                        <Unlink size={12} /> Disconnect
                      </button>
                    </div>
                  </div>

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
                  </div>

                  <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: "12px" }}>
                    {filteredRepos.length} repositories available · click <strong>Select Repository</strong> to connect
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {filteredRepos.map((repo) => {
                      const isConn = repo.alreadyConnected || repo.isConnected;
                      return (
                        <div
                          key={repo.id}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            backgroundColor: "#0d1424",
                            border: `1px solid ${isConn ? "rgba(16,185,129,0.3)" : "#1f2937"}`,
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
                              {repo.defaultBranch && <span style={{ fontSize: "10px", color: "#6b7280" }}>branch: {repo.defaultBranch}</span>}
                              {repo.private
                                ? <span style={{ fontSize: "9px", backgroundColor: "#1f2937", color: "#9ca3af", padding: "1px 6px", borderRadius: "4px" }}>private</span>
                                : <span style={{ fontSize: "9px", backgroundColor: "rgba(0,217,255,0.1)", color: "#00D9FF", padding: "1px 6px", borderRadius: "4px" }}>public</span>
                              }
                            </div>
                            {repo.description && (
                              <p style={{ fontSize: "11px", color: "#6b7280", margin: "4px 0 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {repo.description}
                              </p>
                            )}
                          </div>

                          {isConn ? (
                            <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                              <span style={{
                                fontSize: "10px", fontWeight: "800", color: "#10b981",
                                backgroundColor: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
                                padding: "4px 10px", borderRadius: "6px"
                              }}>
                                ✓ Connected
                              </span>
                            </div>
                          ) : (
                            <button
                              onClick={() => connectRepo(repo.id, repo.fullName)}
                              style={{
                                backgroundColor: "#00D9FF", border: "none", color: "#000",
                                padding: "6px 14px", borderRadius: "6px", fontSize: "11px",
                                fontWeight: "700", cursor: "pointer", flexShrink: 0, transition: "background-color 0.2s"
                              }}
                            >
                              Connect
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

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
    </div>,
    document.body
  );
}

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
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "12px", padding: "0 0 12px 0", display: "flex", alignItems: "center", gap: "4px" }}
        >
          ← Back
        </button>
        <h3 style={{ fontSize: "16px", fontWeight: "900", margin: "0 0 4px 0" }}>Invite to Repository</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <GitBranch size={12} style={{ color: "#00D9FF" }} />
          <code style={{ fontSize: "11px", color: "#00D9FF", backgroundColor: "rgba(0,217,255,0.08)", padding: "2px 8px", borderRadius: "4px" }}>
            {repoFullName}
          </code>
        </div>
      </div>

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

function SyncProgressCard({ repoId, repoFullName, onClose, onInvite }) {
  const [syncStatus, setSyncStatus] = useState({
    status: "PENDING",
    step: "QUEUED",
    counts: { files: 0, commits: 0, pullRequests: 0, chunks: 0, embedded: 0, upserted: 0 },
    lastCommitSha: "",
    lastSyncedAt: null,
    error: null,
  });
  const [loading, setLoading] = useState(false);

  const startSync = async () => {
    setLoading(true);
    try {
      const targetId = encodeURIComponent(repoId);
      await API.post(`/github/repositories/${targetId}/sync`, { syncType: "MANUAL" });
      pollStatus();
    } catch (err) {
      setSyncStatus((prev) => ({
        ...prev,
        status: "FAILED",
        error: err.response?.data?.message || "Failed to start sync.",
      }));
    } finally {
      setLoading(false);
    }
  };

  const pollStatus = useCallback(async () => {
    try {
      const targetId = encodeURIComponent(repoId);
      const res = await API.get(`/github/repositories/${targetId}/sync-status`);
      setSyncStatus(res.data);
    } catch (err) {
      console.error("Failed to poll sync status", err);
    }
  }, [repoId]);

  useEffect(() => {
    startSync();
  }, [repoId]);

  useEffect(() => {
    if (syncStatus.status === "PENDING" || syncStatus.status === "IN_PROGRESS") {
      const interval = setInterval(pollStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [syncStatus.status, pollStatus]);

  const steps = [
    { key: "QUEUED", label: "Queued" },
    { key: "FETCHING_DATA", label: "Fetching repository data (files, commits, pull requests)" },
    { key: "GENERATING_EMBEDDINGS", label: "Generating embeddings" },
    { key: "UPDATING_VECTOR_DB", label: "Updating vector database" },
    { key: "COMPLETED", label: "Indexed" },
  ];

  const getStepState = (stepKey) => {
    if (syncStatus.status === "FAILED") return "failed";
    if (syncStatus.status === "COMPLETED") return "completed";
    const order = ["QUEUED", "FETCHING_DATA", "GENERATING_EMBEDDINGS", "UPDATING_VECTOR_DB", "COMPLETED"];
    const currentIndex = order.indexOf(syncStatus.step);
    const stepIndex = order.indexOf(stepKey);

    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  return (
    <div style={{ padding: "16px 8px" }}>
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "900", margin: "0 0 6px 0", color: "#f9fafb" }}>
          Repository Synchronization
        </h3>
        <code style={{ fontSize: "12px", color: "#00D9FF", backgroundColor: "rgba(0,217,255,0.08)", padding: "3px 10px", borderRadius: "6px" }}>
          {repoFullName}
        </code>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
        {steps.map((st) => {
          const state = getStepState(st.key);
          return (
            <div
              key={st.key}
              style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "10px 14px", borderRadius: "8px",
                backgroundColor: state === "active" ? "rgba(0,217,255,0.08)" : state === "completed" ? "rgba(16,185,129,0.06)" : "#0d1424",
                border: `1px solid ${state === "active" ? "#00D9FF" : state === "completed" ? "rgba(16,185,129,0.3)" : "#1f2937"}`
              }}
            >
              <div style={{ width: "18px", height: "18px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "800", color: state === "completed" ? "#10b981" : state === "active" ? "#00D9FF" : "#6b7280" }}>
                {state === "completed" ? "✓" : state === "active" ? "⚡" : "○"}
              </div>
              <span style={{ fontSize: "12px", fontWeight: "700", color: state === "pending" ? "#6b7280" : "#f3f4f6" }}>
                {st.label}
              </span>
            </div>
          );
        })}
      </div>

      {syncStatus.status === "COMPLETED" && (
        <div style={{ backgroundColor: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "8px", padding: "12px", marginBottom: "16px" }}>
          <p style={{ fontSize: "11px", color: "#10b981", margin: "0 0 6px 0", fontWeight: "800" }}>
            ✓ Indexed cleanly!
          </p>
          <div style={{ fontSize: "10px", color: "#9ca3af", display: "flex", flexDirection: "column", gap: "2px" }}>
            <span>Last Synced: {syncStatus.lastSyncedAt ? new Date(syncStatus.lastSyncedAt).toLocaleString() : "Just now"}</span>
            {syncStatus.lastCommitSha && <span>Latest Commit: <code>{syncStatus.lastCommitSha.slice(0, 7)}</code></span>}
            <span>Files: {syncStatus.counts?.files || 0} · Chunks: {syncStatus.counts?.chunks || 0} · Vectors: {syncStatus.counts?.upserted || 0}</span>
          </div>
        </div>
      )}

      {syncStatus.status === "FAILED" && (
        <div style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "12px", marginBottom: "16px" }}>
          <p style={{ fontSize: "12px", color: "#ef4444", margin: "0 0 4px 0", fontWeight: "800" }}>
            Sync Failed
          </p>
          <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>
            {syncStatus.error || "An error occurred during synchronization."}
          </p>
        </div>
      )}

      <div style={{ display: "flex", gap: "10px" }}>
        {syncStatus.status === "FAILED" ? (
          <button
            onClick={startSync}
            disabled={loading}
            style={{ flex: 1, backgroundColor: "#ef4444", color: "#fff", border: "none", padding: "11px", borderRadius: "8px", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}
          >
            Retry
          </button>
        ) : (
          <button
            onClick={startSync}
            disabled={loading || syncStatus.status === "IN_PROGRESS"}
            style={{ flex: 1, backgroundColor: "#00D9FF", color: "#000", border: "none", padding: "11px", borderRadius: "8px", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}
          >
            {syncStatus.status === "IN_PROGRESS" ? "Syncing..." : "Sync Now"}
          </button>
        )}
        <button
          onClick={onInvite}
          style={{ backgroundColor: "#7C3AED", color: "#fff", border: "none", padding: "11px 14px", borderRadius: "8px", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}
        >
          Invite
        </button>
        <button
          onClick={onClose}
          style={{ backgroundColor: "transparent", border: "1px solid #374151", color: "#9ca3af", padding: "11px 14px", borderRadius: "8px", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}
        >
          Done
        </button>
      </div>
    </div>
  );
}


const keyframes = `
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 0.3; } 100% { opacity: 0.6; } }
`;

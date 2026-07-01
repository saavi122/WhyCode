import React, { useState, useEffect } from "react";
import { X, FolderPlus, GitFork, Check, Users } from "lucide-react";
import API from "../services/api";

export default function RoomModal({ isOpen, onClose, onRoomCreated, employees }) {
  const [name, setName] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [assignedEmployees, setAssignedEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setGithubRepo("");
      setAssignedEmployees([]);
      setError("");
      setSuccess(false);
    }
  }, [isOpen]);

  const handleCheckboxChange = (employeeId) => {
    setAssignedEmployees((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !githubRepo) return;
    setError("");
    setLoading(true);

    try {
      await API.post("/rooms", {
        name,
        githubRepo,
        assignedEmployees,
      });
      setSuccess(true);
      if (onRoomCreated) onRoomCreated();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create Room. Verify subscription plan limits.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(3, 3, 3, 0.8)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        backgroundColor: "#111827",
        border: "1px solid #1f2937",
        borderRadius: "16px",
        padding: "32px",
        width: "100%",
        maxWidth: "460px",
        position: "relative",
        boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.8)"
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#6b7280",
            transition: "color 0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
          onMouseLeave={(e) => e.currentTarget.style.color = "#6b7280"}
        >
          <X size={18} />
        </button>

        <h3 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 8px 0" }}>Create Engineering Room</h3>
        <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 24px 0" }}>
          Link a specific GitHub repository and assign developers to collaborate in the workspace.
        </p>

        {success && (
          <div style={{
            backgroundColor: "rgba(16,185,129,0.06)",
            border: "1px solid rgba(16,185,129,0.2)",
            borderRadius: "10px",
            padding: "12px",
            color: "#10b981",
            fontSize: "12px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            justifyContent: "center"
          }}>
            <Check size={16} />
            <span>Room created successfully!</span>
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: "10px",
            padding: "12px",
            color: "#ef4444",
            fontSize: "12px",
            marginBottom: "20px",
            textAlign: "center"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#6b7280", display: "block", marginBottom: "6px" }}>Room Name</label>
            <div style={{ position: "relative" }}>
              <FolderPlus size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
              <input
                type="text"
                placeholder="Auth Services, Core API"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: "100%",
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  padding: "10px 12px 10px 36px",
                  color: "#fff",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#6b7280", display: "block", marginBottom: "6px" }}>GitHub Repository (owner/repo)</label>
            <div style={{ position: "relative" }}>
              <GitFork size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
              <input
                type="text"
                placeholder="stripe-labs/auth-core"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                required
                style={{
                  width: "100%",
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  padding: "10px 12px 10px 36px",
                  color: "#fff",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#6b7280", display: "block", marginBottom: "8px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Users size={12} />
                <span>Assign Developers</span>
              </span>
            </label>
            <div style={{
              maxHeight: "140px",
              overflowY: "auto",
              backgroundColor: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "8px",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}>
              {employees.length === 0 ? (
                <span style={{ fontSize: "11px", color: "#6b7280" }}>No employees registered to invite.</span>
              ) : (
                employees.map((emp) => (
                  <label key={emp._id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={assignedEmployees.includes(emp._id)}
                      onChange={() => handleCheckboxChange(emp._id)}
                      style={{ accentColor: "#6366f1" }}
                    />
                    <span>{emp.name} ({emp.email})</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            style={{
              backgroundColor: "#6366f1",
              border: "none",
              color: "#fff",
              padding: "12px",
              borderRadius: "8px",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              marginTop: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "opacity 0.2s"
            }}
          >
            {loading ? (
              <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⚡</span>
            ) : (
              <FolderPlus size={14} />
            )}
            <span>{loading ? "Creating Room..." : "Create Room"}</span>
          </button>
        </form>
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

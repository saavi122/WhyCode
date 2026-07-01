import React from "react";
import { AlertTriangle } from "lucide-react";

export default function ConfirmDialog({ isOpen, title, message, confirmLabel = "Delete", onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      backdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 99999,
      fontFamily: "'Inter', sans-serif"
    }}>
      <div className="glass-card-premium" style={{
        padding: "32px",
        width: "100%",
        maxWidth: "400px",
        boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.8), inset 0 2px 20px rgba(255,255,255,0.05)",
        textAlign: "center",
        border: "1px solid rgba(255,255,255,0.1)"
      }}>
        <div style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.2)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ef4444",
          marginBottom: "18px",
          boxShadow: "0 0 15px rgba(239, 68, 68, 0.2)"
        }}>
          <AlertTriangle size={20} />
        </div>

        <h3 style={{ fontSize: "16px", fontWeight: "850", color: "#f9fafb", margin: "0 0 8px 0" }}>{title}</h3>
        <p style={{ fontSize: "12px", color: "#9ca3af", lineHeight: "1.6", margin: "0 0 24px 0" }}>{message}</p>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={onCancel}
            className="btn-glass-secondary"
            style={{ flex: 1, padding: "10px" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn-glass-danger"
            style={{ flex: 1, padding: "10px" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

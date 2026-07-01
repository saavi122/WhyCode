import React from "react";
import { Plus } from "lucide-react";

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 24px",
      borderRadius: "16px",
      backgroundColor: "#111827",
      border: "1px solid #1f2937",
      textAlign: "center",
      maxWidth: "500px",
      margin: "40px auto"
    }}>
      {Icon && (
        <div style={{
          width: "48px",
          height: "48px",
          borderRadius: "12px",
          backgroundColor: "rgba(99, 102, 241, 0.06)",
          border: "1px solid rgba(99, 102, 241, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6366f1",
          marginBottom: "16px"
        }}>
          <Icon size={20} />
        </div>
      )}
      <h4 style={{ fontSize: "14px", fontWeight: "800", color: "#f9fafb", margin: "0 0 6px 0" }}>{title}</h4>
      <p style={{ fontSize: "12px", color: "#6b7280", lineHeight: "1.6", margin: "0 0 20px 0", maxWidth: "320px" }}>{description}</p>
      
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "#6366f1",
            border: "none",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: "750",
            cursor: "pointer",
            transition: "opacity 0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
        >
          <Plus size={12} />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}

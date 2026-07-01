import React, { createContext, useContext, useState } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Portal */}
      <div style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        pointerEvents: "none"
      }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 20px",
              borderRadius: "10px",
              backgroundColor: "#111827",
              border: `1px solid ${
                t.type === "success"
                  ? "rgba(16, 185, 129, 0.2)"
                  : t.type === "error"
                  ? "rgba(239, 68, 68, 0.2)"
                  : "rgba(99, 102, 241, 0.2)"
              }`,
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
              color: "#fff",
              minWidth: "260px",
              maxWidth: "380px",
              animation: "slideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards"
            }}
          >
            <div style={{
              color:
                t.type === "success"
                  ? "#10b981"
                  : t.type === "error"
                  ? "#ef4444"
                  : "#6366f1"
            }}>
              {t.type === "success" && <CheckCircle size={18} />}
              {t.type === "error" && <AlertCircle size={18} />}
              {t.type === "info" && <Info size={18} />}
            </div>
            <div style={{ fontSize: "12px", fontWeight: "600", flexGrow: 1, color: "#f3f4f6" }}>
              {t.message}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              style={{
                background: "none",
                border: "none",
                color: "#6b7280",
                cursor: "pointer",
                padding: "2px",
                display: "inline-flex"
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

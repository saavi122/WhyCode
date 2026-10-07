import React, { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

export default function GitHubCallbackComplete() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const error = searchParams.get("error");
  const message = searchParams.get("message");

  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.opener) {
        try {
          window.opener.postMessage(
            {
              type: "GITHUB_CONNECTED",
              error: error || null,
              message: message || null,
            },
            window.location.origin
          );
        } catch (e) {
          console.error("Failed to post message to opener window:", e);
        }
        window.close();
      } else {
        navigate("/dashboard/repositories", { replace: true });
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [error, message, navigate]);

  return (
    <div style={{
      height: "100vh",
      width: "100vw",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#05070B",
      color: "#ffffff",
      fontFamily: "'Inter', system-ui, sans-serif",
      position: "fixed",
      top: 0,
      left: 0,
      zIndex: 99999,
      padding: "20px",
      boxSizing: "border-box"
    }}>
      <div style={{
        maxWidth: "420px",
        width: "100%",
        padding: "32px",
        borderRadius: "20px",
        backgroundColor: "rgba(12, 12, 16, 0.85)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(16px)",
        textAlign: "center",
        boxShadow: "0 24px 48px rgba(0,0,0,0.8)"
      }}>
        {error ? (
          <>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ef4444",
              marginBottom: "16px"
            }}>
              <AlertCircle size={28} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: "900", margin: "0 0 8px 0" }}>Connection Failed</h3>
            <p style={{ fontSize: "13px", color: "#9ca3af", margin: "0 0 20px 0", lineHeight: "1.5" }}>
              {message || "GitHub authorization was not completed."}
            </p>
          </>
        ) : (
          <>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#10b981",
              marginBottom: "16px"
            }}>
              <CheckCircle size={28} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: "900", margin: "0 0 8px 0" }}>GitHub Connected!</h3>
            <p style={{ fontSize: "13px", color: "#9ca3af", margin: "0 0 20px 0", lineHeight: "1.5" }}>
              Your workspace has been successfully linked with GitHub. Closing popup window...
            </p>
          </>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "12px", color: "#00D9FF" }}>
          <RefreshCw size={14} className="animate-spin" />
          <span>Updating WhyCode dashboard status...</span>
        </div>
      </div>
    </div>
  );
}

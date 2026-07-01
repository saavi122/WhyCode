import React from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Building, Users } from "lucide-react";

export default function LandingRedirect() {
  const navigate = useNavigate();

  const options = [
    {
      title: "I'm an Admin",
      desc: "Access the system configuration center to manage corporate organization nodes and audit licenses.",
      icon: Shield,
      buttonText: "Admin Portal",
      path: "/admin/login",
      accent: "var(--accent-color, #10b981)",
    },
    {
      title: "My Company is new here",
      desc: "Establish a corporate tenant, set up indexing environments, and register workspace clusters.",
      icon: Building,
      buttonText: "Create Workspace",
      path: "/company/signup",
      accent: "#6366f1",
    },
    {
      title: "I'm an Employee",
      desc: "Sign in with your email and company name. No password required — access is granted via your invite.",
      icon: Users,
      buttonText: "Employee Sign In",
      path: "/employee/login",
      accent: "#06b6d4",
    },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0a0f1e",
      color: "#f9fafb",
      fontFamily: "'Inter', sans-serif",
      position: "relative",
      overflow: "hidden",
      padding: "24px"
    }}>
      {/* Decorative gradient blob background */}
      <div style={{
        position: "absolute",
        top: "20%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "500px",
        height: "500px",
        background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(6,182,212,0.05) 50%, rgba(0,0,0,0) 100%)",
        filter: "blur(80px)",
        pointerEvents: "none",
        zIndex: 1
      }}></div>

      <div style={{ zIndex: 10, textAlign: "center", marginBottom: "48px" }}>
        <h1 style={{
          fontSize: "42px",
          fontWeight: "900",
          letterSpacing: "-0.04em",
          background: "linear-gradient(135deg, #fff 0%, #a5b4fc 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          margin: "0 0 12px 0"
        }}>
          CodeMemory
        </h1>
        <p style={{
          fontSize: "16px",
          color: "#6b7280",
          fontWeight: "500",
          margin: 0
        }}>
          Code remembers what changed. We remember why.
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "24px",
        width: "100%",
        maxWidth: "1000px",
        zIndex: 10
      }}>
        {options.map((opt, i) => {
          const Icon = opt.icon;
          return (
            <div
              key={i}
              style={{
                backgroundColor: "#111827",
                border: "1px solid #1f2937",
                borderRadius: "16px",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: "280px",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = opt.accent;
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = `0 20px 40px -15px rgba(0,0,0,0.7), 0 0 20px -5px ${opt.accent}33`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#1f2937";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 10px 30px -10px rgba(0,0,0,0.5)";
              }}
            >
              <div>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid #374151",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: opt.accent,
                  marginBottom: "20px"
                }}>
                  <Icon size={22} />
                </div>
                <h3 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 10px 0" }}>{opt.title}</h3>
                <p style={{ fontSize: "13px", color: "#6b7280", lineHeight: "1.6", margin: 0 }}>{opt.desc}</p>
              </div>

              <button
                onClick={() => navigate(opt.path)}
                style={{
                  width: "100%",
                  marginTop: "24px",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: opt.accent,
                  color: opt.accent === "#ffffff" ? "#000" : "#fff",
                  fontWeight: "700",
                  fontSize: "13px",
                  cursor: "pointer",
                  transition: "opacity 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = 0.9}
                onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
              >
                {opt.buttonText}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

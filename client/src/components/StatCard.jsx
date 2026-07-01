import React from "react";
import { ArrowUpRight } from "lucide-react";

export default function StatCard({ icon: Icon, value, label, accentColor = "#6366f1", trend = "up" }) {
  // Convert standard Tailwind colors to premium hex equivalents if needed
  const normalizedColor = 
    accentColor === "#6366f1" ? "#8b5cf6" : // standard purple
    accentColor === "#06b6d4" ? "#06b6d4" : // cyan/emerald
    accentColor === "#10b981" ? "#10b981" : // emerald
    accentColor === "#ef4444" ? "#ef4444" : // red/rose
    accentColor === "#eab308" ? "#f59e0b" : // soft gold/amber
    accentColor;

  return (
    <div
      style={{
        backgroundColor: "rgba(9, 9, 9, 0.45)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderRadius: "16px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        cursor: "default",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 10px 30px -10px rgba(0,0,0,0.7)"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = `0 15px 35px -5px rgba(0,0,0,0.9), 0 0 20px -5px ${normalizedColor}22`;
        const shine = e.currentTarget.querySelector(".shine-overlay");
        if (shine) shine.style.transform = "translateX(100%)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.05)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 10px 30px -10px rgba(0,0,0,0.7)";
        const shine = e.currentTarget.querySelector(".shine-overlay");
        if (shine) shine.style.transform = "translateX(-100%)";
      }}
    >
      {/* Premium shine overlay */}
      <div 
        className="shine-overlay"
        style={{
          position: "absolute",
          top: 0, left: 0, width: "100%", height: "100%",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)",
          transform: "translateX(-100%)",
          transition: "transform 0.6s ease",
          pointerEvents: "none"
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 2 }}>
        <span style={{ fontSize: "10px", fontWeight: "700", color: "#8a8a93", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {label}
        </span>
        <div style={{
          width: "28px",
          height: "28px",
          borderRadius: "8px",
          backgroundColor: `${normalizedColor}10`,
          border: `1px solid ${normalizedColor}22`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: normalizedColor,
          boxShadow: `0 0 10px ${normalizedColor}11`
        }}>
          {Icon && <Icon size={13} />}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
          <span style={{
            fontSize: "26px",
            fontWeight: "800",
            color: "#ffffff",
            letterSpacing: "-0.03em",
            animation: "countUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards"
          }}>
            {value}
          </span>
          {trend && (
            <span style={{
              fontSize: "9px",
              fontWeight: "700",
              color: trend === "up" ? "#10b981" : "#ef4444",
              display: "inline-flex",
              alignItems: "center",
              gap: "2px",
              padding: "2px 6px",
              borderRadius: "4px",
              background: trend === "up" ? "rgba(16, 185, 129, 0.05)" : "rgba(239, 68, 68, 0.05)"
            }}>
              <ArrowUpRight size={10} />
              <span>Live</span>
            </span>
          )}
        </div>

        {/* Dynamic Sparkline Graphics */}
        <div style={{ display: "flex", alignItems: "center", height: "24px" }}>
          <svg width="55" height="18" viewBox="0 0 55 18" style={{ overflow: "visible" }}>
            <path
              d={trend === "up" ? "M 0 14 C 10 12, 15 2, 25 6 C 35 10, 40 0, 55 2" : "M 0 2 C 10 4, 15 14, 25 10 C 35 6, 40 16, 55 14"}
              fill="none"
              stroke={normalizedColor}
              strokeWidth="1.5"
              className="sparkline-svg"
              style={{ strokeLinecap: "round", strokeLinejoin: "round", opacity: 0.8 }}
            />
          </svg>
        </div>
      </div>

      <style>{`
        @keyframes countUp {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .sparkline-svg {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: drawSparkline 1.2s ease-out forwards;
        }
        @keyframes drawSparkline {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}

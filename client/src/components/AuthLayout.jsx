import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, GitBranch } from "lucide-react";
import AnimatedBackground from "./AnimatedBackground";
import "../pages/Auth.css";

export default function AuthLayout({ 
  children, 
  headline, 
  description, 
  illustration 
}) {
  const navigate = useNavigate();

  return (
    <div className="auth-split-container">
      {/* Shared animated node background */}
      <AnimatedBackground />

      {/* Left 60% Panel - Visual Telemetry & Headline */}
      <div className="auth-hero-section">
        {/* Back to gateway button */}
        <button
          onClick={() => navigate("/")}
          className="btn-back-gateway"
        >
          <ArrowLeft size={14} />
          <span>Back to gateway</span>
        </button>

        {/* Logo mark */}
        <div className="auth-logo-row" onClick={() => navigate("/")}>
          <div className="auth-logo-box">
            <GitBranch size={18} className="text-[#00D9FF]" />
          </div>
          <span className="auth-logo-text">WhyCode</span>
        </div>

        {/* Core Headline */}
        <h1 className="auth-hero-heading">
          {headline}
        </h1>

        {/* Description text */}
        <p className="auth-hero-paragraph">
          {description}
        </p>

        {/* Card / Visual component */}
        <div className="auth-hero-illustration">
          {illustration}
        </div>
      </div>

      {/* Right 40% Panel - Glass Auth Card */}
      <div className="auth-card-container">
        {/* Mobile Back Header */}
        <div className="absolute top-6 left-6 flex items-center justify-between w-[calc(100%-48px)] lg:hidden">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-xs font-bold text-[#71717a] hover:text-[#00D9FF] transition"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-2" onClick={() => navigate("/")}>
            <GitBranch size={16} className="text-[#00D9FF]" />
            <span className="text-sm font-bold text-white">WhyCode</span>
          </div>
        </div>

        <div className="w-full flex justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}

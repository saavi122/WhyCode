import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Code, Sparkles } from "lucide-react";
import API from "../services/api";
import "./Auth.css";

const GithubIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);


export default function CompanyLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  // Animated Particle Network for the Left Panel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Particles array
    const particles = [];
    const particleCount = 45;
    const connectionDistance = 110;

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.6;
        this.vy = (Math.random() - 0.5) * 0.6;
        this.radius = Math.random() * 2 + 1.5;
        this.color = Math.random() > 0.5 ? "rgba(139, 92, 246, 0.4)" : "rgba(16, 185, 129, 0.4)"; // Purple & Emerald
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Boundary bounce
        if (this.x < 0 || this.x > canvas.width) this.vx = -this.vx;
        if (this.y < 0 || this.y > canvas.height) this.vy = -this.vy;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      }
    }

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    // Animation Loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw faint connections (Constellation Graph)
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.update();
        p1.draw();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);

          if (dist < connectionDistance) {
            const alpha = (1 - dist / connectionDistance) * 0.15;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setError("");
    setLoading(true);

    try {
      const res = await API.post("/auth/login", { email, password });

      setSuccess(true);
      // Brief delay to allow success transition
      setTimeout(() => {
        login(res.data.token, res.data.user);
        navigate("/dashboard");
      }, 800);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-container">
      
      {/* Back button */}
      <div
        onClick={() => navigate("/")}
        style={{
          position: "absolute",
          top: "32px",
          left: "32px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: "600",
          color: "#6e6e73",
          transition: "color 0.2s",
          zIndex: 100
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
        onMouseLeave={(e) => e.currentTarget.style.color = "#6e6e73"}
      >
        <ArrowLeft size={16} />
        <span>Back to gateway</span>
      </div>

      {/* LEFT PANEL - ARTWORK & CONSTELLATION GRAPH */}
      <div className="auth-visual-panel">
        <canvas ref={canvasRef} className="auth-visual-canvas" />
        <div className="auth-ambient-glow" style={{ top: "25%", left: "20%" }}></div>

        <div className="auth-visual-content">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #10b981 0%, #8b5cf6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Code size={20} color="#000" strokeWidth={3} />
            </div>
            <span style={{ fontSize: "20px", fontWeight: "800", letterSpacing: "-0.03em" }}>WhyCode</span>
          </div>

          <h2 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.04em", lineHeight: "1.15", marginTop: "12px" }}>
            The memory system for high-performing tech teams.
          </h2>
          <p style={{ color: "#a1a1aa", fontSize: "14px", lineHeight: "1.6", margin: 0 }}>
            Connect your repositories to build automated visual maps, map internal code logic dependencies, and index engineering documentation in real time.
          </p>

          {/* Floating UI Card inside Visual Side */}
          <div className="floating-visual-card" style={{ marginTop: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="visual-node"></span>
                <span style={{ fontSize: "11px", fontWeight: "700" }}>authService.js</span>
              </div>
              <span style={{ fontSize: "9px", color: "#10b981", fontWeight: "700" }}>CONNECTED</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "10px", color: "#6e6e73", fontFamily: "monospace" }}>crypto.js</span>
              <div className="visual-line"></div>
              <span className="visual-node purple"></span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - AUTHENTICATION CARD */}
      <div className="auth-form-panel">
        <div className="glass-auth-card">
          
          <div className="auth-header">
            <div className="auth-logo">
              <div style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #10b981 0%, #8b5cf6 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: "6px"
              }}>
                <Code size={14} color="#000" strokeWidth={3} />
              </div>
              <span>WhyCode</span>
            </div>
            <h2 className="auth-title">Welcome back</h2>
            <p className="auth-subtitle">Sign in to your developer workspace</p>
          </div>

          {/* Social Logins */}
          <div className="oauth-group">
            <button className="btn-oauth" type="button" onClick={() => alert("GitHub integration triggered")}>
              <GithubIcon size={14} />
              GitHub
            </button>
            <button className="btn-oauth" type="button" onClick={() => alert("Google OAuth triggered")}>
              {/* Custom SVG for Google */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              Google
            </button>
          </div>

          <div className="auth-divider">or use credentials</div>

          {error && (
            <div style={{
              backgroundColor: "rgba(239, 68, 68, 0.05)",
              border: "1px solid rgba(239, 68, 68, 0.15)",
              borderRadius: "12px",
              padding: "12px",
              color: "#f87171",
              fontSize: "12px",
              marginBottom: "20px",
              textAlign: "center"
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">WORK EMAIL</label>
              <div className="input-container">
                <Mail size={15} className="input-icon" />
                <input
                  type="email"
                  placeholder="name@company.com"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                PASSWORD
              </label>
              <div className="input-container">
                <Lock size={15} className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="btn-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-actions">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  className="checkbox-input" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
              <span onClick={() => alert("Password reset functionality has been triggered.")} className="link-forgot" style={{ cursor: "pointer" }}>
                Forgot password?
              </span>
            </div>

            <button 
              type="submit" 
              className="btn-auth-submit"
              disabled={loading || success}
            >
              {loading ? (
                <span>Verifying credentials...</span>
              ) : success ? (
                <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#10b981" }}>
                  <Check size={16} /> Success
                </span>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          <div className="auth-footer-link">
            Don't have a workspace?
            <span 
              onClick={() => navigate("/company/signup")} 
              style={{ color: "#ffffff", cursor: "pointer", fontWeight: "600", marginLeft: "4px" }}
            >
              Sign up
            </span>
          </div>

        </div>
      </div>

    </div>
  );
}

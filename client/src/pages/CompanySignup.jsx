import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Building, User, Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, Check, Code, Users } from "lucide-react";
import API from "../services/api";
import "./Auth.css";

export default function CompanySignup() {
  const [step, setStep] = useState(1);
  
  // Step 1 fields
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("lead_engineer");
  const [companySize, setCompanySize] = useState("11_50");
  
  // Step 2 fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  // Animated Particle Background for the Left Panel (Focusing on Emerald/Teal tones)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const particles = [];
    const particleCount = 40;
    const connectionDistance = 120;

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.45;
        this.vy = (Math.random() - 0.5) * 0.45;
        this.radius = Math.random() * 2 + 1;
        this.color = Math.random() > 0.5 ? "rgba(16, 185, 129, 0.35)" : "rgba(245, 158, 11, 0.25)"; // Emerald & Gold
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

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

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.update();
        p1.draw();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);

          if (dist < connectionDistance) {
            const alpha = (1 - dist / connectionDistance) * 0.12;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`;
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

  // Password Validation Checks
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  // Strength calculation
  let strengthScore = 0;
  if (password.length > 0) {
    if (hasMinLength) strengthScore += 1;
    if (hasUppercase) strengthScore += 1;
    if (hasNumber) strengthScore += 1;
    if (password.length >= 12 && /[^A-Za-z0-9]/.test(password)) strengthScore += 1;
  }

  const getStrengthMeta = () => {
    switch (strengthScore) {
      case 0: return { label: "Too short", width: "0%", color: "rgba(255,255,255,0.05)" };
      case 1: return { label: "Weak", width: "25%", color: "#ef4444" };
      case 2: return { label: "Medium", width: "50%", color: "#f59e0b" };
      case 3: return { label: "Strong", width: "75%", color: "#10b981" };
      case 4: return { label: "Excellent", width: "100%", color: "#10b981" };
      default: return { label: "Too short", width: "0%", color: "rgba(255,255,255,0.05)" };
    }
  };

  const strengthMeta = getStrengthMeta();

  const handleNext = (e) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError("Organization Name is required");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) return;
    setError("");

    if (!hasMinLength) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!acceptTerms) {
      setError("Please accept the terms of service and privacy policy");
      return;
    }

    setLoading(true);

    try {
      const res = await API.post("/auth/register", {
        companyName,
        name,
        email,
        password,
        role,
        companySize
      });

      setSuccess(true);
      setTimeout(() => {
        login(res.data.token, res.data.user);
        navigate("/dashboard");
      }, 800);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-container">
      
      {/* Back button */}
      <div
        onClick={() => step === 2 ? setStep(1) : navigate("/")}
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
        <span>{step === 2 ? "Back to Step 1" : "Back to gateway"}</span>
      </div>

      {/* LEFT PANEL - INTERACTIVE PRODUCT PREVIEW */}
      <div className="auth-visual-panel">
        <canvas ref={canvasRef} className="auth-visual-canvas" />
        <div className="auth-ambient-glow" style={{ bottom: "20%", right: "10%" }}></div>

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
            Onboard your team to WhyCode
          </h2>
          <p style={{ color: "#a1a1aa", fontSize: "14px", lineHeight: "1.6", margin: 0 }}>
            Establish a secure company workspace, define architecture schemas, index branch pipelines, and launch AI memory capture nodes.
          </p>

          {/* Floating UI Card 1 (Repository index status tracker) */}
          <div className="floating-visual-card" style={{ marginTop: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#6e6e73" }}>Workspace Indexer</span>
              <span style={{ fontSize: "9px", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "2px 6px", borderRadius: "4px" }}>ACTIVE</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "13px", fontWeight: "700" }}>whycode/gateway-engine</span>
              <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: "70%", background: "linear-gradient(90deg, #10b981, #8b5cf6)" }}></div>
              </div>
              <span style={{ fontSize: "9px", color: "#6e6e73" }}>Indexing AST node graphs: 4,120 / 5,900 files</span>
            </div>
          </div>

          {/* Floating UI Card 2 (Code Snippet) */}
          <div className="floating-visual-card delayed" style={{ width: "85%", alignSelf: "flex-end" }}>
            <div style={{ display: "flex", gap: "5px", marginBottom: "10px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444" }}></span>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f59e0b" }}></span>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }}></span>
            </div>
            <pre style={{ margin: 0, fontSize: "11px", fontFamily: "monospace", color: "#a1a1aa", lineHeight: "1.4" }}>
              <code>
                {`// Centralizing key definitions
export const registerTenant = async (db, org) => {
  const schema = await db.createSchema(org.id);
  await schema.initializeGraphIndex();
  return schema.status; // 'active'
};`}
              </code>
            </pre>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - SIGNUP CARD */}
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
            <h2 className="auth-title">Create Account</h2>
            <p className="auth-subtitle">
              {step === 1 ? "Step 1 of 2: Organization Setup" : "Step 2 of 2: Admin Credentials"}
            </p>
          </div>

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

          {step === 1 ? (
            <form onSubmit={handleNext}>
              <div className="form-group">
                <label className="form-label">ORGANIZATION / COMPANY NAME</label>
                <div className="input-container">
                  <Building size={15} className="input-icon" />
                  <input
                    type="text"
                    placeholder="Stripe, Vercel, Linear"
                    className="input-field"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">YOUR ROLE</label>
                <div className="form-select-container">
                  <select 
                    className="form-select" 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="cto">CTO / VP Engineering</option>
                    <option value="lead_engineer">Lead / Principal Engineer</option>
                    <option value="software_developer">Software Developer</option>
                    <option value="product_designer">Product Designer</option>
                    <option value="product_manager">Product Manager</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">COMPANY SIZE</label>
                <div className="form-select-container">
                  <select 
                    className="form-select" 
                    value={companySize} 
                    onChange={(e) => setCompanySize(e.target.value)}
                  >
                    <option value="1_10">1 - 10 employees</option>
                    <option value="11_50">11 - 50 employees</option>
                    <option value="51_200">51 - 200 employees</option>
                    <option value="201_1000">201 - 1000 employees</option>
                    <option value="1000+">1000+ employees</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn-auth-submit">
                Next Step
                <ArrowRight size={14} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit}>
              
              <div className="form-group">
                <label className="form-label">FULL NAME</label>
                <div className="input-container">
                  <User size={15} className="input-icon" />
                  <input
                    type="text"
                    placeholder="Jane Developer"
                    className="input-field"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">WORK EMAIL</label>
                <div className="input-container">
                  <Mail size={15} className="input-icon" />
                  <input
                    type="email"
                    placeholder="jane@company.com"
                    className="input-field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">CHOOSE PASSWORD</label>
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
                
                {/* Password Strength Meter */}
                {password.length > 0 && (
                  <div className="strength-meter-container">
                    <div className="strength-meter-bar-bg">
                      <div 
                        className="strength-meter-bar" 
                        style={{ 
                          width: strengthMeta.width, 
                          backgroundColor: strengthMeta.color 
                        }}
                      />
                    </div>
                    <span className="strength-text">Password strength: <strong>{strengthMeta.label}</strong></span>
                  </div>
                )}

                {/* Checklist validation */}
                <ul className="validation-checklist">
                  <li className={`validation-item ${hasMinLength ? "valid" : ""}`}>
                    <Check size={10} /> 8+ characters
                  </li>
                  <li className={`validation-item ${hasUppercase ? "valid" : ""}`}>
                    <Check size={10} /> One uppercase letter
                  </li>
                  <li className={`validation-item ${hasNumber ? "valid" : ""}`}>
                    <Check size={10} /> One number
                  </li>
                </ul>

              </div>

              <div className="form-group">
                <label className="form-label">CONFIRM PASSWORD</label>
                <div className="input-container">
                  <Lock size={15} className="input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="input-field"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-actions" style={{ marginBottom: "16px" }}>
                <label className="checkbox-label" style={{ fontSize: "12px", alignItems: "flex-start" }}>
                  <input 
                    type="checkbox" 
                    className="checkbox-input" 
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    style={{ marginTop: "2px" }}
                  />
                  <span>
                    I accept the <a href="#terms" onClick={(e) => { e.preventDefault(); alert("Terms of Service displayed."); }} style={{ color: "#fff", textDecoration: "underline" }}>Terms of Service</a> and <a href="#privacy" onClick={(e) => { e.preventDefault(); alert("Privacy Policy displayed."); }} style={{ color: "#fff", textDecoration: "underline" }}>Privacy Policy</a>
                  </span>
                </label>
              </div>

              <button 
                type="submit" 
                className="btn-auth-submit"
                disabled={loading || success}
              >
                {loading ? (
                  <span>Registering cluster...</span>
                ) : success ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#10b981" }}>
                    <Check size={16} /> Created Successfully
                  </span>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </form>
          )}

          <div className="auth-footer-link">
            Already have a workspace?
            <span 
              onClick={() => navigate("/company/login")} 
              style={{ color: "#ffffff", cursor: "pointer", fontWeight: "600", marginLeft: "4px" }}
            >
              Log in
            </span>
          </div>

        </div>
      </div>

    </div>
  );
}

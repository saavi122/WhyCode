import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GitBranch } from "lucide-react";
import { motion } from "framer-motion";
import AuthLayout from "../components/AuthLayout";
import WorkspaceCard from "../components/WorkspaceCard";
import StepForm from "../components/StepForm";
import API from "../services/api";

export default function Signup() {
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleNextStep = (e) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError("Company workspace name is required");
      return;
    }
    if (!role) {
      setError("Please select your professional role");
      return;
    }
    if (!companySize) {
      setError("Please select organization headcount");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError("All fields are required");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await API.post("/auth/register", {
        companyName,
        name,
        email: email.toLowerCase(),
        password,
      });

      login(res.data.token, res.data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Try a different email.");
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      headline="Onboard your team to WhyCode"
      description="Establish a secure company workspace, define architecture schemas, index branch pipelines, and launch AI memory capture nodes."
      illustration={<WorkspaceCard />}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="glass-auth-card"
      >
        {/* Header branding inside card */}
        <div className="auth-card-header">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#00D9FF]/10 border border-[#00D9FF]/20 flex items-center justify-center">
              <GitBranch size={16} className="text-[#00D9FF]" />
            </div>
            <span className="text-md font-bold tracking-tight text-white">WhyCode</span>
          </div>
          <h2 className="auth-card-title">Create Account</h2>
          <p className="auth-card-subtitle">
            {step === 1 ? "Step 1 of 2: Organization Setup" : "Step 2 of 2: Admin Profile Setup"}
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold leading-relaxed">
            ⚠️ {error}
          </div>
        )}

        {/* Multi-step Signup Form */}
        <StepForm
          step={step}
          companyName={companyName}
          setCompanyName={setCompanyName}
          role={role}
          setRole={setRole}
          companySize={companySize}
          setCompanySize={setCompanySize}
          name={name}
          setName={setName}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          loading={loading}
          onNext={handleNextStep}
          onSubmit={handleSubmit}
        />

        <div className="auth-card-footer">
          Already have a workspace?{" "}
          <button
            onClick={() => navigate("/login")}
            className="auth-card-footer-link"
          >
            Log in
          </button>
        </div>
      </motion.div>
    </AuthLayout>
  );
}

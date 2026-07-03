import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building, User, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, RefreshCw } from "lucide-react";

export default function StepForm({
  step,
  companyName,
  setCompanyName,
  role,
  setRole,
  companySize,
  setCompanySize,
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  loading,
  onNext,
  onSubmit
}) {
  const slideVariants = {
    initial: (direction) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0
    }),
    animate: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.35, ease: "easeInOut" }
    },
    exit: (direction) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0,
      transition: { duration: 0.3, ease: "easeInOut" }
    })
  };

  return (
    <div className="relative overflow-hidden w-full min-h-[300px]">
      <AnimatePresence initial={false} custom={step}>
        {step === 1 && (
          <motion.form
            key="step1"
            custom={1}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onSubmit={onNext}
            className="form-flow-container"
          >
            {/* Company Name */}
            <div className="field-group">
              <label className="field-label">
                Organization / Company Name
              </label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <Building size={14} />
                </span>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Stripe, Vercel, Linear"
                  className="input-field-custom select-text"
                />
              </div>
            </div>

            {/* Role dropdown */}
            <div className="field-group">
              <label className="field-label">
                Your Role
              </label>
              <div className="input-wrapper">
                <select
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="form-select-custom cursor-pointer"
                >
                  <option value="" disabled className="bg-[#121214]">Select your role</option>
                  <option value="Lead / Principal Engineer" className="bg-[#121214]">Lead / Principal Engineer</option>
                  <option value="Engineering Manager" className="bg-[#121214]">Engineering Manager</option>
                  <option value="Software Engineer" className="bg-[#121214]">Software Engineer</option>
                  <option value="CTO / Tech Director" className="bg-[#121214]">CTO / Tech Director</option>
                  <option value="Product Manager" className="bg-[#121214]">Product Manager</option>
                </select>
                <div className="select-arrow-custom" />
              </div>
            </div>

            {/* Company Size */}
            <div className="field-group">
              <label className="field-label">
                Company Size
              </label>
              <div className="input-wrapper">
                <select
                  required
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  className="form-select-custom cursor-pointer"
                >
                  <option value="" disabled className="bg-[#121214]">Select headcount</option>
                  <option value="1 - 10 employees" className="bg-[#121214]">1 - 10 employees</option>
                  <option value="11 - 50 employees" className="bg-[#121214]">11 - 50 employees</option>
                  <option value="51 - 250 employees" className="bg-[#121214]">51 - 250 employees</option>
                  <option value="251 - 1000 employees" className="bg-[#121214]">251 - 1000 employees</option>
                  <option value="1000+ employees" className="bg-[#121214]">1000+ employees</option>
                </select>
                <div className="select-arrow-custom" />
              </div>
            </div>

            <button
              type="submit"
              className="btn-auth-submit-custom"
            >
              <span>Next Step</span>
              <ArrowRight size={13} />
            </button>
          </motion.form>
        )}

        {step === 2 && (
          <motion.form
            key="step2"
            custom={2}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onSubmit={onSubmit}
            className="form-flow-container"
          >
            
            {/* Full Name */}
            <div className="field-group">
              <label className="field-label">
                Full Name
              </label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <User size={14} />
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="input-field-custom select-text"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="field-group">
              <label className="field-label">
                Email Address
              </label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <Mail size={14} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="input-field-custom select-text"
                />
              </div>
            </div>

            {/* Password */}
            <div className="field-group">
              <label className="field-label">
                Password
              </label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <Lock size={14} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field-custom select-text"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="btn-toggle-password-custom"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="field-group">
              <label className="field-label">
                Confirm Password
              </label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <Lock size={14} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field-custom select-text"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-auth-submit-custom"
            >
              {loading ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
              <span>Create Workspace</span>
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

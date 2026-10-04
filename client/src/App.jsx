import React from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { SprintProvider } from "./context/SprintContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingOS from "./pages/LandingOS";
import AdminLogin from "./pages/AdminLogin";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import EmployeeLogin from "./pages/EmployeeLogin";
import EmployeeAcceptInvite from "./pages/EmployeeAcceptInvite";
import Dashboard from "./pages/Dashboard";
import RecruiterOS from "./pages/RecruiterOS";
import AuthCallback from "./components/AuthCallback";
import GitHubCallbackComplete from "./pages/GitHubCallbackComplete";

import ReportsPage from "./pages/ReportsPage";

import { ToastProvider } from "./context/ToastContext";

export default function App() {
  const isDemo = import.meta.env.VITE_DEMO_MODE === "true" || window.location.hostname.includes("demo") || window.location.hostname.includes("vercel.app");

  return (
    <AuthProvider>
      <ThemeProvider>
        <SprintProvider>
          <ToastProvider>
            {isDemo && (
              <div className="bg-gradient-to-r from-indigo-900/90 via-purple-900/90 to-indigo-900/90 text-indigo-200 text-xs py-1 px-4 text-center font-medium border-b border-indigo-500/30 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Demo Environment: Public Repositories Only & Read-Only Protection Active</span>
              </div>
            )}
            <Routes>
              <Route path="/" element={<LandingOS />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/company/login" element={<Login />} />
              <Route path="/company/signup" element={<Signup />} />
              <Route path="/employee/login" element={<EmployeeLogin />} />
              <Route path="/invite/accept" element={<EmployeeAcceptInvite />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/github/callback-complete" element={<GitHubCallbackComplete />} />
              <Route path="/recruiter" element={<RecruiterOS />} />
              <Route path="/reports" element={
                <ProtectedRoute>
                  <ReportsPage />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/*" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
            </Routes>
          </ToastProvider>
        </SprintProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

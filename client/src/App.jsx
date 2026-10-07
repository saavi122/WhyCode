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
import CheckoutPage from "./pages/CheckoutPage";
import PricingPage from "./pages/PricingPage";

import { ToastProvider } from "./context/ToastContext";

export default function App() {
  const isDemo = import.meta.env.VITE_DEMO_MODE === "true" || window.location.hostname.includes("demo") || window.location.hostname.includes("vercel.app");
  const [wakingServer, setWakingServer] = React.useState(false);

  React.useEffect(() => {
    const handleStatus = (e) => {
      if (e.detail?.waking) {
        setWakingServer(true);
      } else {
        setWakingServer(false);
      }
    };
    window.addEventListener("whycode:server-status", handleStatus);
    return () => window.removeEventListener("whycode:server-status", handleStatus);
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>
        <SprintProvider>
          <ToastProvider>
            {wakingServer && (
              <div className="bg-amber-600/90 text-white text-xs py-1.5 px-4 text-center font-medium border-b border-amber-400/40 flex items-center justify-center gap-2 sticky top-0 z-50 animate-pulse">
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Waking up the server... Please wait a moment (cold start on free tier).</span>
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
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/payment" element={<CheckoutPage />} />
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

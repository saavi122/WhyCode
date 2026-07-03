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

import { ToastProvider } from "./context/ToastContext";

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SprintProvider>
          <ToastProvider>
            <Routes>
              <Route path="/" element={<LandingOS />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/company/login" element={<Login />} />
              <Route path="/company/signup" element={<Signup />} />
              {/* Passwordless employee login */}
              <Route path="/employee/login" element={<EmployeeLogin />} />
              {/* Accept email invite link */}
              <Route path="/invite/accept" element={<EmployeeAcceptInvite />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/recruiter" element={<RecruiterOS />} />
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


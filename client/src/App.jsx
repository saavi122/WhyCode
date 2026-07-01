import React from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import AdminLogin from "./pages/AdminLogin";
import CompanySignup from "./pages/CompanySignup";
import CompanyLogin from "./pages/CompanyLogin";
import EmployeeLogin from "./pages/EmployeeLogin";
import EmployeeAcceptInvite from "./pages/EmployeeAcceptInvite";
import Dashboard from "./pages/Dashboard";
import AuthCallback from "./components/AuthCallback";

import { ToastProvider } from "./context/ToastContext";

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/company/login" element={<CompanyLogin />} />
          <Route path="/company/signup" element={<CompanySignup />} />
          {/* Passwordless employee login */}
          <Route path="/employee/login" element={<EmployeeLogin />} />
          {/* Accept email invite link */}
          <Route path="/invite/accept" element={<EmployeeAcceptInvite />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dashboard/*" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}

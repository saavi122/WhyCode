import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Building, Shield, Sliders, LogOut, CheckCircle, Ban,
  Trash2, Key, RefreshCw, GitFork, BarChart3, Settings,
  ChevronLeft, ChevronRight, Menu, X, AlertTriangle, Sparkles,
  Activity, Lock
} from "lucide-react";
import API from "../services/api";
import ConfirmDialog from "../components/ConfirmDialog";
import LoadingSpinner from "../components/LoadingSpinner";
import "./Dashboard.css";

// ─── Helpers ───────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, value, label, accentColor = "#00D9FF" }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="stat-card-glow"
    style={{ "--accent-color": accentColor, "--accent-glow": `${accentColor}22` }}
  >
    <div className="flex items-center justify-between mb-3">
      <span className="text-[9px] font-black text-[#71717a] uppercase tracking-wider">{label}</span>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: `${accentColor}12`, border: `1px solid ${accentColor}25`,
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <Icon size={13} style={{ color: accentColor }} />
      </div>
    </div>
    <div className="text-3xl font-black text-white mt-1" style={{ color: accentColor }}>
      {value ?? 0}
    </div>
    <div className="mt-3">
      <svg className="w-full h-7 opacity-40" viewBox="0 0 90 24" preserveAspectRatio="none">
        <path
          d={`M 0 ${12 + Math.sin(0) * 6} ${Array.from({ length: 9 }, (_, i) =>
            `Q ${i * 10 + 5} ${12 + Math.sin(i * 0.9) * 8}, ${(i + 1) * 10} ${12 + Math.sin((i + 1) * 0.9) * 8}`
          ).join(" ")}`}
          fill="none"
          stroke={accentColor}
          strokeWidth="1.5"
        />
      </svg>
    </div>
  </motion.div>
);

// ─── Main Component ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [detailCompanyId, setDetailCompanyId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("admin_sidebar_collapsed") === "true"
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("admin_sidebar_collapsed", next ? "true" : "false");
      return next;
    });
  };

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: companyDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ["companyDetails", detailCompanyId],
    queryFn: async () => {
      if (!detailCompanyId) return null;
      const res = await API.get(`/admin/companies/${detailCompanyId}/details`);
      return res.data;
    },
    enabled: !!detailCompanyId
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      const res = await API.get("/admin/stats");
      return res.data;
    }
  });

  const { data: companies, isLoading: companiesLoading } = useQuery({
    queryKey: ["adminCompanies"],
    queryFn: async () => {
      const res = await API.get("/admin/companies");
      return res.data;
    }
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: async () => {
      const res = await API.get("/admin/users");
      return res.data;
    }
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const planMutation = useMutation({
    mutationFn: async ({ companyId, plan }) =>
      API.patch(`/admin/companies/${companyId}/plan`, { plan }),
    onSuccess: () => {
      showToast("Company plan updated.", "success");
      queryClient.invalidateQueries(["adminCompanies"]);
      queryClient.invalidateQueries(["adminStats"]);
    },
    onError: (err) => showToast(err.response?.data?.message || "Failed to update plan.", "error")
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (companyId) => API.delete(`/admin/companies/${companyId}`),
    onSuccess: () => {
      showToast("Company and its data deleted.", "success");
      setSelectedCompany(null);
      queryClient.invalidateQueries(["adminCompanies"]);
      queryClient.invalidateQueries(["adminStats"]);
    },
    onError: (err) => showToast(err.response?.data?.message || "Failed to delete company.", "error")
  });

  const toggleUserActiveMutation = useMutation({
    mutationFn: async ({ userId, isActive }) =>
      API.post(`/employees/status/${userId}`, { isActive }),
    onSuccess: () => {
      showToast("User status updated.", "success");
      queryClient.invalidateQueries(["adminUsers"]);
    },
    onError: (err) => showToast(err.response?.data?.message || "Failed to update user status.", "error")
  });

  const isLoading = statsLoading || companiesLoading || usersLoading;

  // ── Nav items ─────────────────────────────────────────────────────────────
  const navItems = [
    { id: "overview",   label: "Overview",    icon: Sliders   },
    { id: "companies",  label: "Companies",   icon: Building  },
    { id: "users",      label: "All Users",   icon: Users     },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-root flex flex-col md:flex-row min-h-screen">
      <div className="dashboard-grid-pattern" />
      <div className="dashboard-vignette" />

      {/* Ambient glows */}
      <div className="absolute top-[10%] left-[20%] w-[350px] h-[350px] rounded-full bg-[#00D9FF]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[15%] w-[400px] h-[400px] rounded-full bg-[#7C3AED]/5 blur-[140px] pointer-events-none" />

      {/* Mobile Header */}
      <header className="mobile-header-bar flex items-center justify-between w-full h-16 px-6 border-b border-white/5 bg-black/60 backdrop-blur-md md:hidden z-50">
        <div className="flex items-center gap-2">
          <div className="sidebar-logo-box">
            <Shield size={15} className="text-[#00D9FF]" />
          </div>
          <span className="sidebar-logo-text">WhyCode Admin</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white hover:text-[#00D9FF] transition">
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Collapsible Sidebar */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 84 : 260 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`sidebar-wrapper ${mobileMenuOpen ? "flex" : "hidden"} md:flex`}
      >
        {/* Toggle button */}
        <button onClick={toggleSidebar} className="sidebar-toggle-btn hidden md:flex">
          {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        <div>
          {/* Logo */}
          <div className="sidebar-logo-row">
            <div className="sidebar-logo-box">
              <Shield size={15} className="text-[#00D9FF]" />
            </div>
            {!sidebarCollapsed && (
              <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="sidebar-logo-text">
                WhyCode
              </motion.span>
            )}
          </div>

          {/* Sub-label */}
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mx-4 mb-5 px-3 py-1.5 rounded-lg border border-white/5 bg-white/1"
            >
              <span className="text-[9px] font-black uppercase tracking-widest text-[#71717a]">Admin Command Center</span>
            </motion.div>
          )}

          {/* Nav links */}
          <nav className="flex flex-col gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                  className={`sidebar-link-item ${active ? "active" : ""}`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  {active && <div className="sidebar-active-indicator" />}
                  <Icon size={16} className={active ? "text-[#00D9FF]" : "text-[#71717a]"} />
                  {!sidebarCollapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      {item.label}
                    </motion.span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Profile + Logout */}
        <div className="flex flex-col gap-3">
          <div className="sidebar-profile-box flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#00D9FF] to-[#7C3AED] flex items-center justify-center text-xs font-bold text-black flex-shrink-0">
              AD
            </div>
            {!sidebarCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-grow min-w-0">
                <p className="text-xs font-bold text-white truncate">{user?.name || "System Admin"}</p>
                <span className="status-pill-premium status-pill-success" style={{ marginTop: 4, fontSize: 9 }}>
                  SUPER ADMIN
                </span>
              </motion.div>
            )}
          </div>
          <button onClick={logout} className="btn-sidebar-signout">
            <LogOut size={14} />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="dashboard-content-viewport">
        {isLoading ? (
          <div className="flex items-center justify-center h-[70vh]">
            <LoadingSpinner size="large" />
          </div>
        ) : (
          <AnimatePresence mode="wait">

            {/* ── OVERVIEW ──────────────────────────────────────────────── */}
            {activeTab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-6"
              >
                <div className="dashboard-vignette" />

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-white uppercase">
                      Admin Command Center
                    </h2>
                    <p className="text-[11px] text-[#71717a] mt-1">
                      Global platform telemetry, workspace audit, and license management.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="status-pill-premium status-pill-success">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                      System Online
                    </span>
                  </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <StatCard icon={Building}  value={stats?.totalCompanies}    label="Total Workspaces"          accentColor="#00D9FF" />
                  <StatCard icon={Users}     value={stats?.totalUsers}         label="Total User Accounts"       accentColor="#8b5cf6" />
                  <StatCard icon={Shield}    value={stats?.activeLicenses}     label="Active Licenses"           accentColor="#10b981" />
                </div>

                {/* Quick tips panel */}
                <div className="glass-panel-premium">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
                    <Sparkles size={14} className="text-[#00D9FF] animate-pulse" />
                    <span className="text-[10px] font-black text-white uppercase tracking-wider">Quick Management Notes</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {[
                      { title: "Enterprise Workspaces", desc: "Toggle user limits or subscription plans from the Companies tab." },
                      { title: "Deactivating Users", desc: "Deactivating a company owner locks access for the entire tenant. Use caution." },
                      { title: "License Audits", desc: "Active license count reflects all non-expired enterprise subscriptions across tenants." },
                    ].map((tip, i) => (
                      <div key={i} className="flex gap-3 p-3 rounded-xl bg-white/2 border border-white/4">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] mt-1.5 flex-shrink-0 shadow-[0_0_6px_#00D9FF]" />
                        <div>
                          <span className="text-xs font-bold text-white">{tip.title}: </span>
                          <span className="text-xs text-[#a1a1aa]">{tip.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Companies snapshot */}
                <div className="glass-panel-premium">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                    <span className="text-[10px] font-black text-white uppercase tracking-wider">Recent Workspaces</span>
                    <button
                      onClick={() => setActiveTab("companies")}
                      className="text-[10px] text-[#00D9FF] font-bold hover:underline"
                    >
                      View All →
                    </button>
                  </div>
                  <div className="premium-table-container">
                    <table className="premium-data-table">
                      <thead>
                        <tr>
                          <th>Company</th>
                          <th>Owner Email</th>
                          <th>Plan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companies?.slice(0, 5).map(c => (
                          <tr key={c._id} className="table-row">
                            <td>
                              <button
                                onClick={() => setDetailCompanyId(c._id)}
                                className="font-bold text-[#00D9FF] hover:text-white transition"
                              >
                                {c.name}
                              </button>
                            </td>
                            <td>{c.ownerId?.email || "No Owner"}</td>
                            <td>
                              <span className={`status-pill-premium ${c.plan === "enterprise" ? "status-pill-warning" : "status-pill-success"}`}>
                                {c.plan}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── COMPANIES ─────────────────────────────────────────────── */}
            {activeTab === "companies" && (
              <motion.div
                key="companies"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-6"
              >
                <div>
                  <h2 className="text-xl font-black tracking-tight text-white uppercase">Manage Workspaces</h2>
                  <p className="text-[11px] text-[#71717a] mt-1">Configure subscriptions, active nodes, and delete tenants.</p>
                </div>

                <div className="glass-panel-premium" style={{ padding: 0, overflow: "hidden" }}>
                  <div className="premium-table-container" style={{ borderRadius: 20, border: "none" }}>
                    <table className="premium-data-table">
                      <thead>
                        <tr>
                          <th>Company Name</th>
                          <th>Owner Email</th>
                          <th>Plan</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companies?.map(c => (
                          <tr key={c._id} className="table-row">
                            <td>
                              <button
                                onClick={() => setDetailCompanyId(c._id)}
                                className="font-bold text-[#00D9FF] hover:text-white transition text-left"
                              >
                                {c.name}
                              </button>
                            </td>
                            <td>{c.ownerId?.email || "No Owner"}</td>
                            <td>
                              <span className={`status-pill-premium ${c.plan === "enterprise" ? "status-pill-warning" : "status-pill-success"}`}>
                                {c.plan}
                              </span>
                            </td>
                            <td>
                              <div className="flex gap-2 justify-end items-center">
                                <select
                                  value={c.plan}
                                  onChange={e => planMutation.mutate({ companyId: c._id, plan: e.target.value })}
                                  className="glass-input-field"
                                  style={{ width: "auto", padding: "6px 10px", fontSize: 11, cursor: "pointer" }}
                                >
                                  <option value="free">Free</option>
                                  <option value="growth">Growth</option>
                                  <option value="enterprise">Enterprise</option>
                                </select>
                                <button
                                  onClick={() => setSelectedCompany(c)}
                                  className="btn-glass-danger"
                                >
                                  <Trash2 size={11} /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── USERS ─────────────────────────────────────────────────── */}
            {activeTab === "users" && (
              <motion.div
                key="users"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-6"
              >
                <div>
                  <h2 className="text-xl font-black tracking-tight text-white uppercase">Global Users Audit</h2>
                  <p className="text-[11px] text-[#71717a] mt-1">Review authentication credentials, roles, and account status.</p>
                </div>

                <div className="glass-panel-premium" style={{ padding: 0, overflow: "hidden" }}>
                  <div className="premium-table-container" style={{ borderRadius: 20, border: "none" }}>
                    <table className="premium-data-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users?.map(u => (
                          <tr key={u._id} className="table-row">
                            <td className="font-bold text-white">{u.name}</td>
                            <td>{u.email}</td>
                            <td>
                              <span className="status-pill-premium status-pill-warning" style={{ textTransform: "none" }}>
                                {u.role}
                              </span>
                            </td>
                            <td>
                              <span className={`status-pill-premium ${u.isActive ? "status-pill-success" : "status-pill-danger"}`}>
                                {u.isActive ? "Active" : "Deactivated"}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              {u.role !== "admin" && (
                                <button
                                  onClick={() => toggleUserActiveMutation.mutate({ userId: u._id, isActive: !u.isActive })}
                                  className={`btn-glass-danger`}
                                  style={u.isActive
                                    ? {}
                                    : { borderColor: "rgba(16,185,129,0.3)", color: "#10b981" }
                                  }
                                >
                                  {u.isActive ? <><Ban size={11} /> Deactivate</> : <><CheckCircle size={11} /> Activate</>}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </main>

      {/* ── CONFIRM DIALOG ──────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!selectedCompany}
        title="Delete Workspace?"
        message={`Permanently delete "${selectedCompany?.name}"? This will remove all repositories, employees, and data linked to it.`}
        confirmLabel="Delete"
        onConfirm={() => deleteCompanyMutation.mutate(selectedCompany._id)}
        onCancel={() => setSelectedCompany(null)}
      />

      {/* ── COMPANY DETAIL MODAL ─────────────────────────────────────────── */}
      <AnimatePresence>
        {detailCompanyId && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailCompanyId(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
            />
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-0 flex items-center justify-center z-[110] p-5 pointer-events-none"
            >
              <div
                className="glass-panel-premium w-full pointer-events-auto"
                style={{
                  maxWidth: 780,
                  maxHeight: "88vh",
                  display: "flex",
                  flexDirection: "column",
                  padding: 0,
                  overflow: "hidden",
                  boxShadow: "0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)"
                }}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="sidebar-logo-box">
                      <Building size={14} className="text-[#00D9FF]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">
                        {companyDetails?.company?.name || "Loading..."} — Workspace Audit
                      </h3>
                      <p className="text-[10px] text-[#71717a] mt-0.5">Full tenant inspection and GitHub integration status</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDetailCompanyId(null)}
                    className="w-8 h-8 rounded-lg border border-white/6 bg-white/2 flex items-center justify-center text-[#71717a] hover:text-white hover:border-white/12 transition"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                  {detailsLoading ? (
                    <div className="flex justify-center py-16"><LoadingSpinner size="medium" /></div>
                  ) : (
                    <>
                      {/* ── KPI STATS ROW ── */}
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: "Subscription Plan", value: (companyDetails?.company?.plan || "free").toUpperCase(), color: "#00D9FF",  icon: "💳" },
                          { label: "Active Employees",  value: companyDetails?.employees?.length ?? 0,                   color: "#8b5cf6", icon: "👥" },
                          { label: "Repositories",      value: companyDetails?.repositories?.length ?? 0,                color: "#10b981", icon: "📁" },
                        ].map(s => (
                          <div
                            key={s.label}
                            className="flex flex-col items-center justify-center gap-1.5 p-5 rounded-2xl border"
                            style={{ background: `${s.color}06`, borderColor: `${s.color}18` }}
                          >
                            <span className="text-lg">{s.icon}</span>
                            <div className="text-[9px] font-black text-[#71717a] uppercase tracking-widest text-center">{s.label}</div>
                            <div className="text-2xl font-black mt-0.5" style={{ color: s.color }}>{s.value}</div>
                          </div>
                        ))}
                      </div>

                      {/* ── GITHUB INTEGRATION ── */}
                      <div className="rounded-2xl border border-white/6 overflow-hidden" style={{ background: "rgba(10,10,12,0.45)" }}>
                        {/* Section header */}
                        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/5 bg-white/1">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] shadow-[0_0_6px_#00D9FF]" />
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">GitHub App Integration</span>
                          <span
                            className="ml-auto status-pill-premium"
                            style={companyDetails?.company?.github?.connected
                              ? { background: "rgba(16,185,129,0.08)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }
                              : { background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }
                            }
                          >
                            {companyDetails?.company?.github?.connected ? "● Connected" : "○ Disconnected"}
                          </span>
                        </div>
                        {/* Key-value rows */}
                        <div className="flex flex-col divide-y divide-white/4">
                          {[
                            { key: "Status", value: companyDetails?.company?.github?.connected ? "GitHub App installed and active" : "No GitHub App connection found" },
                            ...(companyDetails?.company?.github?.connected ? [
                              { key: "Organization", value: companyDetails?.company?.github?.organization || "—" },
                              { key: "Connected On",  value: companyDetails?.company?.github?.connectedAt
                                ? new Date(companyDetails.company.github.connectedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                                : "—"
                              },
                            ] : []),
                          ].map(row => (
                            <div key={row.key} className="flex items-center px-5 py-3 gap-4">
                              <span className="text-[10.5px] font-bold text-[#71717a] w-32 flex-shrink-0">{row.key}</span>
                              <span className="text-[11px] font-semibold text-white">{row.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* ── INVITED EMPLOYEES ── */}
                      <div className="rounded-2xl border border-white/6 overflow-hidden" style={{ background: "rgba(10,10,12,0.45)" }}>
                        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/5 bg-white/1">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] shadow-[0_0_6px_#8b5cf6]" />
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">Invited Employees</span>
                          <span className="ml-auto text-[10px] font-bold text-[#71717a]">
                            {companyDetails?.invites?.length || 0} total
                          </span>
                        </div>
                        {(!companyDetails?.invites || companyDetails.invites.length === 0) ? (
                          <div className="py-10 text-center text-[11px] text-[#71717a]">No invitations sent yet.</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full" style={{ borderCollapse: "collapse", fontSize: 11.5 }}>
                              <thead>
                                <tr className="border-b border-white/5">
                                  {["Name", "Email", "Repository", "Status"].map(h => (
                                    <th key={h} className="text-left px-5 py-3 text-[9.5px] font-black text-[#52525b] uppercase tracking-widest">
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {companyDetails.invites.map((invite, i) => (
                                  <tr
                                    key={invite._id}
                                    className="border-b border-white/4 hover:bg-white/2 transition-colors"
                                  >
                                    <td className="px-5 py-3.5 font-bold text-white">{invite.name || "N/A"}</td>
                                    <td className="px-5 py-3.5 text-[#a1a1aa]">{invite.email}</td>
                                    <td className="px-5 py-3.5">
                                      <code className="text-[#00D9FF] bg-[#00D9FF]/8 border border-[#00D9FF]/15 px-2 py-1 rounded-md text-[10px] font-mono">
                                        {invite.assignedRepo || "All Repositories"}
                                      </code>
                                    </td>
                                    <td className="px-5 py-3.5">
                                      <span
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider"
                                        style={
                                          invite.status === "accepted"
                                            ? { background: "rgba(16,185,129,0.08)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }
                                            : invite.status === "expired"
                                            ? { background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }
                                            : { background: "rgba(234,179,8,0.08)", color: "#f59e0b", border: "1px solid rgba(234,179,8,0.2)" }
                                        }
                                      >
                                        <span className="w-1 h-1 rounded-full bg-current" />
                                        {invite.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* ── MONITORED REPOSITORIES ── */}
                      <div className="rounded-2xl border border-white/6 overflow-hidden" style={{ background: "rgba(10,10,12,0.45)" }}>
                        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/5 bg-white/1">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981]" />
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">Monitored Repositories</span>
                          <span className="ml-auto text-[10px] font-bold text-[#71717a]">
                            {companyDetails?.repositories?.length || 0} connected
                          </span>
                        </div>
                        {(!companyDetails?.repositories || companyDetails.repositories.length === 0) ? (
                          <div className="py-10 text-center text-[11px] text-[#71717a]">No repositories connected yet.</div>
                        ) : (
                          <div className="p-4 flex flex-wrap gap-2">
                            {companyDetails.repositories.map(repo => (
                              <div
                                key={repo._id}
                                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs"
                                style={{
                                  background: repo.status === "completed" ? "rgba(16,185,129,0.05)" : "rgba(245,158,11,0.05)",
                                  borderColor: repo.status === "completed" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)"
                                }}
                              >
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{
                                    background: repo.status === "completed" ? "#10b981" : "#f59e0b",
                                    boxShadow: repo.status === "completed" ? "0 0 6px #10b981" : "0 0 6px #f59e0b"
                                  }}
                                />
                                <span className="font-bold text-white">{repo.repoName}</span>
                                {repo.language && (
                                  <span
                                    className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                    style={{ background: "rgba(255,255,255,0.05)", color: "#71717a" }}
                                  >
                                    {repo.language}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="px-8 py-4 border-t border-white/5 flex justify-end">
                  <button onClick={() => setDetailCompanyId(null)} className="btn-glass-secondary" style={{ padding: "10px 20px" }}>
                    Close Audit
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

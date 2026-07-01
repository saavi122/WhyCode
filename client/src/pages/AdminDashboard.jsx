import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  Users, Building, Shield, Sliders, LogOut, CheckCircle, Ban, Trash2, Key, RefreshCw
} from "lucide-react";
import API from "../services/api";
import StatCard from "../components/StatCard";
import ConfirmDialog from "../components/ConfirmDialog";
import LoadingSpinner from "../components/LoadingSpinner";
import "./EmployeeDashboard.css";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      const x = e.clientX;
      const y = e.clientY;
      document.documentElement.style.setProperty("--mouse-global-x", `${x}px`);
      document.documentElement.style.setProperty("--mouse-global-y", `${y}px`);
    };
    window.addEventListener("mousemove", handleGlobalMouseMove);
    return () => window.removeEventListener("mousemove", handleGlobalMouseMove);
  }, []);

  const handleCardMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
  };

  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "companies" | "users"
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailCompanyId, setDetailCompanyId] = useState(null);

  // Fetch company details for admin view
  const { data: companyDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ["companyDetails", detailCompanyId],
    queryFn: async () => {
      if (!detailCompanyId) return null;
      const res = await API.get(`/admin/companies/${detailCompanyId}/details`);
      return res.data;
    },
    enabled: !!detailCompanyId
  });

  // Fetch admin stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      const res = await API.get("/admin/stats");
      return res.data;
    }
  });

  // Fetch all companies
  const { data: companies, isLoading: companiesLoading } = useQuery({
    queryKey: ["adminCompanies"],
    queryFn: async () => {
      const res = await API.get("/admin/companies");
      return res.data;
    }
  });

  // Fetch all users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: async () => {
      const res = await API.get("/admin/users");
      return res.data;
    }
  });

  // Mutation: Change plan
  const planMutation = useMutation({
    mutationFn: async ({ companyId, plan }) => {
      return API.patch(`/admin/companies/${companyId}/plan`, { plan });
    },
    onSuccess: () => {
      showToast("Company subscription plan updated.", "success");
      queryClient.invalidateQueries(["adminCompanies"]);
      queryClient.invalidateQueries(["adminStats"]);
    },
    onError: (err) => {
      showToast(err.response?.data?.message || "Failed to update plan.", "error");
    }
  });

  // Mutation: Delete company
  const deleteCompanyMutation = useMutation({
    mutationFn: async (companyId) => {
      return API.delete(`/admin/companies/${companyId}`);
    },
    onSuccess: () => {
      showToast("Company and its data deleted.", "success");
      setSelectedCompany(null);
      queryClient.invalidateQueries(["adminCompanies"]);
      queryClient.invalidateQueries(["adminStats"]);
    },
    onError: (err) => {
      showToast(err.response?.data?.message || "Failed to delete company.", "error");
    }
  });

  // Toggle user active status
  const toggleUserActiveMutation = useMutation({
    mutationFn: async ({ userId, isActive }) => {
      return API.post(`/employees/status/${userId}`, { isActive });
    },
    onSuccess: () => {
      showToast("User status updated successfully.", "success");
      queryClient.invalidateQueries(["adminUsers"]);
    },
    onError: (err) => {
      showToast(err.response?.data?.message || "Failed to update user status.", "error");
    }
  });

  const isLoading = statsLoading || companiesLoading || usersLoading;

  return (
    <div className="dashboard-root">
      {/* Background Decorative Grids and Ambient glows */}
      <div className="dashboard-bg-grid" />
      <div className="dashboard-noise" />
      <div className="ambient-glow-1" />
      <div className="ambient-glow-2" />
      <div className="dashboard-spotlight" />

      {/* Sidebar */}
      <aside className="sidebar-container">
        <div>
          {/* Logo */}
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon" style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", boxShadow: "0 0 15px rgba(16, 185, 129, 0.4)" }}>
              A
            </div>
            <span className="sidebar-logo-text">Admin Center</span>
          </div>

          {/* Nav */}
          <nav className="sidebar-nav">
            {[
              { key: "overview", label: "Overview", icon: <Sliders size={14} /> },
              { key: "companies", label: "Companies", icon: <Building size={14} /> },
              { key: "users", label: "All Users", icon: <Users size={14} /> }
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`sidebar-link ${activeTab === item.key ? "active" : ""}`}
                style={{
                  color: activeTab === item.key ? "#10b981" : "#a1a1aa",
                  backgroundColor: activeTab === item.key ? "rgba(16,185,129,0.06)" : "transparent",
                  borderLeftColor: activeTab === item.key ? "#10b981" : "transparent"
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* User Info & LogOut */}
        <div className="sidebar-user-section">
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar" style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", boxShadow: "0 0 10px rgba(16, 185, 129, 0.2)" }}>
              AD
            </div>
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <p style={{ fontSize: "12px", fontWeight: "700", margin: 0, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                {user?.name || "System Admin"}
              </p>
              <span className="premium-badge badge-emerald" style={{ marginTop: "4px", padding: "2px 6px" }}>
                SUPER ADMIN
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px",
              borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)", background: "rgba(255,255,255,0.01)", color: "#a1a1aa",
              fontSize: "12px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#f43f5e"; e.currentTarget.style.borderColor = "rgba(244,63,94,0.3)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)"; }}
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flexGrow: 1, padding: "40px", boxSizing: "border-box", overflowY: "auto", height: "100vh", position: "relative", zIndex: 5 }}>
        {isLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh" }}>
            <LoadingSpinner size="large" />
          </div>
        ) : (
          <div>
            {/* OVERVIEW PANEL */}
            {activeTab === "overview" && (
              <div className="animate-slide-up">
                <div style={{ marginBottom: "32px" }}>
                  <h2 className="hero-title">Admin Configuration Center</h2>
                  <p style={{ fontSize: "14px", color: "#a1a1aa", margin: 0 }}>Global platform telemetry, workspaces, and licenses auditor.</p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "24px", marginBottom: "40px" }}>
                  <StatCard icon={Building} value={stats?.totalCompanies || 0} label="Total Workspaces" accentColor="#10b981" />
                  <StatCard icon={Users} value={stats?.totalUsers || 0} label="Total User Accounts" accentColor="#06b6d4" />
                  <StatCard icon={Shield} value={stats?.activeLicenses || 0} label="Active Enterprise Licenses" accentColor="#8b5cf6" />
                </div>

                <div className="premium-card" onMouseMove={handleCardMouseMove} style={{ padding: "28px" }}>
                  <h3 style={{ fontSize: "15px", fontWeight: "800", margin: "0 0 20px 0", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: "14px", color: "#ffffff" }}>
                    Quick Management Tips
                  </h3>
                  <p style={{ fontSize: "13px", color: "#a1a1aa", lineHeight: "1.7", margin: "0 0 14px 0" }}>
                    - <strong>Enterprise Workspaces:</strong> You can toggle user limits or plans from the "Companies" tab.
                  </p>
                  <p style={{ fontSize: "13px", color: "#a1a1aa", lineHeight: "1.7", margin: 0 }}>
                    - <strong>Deactivating Users:</strong> Deactivating a company owner will lock access for that entire tenant. Use caution.
                  </p>
                </div>
              </div>
            )}

            {/* COMPANIES PANEL */}
            {activeTab === "companies" && (
              <div className="animate-slide-up">
                <div style={{ marginBottom: "28px" }}>
                  <h2 className="hero-title">Manage Workspaces</h2>
                  <p style={{ fontSize: "14px", color: "#a1a1aa", margin: 0 }}>Configure subscriptions, active nodes, and delete tenants.</p>
                </div>

                <div className="premium-card" onMouseMove={handleCardMouseMove} style={{ padding: 0, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)", textAlign: "left", backgroundColor: "rgba(255, 255, 255, 0.01)" }}>
                        <th style={{ padding: "18px 24px", color: "#8a8a93", fontWeight: "700" }}>Company Name</th>
                        <th style={{ padding: "18px 24px", color: "#8a8a93", fontWeight: "700" }}>Owner Email</th>
                        <th style={{ padding: "18px 24px", color: "#8a8a93", fontWeight: "700" }}>Current Plan</th>
                        <th style={{ padding: "18px 24px", color: "#8a8a93", fontWeight: "700", textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies?.map((c) => (
                        <tr key={c._id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                          <td 
                            style={{ padding: "18px 24px", fontWeight: "700", color: "#10b981", cursor: "pointer", transition: "color 0.2s" }}
                            onClick={() => setDetailCompanyId(c._id)}
                            onMouseEnter={(e) => e.currentTarget.style.color = "#059669"}
                            onMouseLeave={(e) => e.currentTarget.style.color = "#10b981"}
                          >
                            {c.name}
                          </td>
                          <td style={{ padding: "18px 24px", color: "#d1d5db" }}>{c.ownerId?.email || "No Owner"}</td>
                          <td style={{ padding: "18px 24px" }}>
                            <span className={`premium-badge ${c.plan === "enterprise" ? "badge-purple" : "badge-emerald"}`}>
                              {c.plan}
                            </span>
                          </td>
                          <td style={{ padding: "18px 24px", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", alignItems: "center" }}>
                              <select
                                value={c.plan}
                                onChange={(e) => planMutation.mutate({ companyId: c._id, plan: e.target.value })}
                                style={{
                                  backgroundColor: "rgba(10, 10, 10, 0.8)", border: "1px solid rgba(255, 255, 255, 0.08)", color: "#fff",
                                  borderRadius: "6px", padding: "6px 10px", fontSize: "12px", cursor: "pointer", outline: "none"
                                }}
                              >
                                <option value="free">Free</option>
                                <option value="growth">Growth</option>
                                <option value="enterprise">Enterprise</option>
                              </select>
                              <button
                                onClick={() => setSelectedCompany(c)}
                                className="premium-btn"
                                style={{ borderColor: "rgba(244,63,94,0.3)", color: "#f43f5e", padding: "6px 12px" }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* USERS PANEL */}
            {activeTab === "users" && (
              <div className="animate-slide-up">
                <div style={{ marginBottom: "28px" }}>
                  <h2 className="hero-title">Global Users Audit</h2>
                  <p style={{ fontSize: "14px", color: "#a1a1aa", margin: 0 }}>Review authentication credentials, roles, and status keys.</p>
                </div>

                <div className="premium-card" onMouseMove={handleCardMouseMove} style={{ padding: 0, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)", textAlign: "left", backgroundColor: "rgba(255, 255, 255, 0.01)" }}>
                        <th style={{ padding: "18px 24px", color: "#8a8a93", fontWeight: "700" }}>Name</th>
                        <th style={{ padding: "18px 24px", color: "#8a8a93", fontWeight: "700" }}>Email</th>
                        <th style={{ padding: "18px 24px", color: "#8a8a93", fontWeight: "700" }}>Role</th>
                        <th style={{ padding: "18px 24px", color: "#8a8a93", fontWeight: "700" }}>Status</th>
                        <th style={{ padding: "18px 24px", color: "#8a8a93", fontWeight: "700", textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users?.map((u) => (
                        <tr key={u._id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                          <td style={{ padding: "18px 24px", fontWeight: "700", color: "#ffffff" }}>{u.name}</td>
                          <td style={{ padding: "18px 24px", color: "#d1d5db" }}>{u.email}</td>
                          <td style={{ padding: "18px 24px" }}>
                            <span className="premium-badge badge-purple" style={{ textTransform: "none" }}>
                              {u.role}
                            </span>
                          </td>
                          <td style={{ padding: "18px 24px" }}>
                            <span className={`premium-badge ${u.isActive ? "badge-emerald" : "badge-rose"}`}>
                              {u.isActive ? "Active" : "Deactivated"}
                            </span>
                          </td>
                          <td style={{ padding: "18px 24px", textAlign: "right" }}>
                            {u.role !== "admin" && (
                              <button
                                onClick={() => toggleUserActiveMutation.mutate({ userId: u._id, isActive: !u.isActive })}
                                className="premium-btn"
                                style={{
                                  borderColor: u.isActive ? "rgba(244,63,94,0.3)" : "rgba(16,185,129,0.3)",
                                  color: u.isActive ? "#f43f5e" : "#10b981",
                                  padding: "6px 12px"
                                }}
                              >
                                {u.isActive ? "Deactivate" : "Activate"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <ConfirmDialog
        isOpen={!!selectedCompany}
        title="Delete Workspace?"
        message={`Are you sure you want to permanently delete company "${selectedCompany?.name}"? This will delete all repositories, employees, and data linked to it.`}
        confirmLabel="Delete"
        onConfirm={() => deleteCompanyMutation.mutate(selectedCompany._id)}
        onCancel={() => setSelectedCompany(null)}
      />

      {/* COMPANY DETAILS OVERLAY MODAL */}
      {detailCompanyId && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 1000, padding: "20px"
        }}>
          <div style={{
            background: "linear-gradient(135deg, rgba(15, 15, 20, 0.98) 0%, rgba(10, 10, 16, 0.98) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "20px",
            width: "100%", maxWidth: "760px", maxHeight: "85vh", display: "flex", flexDirection: "column",
            boxShadow: "0 30px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)", overflow: "hidden"
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "24px 32px", borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
              display: "flex", alignItems: "center", justify: "space-between",
              backgroundColor: "rgba(255, 255, 255, 0.01)", justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Building size={20} style={{ color: "#10b981" }} />
                <h3 style={{ fontSize: "16px", fontWeight: "800", margin: 0, color: "#fff", letterSpacing: "-0.01em" }}>
                  {companyDetails?.company?.name || "Loading..."} - Workspace Audit
                </h3>
              </div>
              <button
                onClick={() => setDetailCompanyId(null)}
                style={{
                  background: "none", border: "none", color: "#8a8a93",
                  cursor: "pointer", fontSize: "22px", fontWeight: "bold", transition: "color 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#ffffff"}
                onMouseLeave={(e) => e.currentTarget.style.color = "#8a8a93"}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: "32px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "28px" }}>
              {detailsLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                  <LoadingSpinner size="medium" />
                </div>
              ) : (
                <>
                  {/* Stats Summary Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
                    <div style={{ backgroundColor: "rgba(255, 255, 255, 0.01)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                      <span style={{ fontSize: "10px", color: "#8a8a93", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.05em" }}>Subscription Plan</span>
                      <p style={{ fontSize: "18px", fontWeight: "800", color: "#10b981", margin: "8px 0 0" }}>
                        {(companyDetails?.company?.plan || "free").toUpperCase()}
                      </p>
                    </div>
                    <div style={{ backgroundColor: "rgba(255, 255, 255, 0.01)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                      <span style={{ fontSize: "10px", color: "#8a8a93", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.05em" }}>Active Employees</span>
                      <p style={{ fontSize: "18px", fontWeight: "800", color: "#06b6d4", margin: "8px 0 0" }}>
                        {companyDetails?.employees?.length || 0}
                      </p>
                    </div>
                    <div style={{ backgroundColor: "rgba(255, 255, 255, 0.01)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                      <span style={{ fontSize: "10px", color: "#8a8a93", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.05em" }}>Connected Repositories</span>
                      <p style={{ fontSize: "18px", fontWeight: "800", color: "#8b5cf6", margin: "8px 0 0" }}>
                        {companyDetails?.repositories?.length || 0}
                      </p>
                    </div>
                  </div>

                  {/* Git Integration Details */}
                  <div style={{ backgroundColor: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "20px" }}>
                    <h4 style={{ fontSize: "13px", color: "#fff", fontWeight: "800", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>GitHub App Integration Status</h4>
                    <p style={{ fontSize: "12px", color: "#a1a1aa", margin: "0 0 8px 0" }}>
                      <strong>Status:</strong> <span style={{ color: "#ffffff" }}>{companyDetails?.company?.github?.connected ? "Connected" : "Not Connected"}</span>
                    </p>
                    {companyDetails?.company?.github?.connected && (
                      <>
                        <p style={{ fontSize: "12px", color: "#a1a1aa", margin: "0 0 8px 0" }}>
                          <strong>Organization Name:</strong> <span style={{ color: "#ffffff" }}>{companyDetails?.company?.github?.organization}</span>
                        </p>
                        <p style={{ fontSize: "12px", color: "#a1a1aa", margin: "0" }}>
                          <strong>Connection Date:</strong> <span style={{ color: "#ffffff" }}>{new Date(companyDetails?.company?.github?.connectedAt).toLocaleDateString()}</span>
                        </p>
                      </>
                    )}
                  </div>

                  {/* Invited Employees Section */}
                  <div>
                    <h4 style={{ fontSize: "13px", color: "#fff", fontWeight: "800", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Invited Employees</h4>
                    {(!companyDetails?.invites || companyDetails.invites.length === 0) ? (
                      <div style={{ textAlign: "center", padding: "24px 0", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: "10px", color: "#8a8a93", fontSize: "12px" }}>
                        No invitations sent yet.
                      </div>
                    ) : (
                      <div style={{ overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "10px" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                          <thead>
                            <tr style={{ backgroundColor: "rgba(255,255,255,0.01)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                              <th style={{ padding: "12px 16px", color: "#8a8a93", fontWeight: "700" }}>Name</th>
                              <th style={{ padding: "12px 16px", color: "#8a8a93", fontWeight: "700" }}>Email</th>
                              <th style={{ padding: "12px 16px", color: "#8a8a93", fontWeight: "700" }}>Repository</th>
                              <th style={{ padding: "12px 16px", color: "#8a8a93", fontWeight: "700" }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {companyDetails.invites.map((invite) => (
                              <tr key={invite._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                <td style={{ padding: "12px 16px", fontWeight: "600", color: "#fff" }}>{invite.name || "N/A"}</td>
                                <td style={{ padding: "12px 16px", color: "#a1a1aa" }}>{invite.email}</td>
                                <td style={{ padding: "12px 16px" }}>
                                  <code style={{ fontSize: "11px", color: "#00f2fe", backgroundColor: "rgba(0,242,254,0.05)", padding: "3px 8px", borderRadius: "4px" }}>
                                    {invite.assignedRepo || "All Repositories"}
                                  </code>
                                </td>
                                <td style={{ padding: "12px 16px" }}>
                                  <span className={`premium-badge ${invite.status === "accepted" ? "badge-emerald" : invite.status === "expired" ? "badge-rose" : "badge-amber"}`} style={{ textTransform: "none" }}>
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

                  {/* Connected Repositories Section */}
                  <div>
                    <h4 style={{ fontSize: "13px", color: "#fff", fontWeight: "800", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Monitored Code Repositories</h4>
                    {(!companyDetails?.repositories || companyDetails.repositories.length === 0) ? (
                      <div style={{ textAlign: "center", padding: "24px 0", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: "10px", color: "#8a8a93", fontSize: "12px" }}>
                        No repositories connected yet.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                        {companyDetails.repositories.map((repo) => (
                          <div
                            key={repo._id}
                            style={{
                              backgroundColor: "rgba(255, 255, 255, 0.01)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px",
                              padding: "10px 16px", fontSize: "12px", display: "flex", alignItems: "center", gap: "10px"
                            }}
                          >
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: repo.status === "completed" ? "#10b981" : "#f59e0b", boxShadow: repo.status === "completed" ? "0 0 8px #10b981" : "0 0 8px #f59e0b" }} />
                            <span style={{ fontWeight: "600", color: "#fff" }}>{repo.repoName}</span>
                            <span style={{ color: "#8a8a93", fontSize: "11px" }}>({repo.language})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "20px 32px", borderTop: "1px solid rgba(255, 255, 255, 0.05)",
              display: "flex", justifyContent: "flex-end", backgroundColor: "rgba(255, 255, 255, 0.01)"
            }}>
              <button
                onClick={() => setDetailCompanyId(null)}
                className="premium-btn"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from "react";
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

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

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
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#0a0f1e",
      color: "#f9fafb",
      fontFamily: "'Inter', sans-serif",
      display: "flex"
    }}>
      {/* Sidebar */}
      <aside style={{
        width: "260px",
        backgroundColor: "#0d1424",
        borderRight: "1px solid #1f2937",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "32px 24px",
        boxSizing: "border-box",
        position: "sticky",
        top: 0,
        height: "100vh"
      }}>
        <div>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "36px" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "8px",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: "900", color: "#fff", fontSize: "16px"
            }}>
              A
            </div>
            <span style={{ fontSize: "16px", fontWeight: "900", letterSpacing: "-0.03em" }}>CodeMemory Admin</span>
          </div>

          {/* Nav */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {[
              { key: "overview", label: "Overview", icon: <Sliders size={15} /> },
              { key: "companies", label: "Companies", icon: <Building size={15} /> },
              { key: "users", label: "All Users", icon: <Users size={15} /> }
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  fontSize: "13px", fontWeight: activeTab === item.key ? "700" : "600",
                  padding: "10px 16px", borderRadius: "8px",
                  color: activeTab === item.key ? "#10b981" : "#9ca3af",
                  backgroundColor: activeTab === item.key ? "rgba(16,185,129,0.08)" : "transparent",
                  borderLeft: activeTab === item.key ? "3px solid #10b981" : "3px solid transparent",
                  border: "none", cursor: "pointer", textAlign: "left", width: "100%"
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* User Info & LogOut */}
        <div>
          <div style={{
            display: "flex", alignItems: "center", gap: "12px", padding: "12px",
            backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid #1f2937", borderRadius: "12px", marginBottom: "16px"
          }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "800", color: "#fff"
            }}>
              AD
            </div>
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <p style={{ fontSize: "12px", fontWeight: "700", margin: 0, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                {user?.name || "System Admin"}
              </p>
              <span style={{
                fontSize: "9px", textTransform: "uppercase", color: "#10b981", fontWeight: "800",
                display: "inline-block", backgroundColor: "rgba(16,185,129,0.08)", padding: "1px 6px", borderRadius: "4px", marginTop: "3px"
              }}>
                SUPER ADMIN
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px",
              borderRadius: "8px", border: "1px solid #1f2937", background: "none", color: "#6b7280",
              fontSize: "13px", fontWeight: "700", cursor: "pointer", transition: "all 0.2s"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#6b7280"; e.currentTarget.style.borderColor = "#1f2937"; }}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flexGrow: 1, padding: "40px", boxSizing: "border-box", overflowY: "auto", height: "100vh" }}>
        {isLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh" }}>
            <LoadingSpinner size="large" />
          </div>
        ) : (
          <div>
            {/* OVERVIEW PANEL */}
            {activeTab === "overview" && (
              <div>
                <div style={{ marginBottom: "32px" }}>
                  <h2 style={{ fontSize: "22px", fontWeight: "900", letterSpacing: "-0.03em", margin: "0 0 6px 0" }}>Admin Configuration Center</h2>
                  <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>Global platform telemetry, workspaces, and licenses auditor.</p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px", marginBottom: "40px" }}>
                  <StatCard icon={Building} value={stats?.totalCompanies || 0} label="Total Workspaces" accentColor="#10b981" />
                  <StatCard icon={Users} value={stats?.totalUsers || 0} label="Total User Accounts" accentColor="#06b6d4" />
                  <StatCard icon={Shield} value={stats?.activeLicenses || 0} label="Active Enterprise Licenses" accentColor="#8b5cf6" />
                </div>

                <div style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "16px", padding: "24px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: "800", margin: "0 0 16px 0", borderBottom: "1px solid #1f2937", paddingBottom: "12px" }}>
                    Quick Management Tips
                  </h3>
                  <p style={{ fontSize: "13px", color: "#9ca3af", lineHeight: "1.6", margin: "0 0 12px 0" }}>
                    - <strong>Enterprise Workspaces:</strong> You can toggle user limits or plans from the "Companies" tab.
                  </p>
                  <p style={{ fontSize: "13px", color: "#9ca3af", lineHeight: "1.6", margin: 0 }}>
                    - <strong>Deactivating Users:</strong> Deactivating a company owner will lock access for that entire tenant. Use caution.
                  </p>
                </div>
              </div>
            )}

            {/* COMPANIES PANEL */}
            {activeTab === "companies" && (
              <div>
                <div style={{ marginBottom: "24px" }}>
                  <h2 style={{ fontSize: "20px", fontWeight: "900", margin: "0 0 6px 0" }}>Manage Workspaces</h2>
                  <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>Configure subscriptions, active nodes, and delete tenants.</p>
                </div>

                <div style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "16px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1f2937", textAlign: "left", backgroundColor: "#0d1424" }}>
                        <th style={{ padding: "16px", color: "#6b7280" }}>Company Name</th>
                        <th style={{ padding: "16px", color: "#6b7280" }}>Owner Email</th>
                        <th style={{ padding: "16px", color: "#6b7280" }}>Current Plan</th>
                        <th style={{ padding: "16px", color: "#6b7280", textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies?.map((c) => (
                        <tr key={c._id} style={{ borderBottom: "1px solid #1f2937" }}>
                          <td 
                            style={{ padding: "16px", fontWeight: "800", color: "#10b981", cursor: "pointer", transition: "color 0.2s" }}
                            onClick={() => setDetailCompanyId(c._id)}
                            onMouseEnter={(e) => e.currentTarget.style.color = "#059669"}
                            onMouseLeave={(e) => e.currentTarget.style.color = "#10b981"}
                          >
                            {c.name}
                          </td>
                          <td style={{ padding: "16px", color: "#9ca3af" }}>{c.ownerId?.email || "No Owner"}</td>
                          <td style={{ padding: "16px" }}>
                            <span style={{
                              fontSize: "10px", fontWeight: "800", padding: "3px 8px", borderRadius: "6px",
                              backgroundColor: c.plan === "enterprise" ? "rgba(139,92,246,0.08)" : "rgba(16,185,129,0.08)",
                              color: c.plan === "enterprise" ? "#8b5cf6" : "#10b981",
                              textTransform: "uppercase"
                            }}>
                              {c.plan}
                            </span>
                          </td>
                          <td style={{ padding: "16px", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                              <select
                                value={c.plan}
                                onChange={(e) => planMutation.mutate({ companyId: c._id, plan: e.target.value })}
                                style={{
                                  backgroundColor: "#1f2937", border: "1px solid #374151", color: "#fff",
                                  borderRadius: "6px", padding: "4px 8px", fontSize: "11px", cursor: "pointer"
                                }}
                              >
                                <option value="free">Free</option>
                                <option value="growth">Growth</option>
                                <option value="enterprise">Enterprise</option>
                              </select>
                              <button
                                onClick={() => setSelectedCompany(c)}
                                style={{
                                  backgroundColor: "transparent", border: "1px solid #ef4444", color: "#ef4444",
                                  padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer"
                                }}
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
              <div>
                <div style={{ marginBottom: "24px" }}>
                  <h2 style={{ fontSize: "20px", fontWeight: "900", margin: "0 0 6px 0" }}>Global Users Audit</h2>
                  <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>Review authentication credentials, roles, and status keys.</p>
                </div>

                <div style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "16px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1f2937", textAlign: "left", backgroundColor: "#0d1424" }}>
                        <th style={{ padding: "16px", color: "#6b7280" }}>Name</th>
                        <th style={{ padding: "16px", color: "#6b7280" }}>Email</th>
                        <th style={{ padding: "16px", color: "#6b7280" }}>Role</th>
                        <th style={{ padding: "16px", color: "#6b7280" }}>Status</th>
                        <th style={{ padding: "16px", color: "#6b7280", textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users?.map((u) => (
                        <tr key={u._id} style={{ borderBottom: "1px solid #1f2937" }}>
                          <td style={{ padding: "16px", fontWeight: "700" }}>{u.name}</td>
                          <td style={{ padding: "16px", color: "#9ca3af" }}>{u.email}</td>
                          <td style={{ padding: "16px" }}>
                            <span style={{
                              fontSize: "10px", fontWeight: "800", padding: "2px 6px", borderRadius: "4px",
                              backgroundColor: "rgba(255,255,255,0.04)", color: "#d1d5db"
                            }}>
                              {u.role}
                            </span>
                          </td>
                          <td style={{ padding: "16px" }}>
                            <span style={{
                              fontSize: "10px", fontWeight: "800", padding: "2px 8px", borderRadius: "12px",
                              backgroundColor: u.isActive ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                              color: u.isActive ? "#10b981" : "#ef4444"
                            }}>
                              {u.isActive ? "Active" : "Deactivated"}
                            </span>
                          </td>
                          <td style={{ padding: "16px", textAlign: "right" }}>
                            {u.role !== "admin" && (
                              <button
                                onClick={() => toggleUserActiveMutation.mutate({ userId: u._id, isActive: !u.isActive })}
                                style={{
                                  backgroundColor: "transparent",
                                  border: `1px solid ${u.isActive ? "#ef4444" : "#10b981"}`,
                                  color: u.isActive ? "#ef4444" : "#10b981",
                                  padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer"
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
          backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 1000, padding: "20px"
        }}>
          <div style={{
            backgroundColor: "#0d1424", border: "1px solid #1f2937", borderRadius: "16px",
            width: "100%", maxWidth: "750px", maxHeight: "85vh", display: "flex", flexDirection: "column",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)", overflow: "hidden"
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "20px 24px", borderBottom: "1px solid #1f2937",
              display: "flex", alignItems: "center", justify: "space-between",
              backgroundColor: "#111827", justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Building size={18} style={{ color: "#10b981" }} />
                <h3 style={{ fontSize: "16px", fontWeight: "900", margin: 0, color: "#fff" }}>
                  {companyDetails?.company?.name || "Loading..."} - Workspace Audit
                </h3>
              </div>
              <button
                onClick={() => setDetailCompanyId(null)}
                style={{
                  background: "none", border: "none", color: "#9ca3af",
                  cursor: "pointer", fontSize: "20px", fontWeight: "bold"
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: "24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "24px" }}>
              {detailsLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                  <LoadingSpinner size="medium" />
                </div>
              ) : (
                <>
                  {/* Stats Summary Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                    <div style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "10px", padding: "14px", textAlign: "center" }}>
                      <span style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", fontWeight: "700" }}>Subscription Plan</span>
                      <p style={{ fontSize: "16px", fontWeight: "800", color: "#10b981", margin: "6px 0 0" }}>
                        {(companyDetails?.company?.plan || "free").toUpperCase()}
                      </p>
                    </div>
                    <div style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "10px", padding: "14px", textAlign: "center" }}>
                      <span style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", fontWeight: "700" }}>Active Employees</span>
                      <p style={{ fontSize: "16px", fontWeight: "800", color: "#06b6d4", margin: "6px 0 0" }}>
                        {companyDetails?.employees?.length || 0}
                      </p>
                    </div>
                    <div style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "10px", padding: "14px", textAlign: "center" }}>
                      <span style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", fontWeight: "700" }}>Connected Repositories</span>
                      <p style={{ fontSize: "16px", fontWeight: "800", color: "#8b5cf6", margin: "6px 0 0" }}>
                        {companyDetails?.repositories?.length || 0}
                      </p>
                    </div>
                  </div>

                  {/* Git Integration Details */}
                  <div style={{ backgroundColor: "rgba(255,255,255,0.01)", border: "1px solid #1f2937", borderRadius: "10px", padding: "16px" }}>
                    <h4 style={{ fontSize: "12px", color: "#fff", fontWeight: "800", margin: "0 0 10px 0", textTransform: "uppercase" }}>GitHub App Integration Status</h4>
                    <p style={{ fontSize: "11px", color: "#9ca3af", margin: "0 0 6px 0" }}>
                      <strong>Status:</strong> {companyDetails?.company?.github?.connected ? "Connected" : "Not Connected"}
                    </p>
                    {companyDetails?.company?.github?.connected && (
                      <>
                        <p style={{ fontSize: "11px", color: "#9ca3af", margin: "0 0 6px 0" }}>
                          <strong>Organization Name:</strong> {companyDetails?.company?.github?.organization}
                        </p>
                        <p style={{ fontSize: "11px", color: "#9ca3af", margin: "0" }}>
                          <strong>Connection Date:</strong> {new Date(companyDetails?.company?.github?.connectedAt).toLocaleDateString()}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Invited Employees Section */}
                  <div>
                    <h4 style={{ fontSize: "12px", color: "#fff", fontWeight: "800", margin: "0 0 12px 0", textTransform: "uppercase" }}>Invited Employees</h4>
                    {(!companyDetails?.invites || companyDetails.invites.length === 0) ? (
                      <div style={{ textAlign: "center", padding: "20px 0", border: "1px dashed #1f2937", borderRadius: "8px", color: "#6b7280", fontSize: "11px" }}>
                        No invitations sent yet.
                      </div>
                    ) : (
                      <div style={{ overflow: "hidden", border: "1px solid #1f2937", borderRadius: "8px" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", textAlign: "left" }}>
                          <thead>
                            <tr style={{ backgroundColor: "#111827", borderBottom: "1px solid #1f2937" }}>
                              <th style={{ padding: "10px 12px", color: "#6b7280" }}>Name</th>
                              <th style={{ padding: "10px 12px", color: "#6b7280" }}>Email</th>
                              <th style={{ padding: "10px 12px", color: "#6b7280" }}>Repository</th>
                              <th style={{ padding: "10px 12px", color: "#6b7280" }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {companyDetails.invites.map((invite) => (
                              <tr key={invite._id} style={{ borderBottom: "1px solid #1f2937" }}>
                                <td style={{ padding: "10px 12px", fontWeight: "600", color: "#fff" }}>{invite.name || "N/A"}</td>
                                <td style={{ padding: "10px 12px", color: "#9ca3af" }}>{invite.email}</td>
                                <td style={{ padding: "10px 12px" }}>
                                  <code style={{ fontSize: "10px", color: "#6366f1", backgroundColor: "rgba(99,102,241,0.06)", padding: "2px 6px", borderRadius: "4px" }}>
                                    {invite.assignedRepo || "All Repositories"}
                                  </code>
                                </td>
                                <td style={{ padding: "10px 12px" }}>
                                  <span style={{
                                    fontSize: "9px", fontWeight: "800", padding: "2px 6px", borderRadius: "4px",
                                    backgroundColor: invite.status === "accepted" ? "rgba(16,185,129,0.08)" : invite.status === "expired" ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)",
                                    color: invite.status === "accepted" ? "#10b981" : invite.status === "expired" ? "#ef4444" : "#f59e0b",
                                    textTransform: "uppercase"
                                  }}>
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
                    <h4 style={{ fontSize: "12px", color: "#fff", fontWeight: "800", margin: "0 0 12px 0", textTransform: "uppercase" }}>Monitored Code Repositories</h4>
                    {(!companyDetails?.repositories || companyDetails.repositories.length === 0) ? (
                      <div style={{ textAlign: "center", padding: "20px 0", border: "1px dashed #1f2937", borderRadius: "8px", color: "#6b7280", fontSize: "11px" }}>
                        No repositories connected yet.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {companyDetails.repositories.map((repo) => (
                          <div
                            key={repo._id}
                            style={{
                              backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "6px",
                              padding: "8px 12px", fontSize: "11px", display: "flex", alignItems: "center", gap: "8px"
                            }}
                          >
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: repo.status === "completed" ? "#10b981" : "#f59e0b" }} />
                            <span style={{ fontWeight: "600", color: "#fff" }}>{repo.repoName}</span>
                            <span style={{ color: "#6b7280", fontSize: "10px" }}>({repo.language})</span>
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
              padding: "16px 24px", borderTop: "1px solid #1f2937",
              display: "flex", justifyContent: "flex-end", backgroundColor: "#111827"
            }}>
              <button
                onClick={() => setDetailCompanyId(null)}
                style={{
                  backgroundColor: "#1f2937", border: "1px solid #374151", color: "#fff",
                  padding: "8px 16px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer"
                }}
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

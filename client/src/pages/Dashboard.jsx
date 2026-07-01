import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation, Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AdminDashboard from "./AdminDashboard";
import EmployeeDashboard from "./EmployeeDashboard";
import {
  Users, Building, Mail, Plus, Shield, Sliders, Play, Lock, Sparkles, Folder,
  GitFork, Layers, LogOut, RefreshCw, Key, Settings, Cpu, HardDrive, Menu, X,
  Clock, CheckCircle, AlertTriangle, BarChart3, ChevronRight, MessageSquare,
  Search, Trash2, Send, CornerDownLeft, Eye, HelpCircle, Check, Ban
} from "lucide-react";
import API from "../services/api";
import "./Dashboard.css";

// Skeletons and UI Helpers
import StatCard from "../components/StatCard";
import ConfirmDialog from "../components/ConfirmDialog";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import ConnectRepoModal from "../components/ConnectRepoModal";
import InviteModal from "../components/InviteModal";

// Helper: Format Date
const formatDate = (dateStr) => {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// Helper: Time Ago
const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return interval + "y ago";
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval + "mo ago";
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval + "d ago";
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + "h ago";
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + "m ago";
  return "just now";
};

// Helper: Table loading skeleton
const TableSkeleton = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", padding: "12px 0" }}>
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="pulse-skeleton" style={{
        height: "40px",
        backgroundColor: "#1f2937",
        borderRadius: "8px",
        width: "100%"
      }} />
    ))}
  </div>
);

// Helper: Card loading skeleton
const CardGridSkeleton = () => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="pulse-skeleton" style={{
        height: "180px",
        backgroundColor: "#111827",
        border: "1px solid #1f2937",
        borderRadius: "12px",
        width: "100%"
      }} />
    ))}
  </div>
);

// MAIN DASHBOARD SWITCHER
export default function Dashboard() {
  const { user } = useAuth();

  if (user?.role === "admin") {
    return <AdminDashboard />;
  }
  if (user?.role === "employee") {
    return <EmployeeDashboard />;
  }

  return <CompanyDashboard />;
}

function CompanyDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch Company Profile globally for sidebar branding
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await API.get("/company/profile");
      return res.data;
    }
  });

  // Active state styling helper
  const isActive = (path) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard" || location.pathname === "/dashboard/";
    }
    return location.pathname.startsWith(path);
  };

  const navItemStyle = (path) => ({
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "13px",
    fontWeight: isActive(path) ? "700" : "600",
    padding: "10px 16px",
    borderRadius: "8px",
    color: isActive(path) ? "#6366f1" : "#9ca3af",
    backgroundColor: isActive(path) ? "rgba(99, 102, 241, 0.08)" : "transparent",
    borderLeft: isActive(path) ? "3px solid #6366f1" : "3px solid transparent",
    textDecoration: "none",
    transition: "all 0.2s"
  });

  return (
    <div className="dashboard-root" style={{
      display: "flex",
      flexDirection: "column"
    }}>
      <div className="dashboard-grid-pattern" />

      {/* Mobile Header */}
      <header style={{
        display: "none",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 24px",
        position: "sticky",
        top: 0,
        zIndex: 1000,
        height: "64px",
        boxSizing: "border-box"
      }} className="mobile-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "28px", height: "28px", borderRadius: "8px",
            background: "linear-gradient(135deg, #10b981 0%, #8b5cf6 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: "900", color: "#000", fontSize: "14px"
          }}>C</div>
          <span style={{ fontSize: "14px", fontWeight: "900", letterSpacing: "-0.02em" }}>CodeMemory</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      <div style={{ display: "flex", flexGrow: 1 }}>
        {/* Sidebar Left */}
        <aside
          className={`sidebar-nav glass-sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}
          style={{
            width: "260px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "32px 24px",
            boxSizing: "border-box",
            position: "sticky",
            top: 0,
            height: "100vh"
          }}
        >
          <div>
            {/* Logo */}
            <div className="sidebar-logo" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "36px" }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "8px",
                background: "linear-gradient(135deg, #10b981 0%, #8b5cf6 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: "900", color: "#000", fontSize: "16px"
              }}>
                C
              </div>
              <span style={{ fontSize: "16px", fontWeight: "800", letterSpacing: "-0.03em" }}>CodeMemory</span>
            </div>

            {/* Menu */}
            <nav style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className={`sidebar-link ${isActive("/dashboard") ? "active-link" : ""}`}>
                <Sliders size={15} />
                <span>Overview</span>
              </Link>
              <Link to="/dashboard/employees" onClick={() => setMobileMenuOpen(false)} className={`sidebar-link ${isActive("/dashboard/employees") ? "active-link" : ""}`}>
                <Users size={15} />
                <span>Employees</span>
              </Link>
              <Link to="/dashboard/invites" onClick={() => setMobileMenuOpen(false)} className={`sidebar-link ${isActive("/dashboard/invites") ? "active-link" : ""}`}>
                <Mail size={15} />
                <span>Invitations</span>
              </Link>
              <Link to="/dashboard/repositories" onClick={() => setMobileMenuOpen(false)} className={`sidebar-link ${isActive("/dashboard/repositories") ? "active-link" : ""}`}>
                <GitFork size={15} />
                <span>Repositories</span>
              </Link>
              <Link to="/dashboard/chat" onClick={() => setMobileMenuOpen(false)} className={`sidebar-link ${isActive("/dashboard/chat") ? "active-link" : ""}`}>
                <MessageSquare size={15} />
                <span>Knowledge Chat</span>
              </Link>
              <Link to="/dashboard/profile" onClick={() => setMobileMenuOpen(false)} className={`sidebar-link ${isActive("/dashboard/profile") ? "active-link" : ""}`}>
                <Settings size={15} />
                <span>Company Profile</span>
              </Link>
            </nav>
          </div>

          {/* User profile section */}
          <div>
            <div className="sidebar-profile-card" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "38px", height: "38px", borderRadius: "50%",
                background: "linear-gradient(135deg, #10b981 0%, #8b5cf6 100%)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "800", color: "#000",
                overflow: "hidden", flexShrink: 0
              }}>
                {profile?.logo ? (
                  <img src={profile.logo} alt={profile.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  profile?.name?.substring(0, 2).toUpperCase() || "CM"
                )}
              </div>
              <div style={{ flexGrow: 1, minWidth: 0 }}>
                <p style={{ fontSize: "13px", fontWeight: "800", margin: 0, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", color: "#fff" }}>
                  {profile?.name || "CodeMemory"}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                  <span style={{ fontSize: "10px", color: "#a1a1aa", fontWeight: "600", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {user?.name}
                  </span>
                  <span style={{
                    fontSize: "8px", textTransform: "uppercase", color: "#10b981", fontWeight: "900",
                    backgroundColor: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.12)", padding: "1px 5px", borderRadius: "3px", flexShrink: 0
                  }}>
                    {user?.role}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="btn-sidebar-logout"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <main style={{ flexGrow: 1, padding: "40px", boxSizing: "border-box", overflowY: "auto", height: "100vh" }} className="main-content glass-main">
          <Routes>
            <Route path="/" element={<OverviewPanel />} />
            <Route path="/employees" element={<EmployeesPanel />} />
            <Route path="/invites" element={<InvitationsPanel />} />
            <Route path="/repositories" element={<RepositoriesPanel />} />
            <Route path="/repositories/:repoId" element={<RepositoryDetailPanel />} />
            <Route path="/chat" element={<KnowledgeChatPanel />} />
            <Route path="/profile" element={<CompanyProfilePanel />} />
          </Routes>
        </main>
      </div>

      <style>{`
        .pulse-skeleton {
          animation: pulse 1.5s infinite ease-in-out;
        }
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 0.3; }
          100% { opacity: 0.6; }
        }
        @media (max-width: 768px) {
          .mobile-header {
            display: flex !important;
          }
          .sidebar-nav {
            display: none !important;
            position: fixed !important;
            left: 0;
            top: 64px;
            height: calc(100vh - 64px) !important;
            z-index: 999;
            width: 100vw !important;
          }
          .sidebar-nav.mobile-open {
            display: flex !important;
          }
          .main-content {
            padding: 20px !important;
            height: calc(100vh - 64px) !important;
          }
          .sidebar-logo {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

// -------------------------------------------------------------
// PANEL 1: OVERVIEW
// -------------------------------------------------------------
function OverviewPanel() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [triggerDropdownOpen, setTriggerDropdownOpen] = useState(false);

  // Fetch Dashboard Stats
  const { data: stats, isLoading, isError, error } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await API.get("/company/stats");
      return res.data;
    }
  });

  // Fetch Repos list for dropdown and table
  const { data: repos } = useQuery({
    queryKey: ["repositories"],
    queryFn: async () => {
      const res = await API.get("/repositories");
      return res.data;
    }
  });

  // Mutation: Trigger Scan
  const scanMutation = useMutation({
    mutationFn: async (repoId) => {
      return API.post(`/scan/${repoId}`);
    },
    onSuccess: () => {
      showToast("Repository scan initiated in background.", "success");
      queryClient.invalidateQueries(["repositories"]);
      queryClient.invalidateQueries(["stats"]);
    },
    onError: (err) => {
      showToast(err.response?.data?.message || "Failed to trigger scan.", "error");
    }
  });

  if (isLoading) return <LoadingSpinner size="large" />;
  if (isError) {
    return (
      <div style={{ padding: "20px", color: "#ef4444", backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px" }}>
        Error loading overview statistics: {error.message}
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: "900", letterSpacing: "-0.03em", margin: "0 0 6px 0" }}>System Overview</h2>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>Real-time telemetry and indexing analysis summary.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "20px", marginBottom: "40px" }}>
        <StatCard icon={Users} value={stats.totalEmployees} label="Total Employees" accentColor="#06b6d4" />
        <StatCard icon={Clock} value={stats.pendingInvites} label="Pending Invites" accentColor="#eab308" />
        <StatCard icon={CheckCircle} value={stats.acceptedInvites} label="Accepted Invites" accentColor="#10b981" />
        <StatCard icon={Folder} value={stats.totalRepositories} label="Repositories" accentColor="#6366f1" />
        <StatCard icon={AlertTriangle} value={stats.totalDriftIssues} label="Open Drift Issues" accentColor="#ef4444" />
        <StatCard icon={BarChart3} value={`${stats.avgDocHealth}%`} label="Avg Doc Health" accentColor="#8b5cf6" />
      </div>

      {/* Middle Row Layout */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", marginBottom: "40px" }}>
        {/* Recent Activity */}
        <div className="glass-card-premium" style={{ flex: "2 1 500px", boxSizing: "border-box" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "800", margin: "0 0 20px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "12px", color: "#fff" }}>Recent Activity</h3>
          {stats.recentActivity?.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#71717a" }}>
              No repository activity yet. Connect a repo to get started.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {stats.recentActivity.map((act) => (
                <div key={act._id} style={{ display: "flex", alignItems: "center", justifySpaceBetween: "space-between", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10b981", boxShadow: "0 0 8px #10b981" }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: "12px", fontWeight: "700", color: "#f9fafb", margin: "0 0 4px 0", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {act.message.length > 60 ? `${act.message.substring(0, 60)}...` : act.message}
                      </p>
                      <span style={{ fontSize: "10px", color: "#71717a" }}>by {act.author} • {timeAgo(act.date)}</span>
                    </div>
                  </div>
                  <span className="status-pill-premium status-pill-info">
                    {act.repository?.repoName || "Repository"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="glass-card-premium" style={{ flex: "1 1 300px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "12px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "800", margin: "0 0 12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "12px", color: "#fff" }}>Quick Actions</h3>
          
          <button
            onClick={() => setIsInviteOpen(true)}
            className="btn-glass-primary"
            style={{ width: "100%" }}
          >
            <Users size={14} />
            <span>Invite Employee</span>
          </button>

          <button
            onClick={() => setIsConnectOpen(true)}
            className="btn-glass-secondary"
            style={{ width: "100%" }}
          >
            <GitFork size={14} />
            <span>Connect Repository</span>
          </button>

          <div style={{ position: "relative" }}>
            <button
              onClick={() => setTriggerDropdownOpen(!triggerDropdownOpen)}
              className="btn-glass-secondary"
              style={{ width: "100%" }}
            >
              <Play size={14} />
              <span>Trigger Scan</span>
            </button>

            {triggerDropdownOpen && (
              <div className="glass-card-premium" style={{
                position: "absolute", bottom: "100%", left: 0, width: "100%", padding: "8px", boxSizing: "border-box",
                zIndex: 100, display: "flex", flexDirection: "column", gap: "4px", marginBottom: "8px"
              }}>
                {repos?.length === 0 ? (
                  <span style={{ fontSize: "11px", color: "#71717a", padding: "8px", textAlign: "center" }}>No connected repos</span>
                ) : (
                  repos?.map((repo) => (
                    <button
                      key={repo._id}
                      onClick={() => {
                        scanMutation.mutate(repo._id);
                        setTriggerDropdownOpen(false);
                      }}
                      className="sidebar-link"
                      style={{
                        padding: "8px", border: "none",
                        fontSize: "11px", textAlign: "left"
                      }}
                    >
                      {repo.fullName}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Repositories Mini Table */}
      <div className="glass-card-premium" style={{ padding: "24px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: "800", margin: "0 0 16px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "12px", color: "#fff" }}>Repositories Summary</h3>
        {repos?.length === 0 ? (
          <EmptyState
            icon={Folder}
            title="Connect your first repository"
            description="Link a repository to track code changes, documentation drift, and ask tribal knowledge questions."
            actionLabel="Connect Repo"
            onAction={() => setIsConnectOpen(true)}
          />
        ) : (
          <div className="premium-table-wrapper">
            <table className="premium-data-grid">
              <thead>
                <tr>
                  <th>Repo Name</th>
                  <th>Language</th>
                  <th>Doc Health</th>
                  <th>Drift Issues</th>
                  <th>Status</th>
                  <th>Last Scan</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {repos?.map((repo) => (
                  <tr key={repo._id} className="grid-row">
                    <td style={{ fontWeight: "700" }}>{repo.repoName}</td>
                    <td style={{ color: "#a1a1aa" }}>{repo.language || "Unknown"}</td>
                    <td style={{ minWidth: "140px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ flexGrow: 1, height: "6px", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{
                            width: `${repo.docHealthScore}%`, height: "100%",
                            backgroundColor: repo.docHealthScore > 70 ? "#10b981" : repo.docHealthScore > 40 ? "#f59e0b" : "#ef4444",
                            boxShadow: `0 0 8px ${repo.docHealthScore > 70 ? "#10b981" : repo.docHealthScore > 40 ? "#f59e0b" : "#ef4444"}44`
                          }} />
                        </div>
                        <span style={{ fontWeight: "700" }}>{repo.docHealthScore}%</span>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        color: repo.openDriftCount > 0 ? "#ef4444" : "#10b981",
                        fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px"
                      }}>
                        {repo.openDriftCount > 0 ? <AlertTriangle size={12} /> : null}
                        <span>{repo.openDriftCount}</span>
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill-premium ${
                        repo.status === "completed" ? "status-pill-success" :
                        repo.status === "failed" ? "status-pill-danger" : "status-pill-warning"
                      }`}>
                        {repo.status}
                      </span>
                    </td>
                    <td style={{ color: "#71717a" }}>{formatDate(repo.lastScanAt)}</td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        <button
                          onClick={() => scanMutation.mutate(repo._id)}
                          className="btn-glass-secondary"
                          style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "10px" }}
                        >
                          Scan Now
                        </button>
                        <button
                          onClick={() => navigate(`/dashboard/repositories/${repo._id}`)}
                          className="btn-glass-primary"
                          style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "10px" }}
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InviteModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} onInviteSent={() => queryClient.invalidateQueries(["stats"])} />
      <ConnectRepoModal isOpen={isConnectOpen} onClose={() => setIsConnectOpen(false)} onConnected={() => queryClient.invalidateQueries(["repositories"])} />
    </div>
  );
}

// -------------------------------------------------------------
// PANEL 2: EMPLOYEES
// -------------------------------------------------------------
function EmployeesPanel() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Fetch employees
  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await API.get("/company/employees");
      return res.data;
    }
  });

  // Mutation: Remove employee
  const deleteMutation = useMutation({
    mutationFn: async (userId) => {
      return API.delete(`/company/employees/${userId}`);
    },
    onSuccess: () => {
      showToast("Employee removed successfully.", "success");
      queryClient.invalidateQueries(["employees"]);
      setSelectedUser(null);
    },
    onError: (err) => {
      showToast(err.response?.data?.message || "Failed to remove employee.", "error");
    }
  });

  // Client-side filtering
  const filteredEmployees = employees?.filter((emp) =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: "900", letterSpacing: "-0.03em", margin: "0 0 6px 0" }}>Team Members</h2>
          <p style={{ fontSize: "13px", color: "#71717a", margin: 0 }}>Manage developer access permissions and company profiles.</p>
        </div>
        <button
          onClick={() => setIsInviteOpen(true)}
          className="btn-glass-primary"
        >
          <Plus size={14} />
          <span>Invite Employee</span>
        </button>
      </div>

      <div className="glass-card-premium" style={{ padding: "24px" }}>
        {/* Search */}
        <div style={{ position: "relative", marginBottom: "20px", maxWidth: "320px" }}>
          <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#71717a" }} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glass-input-premium"
            style={{ paddingLeft: "36px" }}
          />
        </div>

        {isLoading ? (
          <TableSkeleton />
        ) : filteredEmployees.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#71717a" }}>
            No employees yet. Send invites to grow your team.
          </div>
        ) : (
          <div className="premium-table-wrapper">
            <table className="premium-data-grid">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Email</th>
                  <th>Joined Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => {
                  const initials = emp.name.substring(0, 2).toUpperCase();
                  return (
                    <tr key={emp._id} className="grid-row">
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{
                            width: "32px", height: "32px", borderRadius: "50%",
                            background: "linear-gradient(135deg, #10b981 0%, #8b5cf6 100%)", display: "flex", alignItems: "center",
                            justifyContent: "center", color: "#000", fontWeight: "800", fontSize: "10px"
                          }}>
                            {initials}
                          </div>
                          <span style={{ fontWeight: "700" }}>{emp.name}</span>
                        </div>
                      </td>
                      <td style={{ color: "#a1a1aa" }}>{emp.email}</td>
                      <td style={{ color: "#71717a" }}>{formatDate(emp.createdAt)}</td>
                      <td>
                        <span className="status-pill-premium status-pill-success">
                          Active
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          onClick={() => setSelectedUser(emp)}
                          className="btn-glass-danger"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InviteModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} onInviteSent={() => queryClient.invalidateQueries(["employees"])} />

      <ConfirmDialog
        isOpen={!!selectedUser}
        title={`Remove ${selectedUser?.name}?`}
        message="This will revoke their access to all repositories."
        confirmLabel="Remove"
        onConfirm={() => deleteMutation.mutate(selectedUser._id)}
        onCancel={() => setSelectedUser(null)}
      />
    </div>
  );
}

// -------------------------------------------------------------
// PANEL 3: INVITATIONS
// -------------------------------------------------------------
function InvitationsPanel() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedInvite, setSelectedInvite] = useState(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Fetch invites
  const { data: invites, isLoading } = useQuery({
    queryKey: ["invites"],
    queryFn: async () => {
      const res = await API.get("/invites/list");
      return res.data;
    }
  });

  // Mutation: Resend invite
  const resendMutation = useMutation({
    mutationFn: async (id) => {
      return API.post(`/invites/resend/${id}`);
    },
    onSuccess: () => {
      showToast("Invitation link resent successfully.", "success");
      queryClient.invalidateQueries(["invites"]);
    },
    onError: (err) => {
      showToast(err.response?.data?.message || "Failed to resend invite.", "error");
    }
  });

  // Mutation: Revoke invite
  const revokeMutation = useMutation({
    mutationFn: async (id) => {
      return API.delete(`/invites/${id}`);
    },
    onSuccess: () => {
      showToast("Invitation revoked.", "success");
      queryClient.invalidateQueries(["invites"]);
      setSelectedInvite(null);
    },
    onError: (err) => {
      showToast(err.response?.data?.message || "Failed to revoke invite.", "error");
    }
  });

  // Client-side tab filters
  const filteredInvites = invites?.filter((inv) => {
    if (activeTab === "all") return true;
    return inv.status === activeTab;
  }) || [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: "900", letterSpacing: "-0.03em", margin: "0 0 6px 0" }}>Invitations</h2>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>Track active registration links sent to team members.</p>
        </div>
        <button
          onClick={() => setIsInviteOpen(true)}
          className="btn-glass-primary"
          style={{
            display: "flex", alignItems: "center", gap: "8px"
          }}
        >
          <Mail size={14} />
          <span>Send Invite</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {["all", "pending", "accepted", "expired"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`btn-glass-secondary ${activeTab === tab ? "active" : ""}`}
            style={{
              padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "700",
              textTransform: "uppercase", cursor: "pointer", 
              backgroundColor: activeTab === tab ? "rgba(16, 185, 129, 0.1)" : "transparent",
              color: activeTab === tab ? "#10b981" : "#9ca3af",
              border: activeTab === tab ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid transparent"
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="glass-card-premium" style={{ padding: "24px" }}>
        {isLoading ? (
          <TableSkeleton />
        ) : filteredInvites.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
            No {activeTab === "all" ? "" : activeTab} invitations.
          </div>
        ) : (
          <div className="premium-table-wrapper" style={{ overflowX: "auto" }}>
            <div style={{
              backgroundColor: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.12)",
              borderRadius: "10px", padding: "12px 16px", marginBottom: "16px",
              fontSize: "11px", color: "#10b981", lineHeight: "1.6",
              boxShadow: "0 4px 15px rgba(0,0,0,0.4)"
            }}>
              {`💡 `}<strong>No email in dev?</strong>{` Click `}<strong>📋 Copy Link</strong>{` and share it with the employee. They can also sign in directly at `}<strong>/employee/login</strong>{` with email + company name.`}
            </div>
            <table className="premium-data-grid" style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px", fontSize: "12px" }}>
              <thead>
                <tr style={{ textAlign: "left" }}>
                  <th style={{ padding: "12px", color: "#6b7280" }}>Email</th>
                  <th style={{ padding: "12px", color: "#6b7280" }}>Status</th>
                  <th style={{ padding: "12px", color: "#6b7280" }}>Repo</th>
                  <th style={{ padding: "12px", color: "#6b7280" }}>Invited By</th>
                  <th style={{ padding: "12px", color: "#6b7280" }}>Expires At</th>
                  <th style={{ padding: "12px", color: "#6b7280", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvites.map((inv) => {
                  const isExpired = new Date(inv.expiresAt) < new Date();
                  const isAccepted = inv.status === "accepted";
                  const isPending = inv.status === "pending" && !isExpired;
                  
                  return (
                    <tr key={inv._id} className="grid-row">
                      <td style={{ padding: "16px 12px" }}>
                        <div style={{ fontWeight: "700", color: "#f3f4f6" }}>{inv.email}</div>
                        {inv.name && <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px" }}>{inv.name}</div>}
                      </td>
                      <td style={{ padding: "16px 12px" }}>
                        <span className={`status-pill-premium ${isAccepted ? 'success' : isExpired ? 'danger' : 'warning'}`}>
                          {isExpired && inv.status === "pending" ? "Expired" : inv.status}
                        </span>
                      </td>
                      <td style={{ padding: "16px 12px", fontSize: "11px" }}>
                        {inv.assignedRepo
                          ? <span style={{ color: "#6366f1", backgroundColor: "rgba(99,102,241,0.06)", padding: "4px 8px", borderRadius: "6px" }}>{inv.assignedRepo}</span>
                          : <span style={{ color: "#374151" }}>—</span>
                        }
                      </td>
                      <td style={{ padding: "16px 12px", color: "#9ca3af" }}>{inv.invitedBy?.name || "Admin"}</td>
                      <td style={{ padding: "16px 12px", color: isExpired ? "#ef4444" : "#6b7280" }}>
                        {isExpired ? "Expired" : formatDate(inv.expiresAt)}
                      </td>
                      <td style={{ padding: "16px 12px", textAlign: "right" }}>
                        {inv.status === "pending" && !isExpired ? (
                          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                            {inv.inviteLink && (
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(inv.inviteLink);
                                  showToast("✅ Invite link copied! Share it with the employee.", "success");
                                }}
                                title={inv.inviteLink}
                                className="btn-glass-secondary"
                                style={{
                                  color: "#06b6d4",
                                  borderColor: "rgba(6,182,212,0.3)"
                                }}
                              >
                                📋 Copy Link
                              </button>
                            )}
                            <button
                              onClick={() => resendMutation.mutate(inv._id)}
                              disabled={resendMutation.isPending}
                              className="btn-glass-secondary"
                              style={{ color: "#6366f1", borderColor: "rgba(99,102,241,0.3)" }}
                            >
                              {resendMutation.isPending && resendMutation.variables === inv._id ? <LoadingSpinner /> : "Resend"}
                            </button>
                            <button
                              onClick={() => setSelectedInvite(inv)}
                              className="btn-glass-danger"
                            >
                              Revoke
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: "10px", color: "#6b7280" }}>--</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InviteModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} onInviteSent={() => queryClient.invalidateQueries(["invites"])} />

      <ConfirmDialog
        isOpen={!!selectedInvite}
        title="Revoke Invitation?"
        message={`This will invalidate the invite link sent to ${selectedInvite?.email}.`}
        confirmLabel="Revoke"
        onConfirm={() => revokeMutation.mutate(selectedInvite._id)}
        onCancel={() => setSelectedInvite(null)}
      />
    </div>
  );
}

// -------------------------------------------------------------
// PANEL 4: REPOSITORIES
// -------------------------------------------------------------
function RepositoriesPanel() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(null);

  // Fetch repositories list
  const { data: repos, isLoading } = useQuery({
    queryKey: ["repositories"],
    queryFn: async () => {
      const res = await API.get("/repositories");
      return res.data;
    }
  });

  // Mutation: Trigger Scan
  const scanMutation = useMutation({
    mutationFn: async (repoId) => {
      return API.post(`/scan/${repoId}`);
    },
    onSuccess: (data, repoId) => {
      showToast("Repository scan triggered.", "success");
      // Instantly refresh query
      queryClient.invalidateQueries(["repositories"]);
    },
    onError: (err) => {
      showToast(err.response?.data?.message || "Failed to start scan.", "error");
    }
  });

  // Mutation: Delete Repo
  const deleteMutation = useMutation({
    mutationFn: async (repoId) => {
      return API.delete(`/repositories/${repoId}`);
    },
    onSuccess: () => {
      showToast("Repository disconnected and all logs deleted.", "success");
      queryClient.invalidateQueries(["repositories"]);
      setSelectedRepo(null);
    },
    onError: (err) => {
      showToast(err.response?.data?.message || "Failed to disconnect repository.", "error");
    }
  });

  // Background status polling for scanning repositories
  useEffect(() => {
    const scanningRepos = repos?.filter((r) => r.status === "scanning") || [];
    if (scanningRepos.length === 0) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries(["repositories"]);
    }, 3000);

    return () => clearInterval(interval);
  }, [repos, queryClient]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: "900", letterSpacing: "-0.03em", margin: "0 0 6px 0" }}>Connected Repositories</h2>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>Configure and index codebases for documentation health tracking.</p>
        </div>
        <button
          onClick={() => setIsConnectOpen(true)}
          className="btn-glass-primary"
          style={{
            display: "flex", alignItems: "center", gap: "8px"
          }}
        >
          <GitFork size={14} />
          <span>Connect Repository</span>
        </button>
      </div>

      {isLoading ? (
        <CardGridSkeleton />
      ) : repos?.length === 0 ? (
        <EmptyState
          icon={Folder}
          title="No repositories connected"
          description="Connect a repository in owner/repo format to analyze comments, find documentation gaps, and run AI lookups."
          actionLabel="Connect Repository"
          onAction={() => setIsConnectOpen(true)}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "24px" }}>
          {repos?.map((repo) => (
            <div
              key={repo._id}
              className="glass-card-premium repo-card-hover"
              style={{
                padding: "24px",
                display: "flex", flexDirection: "column", justify: "space-between", gap: "16px"
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                  <h3 style={{ fontSize: "15px", fontWeight: "900", margin: 0, color: "#f3f4f6" }}>{repo.repoName}</h3>
                  <span className="status-pill-premium" style={{
                    backgroundColor: "rgba(99, 102, 241, 0.1)", color: "#818cf8", borderColor: "rgba(99, 102, 241, 0.2)"
                  }}>{repo.language || "JavaScript"}</span>
                </div>
                <code style={{ fontSize: "11px", color: "#9ca3af", letterSpacing: "0.02em" }}>{repo.fullName}</code>

                {/* Progress bar */}
                <div style={{ marginTop: "24px" }}>
                  <div style={{ display: "flex", justify: "space-between", fontSize: "11px", fontWeight: "700", marginBottom: "8px" }}>
                    <span style={{ color: "#9ca3af" }}>Documentation Health</span>
                    <span style={{ color: "#f3f4f6" }}>{repo.docHealthScore}%</span>
                  </div>
                  <div style={{ height: "6px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "6px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{
                      width: `${repo.docHealthScore}%`, height: "100%",
                      background: repo.docHealthScore > 70 ? "linear-gradient(90deg, #059669, #10b981)" : repo.docHealthScore > 40 ? "linear-gradient(90deg, #d97706, #f59e0b)" : "linear-gradient(90deg, #dc2626, #ef4444)",
                      boxShadow: repo.docHealthScore > 70 ? "0 0 10px rgba(16,185,129,0.5)" : "none",
                      transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)"
                    }} />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "16px", marginTop: "24px", fontSize: "11px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <AlertTriangle size={13} style={{ color: repo.openDriftCount > 0 ? "#ef4444" : "#10b981" }} />
                    <span style={{ fontWeight: "700", color: repo.openDriftCount > 0 ? "#f87171" : "#a7f3d0" }}>{repo.openDriftCount} Open Drift Issues</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Users size={13} style={{ color: "#9ca3af" }} />
                    <span style={{ fontWeight: "700", color: "#d1d5db" }}>
                      Bus Factor: {repo.busFactor < 2 ? "⚠ Low" : "✓ Healthy"} ({repo.busFactor})
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "16px", display: "flex", justify: "space-between", alignItems: "center", marginTop: "8px" }}>
                <span style={{ fontSize: "10px", color: "#9ca3af", display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: repo.status === "scanning" ? "#f59e0b" : repo.status === "active" ? "#10b981" : "#6b7280", boxShadow: `0 0 8px ${repo.status === "scanning" ? "#f59e0b" : repo.status === "active" ? "#10b981" : "transparent"}` }}></div>
                  <strong style={{ color: "#e5e7eb", textTransform: "capitalize", letterSpacing: "0.05em" }}>{repo.status}</strong>
                </span>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => scanMutation.mutate(repo._id)}
                    disabled={repo.status === "scanning" || scanMutation.isPending}
                    className="btn-glass-secondary"
                    style={{
                      padding: "6px 12px",
                      display: "flex", alignItems: "center", gap: "6px",
                      color: repo.status === "scanning" ? "#f59e0b" : "#d1d5db",
                      borderColor: repo.status === "scanning" ? "rgba(245, 158, 11, 0.3)" : "rgba(255,255,255,0.1)"
                    }}
                  >
                    {repo.status === "scanning" ? (
                      <>
                        <span style={{ animation: "spin 1s linear infinite" }}>⚡</span>
                        <span>Scanning</span>
                      </>
                    ) : (
                      "Scan"
                    )}
                  </button>

                  <button
                    onClick={() => navigate(`/dashboard/repositories/${repo._id}`)}
                    className="btn-glass-primary"
                    style={{ padding: "6px 12px", fontSize: "11px" }}
                  >
                    View
                  </button>

                  <button
                    onClick={() => setSelectedRepo(repo)}
                    className="btn-glass-danger"
                    style={{ padding: "6px 8px" }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConnectRepoModal isOpen={isConnectOpen} onClose={() => setIsConnectOpen(false)} onConnected={() => queryClient.invalidateQueries(["repositories"])} />

      <ConfirmDialog
        isOpen={!!selectedRepo}
        title="Disconnect Repository?"
        message={`Are you sure you want to disconnect ${selectedRepo?.fullName}? This will delete all drift metrics, questions, and commits logs.`}
        confirmLabel="Disconnect"
        onConfirm={() => deleteMutation.mutate(selectedRepo._id)}
        onCancel={() => setSelectedRepo(null)}
      />
    </div>
  );
}

// -------------------------------------------------------------
// PANEL 5: REPOSITORY DETAIL
// -------------------------------------------------------------
function RepositoryDetailPanel() {
  const { repoId } = useParams();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("drift");
  const [filePathFilter, setFilePathFilter] = useState("");
  const [driftFilter, setDriftFilter] = useState("all");

  // Parallel Query Fetches
  const { data: repo, isLoading: repoLoading } = useQuery({
    queryKey: ["repositories", repoId],
    queryFn: async () => {
      const res = await API.get("/repositories");
      return res.data.find((r) => r._id === repoId);
    }
  });

  const { data: drifts, isLoading: driftLoading } = useQuery({
    queryKey: ["drift", repoId],
    queryFn: async () => {
      const res = await API.get(`/drift/${repoId}`);
      return res.data;
    }
  });

  const { data: timeline, isLoading: timelineLoading } = useQuery({
    queryKey: ["timeline", repoId],
    queryFn: async () => {
      const res = await API.get(`/timeline/${repoId}`);
      return res.data;
    }
  });

  // Mutation: Scan Now
  const scanMutation = useMutation({
    mutationFn: async () => {
      return API.post(`/scan/${repoId}`);
    },
    onSuccess: () => {
      showToast("Scan started.", "success");
      queryClient.invalidateQueries(["repositories", repoId]);
    },
    onError: (err) => {
      showToast(err.response?.data?.message || "Failed to trigger scan.", "error");
    }
  });

  // Mutation: Drift status update
  const driftMutation = useMutation({
    mutationFn: async ({ id, action }) => {
      return API.patch(`/drift/${id}`, { action });
    },
    onSuccess: () => {
      showToast("Drift status updated.", "success");
      queryClient.invalidateQueries(["drift", repoId]);
    },
    onError: (err) => {
      showToast(err.response?.data?.message || "Failed to update drift.", "error");
    }
  });

  if (repoLoading || driftLoading || timelineLoading) return <LoadingSpinner size="large" />;
  if (!repo) return <div style={{ padding: "20px", color: "#ef4444" }}>Repository not found.</div>;

  // Filter drifts client-side
  const filteredDrifts = drifts?.filter((d) => {
    const matchesPath = d.filePath.toLowerCase().includes(filePathFilter.toLowerCase());
    const matchesStatus = driftFilter === "all" ? true : d.status === driftFilter;
    return matchesPath && matchesStatus;
  }) || [];

  return (
    <div>
      {/* Top Header Section */}
      <div style={{ display: "flex", justify: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <span style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.05em" }}>Repository Details</span>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "900", margin: 0, color: "#f3f4f6" }}>{repo.repoName}</h2>
            <span className="status-pill-premium" style={{
              backgroundColor: "rgba(99, 102, 241, 0.1)", color: "#818cf8", borderColor: "rgba(99, 102, 241, 0.2)"
            }}>{repo.language}</span>
          </div>
        </div>

        <button
          onClick={() => scanMutation.mutate()}
          disabled={repo.status === "scanning"}
          className="btn-glass-primary"
          style={{ padding: "10px 18px", gap: "6px" }}
        >
          {repo.status === "scanning" ? <LoadingSpinner /> : <RefreshCw size={12} />}
          <span>{repo.status === "scanning" ? "Scanning..." : "Scan Now"}</span>
        </button>
      </div>

      {/* Mini stats chips */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
        <div className="glass-card-premium" style={{ padding: "14px", textAlign: "center" }}>
          <span style={{ fontSize: "10px", color: "#9ca3af", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.05em" }}>Doc Health</span>
          <p style={{ fontSize: "20px", fontWeight: "900", margin: "6px 0 0 0", color: "#10b981", textShadow: "0 0 10px rgba(16,185,129,0.3)" }}>{repo.docHealthScore}%</p>
        </div>
        <div className="glass-card-premium" style={{ padding: "14px", textAlign: "center" }}>
          <span style={{ fontSize: "10px", color: "#9ca3af", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.05em" }}>Drift Issues</span>
          <p style={{ fontSize: "20px", fontWeight: "900", margin: "6px 0 0 0", color: "#ef4444", textShadow: "0 0 10px rgba(239,68,68,0.3)" }}>{repo.openDriftCount}</p>
        </div>
        <div className="glass-card-premium" style={{ padding: "14px", textAlign: "center" }}>
          <span style={{ fontSize: "10px", color: "#9ca3af", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.05em" }}>Bus Factor</span>
          <p style={{ fontSize: "20px", fontWeight: "900", margin: "6px 0 0 0", color: "#06b6d4", textShadow: "0 0 10px rgba(6,182,212,0.3)" }}>{repo.busFactor}</p>
        </div>
        <div className="glass-card-premium" style={{ padding: "14px", textAlign: "center" }}>
          <span style={{ fontSize: "10px", color: "#9ca3af", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.05em" }}>Last Scanned</span>
          <p style={{ fontSize: "12px", fontWeight: "800", margin: "12px 0 0 0", color: "#e5e7eb" }}>{timeAgo(repo.lastScanAt) || "Never"}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid rgba(255,255,255,0.05)", marginBottom: "24px", paddingBottom: "8px" }}>
        {[
          { key: "drift", label: "Drift Issues" },
          { key: "timeline", label: "Timeline" },
          { key: "chat", label: "Knowledge Chat" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`btn-glass-secondary ${activeTab === tab.key ? "active" : ""}`}
            style={{
              padding: "8px 16px",
              fontSize: "12px",
              backgroundColor: activeTab === tab.key ? "rgba(99, 102, 241, 0.1)" : "transparent",
              color: activeTab === tab.key ? "#818cf8" : "#9ca3af",
              borderColor: activeTab === tab.key ? "rgba(99, 102, 241, 0.3)" : "transparent"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: DRIFT ISSUES */}
      {activeTab === "drift" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ position: "relative", width: "100%", maxWidth: "300px" }}>
              <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
              <input
                type="text"
                placeholder="Filter by file path..."
                value={filePathFilter}
                onChange={(e) => setFilePathFilter(e.target.value)}
                className="glass-input"
                style={{ paddingLeft: "36px" }}
              />
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              {["all", "open", "accepted", "rejected"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setDriftFilter(filter)}
                  className={`btn-glass-secondary ${driftFilter === filter ? "active" : ""}`}
                  style={{
                    padding: "6px 12px",
                    textTransform: "capitalize",
                    backgroundColor: driftFilter === filter ? "rgba(99, 102, 241, 0.1)" : "transparent",
                    color: driftFilter === filter ? "#818cf8" : "#9ca3af",
                    borderColor: driftFilter === filter ? "rgba(99, 102, 241, 0.3)" : "rgba(255,255,255,0.1)"
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {filteredDrifts.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
              No drift issues found. Documentation looks healthy!
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {filteredDrifts.map((drift) => (
                <div
                  key={drift._id}
                  className="glass-card-premium"
                  style={{
                    padding: "24px"
                  }}
                >
                  <div style={{ display: "flex", justify: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <code style={{ fontSize: "13px", fontWeight: "700", color: "#818cf8" }}>{drift.filePath}</code>
                      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                        <span className={`status-pill-premium ${drift.severity === "high" ? "danger" : drift.severity === "medium" ? "warning" : "success"}`}>
                          {drift.severity} severity
                        </span>
                        <span className="status-pill-premium" style={{
                          backgroundColor: "rgba(255,255,255,0.05)", color: "#d1d5db", borderColor: "rgba(255,255,255,0.1)"
                        }}>{drift.type}</span>
                        <span style={{ fontSize: "10px", color: "#9ca3af", display: "flex", alignItems: "center" }}>AI Confidence: {drift.confidence}%</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      {drift.status === "open" ? (
                        <>
                          <button
                            onClick={() => driftMutation.mutate({ id: drift._id, action: "accepted" })}
                            className="btn-glass-secondary"
                            style={{
                              color: "#10b981", borderColor: "rgba(16, 185, 129, 0.3)"
                            }}
                          >
                            ✓ Accept
                          </button>
                          <button
                            onClick={() => driftMutation.mutate({ id: drift._id, action: "rejected" })}
                            className="btn-glass-danger"
                          >
                            ✗ Reject
                          </button>
                        </>
                      ) : (
                        <span className={`status-pill-premium ${drift.status === "accepted" ? "success" : "danger"}`}>
                          {drift.status === "accepted" ? "Applied" : "Rejected"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    <div>
                      <span style={{ fontSize: "10px", color: "#9ca3af", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.05em" }}>Current Documentation</span>
                      <pre style={{
                        backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px",
                        padding: "16px", fontSize: "11px", color: "#d1d5db", overflowX: "auto", margin: "8px 0 0 0",
                        boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)"
                      }}>{drift.currentDocText}</pre>
                    </div>

                    <div>
                      <span style={{ fontSize: "10px", color: "#818cf8", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.05em" }}>AI Suggestion</span>
                      <pre style={{
                        backgroundColor: "rgba(99, 102, 241, 0.05)", border: "1px solid rgba(99, 102, 241, 0.2)", borderRadius: "8px",
                        padding: "16px", fontSize: "11px", color: "#a5b4fc", overflowX: "auto", margin: "8px 0 0 0",
                        boxShadow: "inset 0 2px 10px rgba(0,0,0,0.3)"
                      }}>{drift.suggestion}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TIMELINE */}
      {activeTab === "timeline" && (
        <div>
          {timeline?.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
              No commit history found. Scan the repository first.
            </div>
          ) : (
            <div style={{ position: "relative", paddingLeft: "32px", boxSizing: "border-box" }}>
              <div style={{ position: "absolute", left: "12px", top: "10px", width: "2px", height: "calc(100% - 20px)", background: "linear-gradient(to bottom, rgba(99,102,241,0.5), rgba(255,255,255,0.05))" }} />
              
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {timeline.map((commit) => (
                  <div key={commit._id} style={{ position: "relative" }}>
                    {/* Circle timeline dot */}
                    <div style={{
                      position: "absolute", left: "-26px", top: "4px", width: "10px", height: "10px",
                      borderRadius: "50%", backgroundColor: "#818cf8", border: "2px solid #000",
                      boxShadow: "0 0 10px rgba(129, 140, 248, 0.5)"
                    }} />

                    <div className="glass-card-premium" style={{ padding: "16px" }}>
                      <div style={{ display: "flex", justify: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <code style={{ fontSize: "11px", color: "#9ca3af", letterSpacing: "0.05em" }}>
                          {commit.commitSha.substring(0, 7)}
                        </code>
                        <span style={{ fontSize: "10px", color: "#6b7280", fontWeight: "600" }}>
                          {timeAgo(commit.date)}
                        </span>
                      </div>

                      <p style={{ fontSize: "13px", fontWeight: "800", color: "#f3f4f6", margin: "0 0 10px 0" }}>
                        {commit.message}
                      </p>

                      <div style={{ display: "flex", justify: "space-between", alignItems: "center", fontSize: "11px", color: "#9ca3af" }}>
                        <span>by <strong style={{ color: "#d1d5db" }}>{commit.author}</strong></span>
                        <div style={{ display: "flex", gap: "6px" }}>
                          {commit.filesChanged.map((f, idx) => (
                            <span key={idx} style={{
                              fontSize: "9px", backgroundColor: "rgba(255,255,255,0.05)", color: "#d1d5db",
                              padding: "2px 6px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.1)"
                            }}>{f}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: KNOWLEDGE CHAT */}
      {activeTab === "chat" && (
        <RepositoryChatPanel repoId={repoId} />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// NESTED CHAT COMPONENT (WITH INTERNAL CHAT STATE HOOKS)
// -------------------------------------------------------------
function RepositoryChatPanel({ repoId }) {
  const { showToast } = useToast();
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const suggestedQuestions = [
    "Why was this repository created?",
    "Who are the main contributors?",
    "What was the last major change?",
    "Are there any security-related commits?"
  ];

  const handleSend = async (qText) => {
    const textToSend = qText || question;
    if (!textToSend.trim()) return;

    // Append user message
    setMessages((prev) => [...prev, { role: "user", text: textToSend }]);
    if (!qText) setQuestion("");
    setLoading(true);

    try {
      const res = await API.post(`/chat/${repoId}`, { question: textToSend });
      
      // Append AI response
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: res.data.answer,
          confidence: res.data.confidence,
          sources: res.data.sources
        }
      ]);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to ask question.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "480px", justifyContent: "space-between", boxSizing: "border-box" }}>
      {/* Scrollable chat body */}
      <div className="glass-card-premium" style={{
        flexGrow: 1, overflowY: "auto", padding: "16px",
        display: "flex", flexDirection: "column", gap: "16px", marginBottom: "16px",
        boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)"
      }}>
        {messages.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            height: "100%", textAlign: "center", gap: "16px"
          }}>
            <div style={{ padding: "12px", borderRadius: "50%", background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(16,185,129,0.2))", boxShadow: "0 0 20px rgba(99,102,241,0.2)" }}>
              <MessageSquare size={32} style={{ color: "#818cf8" }} />
            </div>
            <div>
              <h4 style={{ fontSize: "14px", fontWeight: "800", color: "#f3f4f6", margin: "0 0 6px 0", letterSpacing: "0.02em" }}>Repo Knowledge Assistant</h4>
              <p style={{ fontSize: "11px", color: "#9ca3af", maxWidth: "260px", margin: 0, lineHeight: "1.5" }}>
                Ask questions regarding commit histories, design decisions, and system requirements.
              </p>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", maxWidth: "480px", width: "100%", marginTop: "10px" }}>
              {suggestedQuestions.map((sq, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(sq)}
                  className="btn-glass-secondary"
                  style={{
                    padding: "12px", textAlign: "left", fontSize: "11px",
                    color: "#d1d5db", whiteSpace: "normal", height: "auto"
                  }}
                >
                  {sq}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} style={{
              display: "flex", justify: msg.role === "user" ? "flex-end" : "flex-start",
              width: "100%"
            }}>
              {msg.role === "user" ? (
                <div style={{
                  background: "linear-gradient(135deg, #4f46e5, #6366f1)", color: "#fff", padding: "12px 16px", borderRadius: "12px 12px 0 12px",
                  fontSize: "12px", fontWeight: "600", maxWidth: "70%", boxShadow: "0 4px 15px rgba(99,102,241,0.3)"
                }}>{msg.text}</div>
              ) : (
                <div style={{
                  backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px 12px 12px 0",
                  padding: "16px", maxWidth: "80%", color: "#f3f4f6", backdropFilter: "blur(10px)"
                }}>
                  <div style={{ display: "flex", justify: "space-between", alignItems: "center", marginBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "8px" }}>
                    <span style={{ fontSize: "10px", fontWeight: "800", color: "#818cf8", letterSpacing: "0.05em", textTransform: "uppercase" }}>CodeMemory Assistant</span>
                    <span className="status-pill-premium success">
                      Confidence: {msg.confidence}%
                    </span>
                  </div>
                  
                  <p style={{ fontSize: "12px", lineHeight: "1.6", margin: "0 0 12px 0" }}>{msg.text}</p>
                  
                  {msg.sources?.length > 0 && (
                    <div>
                      <span style={{ fontSize: "9px", color: "#9ca3af", textTransform: "uppercase", fontWeight: "750", letterSpacing: "0.05em" }}>Reference Excerpts:</span>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
                        {msg.sources.map((src, sIdx) => (
                          <span key={sIdx} style={{ fontSize: "9px", padding: "4px 8px", borderRadius: "6px", backgroundColor: "rgba(0,0,0,0.3)", color: "#d1d5db", border: "1px solid rgba(255,255,255,0.05)" }}>
                            {src.reference} <span style={{ color: "#9ca3af" }}>({src.type})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#818cf8", padding: "10px" }}>
            <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⚡</span>
            <span style={{ fontWeight: "600" }}>AI explanation agent processing...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} style={{ display: "flex", gap: "10px" }}>
        <input
          type="text"
          placeholder="Ask a question about this repository's commits..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={loading}
          className="glass-input"
          style={{ flexGrow: 1 }}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="btn-glass-primary"
          style={{ padding: "0 20px" }}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}

// -------------------------------------------------------------
// PANEL 6: KNOWLEDGE CHAT (GLOBAL REPO SELECTOR)
// -------------------------------------------------------------
function KnowledgeChatPanel() {
  const [selectedRepoId, setSelectedRepoId] = useState("");

  const { data: repos } = useQuery({
    queryKey: ["repositories"],
    queryFn: async () => {
      const res = await API.get("/repositories");
      return res.data;
    }
  });

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "22px", fontWeight: "900", letterSpacing: "-0.03em", margin: "0 0 6px 0" }}>Knowledge Chat</h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>Interact with AI agents grounded in repository commit memories.</p>
      </div>

      <div className="glass-card-premium" style={{ padding: "24px" }}>
        <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "12px", color: "#9ca3af", fontWeight: "700" }}>Select Repository:</span>
          <select
            value={selectedRepoId}
            onChange={(e) => setSelectedRepoId(e.target.value)}
            className="glass-input"
            style={{ width: "240px", padding: "8px 12px" }}
          >
            <option value="">-- Select Repo --</option>
            {repos?.map((repo) => (
              <option key={repo._id} value={repo._id} style={{ backgroundColor: "#020202", color: "#fff" }}>{repo.fullName}</option>
            ))}
          </select>
        </div>

        {selectedRepoId ? (
          <RepositoryChatPanel repoId={selectedRepoId} />
        ) : (
          <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
            Please select a connected repository to begin chat.
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// PANEL 7: COMPANY PROFILE
// -------------------------------------------------------------
function CompanyProfilePanel() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [editMode, setEditMode] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileLogo, setProfileLogo] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Fetch profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await API.get("/company/profile");
      return res.data;
    }
  });

  useEffect(() => {
    if (profile) {
      setProfileName(profile.name);
      setProfileLogo(profile.logo || "");
    }
  }, [profile]);

  // Mutation: Update info
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      return API.patch("/company/profile", { name: profileName, logo: profileLogo });
    },
    onSuccess: () => {
      showToast("Workspace profile updated.", "success");
      queryClient.invalidateQueries(["profile"]);
      setEditMode(false);
    },
    onError: (err) => {
      showToast(err.response?.data?.message || "Failed to update profile.", "error");
    }
  });

  // --- GitHub App Integration Hooks & States ---
  const [repoModalOpen, setRepoModalOpen] = useState(false);
  const [selectedRepos, setSelectedRepos] = useState([]);

  // Fetch candidate repositories from App Installation
  const { data: candidateRepos, isLoading: loadingCandidates, refetch: refetchCandidates } = useQuery({
    queryKey: ["candidateRepos"],
    queryFn: async () => {
      const res = await API.get("/github/repositories");
      return res.data;
    },
    enabled: repoModalOpen
  });

  // Initialize checkboxes when candidates load
  useEffect(() => {
    if (candidateRepos) {
      const currentlyConnected = candidateRepos.filter(r => r.isConnected).map(r => r.fullName);
      setSelectedRepos(currentlyConnected);
    }
  }, [candidateRepos]);

  // Mutation: Connect App (Redirection)
  const connectAppMutation = useMutation({
    mutationFn: async () => {
      const res = await API.get("/github/install");
      return res.data;
    },
    onSuccess: (data) => {
      if (data.installUrl) {
        window.location.href = data.installUrl;
      }
    },
    onError: (err) => {
      showToast(err.response?.data?.message || "Failed to initiate GitHub App installation.", "error");
    }
  });

  // Mutation: Save selected monitored repositories
  const saveReposMutation = useMutation({
    mutationFn: async (reposList) => {
      return API.post("/github/select-repositories", { selectedRepos: reposList });
    },
    onSuccess: () => {
      showToast("Monitored repositories saved. Initial indexing triggered.", "success");
      queryClient.invalidateQueries(["repositories"]);
      queryClient.invalidateQueries(["profile"]);
      setRepoModalOpen(false);
    },
    onError: (err) => {
      showToast(err.response?.data?.message || "Failed to save repositories.", "error");
    }
  });

  // Mutation: Trigger manual sync
  const triggerSyncMutation = useMutation({
    mutationFn: async () => {
      return API.post("/github/sync");
    },
    onSuccess: (data) => {
      showToast(data.message || "Manual sync request queued.", "success");
      queryClient.invalidateQueries(["profile"]);
    },
    onError: (err) => {
      showToast(err.response?.data?.message || "Failed to trigger sync.", "error");
    }
  });

  // Toggle checkbox helper
  const handleCheckboxChange = (fullName) => {
    setSelectedRepos((prev) =>
      prev.includes(fullName) ? prev.filter((r) => r !== fullName) : [...prev, fullName]
    );
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setUpdatingPassword(true);
    try {
      await API.patch("/company/change-password", { currentPassword, newPassword });
      setPasswordSuccess("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err.response?.data?.message || "Password update failed.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (isLoading) return <LoadingSpinner size="large" />;

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "22px", fontWeight: "900", letterSpacing: "-0.03em", margin: "0 0 6px 0" }}>Company Profile</h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>Configure workspace metadata and credentials.</p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
        
        {/* Profile Card Info */}
        <div className="glass-card-premium" style={{ flex: "1 1 360px", padding: "24px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "800", margin: "0 0 16px 0", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "12px", color: "#f3f4f6" }}>Workspace Info</h3>
          
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
            {profileLogo ? (
              <img src={profileLogo} alt="Logo" style={{ width: "64px", height: "64px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 4px 15px rgba(0,0,0,0.4)" }} />
            ) : (
              <div style={{
                width: "64px", height: "64px", borderRadius: "12px",
                background: "linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: "900", color: "#fff",
                boxShadow: "0 4px 15px rgba(99,102,241,0.3)"
              }}>
                {profile?.name?.substring(0, 2).toUpperCase()}
              </div>
            )}

            {!editMode ? (
              <div style={{ textAlign: "center" }}>
                <h4 style={{ fontSize: "16px", fontWeight: "900", margin: "0 0 4px 0", color: "#f3f4f6" }}>{profile?.name}</h4>
                <span style={{ fontSize: "11px", color: "#9ca3af" }}>License Owner: {profile?.ownerId?.email}</span>
                <p style={{ fontSize: "10px", color: "#9ca3af", margin: "8px 0 0 0" }}>Subscription: <strong style={{ color: "#06b6d4", textTransform: "uppercase" }}>{profile?.plan}</strong></p>
              </div>
            ) : (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "#9ca3af", display: "block", marginBottom: "4px" }}>Company Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="glass-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "#9ca3af", display: "block", marginBottom: "4px" }}>Logo URL</label>
                  <input
                    type="text"
                    value={profileLogo}
                    onChange={(e) => setProfileLogo(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="glass-input"
                  />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="btn-glass-secondary"
                style={{ padding: "8px 16px" }}
              >
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={() => setEditMode(false)}
                  className="btn-glass-secondary"
                  style={{ padding: "8px 16px" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateProfileMutation.mutate()}
                  className="btn-glass-primary"
                  style={{ padding: "8px 16px" }}
                >
                  Save Changes
                </button>
              </>
            )}
          </div>
        </div>

        {/* Security / Password Card */}
        <div className="glass-card-premium" style={{ flex: "1 1 360px", padding: "24px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "800", margin: "0 0 16px 0", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "12px", color: "#f3f4f6" }}>Change Password</h3>
          
          {passwordError && (
            <div style={{
              backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "8px", padding: "12px", color: "#ef4444", fontSize: "11px", marginBottom: "16px", textAlign: "center",
              boxShadow: "0 2px 10px rgba(239,68,68,0.1)"
            }}>{passwordError}</div>
          )}

          {passwordSuccess && (
            <div style={{
              backgroundColor: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)",
              borderRadius: "8px", padding: "12px", color: "#10b981", fontSize: "11px", marginBottom: "16px", textAlign: "center",
              boxShadow: "0 2px 10px rgba(16,185,129,0.1)"
            }}>{passwordSuccess}</div>
          )}

          <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "#9ca3af", display: "block", marginBottom: "4px" }}>Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="glass-input"
              />
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "#9ca3af", display: "block", marginBottom: "4px" }}>New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="glass-input"
              />
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "#9ca3af", display: "block", marginBottom: "4px" }}>Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="glass-input"
              />
            </div>

            <button
              type="submit"
              disabled={updatingPassword}
              className="btn-glass-primary"
              style={{
                padding: "10px", marginTop: "8px",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
              }}
            >
              {updatingPassword && <LoadingSpinner />}
              <span>Update Password</span>
            </button>
          </form>
        </div>

      </div>

      {/* GitHub App Integration Panel */}
      <div className="glass-card-premium" style={{ marginTop: "32px", padding: "32px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "20px", marginBottom: "20px" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: "900", margin: "0 0 6px 0", display: "flex", alignItems: "center", gap: "8px", color: "#f3f4f6" }}>
              <GitFork size={18} style={{ color: "#818cf8" }} />
              <span>GitHub App Integration</span>
            </h3>
            <p style={{ fontSize: "13px", color: "#9ca3af", margin: 0 }}>
              Authorize CodeMemory to automatically synchronize repositories, developers, and code commits in real time.
            </p>
          </div>

          <div>
            {profile?.github?.connected ? (
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => setRepoModalOpen(true)}
                  className="btn-glass-primary"
                  style={{ padding: "10px 18px" }}
                >
                  Manage Monitored Repositories
                </button>
                <button
                  onClick={() => triggerSyncMutation.mutate()}
                  disabled={triggerSyncMutation.isPending}
                  className="btn-glass-secondary"
                  style={{ padding: "10px 18px" }}
                >
                  {triggerSyncMutation.isPending ? "Syncing..." : "Sync Metadata"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => connectAppMutation.mutate()}
                disabled={connectAppMutation.isPending}
                className="btn-glass-primary"
                style={{ padding: "10px 20px" }}
              >
                {connectAppMutation.isPending ? "Connecting..." : "Connect GitHub App"}
              </button>
            )}
          </div>
        </div>

        {/* Integration Status Card */}
        <div style={{
          backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "20px",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px",
          boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{
                width: "8px", height: "8px", borderRadius: "50%",
                backgroundColor: profile?.github?.connected ? "#10b981" : "#6b7280",
                boxShadow: profile?.github?.connected ? "0 0 8px #10b981" : "none"
              }} />
              <span style={{ fontSize: "12px", fontWeight: "800", textTransform: "uppercase", color: profile?.github?.connected ? "#10b981" : "#9ca3af", letterSpacing: "0.05em" }}>
                {profile?.github?.connected ? "Status: Connected" : "Status: Not Connected"}
              </span>
            </div>
            {profile?.github?.connected && (
              <p style={{ fontSize: "12px", color: "#d1d5db", margin: 0 }}>
                Linked to organization <strong style={{ color: "#fff" }}>{profile.github.organization}</strong> (Installation ID: {profile.github.installationId}).
              </p>
            )}
          </div>
          {profile?.github?.connected && (
            <div style={{ fontSize: "11px", color: "#6b7280", textAlign: "right" }}>
              <div>Last synchronized: {new Date(profile.github.lastSync).toLocaleString()}</div>
            </div>
          )}
        </div>
      </div>

      {/* Monitored Repos Selection Modal */}
      {repoModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", justify: "center", zIndex: 9999, fontFamily: "'Inter', sans-serif"
        }}>
          <div className="glass-card-premium" style={{
            width: "100%", maxWidth: "500px", padding: "32px", border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.5), inset 0 2px 20px rgba(255,255,255,0.05)"
          }}>
            <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#f9fafb", margin: "0 0 8px 0" }}>
              Manage Monitored Repositories
            </h3>
            <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 24px 0", lineHeight: "1.5" }}>
              Select which organization repositories CodeMemory should monitor, scan, and parse using AI.
            </p>

            {loadingCandidates ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "30px" }}>
                <LoadingSpinner />
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "250px", overflowY: "auto", marginBottom: "24px" }}>
                {candidateRepos?.map((repo) => (
                  <label
                    key={repo.id}
                    style={{
                      display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px",
                      backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(99,102,241,0.1)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.3)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRepos.includes(repo.fullName)}
                      onChange={() => handleCheckboxChange(repo.fullName)}
                      style={{ cursor: "pointer", accentColor: "#6366f1" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "12px", fontWeight: "700", color: "#fff" }}>{repo.fullName}</div>
                      {repo.language && <span style={{ fontSize: "10px", color: "#818cf8" }}>● {repo.language}</span>}
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setRepoModalOpen(false)}
                className="btn-glass-secondary"
                style={{ padding: "10px 18px" }}
              >
                Cancel
              </button>
              <button
                onClick={() => saveReposMutation.mutate(selectedRepos)}
                disabled={saveReposMutation.isPending}
                className="btn-glass-primary"
                style={{ padding: "10px 20px" }}
              >
                {saveReposMutation.isPending ? "Saving..." : "Save Selection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

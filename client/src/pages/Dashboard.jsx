import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation, Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AdminDashboard from "./AdminDashboard";
import EmployeeDashboard from "./EmployeeDashboard";
import { motion, AnimatePresence } from "framer-motion";
import NodeNetwork from "../components/NodeNetwork";
import {
  Users, Building, Mail, Plus, Shield, Sliders, Play, Lock, Sparkles, Folder,
  GitFork, Layers, LogOut, RefreshCw, Key, Settings, Cpu, HardDrive, Menu, X,
  Clock, CheckCircle, AlertTriangle, BarChart3, ChevronRight, ChevronLeft, MessageSquare,
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
        backgroundColor: "#16161a",
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
        backgroundColor: "#0c0c0e",
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("sidebar_collapsed") === "true");

  // Fetch Company Profile globally for sidebar branding
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await API.get("/company/profile");
      return res.data;
    }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", next ? "true" : "false");
      return next;
    });
  };

  // Active state styling helper
  const isActive = (path) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard" || location.pathname === "/dashboard/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="dashboard-root flex flex-col md:flex-row min-h-screen">
      <div className="dashboard-grid-pattern" />

      {/* Floating color orbs in background */}
      <div className="absolute top-[10%] left-[20%] w-[350px] h-[350px] rounded-full bg-[#00D9FF]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[15%] w-[400px] h-[400px] rounded-full bg-[#7C3AED]/5 blur-[140px] pointer-events-none" />

      {/* Mobile Top Header */}
      <header className="mobile-header-bar flex items-center justify-between w-full h-16 px-6 border-b border-white/5 bg-black/60 backdrop-blur-md md:hidden z-50">
        <div className="flex items-center gap-2" onClick={() => navigate("/")}>
          <div className="sidebar-logo-box">
            <GitFork size={16} className="text-[#00D9FF]" />
          </div>
          <span className="sidebar-logo-text">WhyCode</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-white hover:text-[#00D9FF] transition"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Collapsible Sidebar */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 84 : 260 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`sidebar-wrapper ${mobileMenuOpen ? "flex" : "hidden"} md:flex`}
      >
        {/* Sidebar Toggle Circle Button (only on desktop) */}
        <button
          onClick={toggleSidebar}
          className="sidebar-toggle-btn hidden md:flex"
        >
          {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        <div>
          {/* Logo Branding */}
          <div className="sidebar-logo-row" onClick={() => navigate("/")}>
            <div className="sidebar-logo-box">
              <GitFork size={16} className="text-[#00D9FF]" />
            </div>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="sidebar-logo-text"
              >
                WhyCode
              </motion.span>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1">
            {[
              { path: "/dashboard", label: "Overview", icon: Sliders },
              { path: "/dashboard/employees", label: "Employees", icon: Users },
              { path: "/dashboard/invites", label: "Invitations", icon: Mail },
              { path: "/dashboard/repositories", label: "Repositories", icon: GitFork },
              { path: "/dashboard/chat", label: "Knowledge Chat", icon: MessageSquare },
              { path: "/dashboard/profile", label: "Workspace Settings", icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`sidebar-link-item ${active ? "active" : ""}`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  {active && <div className="sidebar-active-indicator" />}
                  <Icon size={16} className={active ? "text-[#00D9FF]" : "text-[#71717a]"} />
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Profile Card & Log Out */}
        <div className="flex flex-col gap-3">
          <div className="sidebar-profile-box flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#00D9FF] to-[#7C3AED] flex items-center justify-center text-xs font-bold text-black overflow-hidden flex-shrink-0">
              {profile?.logo ? (
                <img src={profile.logo} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                profile?.name?.substring(0, 2).toUpperCase() || "WC"
              )}
            </div>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-grow min-w-0"
              >
                <p className="text-xs font-bold text-white truncate">{profile?.name || "WhyCode Workspace"}</p>
                <p className="text-[10px] text-[#71717a] truncate">{user?.name}</p>
              </motion.div>
            )}
          </div>

          <button
            onClick={logout}
            className="btn-sidebar-signout"
          >
            <LogOut size={14} />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="dashboard-content-viewport">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<OverviewPanel />} />
            <Route path="/employees" element={<EmployeesPanel />} />
            <Route path="/invites" element={<InvitationsPanel />} />
            <Route path="/repositories" element={<RepositoriesPanel />} />
            <Route path="/repositories/:repoId" element={<RepositoryDetailPanel />} />
            <Route path="/chat" element={<KnowledgeChatPanel />} />
            <Route path="/profile" element={<CompanyProfilePanel />} />
          </Routes>
        </AnimatePresence>
      </main>

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
          .sidebar-wrapper {
            position: fixed !important;
            left: 0;
            top: 64px;
            height: calc(100vh - 64px) !important;
            width: 260px !important;
            z-index: 999;
          }
          .dashboard-content-viewport {
            height: calc(100vh - 64px) !important;
            padding: 20px !important;
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

  // Mock data for contribution heatmap (168 days)
  // MUST be before any early returns to satisfy Rules of Hooks
  const heatmapCells = React.useMemo(() => {
    return Array.from({ length: 168 }, (_, idx) => {
      const seed = Math.sin(idx * 0.15) * Math.cos(idx * 0.05);
      if (seed < -0.3) return 0;
      if (seed < 0.1) return 1;
      if (seed < 0.5) return 2;
      if (seed < 0.8) return 3;
      return 4;
    });
  }, []);

  if (isLoading) return <LoadingSpinner size="large" />;
  if (isError) {
    return (
      <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs">
        Error loading overview statistics: {error.message}
      </div>
    );
  }

  const progressRadius = 38;
  const progressCircumference = 2 * Math.PI * progressRadius;
  const progressOffset = progressCircumference - ((stats.avgDocHealth || 0) / 100) * progressCircumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col gap-6"
    >
      {/* Vignette & subtle glows */}
      <div className="dashboard-vignette" />

      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white uppercase">Workspace Telemetry</h2>
          <p className="text-[11px] text-[#71717a] mt-1">Grounded AST documentation metrics, index health ratios, and pull requests.</p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard icon={Users} value={stats.totalEmployees} label="Employees" accentColor="#00D9FF" />
        <StatCard icon={Clock} value={stats.pendingInvites} label="Pending Invites" accentColor="#eab308" />
        <StatCard icon={CheckCircle} value={stats.acceptedInvites} label="Accepted" accentColor="#10b981" />
        <StatCard icon={Folder} value={stats.totalRepositories} label="Repositories" accentColor="#7C3AED" />
        <StatCard icon={AlertTriangle} value={stats.totalDriftIssues} label="Drift Alerts" accentColor="#ef4444" trend={stats.totalDriftIssues > 0 ? "down" : "up"} />
        <StatCard icon={BarChart3} value={`${stats.avgDocHealth}%`} label="Doc Health" accentColor="#10b981" />
      </div>

      {/* Developer Workspace Widgets Row (Heatmap + Coverage Rings) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GitHub style Commit Heatmap */}
        <div className="glass-panel-premium lg:col-span-2 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
            <span className="text-[10px] font-black text-white uppercase tracking-wider">Branch Commits Heatmap</span>
            <span className="text-[10px] text-[#71717a]">Last 24 Weeks Activity</span>
          </div>

          <div className="w-full overflow-x-auto py-1">
            <div className="grid grid-flow-col grid-rows-7 gap-[5px] w-max">
              {heatmapCells.map((val, idx) => {
                const densityClass = 
                  val === 0 ? "bg-[#121214]" :
                  val === 1 ? "bg-[#00D9FF]/20" :
                  val === 2 ? "bg-[#00D9FF]/40" :
                  val === 3 ? "bg-[#00D9FF]/70" :
                  "bg-[#00D9FF] shadow-[0_0_6px_rgba(0,217,255,0.4)]";
                return (
                  <div
                    key={idx}
                    className={`heatmap-cell ${densityClass}`}
                    title={`Day ${idx + 1}: ${val * 3} index commits`}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px] text-[#71717a] mt-1 pt-1.5 border-t border-white/5">
            <span>Grid maps direct repository AST updates</span>
            <div className="flex items-center gap-1.5">
              <span>Less</span>
              <div className="w-2.5 h-2.5 rounded-sm bg-[#121214]" />
              <div className="w-2.5 h-2.5 rounded-sm bg-[#00D9FF]/20" />
              <div className="w-2.5 h-2.5 rounded-sm bg-[#00D9FF]/40" />
              <div className="w-2.5 h-2.5 rounded-sm bg-[#00D9FF]/70" />
              <div className="w-2.5 h-2.5 rounded-sm bg-[#00D9FF]" />
              <span>More</span>
            </div>
          </div>
        </div>

        {/* Documentation health progress rings & Language Stats */}
        <div className="glass-panel-premium flex flex-col justify-between gap-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
            <span className="text-[10px] font-black text-white uppercase tracking-wider">Coverage & Languages</span>
          </div>

          <div className="flex items-center gap-5 my-1">
            {/* SVG circular progress ring */}
            <div className="relative w-[76px] h-[76px] flex items-center justify-center flex-shrink-0">
              <svg width="76" height="76" className="-rotate-90">
                <circle
                  cx="38"
                  cy="38"
                  r={progressRadius}
                  stroke="rgba(255,255,255,0.03)"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="38"
                  cy="38"
                  r={progressRadius}
                  stroke="#10b981"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={progressCircumference}
                  strokeDashoffset={progressOffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-xs font-black text-white">{stats.avgDocHealth}%</span>
                <span className="text-[7.5px] font-bold text-[#71717a] uppercase tracking-wider">Doc score</span>
              </div>
            </div>

            {/* Language distribution list */}
            <div className="flex-grow flex flex-col gap-1.5 min-w-0">
              <div className="h-1.5 rounded-full overflow-hidden flex w-full bg-white/5">
                <div className="h-full bg-[#00D9FF]" style={{ width: "68%" }} />
                <div className="h-full bg-[#7C3AED]" style={{ width: "22%" }} />
                <div className="h-full bg-[#eab308]" style={{ width: "10%" }} />
              </div>
              <div className="flex flex-col gap-1 text-[9.5px] text-[#71717a] mt-1">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 truncate"><span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF]" /> JavaScript</span>
                  <span className="font-bold text-white">68%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 truncate"><span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]" /> TypeScript</span>
                  <span className="font-bold text-white">22%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 truncate"><span className="w-1.5 h-1.5 rounded-full bg-[#eab308]" /> Configuration</span>
                  <span className="font-bold text-white">10%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Grid Row: Activity + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Activity Feed */}
        <div className="glass-panel-premium lg:col-span-2 flex flex-col gap-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-3">Recent Repository Activity</h3>
          {stats.recentActivity?.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#71717a]">
              No activity logs available. Link a repository to populate analytics.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {stats.recentActivity.slice(0, 5).map((act) => (
                <div key={act._id} className="flex items-center justify-between border-b border-white/5 pb-3 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981] flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{act.message}</p>
                      <span className="text-[10px] text-[#71717a]">by {act.author} • {timeAgo(act.date)}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] font-bold text-[#00D9FF] truncate flex-shrink-0">
                    {act.repository?.repoName || "repo"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions Panel */}
        <div className="glass-panel-premium flex flex-col gap-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-3">Workspace Controls</h3>
          
          <button
            onClick={() => setIsInviteOpen(true)}
            className="btn-glass-primary w-full h-11"
          >
            <Users size={14} />
            <span>Invite Developer</span>
          </button>

          <button
            onClick={() => setIsConnectOpen(true)}
            className="btn-glass-secondary w-full h-11"
          >
            <GitFork size={14} />
            <span>Link Repository</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setTriggerDropdownOpen(!triggerDropdownOpen)}
              className="btn-glass-secondary w-full h-11"
            >
              <Play size={14} />
              <span>Manual Scan Trigger</span>
            </button>

            {triggerDropdownOpen && (
              <div className="absolute bottom-full left-0 w-full p-2 border border-white/5 bg-[#0c0c0e] rounded-xl flex flex-col gap-1 z-30 mb-2 shadow-2xl">
                {repos?.length === 0 ? (
                  <span className="text-[10px] text-[#71717a] p-2 text-center">No links configured</span>
                ) : (
                  repos?.map((repo) => (
                    <button
                      key={repo._id}
                      onClick={() => {
                        scanMutation.mutate(repo._id);
                        setTriggerDropdownOpen(false);
                      }}
                      className="text-left text-xs text-white hover:text-[#00D9FF] hover:bg-white/5 p-2 rounded-lg transition"
                    >
                      {repo.fullName}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* PR Pipeline status board widget */}
          <div className="mt-1 p-3 border border-white/5 bg-[#0c0c0e]/50 rounded-xl flex flex-col gap-2.5">
            <span className="text-[9px] font-bold text-white uppercase tracking-wider border-b border-white/5 pb-1">Branch Pull Requests</span>
            <div className="flex justify-between items-center text-[10.5px] py-1">
              <div className="flex flex-col items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#eab308]" />
                <span className="font-extrabold text-white mt-1">2 Open</span>
              </div>
              <div className="h-[1px] flex-grow bg-white/5 mx-2" />
              <div className="flex flex-col items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF]" />
                <span className="font-extrabold text-white mt-1">1 Review</span>
              </div>
              <div className="h-[1px] flex-grow bg-white/5 mx-2" />
              <div className="flex flex-col items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                <span className="font-extrabold text-white mt-1">12 Merged</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Repositories Health Overview Grid Table */}
      <div className="glass-panel-premium">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-3 mb-4">Repositories Telemetry Status</h3>
        {repos?.length === 0 ? (
          <EmptyState
            icon={Folder}
            title="Link your first repository"
            description="Link a repository to track code comments drift, view commit histories, and execute AI chat grounding."
            actionLabel="Connect Repo"
            onAction={() => setIsConnectOpen(true)}
          />
        ) : (
          <div className="premium-table-container">
            <table className="premium-data-table">
              <thead>
                <tr>
                  <th>Repository</th>
                  <th>Language</th>
                  <th>Coverage Health</th>
                  <th>Drift Alerts</th>
                  <th>Status</th>
                  <th>Last Indexed</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {repos?.map((repo) => (
                  <tr key={repo._id} className="table-row">
                    <td className="font-bold text-white">{repo.repoName}</td>
                    <td className="text-[#71717a] font-mono text-xs">{repo.language || "Unknown"}</td>
                    <td className="min-w-[140px]">
                      <div className="flex items-center gap-3">
                        <div className="flex-grow h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            style={{ width: `${repo.docHealthScore}%` }}
                            className={`h-full rounded-full ${
                              repo.docHealthScore > 70 ? "bg-[#10b981]" : repo.docHealthScore > 40 ? "bg-[#eab308]" : "bg-[#ef4444]"
                            }`}
                          />
                        </div>
                        <span className="font-bold text-xs">{repo.docHealthScore}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`font-bold flex items-center gap-1 text-xs ${
                        repo.openDriftCount > 0 ? "text-[#ef4444]" : "text-[#10b981]"
                      }`}>
                        {repo.openDriftCount > 0 ? <AlertTriangle size={12} /> : <Check size={12} />}
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
                    <td className="text-[#71717a] text-xs">{formatDate(repo.lastScanAt)}</td>
                    <td className="text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => scanMutation.mutate(repo._id)}
                          className="px-2.5 py-1 text-[10px] font-bold text-white border border-white/5 bg-white/5 rounded-lg hover:bg-white/10 transition"
                        >
                          Scan
                        </button>
                        <button
                          onClick={() => navigate(`/dashboard/repositories/${repo._id}`)}
                          className="px-2.5 py-1 text-[10px] font-bold text-black bg-white rounded-lg hover:bg-white/90 transition"
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
    </motion.div>
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
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Team Management</h2>
          <p className="text-xs text-[#71717a] mt-1">Provision developer credentials and audit repository access logs.</p>
        </div>
        <button
          onClick={() => setIsInviteOpen(true)}
          className="btn-glass-primary"
        >
          <Plus size={14} />
          <span>Invite Developer</span>
        </button>
      </div>

      <div className="glass-panel-premium flex flex-col gap-5">
        {/* Search Input */}
        <div className="relative w-full max-w-[320px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717a]" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glass-input-field pl-10"
          />
        </div>

        {isLoading ? (
          <TableSkeleton />
        ) : filteredEmployees.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#71717a]">
            No employees registered in workspace. Send an invitation to begin.
          </div>
        ) : (
          <div className="premium-table-container">
            <table className="premium-data-table">
              <thead>
                <tr>
                  <th>Developer</th>
                  <th>Email</th>
                  <th>Joined Date</th>
                  <th>Permissions</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => {
                  const initials = emp.name.substring(0, 2).toUpperCase();
                  return (
                    <tr key={emp._id} className="table-row">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00D9FF] to-[#7C3AED] flex items-center justify-center text-black font-extrabold text-[10px]">
                            {initials}
                          </div>
                          <span className="font-bold text-white">{emp.name}</span>
                        </div>
                      </td>
                      <td className="text-[#a1a1aa] font-mono text-xs">{emp.email}</td>
                      <td className="text-[#71717a] text-xs">{formatDate(emp.createdAt)}</td>
                      <td>
                        <span className="status-pill-premium status-pill-success">
                          Active Dev
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => setSelectedUser(emp)}
                          className="px-2.5 py-1 text-[10px] font-bold text-red-400 border border-red-500/10 bg-red-500/5 rounded-lg hover:bg-red-500/10 transition"
                        >
                          Revoke Access
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
        title={`Revoke access for ${selectedUser?.name}?`}
        message="This will instantly block their token key and revoke permission to read all workspace repositories."
        confirmLabel="Revoke access"
        onConfirm={() => deleteMutation.mutate(selectedUser._id)}
        onCancel={() => setSelectedUser(null)}
      />
    </motion.div>
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
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Pending Registrations</h2>
          <p className="text-xs text-[#71717a] mt-1">Audit onboarding links dispatched to external developers.</p>
        </div>
        <button
          onClick={() => setIsInviteOpen(true)}
          className="btn-glass-primary"
        >
          <Mail size={14} />
          <span>Send Invite Link</span>
        </button>
      </div>

      {/* Mini Tabs */}
      <div className="flex gap-2">
        {["all", "pending", "accepted", "expired"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
              activeTab === tab ? "bg-[#00D9FF]/10 text-[#00D9FF] border border-[#00D9FF]/20" : "text-[#71717a] hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="glass-panel-premium flex flex-col gap-4">
        {isLoading ? (
          <TableSkeleton />
        ) : filteredInvites.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#71717a]">
            No invitations matching state: <strong>{activeTab}</strong>.
          </div>
        ) : (
          <div className="premium-table-container">
            <div className="p-3.5 border-b border-[#10b981]/15 bg-[#10b981]/5 text-[#10b981] text-[11px] font-medium leading-relaxed rounded-t-xl">
              💡 <strong>Registration link note:</strong> You can copy invite links directly and deliver them to your developers. Alternatively, they can sign in at <strong>/employee/login</strong> with their work email.
            </div>

            <table className="premium-data-table">
              <thead>
                <tr>
                  <th>Recipient Email</th>
                  <th>Status</th>
                  <th>Scoped Repo</th>
                  <th>Dispatched By</th>
                  <th>Expiration</th>
                  <th className="text-right">Controls</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvites.map((inv) => {
                  const isExpired = new Date(inv.expiresAt) < new Date();
                  const isAccepted = inv.status === "accepted";
                  
                  return (
                    <tr key={inv._id} className="table-row">
                      <td>
                        <div className="font-bold text-white">{inv.email}</div>
                        {inv.name && <span className="text-[10px] text-[#71717a]">{inv.name}</span>}
                      </td>
                      <td>
                        <span className={`status-pill-premium ${isAccepted ? 'status-pill-success' : isExpired ? 'status-pill-danger' : 'status-pill-warning'}`}>
                          {isExpired && inv.status === "pending" ? "Expired" : inv.status}
                        </span>
                      </td>
                      <td className="text-xs font-mono text-[#00D9FF]">
                        {inv.assignedRepo ? (
                          <span className="px-2 py-0.5 rounded bg-[#00D9FF]/5 border border-[#00D9FF]/10">{inv.assignedRepo}</span>
                        ) : (
                          <span className="text-[#3f3f46]">—</span>
                        )}
                      </td>
                      <td className="text-xs text-[#a1a1aa]">{inv.invitedBy?.name || "Workspace Admin"}</td>
                      <td className={`text-xs ${isExpired ? "text-red-400" : "text-[#71717a]"}`}>
                        {isExpired ? "Expired" : formatDate(inv.expiresAt)}
                      </td>
                      <td className="text-right">
                        {inv.status === "pending" && !isExpired ? (
                          <div className="flex gap-2 justify-end">
                            {inv.inviteLink && (
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(inv.inviteLink);
                                  showToast("Registration Link Copied!", "success");
                                }}
                                className="px-2.5 py-1 text-[10px] font-bold text-[#00D9FF] border border-[#00D9FF]/10 bg-[#00D9FF]/5 rounded-lg"
                              >
                                Copy Link
                              </button>
                            )}
                            <button
                              onClick={() => resendMutation.mutate(inv._id)}
                              className="px-2.5 py-1 text-[10px] font-bold text-white border border-white/5 bg-white/5 rounded-lg"
                            >
                              Resend
                            </button>
                            <button
                              onClick={() => setSelectedInvite(inv)}
                              className="px-2.5 py-1 text-[10px] font-bold text-red-400 border border-red-500/10 bg-red-500/5 rounded-lg"
                            >
                              Revoke
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-[#3f3f46]">--</span>
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
        title="Revoke Registration Link?"
        message={`This will invalidate the pending invitation sent to ${selectedInvite?.email}.`}
        confirmLabel="Revoke Link"
        onConfirm={() => revokeMutation.mutate(selectedInvite._id)}
        onCancel={() => setSelectedInvite(null)}
      />
    </motion.div>
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
    onSuccess: () => {
      showToast("Repository scan triggered.", "success");
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
      showToast("Repository disconnected successfully.", "success");
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
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Monitored Repositories</h2>
          <p className="text-xs text-[#71717a] mt-1">Configure workspace branches, analyze AST drift logs, and manage commit index timelines.</p>
        </div>
        <button
          onClick={() => setIsConnectOpen(true)}
          className="btn-glass-primary"
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
          description="Index a repository using owner/repository format to calculate drift indices and launch AI assistant chat bots."
          actionLabel="Connect Repository"
          onAction={() => setIsConnectOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repos?.map((repo) => {
            const hasDrift = repo.openDriftCount > 0;
            return (
              <div
                key={repo._id}
                className="glass-panel-premium flex flex-col justify-between gap-6 p-6"
              >
                <div>
                  {/* Card Header Info */}
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h3 className="text-base font-black text-white truncate max-w-[70%]">{repo.repoName}</h3>
                    <span className="px-2.5 py-0.5 rounded bg-[#00D9FF]/5 border border-[#00D9FF]/10 text-[9px] font-bold text-[#00D9FF] uppercase tracking-wider flex-shrink-0">
                      {repo.language || "JS"}
                    </span>
                  </div>
                  <code className="text-[10px] text-[#71717a] font-mono block mb-4 truncate">{repo.fullName}</code>

                  {/* Coverage Health Progress bar */}
                  <div className="flex flex-col gap-2.5 mt-5">
                    <div className="flex justify-between items-center text-[10.5px] font-bold">
                      <span className="text-[#71717a]">Documentation Health</span>
                      <span className="text-white">{repo.docHealthScore}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden border border-white/5">
                      <div
                        style={{
                          width: `${repo.docHealthScore}%`,
                          boxShadow: repo.docHealthScore > 70 ? "0 0 10px rgba(16,185,129,0.35)" : "none"
                        }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          repo.docHealthScore > 70 ? "bg-[#10b981]" : repo.docHealthScore > 40 ? "bg-[#eab308]" : "bg-[#ef4444]"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Telemetry metrics capsules */}
                  <div className="flex flex-wrap items-center gap-3 mt-6 text-[10.5px]">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
                      hasDrift ? "bg-red-500/5 border-red-500/10 text-red-400" : "bg-[#10b981]/5 border-[#10b981]/10 text-[#10b981]"
                    }`}>
                      <AlertTriangle size={12} />
                      <span className="font-bold">{repo.openDriftCount} Drift issues</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[#a1a1aa]">
                      <Users size={12} />
                      <span>Bus Factor: <strong className="text-white">{repo.busFactor}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Card Controls Footer */}
                <div className="border-t border-white/5 pt-4 mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${
                      repo.status === "scanning"
                        ? "bg-amber-400 animate-pulse shadow-[0_0_8px_#eab308]"
                        : repo.status === "active"
                        ? "bg-[#10b981] shadow-[0_0_8px_#10b981]"
                        : "bg-[#52525b]"
                    }`} />
                    <span className="text-[10px] font-bold text-white capitalize">{repo.status}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => scanMutation.mutate(repo._id)}
                      disabled={repo.status === "scanning" || scanMutation.isPending}
                      className="px-3.5 py-1.5 text-xs font-bold text-white border border-white/5 bg-white/5 rounded-lg hover:bg-white/10 hover:border-white/15 transition duration-200 disabled:opacity-50"
                    >
                      {repo.status === "scanning" ? "Scanning" : "Scan"}
                    </button>
                    <button
                      onClick={() => navigate(`/dashboard/repositories/${repo._id}`)}
                      className="px-3.5 py-1.5 text-xs font-bold text-black bg-white rounded-lg hover:bg-white/90 transition duration-200"
                    >
                      View
                    </button>
                    <button
                      onClick={() => setSelectedRepo(repo)}
                      className="p-2 text-red-400 border border-red-500/10 bg-red-500/5 rounded-lg hover:bg-red-500/10 hover:border-red-500/20 transition duration-200 flex items-center justify-center"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConnectRepoModal isOpen={isConnectOpen} onClose={() => setIsConnectOpen(false)} onConnected={() => queryClient.invalidateQueries(["repositories"])} />

      <ConfirmDialog
        isOpen={!!selectedRepo}
        title="Disconnect Repository?"
        message={`This will delete all drift metrics, documentation index lists, and AI chat logs associated with ${selectedRepo?.fullName}.`}
        confirmLabel="Disconnect Repo"
        onConfirm={() => deleteMutation.mutate(selectedRepo._id)}
        onCancel={() => setSelectedRepo(null)}
      />
    </motion.div>
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
      showToast("Scan initiated.", "success");
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
  if (!repo) return <div className="p-4 text-red-400 text-xs">Repository not found.</div>;

  // Filter drifts client-side
  const filteredDrifts = drifts?.filter((d) => {
    const matchesPath = d.filePath.toLowerCase().includes(filePathFilter.toLowerCase());
    const matchesStatus = driftFilter === "all" ? true : d.status === driftFilter;
    return matchesPath && matchesStatus;
  }) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col gap-6"
    >
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black text-[#71717a] uppercase tracking-wider">Repository Details</span>
          <div className="flex items-center gap-3 mt-1">
            <h2 className="text-xl font-black text-white">{repo.repoName}</h2>
            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[9px] font-bold text-[#00D9FF] uppercase">{repo.language}</span>
          </div>
        </div>

        <button
          onClick={() => scanMutation.mutate()}
          disabled={repo.status === "scanning"}
          className="btn-glass-primary h-11"
        >
          {repo.status === "scanning" ? <LoadingSpinner /> : <RefreshCw size={13} />}
          <span>{repo.status === "scanning" ? "Scanning..." : "Scan Repo"}</span>
        </button>
      </div>

      {/* Mini stats cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel-premium p-4 flex flex-col items-center justify-center text-center">
          <span className="text-[9px] font-bold text-[#71717a] uppercase tracking-widest">Coverage Health</span>
          <p className="text-xl font-black text-[#10b981] mt-2">{repo.docHealthScore}%</p>
        </div>
        <div className="glass-panel-premium p-4 flex flex-col items-center justify-center text-center">
          <span className="text-[9px] font-bold text-[#71717a] uppercase tracking-widest">Drift Alerts</span>
          <p className="text-xl font-black text-[#ef4444] mt-2">{repo.openDriftCount}</p>
        </div>
        <div className="glass-panel-premium p-4 flex flex-col items-center justify-center text-center">
          <span className="text-[9px] font-bold text-[#71717a] uppercase tracking-widest">Bus Factor</span>
          <p className="text-xl font-black text-[#00D9FF] mt-2">{repo.busFactor}</p>
        </div>
        <div className="glass-panel-premium p-4 flex flex-col items-center justify-center text-center">
          <span className="text-[9px] font-bold text-[#71717a] uppercase tracking-widest">Last Scanned</span>
          <p className="text-xs font-bold text-white mt-3.5 truncate max-w-full">{timeAgo(repo.lastScanAt) || "Never"}</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-white/5 pb-2">
        {[
          { key: "drift", label: "Drift Logs" },
          { key: "timeline", label: "Indexing History" },
          { key: "chat", label: "AI Grounded Chat" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === tab.key ? "bg-[#00D9FF]/10 text-[#00D9FF] border border-[#00D9FF]/20" : "text-[#71717a] hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: DRIFT LOGS */}
      {activeTab === "drift" && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full max-w-[300px]">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717a]" />
              <input
                type="text"
                placeholder="Filter by file path..."
                value={filePathFilter}
                onChange={(e) => setFilePathFilter(e.target.value)}
                className="glass-input-field pl-10"
              />
            </div>

            <div className="flex gap-2">
              {["all", "open", "accepted", "rejected"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setDriftFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition capitalize ${
                    driftFilter === filter ? "bg-[#00D9FF]/10 text-[#00D9FF] border border-[#00D9FF]/20" : "text-[#71717a] hover:text-white"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {filteredDrifts.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#71717a]">
              No drift logs found matching filters. Documentation is healthy.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {filteredDrifts.map((drift) => (
                <div
                  key={drift._id}
                  className="glass-panel-premium flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <code className="text-xs font-bold text-[#00D9FF] font-mono break-all">{drift.filePath}</code>
                      <div className="flex gap-2 mt-2">
                        <span className={`status-pill-premium ${drift.severity === "high" ? "status-pill-danger" : drift.severity === "medium" ? "status-pill-warning" : "status-pill-success"}`}>
                          {drift.severity} severity
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] font-bold text-[#a1a1aa] uppercase">{drift.type}</span>
                        <span className="text-[10px] text-[#71717a] flex items-center">Confidence: {drift.confidence}%</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {drift.status === "open" ? (
                        <>
                          <button
                            onClick={() => driftMutation.mutate({ id: drift._id, action: "accepted" })}
                            className="px-2.5 py-1 text-[10px] font-bold text-[#10b981] border border-[#10b981]/10 bg-[#10b981]/5 rounded-lg"
                          >
                            ✓ Accept
                          </button>
                          <button
                            onClick={() => driftMutation.mutate({ id: drift._id, action: "rejected" })}
                            className="px-2.5 py-1 text-[10px] font-bold text-red-400 border border-red-500/10 bg-red-500/5 rounded-lg"
                          >
                            ✗ Reject
                          </button>
                        </>
                      ) : (
                        <span className={`status-pill-premium ${drift.status === "accepted" ? "status-pill-success" : "status-pill-danger"}`}>
                          {drift.status === "accepted" ? "Applied" : "Rejected"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
                    <div>
                      <span className="text-[9px] font-bold text-[#71717a] uppercase tracking-wider block mb-2">Current Doc comments</span>
                      <pre className="p-4 rounded-xl border border-white/5 bg-black/40 text-[10.5px] text-[#d1d5db] font-mono overflow-x-auto shadow-inner">{drift.currentDocText}</pre>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-[#00D9FF] uppercase tracking-wider block mb-2">AI Code Suggestion</span>
                      <pre className="p-4 rounded-xl border border-[#00D9FF]/20 bg-[#00D9FF]/5 text-[10.5px] text-[#a5b4fc] font-mono overflow-x-auto shadow-inner">{drift.suggestion}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INDEXING HISTORY */}
      {activeTab === "timeline" && (
        <div className="flex flex-col gap-4">
          {timeline?.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#71717a]">
              No repository commits timeline found. Trigger a scan first.
            </div>
          ) : (
            <div className="relative pl-6 box-sizing-border">
              <div className="absolute left-[7px] top-2 bottom-2 w-[1px] bg-gradient-to-b from-[#00D9FF] to-white/5" />
              
              <div className="flex flex-col gap-5">
                {timeline.map((commit) => (
                  <div key={commit._id} className="relative">
                    {/* Circle Timeline Dot */}
                    <div className="absolute left-[-22px] top-1.5 w-2 h-2 rounded-full bg-[#00D9FF] border-2 border-black shadow-[0_0_8px_#00D9FF]" />

                    <div className="glass-panel-premium p-4 flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[10px]">
                        <code className="text-[#a1a1aa] font-mono">{commit.commitSha.substring(0, 7)}</code>
                        <span className="text-[#71717a]">{timeAgo(commit.date)}</span>
                      </div>

                      <p className="text-xs font-bold text-white leading-relaxed">{commit.message}</p>

                      <div className="flex justify-between items-center text-[10px] text-[#71717a] mt-2">
                        <span>by <strong className="text-white font-semibold">{commit.author}</strong></span>
                        <div className="flex gap-2">
                          {commit.filesChanged.slice(0, 3).map((f, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-[#a1a1aa] font-mono">{f}</span>
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

      {/* TAB 3: AI GROUNDED CHAT */}
      {activeTab === "chat" && (
        <RepositoryChatPanel repoId={repoId} />
      )}
    </motion.div>
  );
}

// -------------------------------------------------------------
// NESTED CHAT COMPONENT
// -------------------------------------------------------------
function RepositoryChatPanel({ repoId }) {
  const { showToast } = useToast();
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const suggestedQuestions = [
    "Explain the purpose of this codebase.",
    "Show the main contributor analytics.",
    "Summarize recent architecture drift events.",
    "Are there missing developer documentation blocks?"
  ];

  const handleSend = async (qText) => {
    const textToSend = qText || question;
    if (!textToSend.trim()) return;

    setMessages((prev) => [...prev, { role: "user", text: textToSend }]);
    if (!qText) setQuestion("");
    setLoading(true);

    try {
      const res = await API.post(`/chat/${repoId}`, { question: textToSend });
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
    <div className="flex flex-col justify-between min-h-[480px] gap-4">
      {/* Scrollable Chat Body */}
      <div className="glass-panel-premium flex-grow overflow-y-auto max-h-[400px] p-4 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 gap-4">
            <div className="p-3.5 rounded-full bg-[#00D9FF]/15 border border-[#00D9FF]/20 shadow-[0_0_20px_rgba(0,217,255,0.15)]">
              <MessageSquare size={24} className="text-[#00D9FF]" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Repository Knowledge Companion</h4>
              <p className="text-[11px] text-[#71717a] mt-1 max-w-[280px] leading-relaxed">
                Query engineering logic, design patterns, file dependencies, and local git histories.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-[480px] w-full mt-4">
              {suggestedQuestions.map((sq, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(sq)}
                  className="px-3 py-2 text-left text-[11px] text-[#a1a1aa] border border-white/5 bg-white/5 rounded-lg hover:text-white hover:border-[#00D9FF]/25 transition"
                >
                  {sq}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "user" ? (
                <div className="px-4 py-2.5 rounded-xl rounded-tr-none bg-gradient-to-tr from-[#00D9FF] to-[#7C3AED] text-black text-xs font-semibold max-w-[70%] shadow-lg">
                  {msg.text}
                </div>
              ) : (
                <div className="px-4 py-4 rounded-xl rounded-tl-none border border-white/5 bg-[#121214] text-xs text-white max-w-[80%] flex flex-col gap-3">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-[9px] font-black text-[#00D9FF] uppercase tracking-wider">WhyCode Companion</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#10b981]/5 border border-[#10b981]/10 text-[9px] font-bold text-[#10b981] uppercase">
                      Confidence: {msg.confidence}%
                    </span>
                  </div>
                  <p className="leading-relaxed text-[#d1d5db]">{msg.text}</p>
                  
                  {msg.sources?.length > 0 && (
                    <div className="mt-2 border-t border-white/5 pt-2">
                      <span className="text-[9px] font-bold text-[#71717a] uppercase tracking-wider block">Retrieved Contexts:</span>
                      <div className="flex gap-2 flex-wrap mt-2">
                        {msg.sources.map((src, sIdx) => (
                          <span key={sIdx} className="px-2 py-0.5 rounded bg-black/40 text-[9px] text-[#a1a1aa] border border-white/5">
                            {src.reference} <span className="text-[9px] text-[#52525b]">({src.type})</span>
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
          <div className="flex items-center gap-2 text-xs text-[#00D9FF] p-2">
            <span className="animate-spin">⚡</span>
            <span className="font-bold">Analyzing workspace repositories...</span>
          </div>
        )}
      </div>

      {/* Input row */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 mt-2">
        <input
          type="text"
          placeholder="Ask a question about this repository's commits..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={loading}
          className="glass-input-field flex-grow"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="px-4 bg-white hover:bg-white/90 text-black font-bold rounded-lg transition disabled:opacity-50"
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
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col gap-6"
    >
      <div>
        <h2 className="text-2xl font-black text-white">Global Knowledge Companion</h2>
        <p className="text-xs text-[#71717a] mt-1">Grounded developer query environment linked with repository indices.</p>
      </div>

      <div className="glass-panel-premium flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[#a1a1aa]">Scope Repository:</span>
          <select
            value={selectedRepoId}
            onChange={(e) => setSelectedRepoId(e.target.value)}
            className="glass-input-field max-w-[280px]"
          >
            <option value="" className="bg-[#0c0c0e]">-- Select Repo --</option>
            {repos?.map((repo) => (
              <option key={repo._id} value={repo._id} className="bg-[#0c0c0e]">{repo.fullName}</option>
            ))}
          </select>
        </div>

        {selectedRepoId ? (
          <RepositoryChatPanel repoId={selectedRepoId} />
        ) : (
          <div className="py-12 text-center text-xs text-[#71717a]">
            Please select a configured repository to initialize the AI grounding session.
          </div>
        )}
      </div>
    </motion.div>
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
  const { data: candidateRepos, isLoading: loadingCandidates } = useQuery({
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
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col gap-6"
    >
      <div>
        <h2 className="text-2xl font-black text-white">Workspace Configuration</h2>
        <p className="text-xs text-[#71717a] mt-1">Configure company profiles, authorization keys, and change admin credentials.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Profile Card Info */}
        <div className="glass-panel-premium flex flex-col gap-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-3">Company Metadata</h3>
          
          <div className="flex flex-col items-center gap-4 py-4">
            {profileLogo ? (
              <img src={profileLogo} alt="Logo" className="w-16 h-16 rounded-xl border border-white/10 shadow-lg object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-[#00D9FF] to-[#7C3AED] flex items-center justify-center text-xl font-bold text-black shadow-lg">
                {profile?.name?.substring(0, 2).toUpperCase()}
              </div>
            )}

            {!editMode ? (
              <div className="text-center">
                <h4 className="text-sm font-bold text-white">{profile?.name}</h4>
                <p className="text-[10px] text-[#71717a] mt-1">Licence Owner: {profile?.ownerId?.email}</p>
                <p className="text-[10px] text-[#71717a] mt-2">Subscription plan: <strong className="text-[#00D9FF] uppercase">{profile?.plan}</strong></p>
              </div>
            ) : (
              <div className="w-full flex flex-col gap-4">
                <div>
                  <label className="text-[9px] font-bold text-[#71717a] uppercase tracking-wider block mb-2">Company Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="glass-input-field"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[#71717a] uppercase tracking-wider block mb-2">Logo Image URL</label>
                  <input
                    type="text"
                    value={profileLogo}
                    onChange={(e) => setProfileLogo(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="glass-input-field"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 text-xs font-bold text-white border border-white/5 bg-white/5 rounded-lg"
              >
                Edit Metadata
              </button>
            ) : (
              <>
                <button
                  onClick={() => setEditMode(false)}
                  className="px-4 py-2 text-xs font-bold text-white border border-white/5 bg-white/5 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateProfileMutation.mutate()}
                  className="px-4 py-2 text-xs font-bold text-black bg-white rounded-lg"
                >
                  Save Changes
                </button>
              </>
            )}
          </div>
        </div>

        {/* Change Password Card */}
        <div className="glass-panel-premium flex flex-col gap-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-3">Update Workspace Key</h3>
          
          {passwordError && (
            <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-xs text-center">{passwordError}</div>
          )}

          {passwordSuccess && (
            <div className="p-3 rounded-lg border border-[#10b981]/25 bg-[#10b981]/5 text-[#10b981] text-xs text-center">{passwordSuccess}</div>
          )}

          <form onSubmit={handlePasswordChange} className="flex flex-col gap-3">
            <div>
              <label className="text-[9px] font-bold text-[#71717a] uppercase tracking-wider block mb-2">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="glass-input-field"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-[#71717a] uppercase tracking-wider block mb-2">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="glass-input-field"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-[#71717a] uppercase tracking-wider block mb-2">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="glass-input-field"
              />
            </div>

            <button
              type="submit"
              disabled={updatingPassword}
              className="w-full h-11 bg-white hover:bg-white/90 text-black font-bold text-xs rounded-lg mt-3 flex items-center justify-center gap-2"
            >
              {updatingPassword && <LoadingSpinner />}
              <span>Update Password</span>
            </button>
          </form>
        </div>
      </div>

      {/* GitHub App Integration Panel */}
      <div className="glass-panel-premium flex flex-col gap-5 mt-4">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <GitFork size={14} className="text-[#00D9FF]" />
              <span>GitHub App Integration</span>
            </h3>
            <p className="text-[11px] text-[#71717a] mt-1 max-w-[480px] leading-relaxed">
              Link your organization's GitHub accounts to authorize WhyCode to automatically scan repositories, parse AST modules, and map code changes.
            </p>
          </div>

          <div>
            {profile?.github?.connected ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setRepoModalOpen(true)}
                  className="px-4 py-2 text-xs font-bold text-black bg-white rounded-lg"
                >
                  Manage Monitored Repos
                </button>
                <button
                  onClick={() => triggerSyncMutation.mutate()}
                  disabled={triggerSyncMutation.isPending}
                  className="px-4 py-2 text-xs font-bold text-white border border-white/5 bg-white/5 rounded-lg"
                >
                  {triggerSyncMutation.isPending ? "Syncing..." : "Sync Metadata"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => connectAppMutation.mutate()}
                disabled={connectAppMutation.isPending}
                className="px-4 py-2 text-xs font-bold text-black bg-white rounded-lg"
              >
                {connectAppMutation.isPending ? "Connecting..." : "Connect GitHub App"}
              </button>
            )}
          </div>
        </div>

        {/* Integration Status Block */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${
                profile?.github?.connected ? "bg-[#10b981] shadow-[0_0_8px_#10b981]" : "bg-[#52525b]"
              }`} />
              <span className={`text-[10px] font-black uppercase tracking-wider ${profile?.github?.connected ? "text-[#10b981]" : "text-[#71717a]"}`}>
                {profile?.github?.connected ? "Status: Active Authorization" : "Status: Disconnected"}
              </span>
            </div>
            {profile?.github?.connected && (
              <p className="text-[11px] text-[#a1a1aa] mt-2 leading-relaxed">
                Workspace synced with organization <strong className="text-white">{profile.github.organization}</strong> (Installation ID: {profile.github.installationId}).
              </p>
            )}
          </div>
          {profile?.github?.connected && (
            <span className="text-[10px] text-[#71717a]">Last synchronized: {new Date(profile.github.lastSync).toLocaleString()}</span>
          )}
        </div>
      </div>

      {/* Monitored Repos Selection Modal */}
      {repoModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", justify: "center", zIndex: 9999
        }}>
          <div className="glass-panel-premium w-full max-w-[500px] p-6 border border-white/10 flex flex-col gap-4 shadow-2xl">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Manage Monitored Repositories
            </h3>
            <p className="text-xs text-[#71717a] leading-relaxed">
              Select which organization repositories WhyCode should monitor, scan, and parse using AI.
            </p>

            {loadingCandidates ? (
              <div className="flex justify-center py-6">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-1">
                {candidateRepos?.map((repo) => (
                  <label
                    key={repo.id}
                    className="flex items-center gap-3 p-3 bg-black/40 border border-white/5 rounded-xl cursor-pointer hover:bg-white/5 transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRepos.includes(repo.fullName)}
                      onChange={() => handleCheckboxChange(repo.fullName)}
                      style={{ cursor: "pointer", accentColor: "#00D9FF" }}
                    />
                    <div className="flex-grow min-w-0">
                      <div className="text-xs font-bold text-white truncate">{repo.fullName}</div>
                      {repo.language && <span className="text-[9px] text-[#00D9FF] font-mono">● {repo.language}</span>}
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="flex gap-2 justify-end mt-2">
              <button
                onClick={() => setRepoModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-white border border-white/5 bg-white/5 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => saveReposMutation.mutate(selectedRepos)}
                disabled={saveReposMutation.isPending}
                className="px-4 py-2 text-xs font-bold text-black bg-white rounded-lg"
              >
                {saveReposMutation.isPending ? "Saving..." : "Save Selection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

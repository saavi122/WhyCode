import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sliders, Users, Mail, GitFork, MessageSquare, Settings, CheckCircle, Clock,
  AlertTriangle, Folder, Search, Sparkles, Send, HelpCircle, Layers,
  Terminal, ShieldCheck, FileText, Share2, TrendingUp, BookOpen, AlertCircle, Check, LogOut,
  Menu, X, ChevronLeft, ChevronRight, Trash2, Play, Calendar, Star, Flame
} from "lucide-react";
import API from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import StatCard from "../components/StatCard";
import "./EmployeeDashboard.css";

export default function EmployeeDashboard() {
  const { logout } = useAuth();
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

  const [activeTab, setActiveTab] = useState("dashboard"); // sidebar tab
  const [selectedRepo, setSelectedRepo] = useState(null); // active repository in explorer
  const [selectedFile, setSelectedFile] = useState(null); // active file in viewer
  const [chatQuery, setChatQuery] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", text: "Hi! I am your WhyCode AI Assistant. Ask me anything about your assigned repositories, APIs, or architectural decisions." }
  ]);
  const [workspaceTarget, setWorkspaceTarget] = useState("");
  const [workspaceAnalysis, setWorkspaceAnalysis] = useState(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null); // dependency graph selection
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Teammate states
  const [selectedTeammateId, setSelectedTeammateId] = useState(null);

  // Collapsible sidebar states
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("employee_sidebar_collapsed") === "true");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 1. Employee Profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["employeeProfile"],
    queryFn: async () => {
      const res = await API.get("/employee/profile");
      return res.data;
    }
  });

  // 2. Dashboard Data
  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ["employeeDashboard"],
    queryFn: async () => {
      const res = await API.get("/employee/dashboard");
      return res.data;
    }
  });

  // 3. Projects
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["employeeProjects"],
    queryFn: async () => {
      const res = await API.get("/employee/projects");
      return res.data;
    }
  });

  // 4. Repositories
  const { data: repositories, isLoading: reposLoading } = useQuery({
    queryKey: ["employeeRepositories"],
    queryFn: async () => {
      const res = await API.get("/employee/repositories");
      return res.data;
    }
  });

  // 5. Activity log (Team activity feed)
  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ["employeeActivity"],
    queryFn: async () => {
      const res = await API.get("/team/activity");
      return res.data;
    }
  });

  // 6. Analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["employeeAnalytics"],
    queryFn: async () => {
      const res = await API.get("/employee/analytics");
      return res.data;
    }
  });

  // 7. Notifications
  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ["employeeNotifications"],
    queryFn: async () => {
      const res = await API.get("/employee/notifications");
      return res.data;
    }
  });

  // 8. Knowledge Hub
  const { data: knowledge, isLoading: knowledgeLoading } = useQuery({
    queryKey: ["employeeKnowledge"],
    queryFn: async () => {
      const res = await API.get("/employee/knowledge");
      return res.data;
    }
  });

  // 9. Timeline
  const { data: timeline, isLoading: timelineLoading } = useQuery({
    queryKey: ["employeeTimeline"],
    queryFn: async () => {
      const res = await API.get("/employee/timeline");
      return res.data;
    }
  });

  // 10. Teammates List (Scoped by Repository Permissions)
  const { data: teammates, isLoading: teammatesLoading } = useQuery({
    queryKey: ["teamMembers"],
    queryFn: async () => {
      const res = await API.get("/team");
      return res.data;
    }
  });

  // 11. Teammate Detail Profile (Fetches dynamically on click)
  const { data: teammateDetail, isLoading: loadingTeammateDetail } = useQuery({
    queryKey: ["teammateDetail", selectedTeammateId],
    queryFn: async () => {
      const res = await API.get(`/team/${selectedTeammateId}`);
      return res.data;
    },
    enabled: !!selectedTeammateId
  });

  // 12. Selected Repo Members (loaded when repo explorer selects a repo)
  const { data: repoMembers, isLoading: loadingRepoMembers } = useQuery({
    queryKey: ["repoMembers", selectedRepo?._id],
    queryFn: async () => {
      const res = await API.get(`/team/repository/${selectedRepo._id}`);
      return res.data;
    },
    enabled: !!selectedRepo
  });

  // 13. Selected Repo Ownership & Contributors
  const { data: repoOwnership, isLoading: loadingRepoOwnership } = useQuery({
    queryKey: ["repoOwnership", selectedRepo?._id],
    queryFn: async () => {
      const res = await API.get(`/team/contributors/${selectedRepo._id}`);
      return res.data;
    },
    enabled: !!selectedRepo
  });

  // Chat Mutation (uses dynamic RAG)
  const chatMutation = useMutation({
    mutationFn: async (question) => {
      const res = await API.post("/employee/chat", { question });
      return res.data;
    },
    onSuccess: (data) => {
      setChatMessages((prev) => [...prev, { role: "assistant", text: data.answer }]);
    },
    onError: (err) => {
      showToast(err.response?.data?.message || "AI failed to respond.", "error");
    }
  });

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatQuery.trim() || chatMutation.isPending) return;

    const userMsg = chatQuery;
    setChatMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setChatQuery("");
    chatMutation.mutate(userMsg);
  };

  const handleWorkspaceExplain = (target) => {
    if (!target) return;
    setWorkspaceLoading(true);
    setWorkspaceAnalysis(null);

    setTimeout(() => {
      setWorkspaceAnalysis({
        purpose: "Handles client routing, session hydration, and conditional rendering of portal tabs based on User node parameters.",
        logic: "Checks global React Query cache first, then loads protected layout, preventing unauthorized API queries to telemetry paths.",
        businessReason: "Ensures secure customer onboarding and strict compliance with corporate security audits.",
        dependencies: ["/client/src/context/AuthContext.jsx", "/client/src/services/api.js"],
        risk: "Low. State management is isolated to page context.",
        testing: "Unit test suite available at tests/Dashboard.test.js.",
        futureImpact: "Will integrate with Chrome DevTools plugin seamlessly."
      });
      setWorkspaceLoading(false);
    }, 1000);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    setTimeout(() => {
      setSearchResults([
        { type: "Middleware", path: "server/middleware/authMiddleware.js", matches: ["const protect = async (req, res, next) =>", "req.user.githubAccessToken = ..."] },
        { type: "Controller", path: "server/controllers/authController.js", matches: ["export const employeeLogin = async (req, res, next) =>"] },
        { type: "Route", path: "server/routes/authRoutes.js", matches: ["router.post('/employee-login', employeeLogin);"] }
      ]);
      setSearchLoading(false);
    }, 800);
  };

  const isLoading =
    profileLoading ||
    dashboardLoading ||
    projectsLoading ||
    reposLoading ||
    activityLoading ||
    analyticsLoading ||
    notificationsLoading ||
    knowledgeLoading ||
    timelineLoading ||
    teammatesLoading;

  // Mock data for contribution heatmap (112 days / 16 weeks)
  const heatmapCells = React.useMemo(() => {
    return Array.from({ length: 112 }, (_, idx) => {
      const seed = Math.sin(idx * 0.15) * Math.cos(idx * 0.05);
      if (seed < -0.3) return 0;
      if (seed < 0.1) return 1;
      if (seed < 0.5) return 2;
      if (seed < 0.8) return 3;
      return 4;
    });
  }, []);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Sliders },
    { id: "projects", label: "My Projects", icon: Folder },
    { id: "tasks", label: "Assigned Tasks", icon: CheckCircle },
    { id: "repositories", label: "Repositories", icon: GitFork },
    { id: "chat", label: "AI Assistant", icon: MessageSquare },
    { id: "activity", label: "Activity Feed", icon: Clock },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  return (
    <div className="dashboard-root min-h-screen w-full flex flex-col md:flex-row">
      {/* Background Grids & Ambient Glows */}
      <div className="dashboard-grid-pattern" />
      <div className="dashboard-vignette" />

      {/* Floating color orbs in background */}
      <div className="absolute top-[8%] right-[12%] w-[400px] h-[400px] rounded-full bg-[#6366f1]/4 blur-[130px] pointer-events-none z-0" />
      <div className="absolute bottom-[12%] left-[25%] w-[450px] h-[450px] rounded-full bg-[#00D9FF]/3 blur-[130px] pointer-events-none z-0" />

      {/* Mobile Top Navigation Header */}
      <div className="mobile-header-bar md:hidden flex items-center justify-between w-full p-4 border-b border-white/5 bg-[#08080a] z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#00D9FF]/10 border border-[#00D9FF]/20 flex items-center justify-center">
            <span className="text-[#00D9FF] font-black text-sm">W</span>
          </div>
          <span className="text-white font-black tracking-tight text-sm uppercase">WhyCode</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white p-1">
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Left Collapsible Sidebar (Desktop Aside) */}
      <motion.aside
        animate={{ width: collapsed ? 84 : 280 }}
        transition={{ duration: 0.3, cubicBezier: [0.16, 1, 0.3, 1] }}
        className="sidebar-wrapper relative flex-shrink-0 hidden md:flex"
      >
        {/* Toggle Arrow */}
        <button
          onClick={() => {
            const next = !collapsed;
            setCollapsed(next);
            localStorage.setItem("employee_sidebar_collapsed", String(next));
          }}
          className="sidebar-toggle-btn"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        <div className="flex flex-col flex-grow overflow-hidden">
          {/* Logo Brand Row */}
          <div className="sidebar-logo-row">
            <div className="sidebar-logo-box">
              <span className="text-[#00D9FF] font-black text-sm">W</span>
            </div>
            {!collapsed && <span className="sidebar-logo-text">WhyCode</span>}
          </div>

          {/* Navigation Links Scroll Area */}
          <div className="sidebar-nav-container">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`sidebar-link-item ${activeTab === item.id ? "active" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                {activeTab === item.id && <div className="sidebar-active-indicator" />}
                <item.icon size={16} className={`flex-shrink-0 ${activeTab === item.id ? "text-[#00D9FF]" : "text-[#71717a]"}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Profile Avatar Card & Logout Controls */}
        <div className="flex flex-col gap-3.5 mt-auto pt-3 border-t border-white/5">
          {!collapsed && (
            <div className="sidebar-profile-box">
              <div className="w-8 h-8 rounded-full bg-[#00D9FF]/10 border border-[#00D9FF]/20 flex items-center justify-center font-bold text-xs text-[#00D9FF] flex-shrink-0">
                {profile?.initials || "EM"}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate">{profile?.name}</span>
                <span className="text-[9.5px] text-[#71717a] truncate uppercase font-extrabold tracking-wider">{profile?.designation}</span>
              </div>
            </div>
          )}
          <button onClick={logout} className="btn-sidebar-signout">
            <LogOut size={13} className="flex-shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* Mobile Drawer Navigation Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black z-40 md:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-[#08080a] border-r border-white/5 z-50 p-6 flex flex-col justify-between md:hidden"
            >
              <div className="flex flex-col flex-grow overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="sidebar-logo-box">
                      <span className="text-[#00D9FF] font-black text-sm">W</span>
                    </div>
                    <span className="text-white font-black tracking-tight text-sm uppercase">WhyCode</span>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="text-white">
                    <X size={20} />
                  </button>
                </div>

                <div className="sidebar-nav-container">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`sidebar-link-item ${activeTab === item.id ? "active" : ""}`}
                    >
                      <item.icon size={14} className="flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {activeTab === item.id && <div className="sidebar-active-indicator" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3.5 mt-auto pt-4 border-t border-white/5">
                <div className="sidebar-profile-box">
                  <div className="w-8 h-8 rounded-full bg-[#00D9FF]/10 border border-[#00D9FF]/20 flex items-center justify-center font-bold text-xs text-[#00D9FF] flex-shrink-0">
                    {profile?.initials || "EM"}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white truncate">{profile?.name}</span>
                    <span className="text-[9.5px] text-[#71717a] truncate uppercase font-extrabold tracking-wider">{profile?.designation}</span>
                  </div>
                </div>
                <button onClick={logout} className="btn-sidebar-signout">
                  <LogOut size={13} className="flex-shrink-0" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Workspace Viewport */}
      <div className="flex-grow flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header Navigation Bar */}
        <header className="sticky top-0 bg-[#050505]/75 backdrop-filter blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between z-30 w-full">
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#71717a] uppercase font-bold tracking-wider select-none">Workspace Portal</span>
            <span className="text-xs text-white/10 select-none">/</span>
            <span className="text-xs text-white font-extrabold capitalize">{activeTab}</span>
          </div>

          {/* Search Input bar */}
          <div className="hidden md:flex items-center gap-2.5 bg-white/3 border border-white/5 rounded-lg px-3 py-1.5 w-64">
            <Search size={13} className="text-[#71717a]" />
            <input type="text" placeholder="Search projects, tasks..." className="bg-transparent text-xs text-white outline-none w-full placeholder-[#52525b]" />
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-4">
            <div className="relative cursor-pointer text-[#71717a] hover:text-white transition">
              <Mail size={15} />
              <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-[#00D9FF]" />
            </div>
            <div className="w-7 h-7 rounded-full bg-[#00D9FF]/10 border border-[#00D9FF]/20 flex items-center justify-center font-bold text-[10.5px] text-[#00D9FF]">
              {profile?.initials || "EM"}
            </div>
          </div>
        </header>

        <main className="dashboard-content-viewport">
          {isLoading ? (
            <div className="flex items-center justify-center h-[60vh]">
              <LoadingSpinner size="large" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              
              {/* 1. DASHBOARD PORTAL OVERVIEW */}
              {activeTab === "dashboard" && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col gap-6"
                >
                  {/* Hero Section Banner */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="glass-panel-premium lg:col-span-2 flex flex-col justify-between p-6 min-h-[160px]">
                      <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Welcome Back, Developer 💻</h2>
                        <p className="text-[11px] text-[#a1a1aa] mt-1.5 leading-relaxed">
                          Your workspace telemetry is performing optimally. Commits ledger is linked with the active AST indexer.
                        </p>
                      </div>

                      {/* Productivity metrics row */}
                      <div className="flex flex-wrap items-center gap-6 mt-6 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2 text-xs">
                          <Flame size={14} className="text-amber-500 fill-amber-500" />
                          <span className="text-[#71717a]">Streak:</span>
                          <strong className="text-white font-extrabold">14 Days</strong>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Folder size={14} className="text-[#00D9FF]" />
                          <span className="text-[#71717a]">Projects:</span>
                          <strong className="text-white font-extrabold">{dashboard?.totalRooms || 0} Active</strong>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="flex-grow flex items-center gap-3 max-w-[200px]">
                          <span className="text-[10px] text-[#71717a] font-bold">Progress:</span>
                          <div className="flex-grow h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: "85%" }} />
                          </div>
                          <span className="text-[10px] font-black text-white">85%</span>
                        </div>
                      </div>
                    </div>

                    {/* AI Advisory Suggestion Widget */}
                    <div className="glass-panel-premium border-l-4 border-l-[#00D9FF] flex flex-col justify-between p-6">
                      <div className="flex items-center gap-2 text-[#00D9FF]">
                        <Sparkles size={14} className="animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-wider">AI Advisory Suggestion</span>
                      </div>
                      <p className="text-[11px] text-[#d1d5db] leading-relaxed my-2">
                        {dashboard?.aiSummary?.text || "Grounded analysis recommends validating SSO callback parameters inside server router middleware."}
                      </p>
                      <span className="text-[9.5px] text-[#71717a]">Recommended: Inspect `server/app.js`</span>
                    </div>
                  </div>

                  {/* 6 KPI Cards Grid (Sparklines included) */}
                  <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                    
                    {/* Assigned Tasks */}
                    <div className="stat-card-glow p-4 flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-black text-[#71717a] uppercase tracking-wider">Assigned Tasks</span>
                        <div className="text-2xl font-black text-white mt-1">4</div>
                      </div>
                      <svg className="w-full h-6 mt-3 text-cyan-500 opacity-60">
                        <path d="M 0 15 Q 15 5, 30 10 T 60 5 T 90 12" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </div>

                    {/* Completed Tasks */}
                    <div className="stat-card-glow p-4 flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-black text-[#71717a] uppercase tracking-wider">Completed</span>
                        <div className="text-2xl font-black text-[#10b981] mt-1">8</div>
                      </div>
                      <svg className="w-full h-6 mt-3 text-emerald-500 opacity-60">
                        <path d="M 0 18 Q 15 12, 30 5 T 60 10 T 90 2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </div>

                    {/* Active Projects */}
                    <div className="stat-card-glow p-4 flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-black text-[#71717a] uppercase tracking-wider">Active Projects</span>
                        <div className="text-2xl font-black text-white mt-1">{dashboard?.totalRooms || 0}</div>
                      </div>
                      <svg className="w-full h-6 mt-3 text-indigo-500 opacity-60">
                        <path d="M 0 10 Q 15 15, 30 8 T 60 14 T 90 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </div>

                    {/* Pull Requests */}
                    <div className="stat-card-glow p-4 flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-black text-[#71717a] uppercase tracking-wider">Pull Requests</span>
                        <div className="text-2xl font-black text-white mt-1">3</div>
                      </div>
                      <svg className="w-full h-6 mt-3 text-amber-500 opacity-60">
                        <path d="M 0 15 Q 15 15, 30 5 T 60 8 T 90 3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </div>

                    {/* Commits This Week */}
                    <div className="stat-card-glow p-4 flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-black text-[#71717a] uppercase tracking-wider">Commits</span>
                        <div className="text-2xl font-black text-white mt-1">{dashboard?.totalCommits || 0}</div>
                      </div>
                      <svg className="w-full h-6 mt-3 text-purple-500 opacity-60">
                        <path d="M 0 12 Q 15 5, 30 15 T 60 4 T 90 8" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </div>

                    {/* Documentation Score */}
                    <div className="stat-card-glow p-4 flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-black text-[#71717a] uppercase tracking-wider">Doc Health</span>
                        <div className="text-2xl font-black text-[#10b981] mt-1">{dashboard?.avgDocHealth || 0}%</div>
                      </div>
                      <svg className="w-full h-6 mt-3 text-emerald-500 opacity-60">
                        <path d="M 0 18 Q 15 10, 30 5 T 60 5 T 90 2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </div>
                  </div>

                  {/* Active Projects Grid Row */}
                  <div className="glass-panel-premium flex flex-col gap-4">
                    <span className="text-[10px] font-black text-white uppercase tracking-wider border-b border-white/5 pb-2.5">My Active Projects</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {projects?.slice(0, 4).map((project) => (
                        <div key={project._id} className="p-4 rounded-xl bg-white/2 border border-white/5 flex flex-col justify-between gap-4">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="text-xs font-bold text-white truncate">{project.name}</h4>
                              <span className="status-badge-custom badge-purple text-[8.5px] py-0.5">{project.githubRepo?.split("/")[1] || "repo"}</span>
                            </div>
                            <code className="text-[10px] text-[#71717a] font-mono block mt-1">{project.githubRepo}</code>
                            
                            {/* Health progress bar */}
                            <div className="flex items-center gap-3 mt-4">
                              <div className="flex-grow h-1 rounded-full bg-white/5 overflow-hidden">
                                <div className="h-full bg-[#00D9FF]" style={{ width: `${project.progress || 0}%` }} />
                              </div>
                              <span className="text-[10px] text-white font-bold">{project.progress || 0}%</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-[#71717a] pt-2 border-t border-white/3">
                            <span>Manager: {project.manager}</span>
                            <button
                              onClick={() => {
                                setSelectedRepo(repositories?.find(r => r.fullName === project.githubRepo) || null);
                                setActiveTab("repositories");
                              }}
                              className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-white hover:bg-white/10 transition"
                            >
                              Explore
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tasks Kanban Board */}
                  <div className="glass-panel-premium flex flex-col gap-4">
                    <span className="text-[10px] font-black text-white uppercase tracking-wider border-b border-white/5 pb-2.5">My Sprint Tasks</span>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      
                      {/* TODO */}
                      <div className="flex flex-col gap-2 p-3 bg-[#0c0c0e]/30 border border-white/3 rounded-xl min-h-[160px]">
                        <span className="text-[9px] font-black text-[#71717a] uppercase tracking-wider border-b border-white/3 pb-1 mb-1">To Do</span>
                        <div className="p-2.5 rounded-lg bg-white/2 border border-white/5 text-[10.5px]">
                          <span className="font-bold text-white">CM-92</span>
                          <p className="text-[#a1a1aa] mt-1">Setup Redis pool parameters</p>
                        </div>
                      </div>

                      {/* IN PROGRESS */}
                      <div className="flex flex-col gap-2 p-3 bg-[#0c0c0e]/30 border border-white/3 rounded-xl min-h-[160px]">
                        <span className="text-[9px] font-black text-[#00D9FF] uppercase tracking-wider border-b border-white/3 pb-1 mb-1">In Progress</span>
                        <div className="p-2.5 rounded-lg bg-[#00D9FF]/5 border border-[#00D9FF]/10 text-[10.5px] border-l-2 border-l-[#00D9FF]">
                          <span className="font-bold text-white">CM-89</span>
                          <p className="text-[#a1a1aa] mt-1">Verify passwordless login route</p>
                        </div>
                      </div>

                      {/* REVIEW */}
                      <div className="flex flex-col gap-2 p-3 bg-[#0c0c0e]/30 border border-white/3 rounded-xl min-h-[160px]">
                        <span className="text-[9px] font-black text-purple-400 uppercase tracking-wider border-b border-white/3 pb-1 mb-1">In Review</span>
                        <div className="p-2.5 rounded-lg bg-purple-500/5 border border-purple-500/10 text-[10.5px]">
                          <span className="font-bold text-white">CM-84</span>
                          <p className="text-[#a1a1aa] mt-1">Bind Client SPA routes</p>
                        </div>
                      </div>

                      {/* COMPLETED */}
                      <div className="flex flex-col gap-2 p-3 bg-[#0c0c0e]/30 border border-white/3 rounded-xl min-h-[160px]">
                        <span className="text-[9px] font-black text-[#10b981] uppercase tracking-wider border-b border-white/3 pb-1 mb-1">Completed</span>
                        <div className="p-2.5 rounded-lg bg-[#10b981]/5 border border-[#10b981]/10 text-[10.5px] opacity-60">
                          <span className="font-bold text-[#10b981] line-through">CM-72</span>
                          <p className="text-[#a1a1aa] mt-1">Hydrate SSO callback payloads</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contribution Analytics Heatmap & timelines */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Weekly Contributions Heatmap */}
                    <div className="glass-panel-premium lg:col-span-2 flex flex-col gap-4">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-[10px] font-black text-white uppercase tracking-wider">Branch Commits Heatmap</span>
                        <span className="text-[9.5px] text-[#71717a]">Activity logs</span>
                      </div>
                      
                      <div className="overflow-x-auto py-1">
                        <div className="grid grid-flow-col grid-rows-7 gap-[5px] w-max">
                          {heatmapCells.map((val, idx) => {
                            const density = 
                              val === 0 ? "bg-[#121214]" :
                              val === 1 ? "bg-[#00D9FF]/20" :
                              val === 2 ? "bg-[#00D9FF]/40" :
                              val === 3 ? "bg-[#00D9FF]/70" :
                              "bg-[#00D9FF] shadow-[0_0_6px_rgba(0,217,255,0.4)]";
                            return <div key={idx} className={`heatmap-cell ${density}`} />;
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Team timeline activity feed */}
                    <div className="glass-panel-premium flex flex-col gap-4">
                      <span className="text-[10px] font-black text-white uppercase tracking-wider border-b border-white/5 pb-2">Recent timeline activity</span>
                      <div className="flex flex-col gap-3 max-h-[140px] overflow-y-auto pr-1">
                        {activity?.slice(0, 4).map((act) => (
                          <div key={act._id} className="flex gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] mt-1.5 shadow-[0_0_6px_#00D9FF]" />
                            <div className="min-w-0 text-[10.5px]">
                              <p className="text-[#d1d5db] truncate margin-0"><strong className="text-white">@{act.developer}</strong>: {act.message}</p>
                              <span className="text-[9.5px] text-[#71717a]">{new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions Panel */}
                  <div className="glass-panel-premium flex flex-col gap-3">
                    <span className="text-[10px] font-black text-white uppercase tracking-wider border-b border-white/5 pb-2.5">Workspace Quick Actions</span>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      
                      <button
                        onClick={() => {
                          setSelectedRepo(repositories?.[0] || null);
                          setActiveTab("repositories");
                        }}
                        className="btn-glass-secondary py-2.5 text-xs flex flex-col items-center gap-1.5"
                      >
                        <GitFork size={13} className="text-[#00D9FF]" />
                        <span>Open Repository</span>
                      </button>

                      <button
                        onClick={() => setActiveTab("chat")}
                        className="btn-glass-secondary py-2.5 text-xs flex flex-col items-center gap-1.5"
                      >
                        <Terminal size={13} className="text-purple-400" />
                        <span>Coding Session</span>
                      </button>

                      <button
                        onClick={() => setActiveTab("prs")}
                        className="btn-glass-secondary py-2.5 text-xs flex flex-col items-center gap-1.5"
                      >
                        <Share2 size={13} className="text-emerald-400" />
                        <span>Submit PR</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedFile({ name: "server/app.js" });
                          setActiveTab("repositories");
                        }}
                        className="btn-glass-secondary py-2.5 text-xs flex flex-col items-center gap-1.5"
                      >
                        <FileText size={13} className="text-amber-400" />
                        <span>Update Docs</span>
                      </button>

                      <button
                        onClick={() => {
                          showToast("Workspace index synchronization initialized.", "success");
                        }}
                        className="btn-glass-secondary py-2.5 text-xs flex flex-col items-center gap-1.5"
                      >
                        <Play size={13} className="text-[#00D9FF]" />
                        <span>Sync Repository</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 2. MY ASSIGNED PROJECTS */}
              {activeTab === "projects" && (
                <motion.div
                  key="projects"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col gap-6"
                >
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">My Assigned Projects</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects?.length === 0 ? (
                      <div className="glass-panel-premium text-center py-16 text-xs text-[#71717a] lg:col-span-3">
                        No projects currently assigned to you.
                      </div>
                    ) : (
                      projects?.map((project) => (
                        <div key={project._id} className="glass-panel-premium flex flex-col justify-between gap-5 p-5">
                          <div>
                            <h4 className="text-sm font-bold text-white truncate">{project.name}</h4>
                            <code className="text-[10px] text-[#00D9FF] block mt-1 mb-4 truncate">{project.githubRepo}</code>
                            
                            <div className="flex flex-col gap-2 text-xs text-[#a1a1aa]">
                              <div>📅 <strong>Sprint:</strong> <span className="text-white">{project.currentSprint || "Active"}</span></div>
                              <div>📊 <strong>Tech:</strong> <span className="text-white">{(project.techStack || []).join(", ") || "N/A"}</span></div>
                              <div>🔧 <strong>Health Score:</strong> <span className="text-white">{project.progress || 0}%</span></div>
                              <div>💡 <strong>Knowledge coverage:</strong> <span className="text-white">{project.knowledgeScore || 0}%</span></div>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedRepo(repositories?.find(r => r.fullName === project.githubRepo) || null);
                              setActiveTab("repositories");
                            }}
                            className="btn-glass-primary w-full py-2.5 text-xs"
                          >
                            Explore Repository
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}

              {/* 3. ASSIGNED TASKS */}
              {activeTab === "tasks" && (
                <motion.div
                  key="tasks"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col gap-6"
                >
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">My Assigned Tasks</h3>
                  <div className="flex flex-col gap-4">
                    <div className="glass-panel-premium flex flex-col gap-3 p-5">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                        <span className="text-xs font-bold text-white">CM-89: Verify passwordless employee route</span>
                        <span className="status-badge-custom badge-rose">High Priority</span>
                      </div>
                      <p className="text-xs text-[#a1a1aa] leading-relaxed my-1 font-bold">Ensure error codes match payload specifications cleanly.</p>
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <span className="text-[9.5px] font-black text-[#71717a] uppercase tracking-wider block mb-2">AI Suggested Files:</span>
                        <code className="text-xs text-[#00D9FF] font-mono">server/controllers/authController.js</code>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 4. REPOSITORY EXPLORER */}
              {activeTab === "repositories" && (
                <motion.div
                  key="repositories"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col gap-6"
                >
                  <h3 className="text-lg font-black text-white uppercase tracking-tight font-black">Repository Explorer</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="glass-panel-premium flex flex-col gap-4 h-fit lg:col-span-1">
                      <span className="text-[10px] font-black text-[#71717a] uppercase tracking-wider">Select Repository</span>
                      <div className="flex flex-col gap-2">
                        {repositories?.map((repo) => (
                          <button
                            key={repo._id}
                            onClick={() => { setSelectedRepo(repo); setSelectedFile(null); }}
                            className={`sidebar-link-item text-xs justify-start ${selectedRepo?._id === repo._id ? "active" : ""}`}
                          >
                            {repo.fullName.split("/")[1]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedRepo ? (
                      <div className="lg:col-span-3 flex flex-col gap-6">
                        {/* Leadership info */}
                        <div className="glass-panel-premium flex flex-col gap-4">
                          <span className="text-[10px] font-black text-[#00D9FF] uppercase tracking-wider">Repository Owner & Leadership</span>
                          <div className="grid grid-cols-2 gap-4 text-xs text-[#a1a1aa] border-b border-white/5 pb-4">
                            <div>👑 <strong>Owner:</strong> <span className="text-white font-bold">{repoOwnership?.owner}</span></div>
                            <div>🔥 <strong>Knowledge Leader:</strong> <span className="text-white font-bold">{repoOwnership?.aiKnowledgeLeader}</span></div>
                          </div>
                          <div>
                            <span className="text-[9.5px] font-black text-[#71717a] uppercase tracking-wider block mb-3">Repository Teammates ({repoMembers?.length || 0})</span>
                            <div className="flex gap-2 flex-wrap">
                              {repoMembers?.map((m) => (
                                <span
                                  key={m._id}
                                  onClick={() => setSelectedTeammateId(m._id)}
                                  className="status-badge-custom badge-cyan hover:border-[#00D9FF]/30 cursor-pointer transition text-[10.5px]"
                                >
                                  @{m.githubUsername || m.name.split(" ")[0]}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* File lists */}
                        <div className="glass-panel-premium flex flex-col gap-4">
                          <div className="flex justify-between items-center border-b border-white/5 pb-3">
                            <span className="text-xs font-black text-white">{selectedRepo.fullName}</span>
                            <span className="status-badge-custom badge-purple">Health: {selectedRepo.docHealthScore}%</span>
                          </div>
                          <div className="flex flex-col gap-3">
                            {[
                              { name: "server/app.js", desc: "Core Express app server setup and route configuration bindings" },
                              { name: "server/controllers/authController.js", desc: "SSO and passwordless employee authentication controllers" },
                              { name: "server/middleware/authMiddleware.js", desc: "Session hydration logic verifying active scopes" },
                              { name: "client/src/App.jsx", desc: "React root containing global route configurations" }
                            ].map((f) => (
                              <div
                                key={f.name}
                                onClick={() => setSelectedFile(f)}
                                className="flex justify-between items-center p-3.5 border rounded-xl cursor-pointer transition"
                                style={{
                                  backgroundColor: selectedFile?.name === f.name ? "rgba(0, 217, 255, 0.04)" : "rgba(255, 255, 255, 0.01)",
                                  borderColor: selectedFile?.name === f.name ? "#00D9FF" : "rgba(255, 255, 255, 0.05)"
                                }}
                              >
                                <div className="min-w-0 pr-4">
                                  <div className="text-xs font-bold text-white truncate">{f.name}</div>
                                  <div className="text-[10px] text-[#71717a] mt-1 truncate">{f.desc}</div>
                                </div>
                                <span className="status-badge-custom badge-cyan flex-shrink-0 text-[10.5px]">AI Explained</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="lg:col-span-3 glass-panel-premium text-center py-24 text-xs text-[#71717a]">
                        Select a repository to explore files.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* 5. AI ASSISTANT CHAT */}
              {activeTab === "chat" && (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col gap-6"
                  style={{ height: "calc(100vh - 140px)" }}
                >
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">AI Assistant Chat</h3>
                    <span className="status-badge-custom badge-emerald">SSO scope active</span>
                  </div>

                  <div className="chat-messages-container flex-grow pr-2">
                    {chatMessages.map((msg, index) => (
                      <div
                        key={index}
                        className={`chat-bubble ${msg.role === "user" ? "user" : "assistant"}`}
                      >
                        {msg.text}
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendChat} className="flex gap-3 mt-auto pt-3 border-t border-white/5">
                    <input
                      type="text"
                      placeholder="Ask AI assistant about codebase structures, endpoint configurations..."
                      value={chatQuery}
                      onChange={(e) => setChatQuery(e.target.value)}
                      className="glass-input-field flex-grow"
                    />
                    <button
                      type="submit"
                      className="btn-glass-primary px-5"
                      disabled={chatMutation.isPending}
                    >
                      <Send size={14} />
                    </button>
                  </form>
                </motion.div>
              )}

              {/* 6. ACTIVITY FEED */}
              {activeTab === "activity" && (
                <motion.div
                  key="activity"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col gap-6"
                >
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Activity Feed</h3>
                  <div className="flex flex-col gap-4">
                    {activity?.length === 0 ? (
                      <div className="glass-panel-premium text-center py-16 text-xs text-[#71717a]">
                        No active workspace commits analyzed yet.
                      </div>
                    ) : (
                      activity?.map((act) => (
                        <div key={act._id} className="glass-panel-premium flex gap-3 p-4">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] mt-2 flex-shrink-0 shadow-[0_0_8px_#00D9FF]" />
                          <div className="min-w-0">
                            <p className="text-xs text-[#d1d5db] leading-relaxed margin-0">
                              <strong className="text-white">@{act.developer}</strong>: {act.message}
                            </p>
                            <span className="text-[10px] text-[#71717a] block mt-1">
                              in {act.repository} • {new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}

              {/* 7. PERSONAL GROWTH ANALYTICS */}
              {activeTab === "analytics" && (
                <motion.div
                  key="analytics"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col gap-6"
                >
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Growth & Contribution Analytics</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="glass-panel-premium flex flex-col gap-2">
                      <span className="text-[10px] font-black text-[#71717a] uppercase tracking-wider">Total Commits</span>
                      <span className="text-3xl font-black text-white">{analytics?.commits || 0}</span>
                    </div>
                    <div className="glass-panel-premium flex flex-col gap-2">
                      <span className="text-[10px] font-black text-[#71717a] uppercase tracking-wider">PRs Completed</span>
                      <span className="text-3xl font-black text-white">{analytics?.prs || 0}</span>
                    </div>
                    <div className="glass-panel-premium flex flex-col gap-2">
                      <span className="text-[10px] font-black text-[#71717a] uppercase tracking-wider">Lines Added</span>
                      <span className="text-3xl font-black text-white">{analytics?.linesAdded || 0}</span>
                    </div>
                    <div className="glass-panel-premium flex flex-col gap-2">
                      <span className="text-[10px] font-black text-[#71717a] uppercase tracking-wider">AI Suggestions Accepted</span>
                      <span className="text-3xl font-black text-white">{analytics?.aiSuggestionsAccepted || 0}%</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 8. SETTINGS */}
              {activeTab === "settings" && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col gap-6"
                >
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Workspace settings</h3>
                  <div className="glass-panel-premium flex flex-col gap-5 p-6">
                    <div>
                      <label className="text-[10px] font-black text-[#71717a] uppercase tracking-wider block mb-2">Theme Mode</label>
                      <select className="glass-input-field cursor-pointer">
                        <option>Dark Mode (Default)</option>
                        <option>AMOLED Midnight</option>
                      </select>
                    </div>
                    <div className="border-t border-white/5 pt-4">
                      <label className="text-[10px] font-black text-[#71717a] uppercase tracking-wider block mb-2">Keyboard Shortcuts</label>
                      <div className="text-xs text-[#a1a1aa] bg-white/1 border border-white/5 p-4 rounded-xl leading-relaxed">
                        Press <kbd className="bg-white/5 px-1.5 py-0.5 rounded font-mono text-[10px] text-[#00D9FF]">Ctrl + /</kbd> to trigger AI chat from any workspace panel.
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* Teammate Profile Detail Drawer Overlay */}
      {selectedTeammateId && (
        <>
          <div className="drawer-backdrop" onClick={() => setSelectedTeammateId(null)} />
          <div className="drawer-content flex flex-col gap-6">
            {loadingTeammateDetail ? (
              <div className="flex items-center justify-center h-full">
                <LoadingSpinner />
              </div>
            ) : teammateDetail ? (
              <div>
                <button
                  onClick={() => setSelectedTeammateId(null)}
                  className="absolute top-6 right-6 text-[#71717a] hover:text-white transition text-lg"
                >
                  ✕
                </button>

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-[#00D9FF]/10 border border-[#00D9FF]/20 flex items-center justify-center font-black text-base text-[#00D9FF] flex-shrink-0">
                    {teammateDetail.profile.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">{teammateDetail.profile.name}</h3>
                    <p className="text-xs text-[#71717a] truncate mt-1">
                      {teammateDetail.profile.designation} • {teammateDetail.profile.companyName}
                    </p>
                  </div>
                </div>

                <div 
                  className="glass-panel-premium border-l-4 border-l-[#00D9FF] mb-6 p-4"
                  style={{
                    background: "linear-gradient(90deg, rgba(0, 217, 255, 0.02) 0%, rgba(10, 10, 12, 0.45) 100%)"
                  }}
                >
                  <div className="flex items-center gap-2 text-[#00D9FF] mb-2.5">
                    <Sparkles size={13} className="animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-wider">AI Team Insight</span>
                  </div>
                  <p className="text-xs text-[#d1d5db] leading-relaxed">
                    {teammateDetail.aiSummary}
                  </p>
                </div>

                <div className="mb-6">
                  <span className="text-[10px] font-black text-[#71717a] uppercase tracking-wider block mb-3">Assigned Repositories</span>
                  <div className="flex gap-2 flex-wrap">
                    {teammateDetail.repositories.map((repo, idx) => (
                      <span key={idx} className="status-badge-custom badge-purple text-[10.5px]">
                        {repo}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-black text-[#71717a] uppercase tracking-wider block mb-4">Recent Contributions</span>
                  <div className="flex flex-col gap-4">
                    {teammateDetail.commits.map((c) => (
                      <div key={c.sha} className="glass-panel-premium p-4 flex flex-col gap-2">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                          <code className="text-xs text-[#00D9FF] font-mono">{c.sha}</code>
                          <span className="status-badge-custom badge-cyan text-[10.5px]">{c.repo}</span>
                        </div>
                        <p className="text-xs text-white leading-relaxed">{c.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#71717a]">Teammate details unavailable.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

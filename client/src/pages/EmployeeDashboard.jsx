import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  Sliders, Users, Mail, GitFork, MessageSquare, Settings, CheckCircle, Clock,
  AlertTriangle, Folder, Search, Sparkles, Send, HelpCircle, Layers,
  Terminal, ShieldCheck, FileText, Share2, TrendingUp, BookOpen, AlertCircle, Check, LogOut
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
    { role: "assistant", text: "Hi! I am your CodeMemory AI Assistant. Ask me anything about your assigned repositories, APIs, or architectural decisions." }
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

  const navItemStyle = (tab) => ({
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "13px",
    fontWeight: activeTab === tab ? "700" : "600",
    padding: "8px 14px",
    borderRadius: "6px",
    color: activeTab === tab ? "#06b6d4" : "#9ca3af",
    backgroundColor: activeTab === tab ? "rgba(6,182,212,0.06)" : "transparent",
    borderLeft: activeTab === tab ? "3px solid #06b6d4" : "3px solid transparent",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    boxSizing: "border-box"
  });

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
        <div style={{ overflowY: "auto", flex: 1, paddingRight: "4px" }}>
          {/* Logo */}
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              C
            </div>
            <span className="sidebar-logo-text">CodeMemory</span>
          </div>

          {/* Navigation Links */}
          <nav className="sidebar-nav">
            <button onClick={() => setActiveTab("dashboard")} className={`sidebar-link ${activeTab === "dashboard" ? "active" : ""}`}>
              <Sliders size={14} /> <span>Workspace</span>
            </button>
            <button onClick={() => setActiveTab("invitations")} className={`sidebar-link ${activeTab === "invitations" ? "active" : ""}`}>
              <Mail size={14} /> <span>Invitations</span>
            </button>
            <button onClick={() => setActiveTab("team")} className={`sidebar-link ${activeTab === "team" ? "active" : ""}`}>
              <Users size={14} /> <span>Teammates</span>
            </button>
            <button onClick={() => setActiveTab("projects")} className={`sidebar-link ${activeTab === "projects" ? "active" : ""}`}>
              <Folder size={14} /> <span>My Projects</span>
            </button>
            <button onClick={() => setActiveTab("repositories")} className={`sidebar-link ${activeTab === "repositories" ? "active" : ""}`}>
              <GitFork size={14} /> <span>Repositories</span>
            </button>
            <button onClick={() => setActiveTab("workspace")} className={`sidebar-link ${activeTab === "workspace" ? "active" : ""}`}>
              <Sparkles size={14} /> <span>AI Inspector</span>
            </button>
            <button onClick={() => setActiveTab("chat")} className={`sidebar-link ${activeTab === "chat" ? "active" : ""}`}>
              <MessageSquare size={14} /> <span>AI Chat</span>
            </button>
            <button onClick={() => setActiveTab("hub")} className={`sidebar-link ${activeTab === "hub" ? "active" : ""}`}>
              <BookOpen size={14} /> <span>Knowledge Hub</span>
            </button>
            <button onClick={() => setActiveTab("docs")} className={`sidebar-link ${activeTab === "docs" ? "active" : ""}`}>
              <FileText size={14} /> <span>API Specs</span>
            </button>
            <button onClick={() => setActiveTab("search")} className={`sidebar-link ${activeTab === "search" ? "active" : ""}`}>
              <Search size={14} /> <span>Code Search</span>
            </button>
            <button onClick={() => setActiveTab("graph")} className={`sidebar-link ${activeTab === "graph" ? "active" : ""}`}>
              <Layers size={14} /> <span>Dependencies</span>
            </button>
            <button onClick={() => setActiveTab("analytics")} className={`sidebar-link ${activeTab === "analytics" ? "active" : ""}`}>
              <TrendingUp size={14} /> <span>My Analytics</span>
            </button>
            <button onClick={() => setActiveTab("timeline")} className={`sidebar-link ${activeTab === "timeline" ? "active" : ""}`}>
              <Clock size={14} /> <span>Change Timeline</span>
            </button>
            <button onClick={() => setActiveTab("prs")} className={`sidebar-link ${activeTab === "prs" ? "active" : ""}`}>
              <Share2 size={14} /> <span>Pull Requests</span>
            </button>
            <button onClick={() => setActiveTab("tasks")} className={`sidebar-link ${activeTab === "tasks" ? "active" : ""}`}>
              <CheckCircle size={14} /> <span>Assigned Tasks</span>
            </button>
            <button onClick={() => setActiveTab("settings")} className={`sidebar-link ${activeTab === "settings" ? "active" : ""}`}>
              <Settings size={14} /> <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* User Badge */}
        <div className="sidebar-user-section">
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar">
              {profile?.initials || "EM"}
            </div>
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <p style={{ fontSize: "12px", fontWeight: "700", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {profile?.name}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#10b981" }} />
                <span style={{ fontSize: "9px", textTransform: "uppercase", color: "#8a8a93", fontWeight: "700", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {profile?.designation}
                </span>
              </div>
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

      {/* Workspace Panel Viewports */}
      <main style={{ flexGrow: 1, padding: "40px", boxSizing: "border-box", overflowY: "auto", height: "100vh", position: "relative", zIndex: 5 }}>
        {isLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh" }}>
            <LoadingSpinner size="large" />
          </div>
        ) : (
          <div>
            {/* 1. DASHBOARD OVERVIEW */}
            {activeTab === "dashboard" && (
              <div className="animate-slide-up">
                <div style={{ marginBottom: "32px" }}>
                  <h2 className="hero-title">
                    Good Morning, {profile?.name?.split(" ")[0]} 💻
                  </h2>
                  <p style={{ fontSize: "14px", color: "#a1a1aa", margin: 0 }}>CodeMemory indexed software engineering environment.</p>
                </div>

                {/* AI Summary Banner */}
                {dashboard?.aiSummary && (
                  <div 
                    className="premium-card" 
                    onMouseMove={handleCardMouseMove}
                    style={{
                      borderLeft: "4px solid #00f2fe",
                      background: "linear-gradient(90deg, rgba(0, 242, 254, 0.02) 0%, rgba(10, 10, 10, 0.45) 100%)",
                      padding: "24px",
                      marginBottom: "32px"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#00f2fe", marginBottom: "12px" }}>
                      <Sparkles size={16} />
                      <span style={{ fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.08em" }}>Yesterday's AI Summary</span>
                    </div>
                    <p style={{ fontSize: "14px", color: "#d1d5db", lineHeight: "1.6", margin: 0 }}>
                      {dashboard.aiSummary.text}
                    </p>
                    <div style={{ fontSize: "11px", color: "#8a8a93", marginTop: "12px" }}>
                      Last generated: {dashboard.aiSummary.lastGenerated}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px", marginBottom: "32px" }}>
                  <StatCard icon={Folder} value={dashboard?.totalRooms || 0} label="Assigned Projects" accentColor="#06b6d4" />
                  <StatCard icon={GitFork} value={dashboard?.totalRepos || 0} label="Tracked Repositories" accentColor="#6366f1" />
                  <StatCard icon={Terminal} value={dashboard?.totalCommits || 0} label="Analyzed Commits" accentColor="#10b981" />
                  <StatCard icon={ShieldCheck} value={`${dashboard?.avgDocHealth || 0}%`} label="Avg Code Health Score" accentColor="#8b5cf6" />
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
                  {/* Assigned Repositories */}
                  <div className="premium-card" onMouseMove={handleCardMouseMove} style={{ flex: "1 1 300px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: "800", margin: "0 0 20px 0", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: "12px", color: "#ffffff", letterSpacing: "-0.01em" }}>Assigned Repositories</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {dashboard?.repos?.length === 0 ? (
                        <div style={{ fontSize: "13px", color: "#8a8a93", padding: "12px 0" }}>No repositories linked.</div>
                      ) : (
                        dashboard?.repos?.map((repo) => (
                          <div 
                            key={repo._id} 
                            style={{ 
                              display: "flex", 
                              justifyContent: "space-between", 
                              alignItems: "center", 
                              backgroundColor: "rgba(255, 255, 255, 0.02)", 
                              border: "1px solid rgba(255, 255, 255, 0.04)",
                              padding: "12px 16px", 
                              borderRadius: "10px",
                              transition: "all 0.2s"
                            }}
                          >
                            <div>
                              <span style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff" }}>{repo.fullName}</span>
                              {repo.language && <span style={{ fontSize: "11px", color: "#8a8a93", marginLeft: "10px" }}>● {repo.language}</span>}
                            </div>
                            <span className="premium-badge badge-emerald">
                              Active
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="premium-card" onMouseMove={handleCardMouseMove} style={{ flex: "1 1 300px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: "800", margin: "0 0 20px 0", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: "12px", color: "#ffffff", letterSpacing: "-0.01em" }}>Recent Team Activity</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {activity?.length === 0 ? (
                        <div style={{ fontSize: "13px", color: "#8a8a93", padding: "12px 0" }}>No recent commits analyzed yet.</div>
                      ) : (
                        activity?.map((act) => (
                          <div key={act._id} style={{ display: "flex", gap: "12px" }}>
                            <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#00f2fe", marginTop: "5px", flexShrink: 0, boxShadow: "0 0 8px #00f2fe" }} />
                            <div>
                              <p style={{ fontSize: "13px", margin: 0, fontWeight: "600", color: "#d1d5db", lineHeight: "1.4" }}>
                                <strong style={{ color: "#ffffff" }}>{act.developer}</strong>: {act.message}
                              </p>
                              <span style={{ fontSize: "11px", color: "#8a8a93", display: "block", marginTop: "4px" }}>
                                in {act.repository} • {new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. INVITATIONS */}
            {activeTab === "invitations" && (
              <div className="animate-slide-up">
                <h3 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 20px 0", letterSpacing: "-0.02em" }}>Project Invitations</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {projects?.length === 0 ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#8a8a93" }} className="premium-card">
                      No active projects. Ask your company owner to invite you.
                    </div>
                  ) : (
                    projects.map((project) => (
                      <div key={project._id} className="premium-card" onMouseMove={handleCardMouseMove} style={{ padding: "24px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                          <div>
                            <h4 style={{ fontSize: "16px", fontWeight: "700", margin: "0 0 6px 0", color: "#ffffff" }}>{project.name}</h4>
                            <span className="premium-badge badge-purple">
                              {project.githubRepo}
                            </span>
                          </div>
                          <span className="premium-badge badge-emerald">
                            Assigned
                          </span>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px", fontSize: "13px", color: "#a1a1aa" }}>
                          <div><strong>Workspace Manager:</strong> <span style={{ color: "#ffffff" }}>{project.manager}</span></div>
                          <div><strong>Timeline Expected:</strong> <span style={{ color: "#ffffff" }}>Q3 Release</span></div>
                          <div><strong>Stack:</strong> <span style={{ color: "#ffffff" }}>{project.techStack.join(", ")}</span></div>
                          <div><strong>Doc Coverage:</strong> <span style={{ color: "#00f2fe" }}>{project.knowledgeScore}%</span></div>
                        </div>

                        <div style={{ display: "flex", gap: "10px" }}>
                          <button
                            className="premium-btn"
                            style={{ cursor: "default", opacity: 0.9 }}
                          >
                            ✓ Active Member
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 👥 TEAM PAGE */}
            {activeTab === "team" && (
              <div className="animate-slide-up">
                <h3 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>👥 Team Collaboration Workspace</h3>
                <p style={{ fontSize: "13px", color: "#8a8a93", margin: "0 0 24px 0" }}>
                  Teammates sharing repository permissions under the {profile?.companyName} organization.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
                  {teammates?.map((member) => (
                    <div
                      key={member._id}
                      className="premium-card"
                      onMouseMove={handleCardMouseMove}
                      style={{
                        display: "flex", flexDirection: "column", justify: "space-between", gap: "20px"
                      }}
                    >
                      <div>
                        {/* Member Header */}
                        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
                          <div style={{
                            width: "44px", height: "44px", borderRadius: "50%",
                            background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)",
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "800", color: "#000",
                            boxShadow: "0 0 10px rgba(0,242,254,0.15)"
                          }}>
                            {member.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 style={{ fontSize: "14px", fontWeight: "700", margin: 0, color: "#ffffff" }}>{member.name}</h4>
                            <span style={{ fontSize: "12px", color: "#8a8a93" }}>{member.designation}</span>
                          </div>
                        </div>

                        {/* Stats */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "12px", color: "#a1a1aa", marginBottom: "20px" }}>
                          <div>🔥 <strong>Knowledge:</strong> <span style={{ color: "#ffffff" }}>{member.knowledgeScore}%</span></div>
                          <div>💻 <strong>Commits:</strong> <span style={{ color: "#ffffff" }}>{member.totalCommits}</span></div>
                          <div>📝 <strong>PRs:</strong> <span style={{ color: "#ffffff" }}>{member.prs}</span></div>
                          <div>💬 <strong>Status:</strong> <span className={`premium-badge ${member.status === "online" ? "badge-emerald" : "badge-purple"}`}>{member.status}</span></div>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <button
                          onClick={() => setSelectedTeammateId(member._id)}
                          className="premium-btn premium-btn-primary"
                          style={{ width: "100%", padding: "10px", fontSize: "12px" }}
                        >
                          View Detailed Profile
                        </button>
                        <button
                          onClick={() => {
                            setChatQuery(`Who owns Checkout? Tell me about ${member.name}'s contributions.`);
                            setActiveTab("chat");
                          }}
                          className="premium-btn"
                          style={{ width: "100%", padding: "10px", fontSize: "12px" }}
                        >
                          AI Ask About Developer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. MY PROJECTS */}
            {activeTab === "projects" && (
              <div className="animate-slide-up">
                <h3 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 20px 0", letterSpacing: "-0.02em" }}>My Assigned Projects</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
                  {projects?.length === 0 ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#8a8a93" }} className="premium-card">
                      No projects assigned.
                    </div>
                  ) : (
                    projects?.map((project) => (
                      <div key={project._id} className="premium-card" onMouseMove={handleCardMouseMove} style={{ padding: "24px" }}>
                        <h4 style={{ fontSize: "15px", fontWeight: "700", margin: "0 0 6px 0", color: "#ffffff" }}>{project.name}</h4>
                        <code style={{ fontSize: "12px", color: "#00f2fe", display: "block", marginBottom: "16px" }}>{project.githubRepo}</code>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px", color: "#a1a1aa", marginBottom: "20px" }}>
                          <div>📅 <strong>Sprint:</strong> <span style={{ color: "#ffffff" }}>{project.currentSprint}</span></div>
                          <div>📊 <strong>Tech:</strong> <span style={{ color: "#ffffff" }}>{project.techStack.join(", ")}</span></div>
                          <div>🔧 <strong>Health Score:</strong> <span style={{ color: "#ffffff" }}>{project.progress}%</span></div>
                          <div>💡 <strong>Knowledge coverage:</strong> <span style={{ color: "#ffffff" }}>{project.knowledgeScore}%</span></div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedRepo(repositories.find(r => r.fullName === project.githubRepo) || null);
                            setActiveTab("repositories");
                          }}
                          className="premium-btn premium-btn-primary"
                          style={{ width: "100%", padding: "10px", fontSize: "12px" }}
                        >
                          Explore Repository
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 4. MY REPOSITORIES */}
            {activeTab === "repositories" && (
              <div className="animate-slide-up">
                <h3 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 20px 0", letterSpacing: "-0.02em" }}>Repository Explorer</h3>
                
                <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                  {/* Repo list */}
                  <div className="premium-card" onMouseMove={handleCardMouseMove} style={{ flex: "1 1 220px", height: "fit-content" }}>
                    <h4 style={{ fontSize: "11px", textTransform: "uppercase", color: "#8a8a93", margin: "0 0 16px 0", fontWeight: "700", letterSpacing: "0.08em" }}>Select Repository</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {repositories?.map((repo) => (
                        <button
                          key={repo._id}
                          onClick={() => { setSelectedRepo(repo); setSelectedFile(null); }}
                          className={`sidebar-link ${selectedRepo?._id === repo._id ? "active" : ""}`}
                          style={{ padding: "10px 14px", fontSize: "12px" }}
                        >
                          {repo.fullName}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* File Explorer & Viewer */}
                  {selectedRepo ? (
                    <div style={{ flex: "3 1 500px", display: "flex", flexDirection: "column", gap: "24px" }}>
                      {/* Repo Owner & Contributors block */}
                      <div className="premium-card" onMouseMove={handleCardMouseMove} style={{ padding: "24px" }}>
                        <h4 style={{ fontSize: "14px", fontWeight: "800", color: "#00f2fe", margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                          Repository Owner & Leadership
                        </h4>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px", color: "#a1a1aa", marginBottom: "20px" }}>
                          <div>👑 <strong>Owner:</strong> <span style={{ color: "#ffffff" }}>{repoOwnership?.owner}</span></div>
                          <div>🔥 <strong>AI Knowledge Leader:</strong> <span style={{ color: "#ffffff" }}>{repoOwnership?.aiKnowledgeLeader}</span></div>
                        </div>

                        {/* Repository Members */}
                        <div style={{ marginTop: "16px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "16px" }}>
                          <span style={{ fontSize: "11px", fontWeight: "800", textTransform: "uppercase", color: "#8a8a93", display: "block", marginBottom: "12px", letterSpacing: "0.05em" }}>
                            Repository Teammates ({repoMembers?.length || 0})
                          </span>
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            {repoMembers?.map((m) => (
                              <span
                                key={m._id}
                                onClick={() => setSelectedTeammateId(m._id)}
                                className="premium-badge badge-cyan"
                                style={{ cursor: "pointer", padding: "4px 12px", fontSize: "12px", textTransform: "none" }}
                              >
                                @{m.githubUsername || m.name.split(" ")[0]}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="premium-card" onMouseMove={handleCardMouseMove} style={{ padding: "24px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: "16px", marginBottom: "20px" }}>
                          <span style={{ fontSize: "15px", fontWeight: "800", color: "#ffffff" }}>{selectedRepo.fullName}</span>
                          <span className="premium-badge badge-purple" style={{ fontSize: "11px" }}>Health: {selectedRepo.docHealthScore}%</span>
                        </div>

                        {/* Files list */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {[
                            { name: "server/app.js", desc: "Core Express app server setup and route configuration bindings" },
                            { name: "server/controllers/authController.js", desc: "SSO and passwordless employee authentication controllers" },
                            { name: "server/middleware/authMiddleware.js", desc: "Session hydration logic verifying active scopes" },
                            { name: "client/src/App.jsx", desc: "React root containing global route configurations" }
                          ].map((f) => (
                            <div
                              key={f.name}
                              onClick={() => setSelectedFile(f)}
                              style={{
                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                padding: "14px 18px", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "10px", cursor: "pointer",
                                backgroundColor: selectedFile?.name === f.name ? "rgba(0, 242, 254, 0.04)" : "rgba(255, 255, 255, 0.01)",
                                borderColor: selectedFile?.name === f.name ? "#00f2fe" : "rgba(255, 255, 255, 0.05)",
                                transition: "all 0.2s"
                              }}
                            >
                              <div>
                                <div style={{ fontSize: "13px", fontWeight: "700", color: selectedFile?.name === f.name ? "#00f2fe" : "#ffffff" }}>{f.name}</div>
                                <div style={{ fontSize: "11px", color: "#8a8a93", marginTop: "4px" }}>{f.desc}</div>
                              </div>
                              <span className="premium-badge badge-cyan" style={{ textTransform: "none" }}>AI Explained</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* File Details Panel */}
                      {selectedFile && (
                        <div className="premium-card" onMouseMove={handleCardMouseMove} style={{ padding: "24px" }}>
                          <h4 style={{ fontSize: "14px", fontWeight: "800", margin: "0 0 16px 0", color: "#ffffff" }}>Smart Code Viewer: {selectedFile.name}</h4>
                          
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                            <div style={{ backgroundColor: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", padding: "14px", borderRadius: "10px" }}>
                              <div style={{ fontSize: "11px", color: "#8a8a93", textTransform: "uppercase", fontWeight: "700", marginBottom: "6px", letterSpacing: "0.05em" }}>File Purpose</div>
                              <p style={{ fontSize: "13px", margin: 0, color: "#d1d5db", lineHeight: "1.4" }}>Handles request routing flow and hydration parameters safely.</p>
                            </div>
                            <div style={{ backgroundColor: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", padding: "14px", borderRadius: "10px" }}>
                              <div style={{ fontSize: "11px", color: "#8a8a93", textTransform: "uppercase", fontWeight: "700", marginBottom: "6px", letterSpacing: "0.05em" }}>Risk level</div>
                              <p style={{ fontSize: "13px", margin: 0, color: "#10b981", fontWeight: "600" }}>Low Risk. Scoped cleanly.</p>
                            </div>
                          </div>

                          <button
                            onClick={() => { setWorkspaceTarget(selectedFile.name); handleWorkspaceExplain(selectedFile.name); setActiveTab("workspace"); }}
                            className="premium-btn premium-btn-primary"
                          >
                            Inspect in AI Workspace
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ flex: "3 1 500px", padding: "48px", textAlign: "center", color: "#8a8a93" }} className="premium-card">
                      Select a repository to explore files and commit rationales.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. AI WORKSPACE */}
            {activeTab === "workspace" && (
              <div className="animate-slide-up">
                <h3 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 20px 0", letterSpacing: "-0.02em" }}>AI Workspace Inspector</h3>
                
                <div className="premium-card" onMouseMove={handleCardMouseMove} style={{ padding: "24px", marginBottom: "24px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#8a8a93", display: "block", marginBottom: "10px", letterSpacing: "0.08em" }}>
                    Select Target Node (File, Folder, Commit or Branch)
                  </label>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <input
                      type="text"
                      placeholder="e.g. server/controllers/authController.js"
                      value={workspaceTarget}
                      onChange={(e) => setWorkspaceTarget(e.target.value)}
                      className="premium-input"
                    />
                    <button
                      onClick={() => handleWorkspaceExplain(workspaceTarget)}
                      className="premium-btn premium-btn-primary"
                      style={{ whiteSpace: "nowrap" }}
                    >
                      Analyze Target
                    </button>
                  </div>
                </div>

                {workspaceLoading ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
                    <LoadingSpinner />
                  </div>
                ) : workspaceAnalysis ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
                      <div className="premium-card" onMouseMove={handleCardMouseMove} style={{ padding: "20px" }}>
                        <div style={{ fontSize: "11px", color: "#8a8a93", textTransform: "uppercase", fontWeight: "700", marginBottom: "8px", letterSpacing: "0.05em" }}>Purpose</div>
                        <p style={{ fontSize: "13px", color: "#d1d5db", margin: 0, lineHeight: "1.5" }}>{workspaceAnalysis.purpose}</p>
                      </div>
                      <div className="premium-card" onMouseMove={handleCardMouseMove} style={{ padding: "20px" }}>
                        <div style={{ fontSize: "11px", color: "#8a8a93", textTransform: "uppercase", fontWeight: "700", marginBottom: "8px", letterSpacing: "0.05em" }}>Logical rationale</div>
                        <p style={{ fontSize: "13px", color: "#d1d5db", margin: 0, lineHeight: "1.5" }}>{workspaceAnalysis.logic}</p>
                      </div>
                      <div className="premium-card" onMouseMove={handleCardMouseMove} style={{ padding: "20px" }}>
                        <div style={{ fontSize: "11px", color: "#8a8a93", textTransform: "uppercase", fontWeight: "700", marginBottom: "8px", letterSpacing: "0.05em" }}>Business Reason</div>
                        <p style={{ fontSize: "13px", color: "#d1d5db", margin: 0, lineHeight: "1.5" }}>{workspaceAnalysis.businessReason}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "48px", textAlign: "center", color: "#8a8a93" }} className="premium-card">
                    Enter any folder path or file to trigger deep semantic AI context analyzer.
                  </div>
                )}
              </div>
            )}

            {/* 6. AI CHAT */}
            {activeTab === "chat" && (
              <div style={{ height: "calc(100vh - 140px)", display: "flex", flexDirection: "column" }} className="animate-slide-up">
                <div style={{ display: "flex", justify: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: "16px", marginBottom: "20px" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "800", margin: 0, letterSpacing: "-0.02em" }}>Workspace AI Chat</h3>
                  <span className="premium-badge badge-emerald">SSO scope enabled</span>
                </div>

                {/* Messages area */}
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px", paddingRight: "8px", marginBottom: "20px" }}>
                  {chatMessages.map((msg, index) => (
                    <div
                      key={index}
                      style={{
                        alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                        maxWidth: "75%",
                        background: msg.role === "user" ? "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)" : "rgba(255, 255, 255, 0.02)",
                        border: msg.role === "user" ? "none" : "1px solid rgba(255, 255, 255, 0.05)",
                        color: msg.role === "user" ? "#000000" : "#d1d5db",
                        padding: "14px 18px",
                        borderRadius: "14px",
                        fontSize: "13px",
                        lineHeight: "1.6",
                        fontWeight: msg.role === "user" ? "600" : "400",
                        boxShadow: msg.role === "user" ? "0 4px 15px rgba(0, 242, 254, 0.15)" : "none"
                      }}
                    >
                      {msg.text}
                    </div>
                  ))}
                </div>

                {/* Chat input */}
                <form onSubmit={handleSendChat} style={{ display: "flex", gap: "12px" }}>
                  <input
                    type="text"
                    placeholder="Explain Auth Flow or SQL parameters..."
                    value={chatQuery}
                    onChange={(e) => setChatQuery(e.target.value)}
                    className="premium-input"
                  />
                  <button
                    type="submit"
                    className="premium-btn premium-btn-primary"
                    style={{ padding: "0 24px" }}
                  >
                    <Send size={15} />
                  </button>
                </form>
              </div>
            )}

            {/* 7. KNOWLEDGE HUB */}
            {activeTab === "hub" && (
              <div className="animate-slide-up">
                <h3 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 20px 0", letterSpacing: "-0.02em" }}>Knowledge Hub</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  <div className="premium-card" onMouseMove={handleCardMouseMove}>
                    <h4 style={{ fontSize: "14px", fontWeight: "800", color: "#00f2fe", margin: "0 0 10px 0" }}>System Architecture</h4>
                    <p style={{ fontSize: "13px", color: "#d1d5db", lineHeight: "1.6", margin: 0 }}>
                      {knowledge?.architecture}
                    </p>
                  </div>
                  <div className="premium-card" onMouseMove={handleCardMouseMove}>
                    <h4 style={{ fontSize: "14px", fontWeight: "800", color: "#00f2fe", margin: "0 0 10px 0" }}>Business Logic</h4>
                    <p style={{ fontSize: "13px", color: "#d1d5db", lineHeight: "1.6", margin: 0 }}>
                      {knowledge?.businessLogic}
                    </p>
                  </div>
                  <div className="premium-card" onMouseMove={handleCardMouseMove}>
                    <h4 style={{ fontSize: "14px", fontWeight: "800", color: "#00f2fe", margin: "0 0 10px 0" }}>Design Decisions</h4>
                    <p style={{ fontSize: "13px", color: "#d1d5db", lineHeight: "1.6", margin: 0 }}>
                      {knowledge?.designDecisions}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 8. DOCUMENTATION */}
            {activeTab === "docs" && (
              <div className="animate-slide-up">
                <h3 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 20px 0", letterSpacing: "-0.02em" }}>Interactive API Documentation</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {[
                    { method: "POST", path: "/api/auth/employee-login", desc: "Passwordless workspace login key validation" },
                    { method: "GET", path: "/api/employee/stats", desc: "Calculates total commits and active repository scores" },
                    { method: "GET", path: "/api/repositories/github-list", desc: "List candidate repos from linked GitHub profile" }
                  ].map((api) => (
                    <div key={api.path} className="premium-card" onMouseMove={handleCardMouseMove} style={{ padding: "20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                        <span className={`premium-badge ${api.method === "POST" ? "badge-purple" : "badge-emerald"}`}>
                          {api.method}
                        </span>
                        <code style={{ fontSize: "13px", color: "#ffffff", fontWeight: "600" }}>{api.path}</code>
                      </div>
                      <p style={{ fontSize: "12px", color: "#8a8a93", margin: 0 }}>{api.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 9. CODE SEARCH */}
            {activeTab === "search" && (
              <div className="animate-slide-up">
                <h3 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 20px 0", letterSpacing: "-0.02em" }}>Semantic Code Search</h3>
                <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
                  <input
                    type="text"
                    placeholder="e.g. JWT token middleware verify..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="premium-input"
                  />
                  <button type="submit" className="premium-btn premium-btn-primary" style={{ whiteSpace: "nowrap" }}>
                    Search
                  </button>
                </form>

                {searchLoading ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
                    <LoadingSpinner />
                  </div>
                ) : searchResults ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {searchResults.map((res) => (
                      <div key={res.path} className="premium-card" onMouseMove={handleCardMouseMove} style={{ padding: "20px" }}>
                        <div className="premium-badge badge-purple" style={{ marginBottom: "10px" }}>{res.type}</div>
                        <code style={{ fontSize: "13px", color: "#00f2fe", display: "block", marginBottom: "10px" }}>{res.path}</code>
                        <div style={{ backgroundColor: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.05)", padding: "14px", borderRadius: "8px", overflowX: "auto" }}>
                          {res.matches.map((m, i) => <pre key={i} style={{ fontSize: "12px", margin: 0, color: "#ffffff", fontFamily: "monospace" }}>{m}</pre>)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: "48px", textAlign: "center", color: "#8a8a93" }} className="premium-card">
                    Run semantic queries to search logic blocks across all workspaces.
                  </div>
                )}
              </div>
            )}

            {/* 10. DEPENDENCY GRAPH */}
            {activeTab === "graph" && (
              <div className="animate-slide-up">
                <h3 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>Dependency Graph</h3>
                <p style={{ fontSize: "13px", color: "#8a8a93", margin: "0 0 24px 0" }}>Click on any microservice block to audit owner nodes and risk telemetry.</p>

                <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                  <div 
                    className="premium-card" 
                    onMouseMove={handleCardMouseMove}
                    style={{
                      flex: "2 1 400px", display: "flex", flexDirection: "column",
                      alignItems: "center", gap: "16px", minHeight: "320px", justifyContent: "center"
                    }}
                  >
                    {[
                      { id: "front", label: "Vite Client SPA", type: "Frontend" },
                      { id: "gateway", label: "SSO Gateway", type: "Security" },
                      { id: "auth", label: "Auth Controller", type: "Service" },
                      { id: "redis", label: "Redis Cache", type: "Cache" }
                    ].map((node, index, arr) => (
                      <React.Fragment key={node.id}>
                        <div
                          onClick={() => setSelectedNode(node)}
                          style={{
                            width: "200px", 
                            backgroundColor: selectedNode?.id === node.id ? "rgba(0, 242, 254, 0.05)" : "rgba(255,255,255,0.01)", 
                            border: "1px solid",
                            borderColor: selectedNode?.id === node.id ? "#00f2fe" : "rgba(255, 255, 255, 0.08)",
                            borderRadius: "10px", 
                            padding: "14px", 
                            textAlign: "center", 
                            cursor: "pointer",
                            transition: "all 0.2s",
                            boxShadow: selectedNode?.id === node.id ? "0 0 15px rgba(0, 242, 254, 0.15)" : "none"
                          }}
                        >
                          <div style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff" }}>{node.label}</div>
                          <div style={{ fontSize: "10px", color: "#8a8a93", textTransform: "uppercase", marginTop: "6px", fontWeight: "700" }}>{node.type}</div>
                        </div>
                        {index < arr.length - 1 && (
                          <div style={{
                            width: "2px",
                            height: "16px",
                            background: "linear-gradient(180deg, #00f2fe, #8b5cf6)",
                            opacity: 0.5,
                            margin: "-8px 0"
                          }} />
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="premium-card" onMouseMove={handleCardMouseMove} style={{ flex: "1 1 240px", height: "fit-content" }}>
                    <h4 style={{ fontSize: "11px", textTransform: "uppercase", color: "#8a8a93", margin: "0 0 16px 0", letterSpacing: "0.05em", fontWeight: "700" }}>Node Inspector</h4>
                    {selectedNode ? (
                      <div>
                        <h5 style={{ fontSize: "15px", fontWeight: "800", margin: "0 0 12px 0", color: "#ffffff" }}>{selectedNode.label}</h5>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "12px", color: "#a1a1aa" }}>
                          <div>👥 <strong>Owner:</strong> <span style={{ color: "#ffffff" }}>{profile?.name || "Saavi"}</span></div>
                          <div>🔧 <strong>Last modified:</strong> <span style={{ color: "#ffffff" }}>2 hours ago</span></div>
                          <div>⚠️ <strong>Risk Level:</strong> <span className="premium-badge badge-emerald">low risk</span></div>
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: "12px", color: "#8a8a93", margin: 0 }}>Click any graph block to audit its properties.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 11. MY ANALYTICS */}
            {activeTab === "analytics" && (
              <div className="animate-slide-up">
                <h3 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 20px 0", letterSpacing: "-0.02em" }}>Personal Engineering Growth</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "24px" }}>
                  <div className="premium-card" onMouseMove={handleCardMouseMove}>
                    <h4 style={{ fontSize: "11px", textTransform: "uppercase", color: "#8a8a93", margin: "0 0 12px 0", fontWeight: "700", letterSpacing: "0.05em" }}>Total Commits</h4>
                    <span style={{ fontSize: "36px", fontWeight: "800", color: "#ffffff" }}>{analytics?.commits}</span>
                  </div>
                  <div className="premium-card" onMouseMove={handleCardMouseMove}>
                    <h4 style={{ fontSize: "11px", textTransform: "uppercase", color: "#8a8a93", margin: "0 0 12px 0", fontWeight: "700", letterSpacing: "0.05em" }}>PRs Completed</h4>
                    <span style={{ fontSize: "36px", fontWeight: "800", color: "#ffffff" }}>{analytics?.prs}</span>
                  </div>
                  <div className="premium-card" onMouseMove={handleCardMouseMove}>
                    <h4 style={{ fontSize: "11px", textTransform: "uppercase", color: "#8a8a93", margin: "0 0 12px 0", fontWeight: "700", letterSpacing: "0.05em" }}>Lines Added</h4>
                    <span style={{ fontSize: "36px", fontWeight: "800", color: "#ffffff" }}>{analytics?.linesAdded}</span>
                  </div>
                  <div className="premium-card" onMouseMove={handleCardMouseMove}>
                    <h4 style={{ fontSize: "11px", textTransform: "uppercase", color: "#8a8a93", margin: "0 0 12px 0", fontWeight: "700", letterSpacing: "0.05em" }}>AI Suggestions Accepted</h4>
                    <span style={{ fontSize: "36px", fontWeight: "800", color: "#ffffff" }}>{analytics?.aiSuggestionsAccepted}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* 12. CHANGE TIMELINE */}
            {activeTab === "timeline" && (
              <div className="animate-slide-up">
                <h3 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 20px 0", letterSpacing: "-0.02em" }}>Change Timeline</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {timeline?.length === 0 ? (
                    <div style={{ padding: "48px", textAlign: "center", color: "#8a8a93" }} className="premium-card">
                      No timeline elements found.
                    </div>
                  ) : (
                    timeline?.map((ver, i) => (
                      <div key={i} className="premium-card" onMouseMove={handleCardMouseMove} style={{ padding: "24px" }}>
                        <div style={{ display: "flex", justify: "space-between", alignItems: "center", marginBottom: "12px" }}>
                          <span className="premium-badge badge-cyan" style={{ fontSize: "12px", textTransform: "none", padding: "4px 12px" }}>{ver.version}</span>
                          <span style={{ fontSize: "12px", color: "#8a8a93" }}>{new Date(ver.date).toLocaleDateString()} by {ver.developer}</span>
                        </div>
                        <p style={{ fontSize: "14px", color: "#ffffff", margin: "0 0 16px 0", lineHeight: "1.5" }}>{ver.reason}</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px", color: "#a1a1aa", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "12px" }}>
                          <div>💼 <strong>Business Context:</strong> <span style={{ color: "#ffffff" }}>{ver.businessContext}</span></div>
                          <div>🔧 <strong>Architecture:</strong> <span style={{ color: "#ffffff" }}>{ver.architectureDecision}</span></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 13. PULL REQUESTS */}
            {activeTab === "prs" && (
              <div className="animate-slide-up">
                <h3 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 20px 0", letterSpacing: "-0.02em" }}>Pull Requests</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {[
                    { id: "#431", title: "Enterprise SSO Callback validation", status: "Needs Review", branch: "feature/sso-validation" },
                    { id: "#429", title: "Redis connection pool parameters setup", status: "Merged", branch: "hotfix/redis-pool" }
                  ].map((pr) => (
                    <div key={pr.id} className="premium-card" onMouseMove={handleCardMouseMove} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px" }}>
                      <div>
                        <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#ffffff", margin: "0 0 6px 0" }}>{pr.title}</h4>
                        <span style={{ fontSize: "12px", color: "#8a8a93" }}>{pr.id} • <code style={{ color: "#00f2fe" }}>{pr.branch}</code></span>
                      </div>
                      <span className={`premium-badge ${pr.status === "Merged" ? "badge-emerald" : "badge-amber"}`} style={{ padding: "4px 12px" }}>
                        {pr.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 14. ASSIGNED TASKS */}
            {activeTab === "tasks" && (
              <div className="animate-slide-up">
                <h3 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 20px 0", letterSpacing: "-0.02em" }}>My Assigned Tasks</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div className="premium-card" onMouseMove={handleCardMouseMove} style={{ padding: "24px" }}>
                    <div style={{ display: "flex", justify: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <span style={{ fontSize: "14px", fontWeight: "800", color: "#ffffff" }}>CM-89: Verify passwordless employee route</span>
                      <span className="premium-badge badge-rose" style={{ padding: "4px 12px" }}>High Priority</span>
                    </div>
                    <p style={{ fontSize: "13px", color: "#a1a1aa", margin: "0 0 20px 0", lineHeight: "1.5" }}>Ensure error codes match payload specifications cleanly.</p>
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "16px" }}>
                      <div style={{ fontSize: "11px", color: "#8a8a93", textTransform: "uppercase", fontWeight: "700", marginBottom: "6px", letterSpacing: "0.05em" }}>AI Suggested Files:</div>
                      <code style={{ fontSize: "12px", color: "#00f2fe" }}>server/controllers/authController.js</code>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 15. SETTINGS */}
            {activeTab === "settings" && (
              <div className="animate-slide-up">
                <h3 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 20px 0", letterSpacing: "-0.02em" }}>Employee settings</h3>
                <div className="premium-card" onMouseMove={handleCardMouseMove} style={{ padding: "32px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#8a8a93", display: "block", marginBottom: "10px", letterSpacing: "0.08em" }}>Theme Mode</label>
                      <select style={{ background: "rgba(10,10,10,0.6)", border: "1px solid rgba(255,255,255,0.08)", color: "#ffffff", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", width: "100%", outline: "none" }}>
                        <option>Dark Mode (Default)</option>
                        <option>AMOLED Midnight</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#8a8a93", display: "block", marginBottom: "8px", letterSpacing: "0.08em" }}>Keyboard Shortcuts</label>
                      <div style={{ fontSize: "12px", color: "#a1a1aa", backgroundColor: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", padding: "14px", borderRadius: "8px" }}>
                        <div>Press <kbd style={{ background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", margin: "0 4px" }}>Ctrl + /</kbd> to trigger AI chat from any workspace panel.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Teammate Detail Drawer/Modal Overlay */}
      {selectedTeammateId && (
        <>
          <div className="drawer-backdrop" onClick={() => setSelectedTeammateId(null)} />
          <div className="drawer-content">
            {loadingTeammateDetail ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh" }}>
                <LoadingSpinner />
              </div>
            ) : teammateDetail ? (
              <div>
                {/* Close Button */}
                <button
                  onClick={() => setSelectedTeammateId(null)}
                  style={{
                    position: "absolute", top: "24px", right: "24px", background: "none",
                    border: "none", color: "#8a8a93", cursor: "pointer", fontSize: "20px", transition: "color 0.2s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#ffffff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#8a8a93"; }}
                >
                  ✕
                </button>

                {/* Profile Card */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
                  <div style={{
                    width: "56px", height: "56px", borderRadius: "50%",
                    background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "900", color: "#000000",
                    boxShadow: "0 0 15px rgba(0, 242, 254, 0.3)"
                  }}>
                    {teammateDetail.profile.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ fontSize: "18px", fontWeight: "800", margin: 0, color: "#ffffff" }}>{teammateDetail.profile.name}</h3>
                    <p style={{ fontSize: "13px", color: "#8a8a93", margin: "4px 0 0 0" }}>
                      {teammateDetail.profile.designation} • {teammateDetail.profile.companyName}
                    </p>
                  </div>
                </div>

                {/* AI Expert Profile Summary */}
                <div 
                  className="premium-card"
                  style={{
                    borderLeft: "4px solid #00f2fe",
                    background: "linear-gradient(90deg, rgba(0, 242, 254, 0.02) 0%, rgba(10, 10, 10, 0.45) 100%)",
                    padding: "20px",
                    marginBottom: "28px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#00f2fe", marginBottom: "10px" }}>
                    <Sparkles size={14} />
                    <span style={{ fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.05em" }}>AI Team Insight</span>
                  </div>
                  <p style={{ fontSize: "13px", color: "#d1d5db", lineHeight: "1.6", margin: 0 }}>
                    {teammateDetail.aiSummary}
                  </p>
                </div>

                {/* Repositories */}
                <div style={{ marginBottom: "28px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "800", textTransform: "uppercase", color: "#8a8a93", display: "block", marginBottom: "12px", letterSpacing: "0.05em" }}>
                    Assigned Repositories
                  </span>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {teammateDetail.repositories.map((repo, idx) => (
                      <span
                        key={idx}
                        className="premium-badge badge-purple"
                        style={{ padding: "4px 10px", fontSize: "12px", textTransform: "none" }}
                      >
                        {repo}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Recent Commits */}
                <div>
                  <span style={{ fontSize: "11px", fontWeight: "800", textTransform: "uppercase", color: "#8a8a93", display: "block", marginBottom: "16px", letterSpacing: "0.05em" }}>
                    Recent Contributions
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {teammateDetail.commits.map((c) => (
                      <div key={c.sha} className="premium-card" style={{ padding: "16px" }}>
                        <div style={{ display: "flex", justify: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <code style={{ fontSize: "12px", color: "#00f2fe" }}>{c.sha}</code>
                          <span className="premium-badge badge-cyan" style={{ fontSize: "10px", textTransform: "none" }}>{c.repo}</span>
                        </div>
                        <p style={{ fontSize: "13px", color: "#ffffff", margin: 0, lineHeight: "1.4" }}>{c.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ color: "#8a8a93", fontSize: "13px" }}>Teammate details unavailable.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

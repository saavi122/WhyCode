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

export default function EmployeeDashboard() {
  const { logout } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

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
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#0a0f1e",
      color: "#f9fafb",
      fontFamily: "'Inter', sans-serif",
      display: "flex"
    }}>
      {/* Sidebar */}
      <aside style={{
        width: "250px",
        backgroundColor: "#0d1424",
        borderRight: "1px solid #1f2937",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "24px 16px",
        boxSizing: "border-box",
        position: "sticky",
        top: 0,
        height: "100vh",
        zIndex: 10
      }}>
        <div style={{ overflowY: "auto", flex: 1, paddingRight: "4px" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px", paddingLeft: "10px" }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "6px",
              background: "linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: "900", color: "#fff", fontSize: "14px"
            }}>
              C
            </div>
            <span style={{ fontSize: "15px", fontWeight: "900", letterSpacing: "-0.03em" }}>CodeMemory Workspace</span>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <button onClick={() => setActiveTab("dashboard")} style={navItemStyle("dashboard")}>
              <Sliders size={14} /> <span>Workspace</span>
            </button>
            <button onClick={() => setActiveTab("invitations")} style={navItemStyle("invitations")}>
              <Mail size={14} /> <span>Invitations</span>
            </button>
            <button onClick={() => setActiveTab("team")} style={navItemStyle("team")}>
              <Users size={14} /> <span>👥 Team</span>
            </button>
            <button onClick={() => setActiveTab("projects")} style={navItemStyle("projects")}>
              <Folder size={14} /> <span>My Projects</span>
            </button>
            <button onClick={() => setActiveTab("repositories")} style={navItemStyle("repositories")}>
              <GitFork size={14} /> <span>My Repositories</span>
            </button>
            <button onClick={() => setActiveTab("workspace")} style={navItemStyle("workspace")}>
              <Sparkles size={14} /> <span>AI Workspace</span>
            </button>
            <button onClick={() => setActiveTab("chat")} style={navItemStyle("chat")}>
              <MessageSquare size={14} /> <span>AI Chat</span>
            </button>
            <button onClick={() => setActiveTab("hub")} style={navItemStyle("hub")}>
              <BookOpen size={14} /> <span>Knowledge Hub</span>
            </button>
            <button onClick={() => setActiveTab("docs")} style={navItemStyle("docs")}>
              <FileText size={14} /> <span>Documentation</span>
            </button>
            <button onClick={() => setActiveTab("search")} style={navItemStyle("search")}>
              <Search size={14} /> <span>Code Search</span>
            </button>
            <button onClick={() => setActiveTab("graph")} style={navItemStyle("graph")}>
              <Layers size={14} /> <span>Dependency Graph</span>
            </button>
            <button onClick={() => setActiveTab("analytics")} style={navItemStyle("analytics")}>
              <TrendingUp size={14} /> <span>My Analytics</span>
            </button>
            <button onClick={() => setActiveTab("timeline")} style={navItemStyle("timeline")}>
              <Clock size={14} /> <span>Change Timeline</span>
            </button>
            <button onClick={() => setActiveTab("prs")} style={navItemStyle("prs")}>
              <Share2 size={14} /> <span>Pull Requests</span>
            </button>
            <button onClick={() => setActiveTab("tasks")} style={navItemStyle("tasks")}>
              <CheckCircle size={14} /> <span>Assigned Tasks</span>
            </button>
            <button onClick={() => setActiveTab("settings")} style={navItemStyle("settings")}>
              <Settings size={14} /> <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* User Badge */}
        <div style={{ marginTop: "16px", borderTop: "1px solid #1f2937", paddingTop: "16px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "10px", padding: "8px",
            backgroundColor: "rgba(255,255,255,0.01)", border: "1px solid #1f2937", borderRadius: "10px", marginBottom: "12px"
          }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: "linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#fff", fontWeight: "800"
            }}>
              {profile?.initials || "EM"}
            </div>
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <p style={{ fontSize: "11px", fontWeight: "700", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {profile?.name}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#10b981" }} />
                <span style={{ fontSize: "9px", textTransform: "uppercase", color: "#6b7280", fontWeight: "800" }}>
                  {profile?.designation} • {profile?.companyName}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px",
              borderRadius: "6px", border: "1px solid #1f2937", background: "none", color: "#6b7280",
              fontSize: "12px", fontWeight: "700", cursor: "pointer", transition: "color 0.2s"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#6b7280"; e.currentTarget.style.borderColor = "#1f2937"; }}
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Workspace Panel Viewports */}
      <main style={{ flexGrow: 1, padding: "32px", boxSizing: "border-box", overflowY: "auto", height: "100vh" }}>
        {isLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh" }}>
            <LoadingSpinner size="large" />
          </div>
        ) : (
          <div>
            {/* 1. DASHBOARD OVERVIEW */}
            {activeTab === "dashboard" && (
              <div>
                <div style={{ marginBottom: "28px" }}>
                  <h2 style={{ fontSize: "20px", fontWeight: "900", margin: "0 0 4px 0", letterSpacing: "-0.02em" }}>
                    Good Morning, {profile?.name?.split(" ")[0]} 💻
                  </h2>
                  <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>CodeMemory indexed software engineering environment.</p>
                </div>

                {/* AI Summary Banner */}
                {dashboard?.aiSummary && (
                  <div style={{
                    backgroundColor: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.15)",
                    borderRadius: "12px", padding: "18px 24px", marginBottom: "28px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#06b6d4", marginBottom: "10px" }}>
                      <Sparkles size={16} />
                      <span style={{ fontSize: "12px", fontWeight: "800", textTransform: "uppercase" }}>Yesterday's AI Summary</span>
                    </div>
                    <p style={{ fontSize: "13px", color: "#d1d5db", lineHeight: "1.6", margin: 0 }}>
                      {dashboard.aiSummary.text}
                    </p>
                    <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "8px" }}>
                      Last generated: {dashboard.aiSummary.lastGenerated}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px", marginBottom: "28px" }}>
                  <StatCard icon={Folder} value={dashboard?.totalRooms || 0} label="Assigned Projects" accentColor="#06b6d4" />
                  <StatCard icon={GitFork} value={dashboard?.totalRepos || 0} label="Tracked Repositories" accentColor="#6366f1" />
                  <StatCard icon={Terminal} value={dashboard?.totalCommits || 0} label="Analyzed Commits" accentColor="#10b981" />
                  <StatCard icon={ShieldCheck} value={`${dashboard?.avgDocHealth || 0}%`} label="Avg Code Health Score" accentColor="#8b5cf6" />
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
                  {/* Assigned Repositories */}
                  <div style={{ flex: "1 1 300px", backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "20px" }}>
                    <h3 style={{ fontSize: "13px", fontWeight: "800", margin: "0 0 16px 0", borderBottom: "1px solid #1f2937", paddingBottom: "10px" }}>Assigned Repositories</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {dashboard?.repos?.length === 0 ? (
                        <div style={{ fontSize: "12px", color: "#6b7280", padding: "10px 0" }}>No repositories linked.</div>
                      ) : (
                        dashboard?.repos?.map((repo) => (
                          <div key={repo._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#0a0f1e", padding: "10px 14px", borderRadius: "8px" }}>
                            <div>
                              <span style={{ fontSize: "12px", fontWeight: "700" }}>{repo.fullName}</span>
                              {repo.language && <span style={{ fontSize: "10px", color: "#6b7280", marginLeft: "8px" }}>● {repo.language}</span>}
                            </div>
                            <span style={{ fontSize: "10px", color: "#10b981", fontWeight: "800", backgroundColor: "rgba(16,185,129,0.06)", padding: "2px 8px", borderRadius: "12px" }}>
                              Active
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div style={{ flex: "1 1 300px", backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "20px" }}>
                    <h3 style={{ fontSize: "13px", fontWeight: "800", margin: "0 0 16px 0", borderBottom: "1px solid #1f2937", paddingBottom: "10px" }}>Recent Team Activity</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {activity?.length === 0 ? (
                        <div style={{ fontSize: "12px", color: "#6b7280", padding: "10px 0" }}>No recent commits analyzed yet.</div>
                      ) : (
                        activity?.map((act) => (
                          <div key={act._id} style={{ display: "flex", gap: "10px" }}>
                            <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#06b6d4", marginTop: "5px", flexShrink: 0 }} />
                            <div>
                              <p style={{ fontSize: "12px", margin: 0, fontWeight: "700" }}>
                                <strong>{act.developer}</strong>: {act.message}
                              </p>
                              <span style={{ fontSize: "10px", color: "#6b7280" }}>
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
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "900", margin: "0 0 16px 0" }}>Project Invitations</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {projects?.length === 0 ? (
                    <div style={{ padding: "40px", backgroundColor: "#111827", borderRadius: "12px", textAlign: "center", color: "#6b7280" }}>
                      No active projects. Ask your company owner to invite you.
                    </div>
                  ) : (
                    projects.map((project) => (
                      <div key={project._id} style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                          <div>
                            <h4 style={{ fontSize: "14px", fontWeight: "800", margin: "0 0 4px 0" }}>{project.name}</h4>
                            <span style={{ fontSize: "11px", color: "#6366f1", backgroundColor: "rgba(99,102,241,0.06)", padding: "2px 8px", borderRadius: "6px" }}>
                              {project.githubRepo}
                            </span>
                          </div>
                          <span style={{ fontSize: "10px", color: "#10b981", backgroundColor: "rgba(16,185,129,0.08)", padding: "3px 10px", borderRadius: "12px", fontWeight: "800" }}>
                            Assigned
                          </span>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px", fontSize: "12px", color: "#9ca3af" }}>
                          <div><strong>Workspace Manager:</strong> {project.manager}</div>
                          <div><strong>Timeline Expected:</strong> Q3 Release</div>
                          <div><strong>Stack:</strong> {project.techStack.join(", ")}</div>
                          <div><strong>Doc Coverage:</strong> {project.knowledgeScore}%</div>
                        </div>

                        <div style={{ display: "flex", gap: "10px" }}>
                          <button
                            style={{
                              backgroundColor: "#06b6d4", border: "none", color: "#fff",
                              padding: "8px 16px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "default"
                            }}
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
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "900", margin: "0 0 4px 0" }}>👥 Team Collaboration Workspace</h3>
                <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 24px 0" }}>
                  Teammates sharing repository permissions under the {profile?.companyName} organization.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
                  {teammates?.map((member) => (
                    <div
                      key={member._id}
                      style={{
                        backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "12px",
                        padding: "20px", display: "flex", flexDirection: "column", justify: "space-between", gap: "16px"
                      }}
                    >
                      <div>
                        {/* Member Header */}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                          <div style={{
                            width: "42px", height: "42px", borderRadius: "50%",
                            background: "linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)",
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "800", color: "#fff"
                          }}>
                            {member.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 style={{ fontSize: "13px", fontWeight: "800", margin: 0 }}>{member.name}</h4>
                            <span style={{ fontSize: "10px", color: "#6b7280" }}>{member.designation}</span>
                          </div>
                        </div>

                        {/* Stats */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "11px", color: "#9ca3af", marginBottom: "16px" }}>
                          <div>🔥 <strong>Knowledge:</strong> {member.knowledgeScore}%</div>
                          <div>💻 <strong>Commits:</strong> {member.totalCommits}</div>
                          <div>📝 <strong>PRs:</strong> {member.prs}</div>
                          <div>💬 <strong>Status:</strong> <span style={{ color: member.status === "online" ? "#10b981" : "#6b7280" }}>{member.status}</span></div>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <button
                          onClick={() => setSelectedTeammateId(member._id)}
                          style={{
                            width: "100%", backgroundColor: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)",
                            color: "#06b6d4", padding: "8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer"
                          }}
                        >
                          View Detailed Profile
                        </button>
                        <button
                          onClick={() => {
                            setChatQuery(`Who owns Checkout? Tell me about ${member.name}'s contributions.`);
                            setActiveTab("chat");
                          }}
                          style={{
                            width: "100%", backgroundColor: "transparent", border: "1px solid #374151",
                            color: "#9ca3af", padding: "8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer"
                          }}
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
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "900", margin: "0 0 16px 0" }}>My Assigned Projects</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
                  {projects?.length === 0 ? (
                    <div style={{ padding: "40px", backgroundColor: "#111827", borderRadius: "12px", textAlign: "center", color: "#6b7280" }}>
                      No projects assigned.
                    </div>
                  ) : (
                    projects?.map((project) => (
                      <div key={project._id} style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "20px" }}>
                        <h4 style={{ fontSize: "13px", fontWeight: "800", margin: "0 0 4px 0" }}>{project.name}</h4>
                        <code style={{ fontSize: "10px", color: "#06b6d4", display: "block", marginBottom: "16px" }}>{project.githubRepo}</code>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "11px", color: "#9ca3af", marginBottom: "16px" }}>
                          <div>📅 <strong>Sprint:</strong> {project.currentSprint}</div>
                          <div>📊 <strong>Tech:</strong> {project.techStack.join(", ")}</div>
                          <div>🔧 <strong>Health Score:</strong> {project.progress}%</div>
                          <div>💡 <strong>Knowledge coverage:</strong> {project.knowledgeScore}%</div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedRepo(repositories.find(r => r.fullName === project.githubRepo) || null);
                            setActiveTab("repositories");
                          }}
                          style={{
                            width: "100%", backgroundColor: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)",
                            color: "#06b6d4", padding: "8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer"
                          }}
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
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "900", margin: "0 0 16px 0" }}>Repository Explorer</h3>
                
                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                  {/* Repo list */}
                  <div style={{ flex: "1 1 220px", backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "16px" }}>
                    <h4 style={{ fontSize: "11px", textTransform: "uppercase", color: "#6b7280", margin: "0 0 12px 0" }}>Select Repository</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {repositories?.map((repo) => (
                        <button
                          key={repo._id}
                          onClick={() => { setSelectedRepo(repo); setSelectedFile(null); }}
                          style={{
                            display: "block", width: "100%", border: "none", padding: "8px 12px",
                            borderRadius: "6px", fontSize: "11px", textAlign: "left", cursor: "pointer",
                            backgroundColor: selectedRepo?._id === repo._id ? "rgba(6,182,212,0.08)" : "transparent",
                            color: selectedRepo?._id === repo._id ? "#06b6d4" : "#9ca3af",
                            fontWeight: selectedRepo?._id === repo._id ? "700" : "600"
                          }}
                        >
                          {repo.fullName}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* File Explorer & Viewer */}
                  {selectedRepo ? (
                    <div style={{ flex: "3 1 500px", display: "flex", flexDirection: "column", gap: "20px" }}>
                      {/* Repo Owner & Contributors block */}
                      <div style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "20px" }}>
                        <h4 style={{ fontSize: "12px", fontWeight: "800", color: "#06b6d4", margin: "0 0 12px 0" }}>
                          Repository Owner & Leadership
                        </h4>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "11px", color: "#9ca3af" }}>
                          <div>👑 <strong>Owner:</strong> {repoOwnership?.owner}</div>
                          <div>🔥 <strong>AI Knowledge Leader:</strong> {repoOwnership?.aiKnowledgeLeader}</div>
                        </div>

                        {/* Repository Members */}
                        <div style={{ marginTop: "16px" }}>
                          <span style={{ fontSize: "10px", fontWeight: "800", textTransform: "uppercase", color: "#6b7280", display: "block", marginBottom: "8px" }}>
                            Repository Teammates ({repoMembers?.length || 0})
                          </span>
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            {repoMembers?.map((m) => (
                              <span
                                key={m._id}
                                onClick={() => setSelectedTeammateId(m._id)}
                                style={{
                                  fontSize: "11px", color: "#06b6d4", backgroundColor: "rgba(6,182,212,0.06)",
                                  padding: "3px 10px", borderRadius: "12px", cursor: "pointer", fontWeight: "700"
                                }}
                              >
                                @{m.githubUsername || m.name.split(" ")[0]}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "20px" }}>
                        <div style={{ display: "flex", justify: "space-between", borderBottom: "1px solid #1f2937", paddingBottom: "12px", marginBottom: "16px" }}>
                          <span style={{ fontSize: "13px", fontWeight: "800" }}>{selectedRepo.fullName}</span>
                          <span style={{ fontSize: "11px", color: "#6b7280" }}>Health Score: {selectedRepo.docHealthScore}%</span>
                        </div>

                        {/* Files list */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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
                                padding: "10px 14px", border: "1px solid #1f2937", borderRadius: "8px", cursor: "pointer",
                                backgroundColor: selectedFile?.name === f.name ? "rgba(255,255,255,0.02)" : "#0a0f1e"
                              }}
                            >
                              <div>
                                <div style={{ fontSize: "12px", fontWeight: "700", color: "#f3f4f6" }}>{f.name}</div>
                                <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px" }}>{f.desc}</div>
                              </div>
                              <span style={{ fontSize: "10px", color: "#06b6d4" }}>AI Explained</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* File Details Panel */}
                      {selectedFile && (
                        <div style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "20px" }}>
                          <h4 style={{ fontSize: "13px", fontWeight: "800", margin: "0 0 12px 0" }}>Smart Code Viewer: {selectedFile.name}</h4>
                          
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                            <div style={{ backgroundColor: "#0a0f1e", padding: "12px", borderRadius: "8px" }}>
                              <div style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", fontWeight: "700", marginBottom: "4px" }}>File Purpose</div>
                              <p style={{ fontSize: "12px", margin: 0, color: "#d1d5db" }}>Handles request routing flow and hydration parameters safely.</p>
                            </div>
                            <div style={{ backgroundColor: "#0a0f1e", padding: "12px", borderRadius: "8px" }}>
                              <div style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", fontWeight: "700", marginBottom: "4px" }}>Risk level</div>
                              <p style={{ fontSize: "12px", margin: 0, color: "#10b981" }}>Low Risk. Scoped cleanly.</p>
                            </div>
                          </div>

                          <button
                            onClick={() => { setWorkspaceTarget(selectedFile.name); handleWorkspaceExplain(selectedFile.name); setActiveTab("workspace"); }}
                            style={{
                              backgroundColor: "#06b6d4", border: "none", color: "#fff",
                              padding: "8px 16px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer"
                            }}
                          >
                            Inspect in AI Workspace
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ flex: "3 1 500px", padding: "40px", backgroundColor: "#111827", borderRadius: "12px", textAlign: "center", color: "#6b7280" }}>
                      Select a repository to explore files and commit rationales.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. AI WORKSPACE */}
            {activeTab === "workspace" && (
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "900", margin: "0 0 16px 0" }}>AI Workspace Inspector</h3>
                
                <div style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "24px", marginBottom: "20px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#6b7280", display: "block", marginBottom: "8px" }}>
                    Select Target Node (File, Folder, Commit or Branch)
                  </label>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <input
                      type="text"
                      placeholder="e.g. server/controllers/authController.js"
                      value={workspaceTarget}
                      onChange={(e) => setWorkspaceTarget(e.target.value)}
                      style={{
                        flex: 1, backgroundColor: "#0a0f1e", border: "1px solid #374151",
                        borderRadius: "8px", padding: "10px 14px", color: "#fff", fontSize: "12px", outline: "none"
                      }}
                    />
                    <button
                      onClick={() => handleWorkspaceExplain(workspaceTarget)}
                      style={{
                        backgroundColor: "#06b6d4", border: "none", color: "#fff",
                        padding: "10px 20px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer"
                      }}
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
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                      <div style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "16px" }}>
                        <div style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", fontWeight: "700", marginBottom: "6px" }}>Purpose</div>
                        <p style={{ fontSize: "12px", color: "#d1d5db", margin: 0 }}>{workspaceAnalysis.purpose}</p>
                      </div>
                      <div style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "16px" }}>
                        <div style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", fontWeight: "700", marginBottom: "6px" }}>Logical rationale</div>
                        <p style={{ fontSize: "12px", color: "#d1d5db", margin: 0 }}>{workspaceAnalysis.logic}</p>
                      </div>
                      <div style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "16px" }}>
                        <div style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", fontWeight: "700", marginBottom: "6px" }}>Business Reason</div>
                        <p style={{ fontSize: "12px", color: "#d1d5db", margin: 0 }}>{workspaceAnalysis.businessReason}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "40px", backgroundColor: "#111827", borderRadius: "12px", textAlign: "center", color: "#6b7280" }}>
                    Enter any folder path or file to trigger deep semantic AI context analyzer.
                  </div>
                )}
              </div>
            )}

            {/* 6. AI CHAT */}
            {activeTab === "chat" && (
              <div style={{ height: "calc(100vh - 120px)", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justify: "space-between", borderBottom: "1px solid #1f2937", paddingBottom: "12px", marginBottom: "16px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "900", margin: 0 }}>Workspace AI Chat</h3>
                  <span style={{ fontSize: "11px", color: "#6b7280" }}>SSO scope enabled</span>
                </div>

                {/* Messages area */}
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", paddingRight: "8px", marginBottom: "16px" }}>
                  {chatMessages.map((msg, index) => (
                    <div
                      key={index}
                      style={{
                        alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                        maxWidth: "80%",
                        backgroundColor: msg.role === "user" ? "#06b6d4" : "#111827",
                        color: msg.role === "user" ? "#fff" : "#d1d5db",
                        padding: "10px 14px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        lineHeight: "1.5"
                      }}
                    >
                      {msg.text}
                    </div>
                  ))}
                </div>

                {/* Chat input */}
                <form onSubmit={handleSendChat} style={{ display: "flex", gap: "10px" }}>
                  <input
                    type="text"
                    placeholder="Explain Auth Flow or SQL parameters..."
                    value={chatQuery}
                    onChange={(e) => setChatQuery(e.target.value)}
                    style={{
                      flex: 1, backgroundColor: "#111827", border: "1px solid #374151",
                      borderRadius: "8px", padding: "12px 16px", color: "#fff", fontSize: "12px", outline: "none"
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      backgroundColor: "#06b6d4", border: "none", color: "#fff",
                      padding: "0 20px", borderRadius: "8px", fontWeight: "700", cursor: "pointer"
                    }}
                  >
                    <Send size={15} />
                  </button>
                </form>
              </div>
            )}

            {/* 7. KNOWLEDGE HUB */}
            {activeTab === "hub" && (
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "900", margin: "0 0 16px 0" }}>Knowledge Hub</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "20px" }}>
                    <h4 style={{ fontSize: "13px", fontWeight: "800", color: "#06b6d4", margin: "0 0 8px 0" }}>System Architecture</h4>
                    <p style={{ fontSize: "12px", color: "#d1d5db", lineHeight: "1.6", margin: 0 }}>
                      {knowledge?.architecture}
                    </p>
                  </div>
                  <div style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "20px" }}>
                    <h4 style={{ fontSize: "13px", fontWeight: "800", color: "#06b6d4", margin: "0 0 8px 0" }}>Business Logic</h4>
                    <p style={{ fontSize: "12px", color: "#d1d5db", lineHeight: "1.6", margin: 0 }}>
                      {knowledge?.businessLogic}
                    </p>
                  </div>
                  <div style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "20px" }}>
                    <h4 style={{ fontSize: "13px", fontWeight: "800", color: "#06b6d4", margin: "0 0 8px 0" }}>Design Decisions</h4>
                    <p style={{ fontSize: "12px", color: "#d1d5db", lineHeight: "1.6", margin: 0 }}>
                      {knowledge?.designDecisions}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 8. DOCUMENTATION */}
            {activeTab === "docs" && (
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "900", margin: "0 0 16px 0" }}>Interactive API Documentation</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {[
                    { method: "POST", path: "/api/auth/employee-login", desc: "Passwordless workspace login key validation" },
                    { method: "GET", path: "/api/employee/stats", desc: "Calculates total commits and active repository scores" },
                    { method: "GET", path: "/api/repositories/github-list", desc: "List candidate repos from linked GitHub profile" }
                  ].map((api) => (
                    <div key={api.path} style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                        <span style={{
                          fontSize: "10px", fontWeight: "900", padding: "3px 8px", borderRadius: "6px",
                          backgroundColor: api.method === "POST" ? "rgba(139,92,246,0.08)" : "rgba(16,185,129,0.08)",
                          color: api.method === "POST" ? "#8b5cf6" : "#10b981"
                        }}>
                          {api.method}
                        </span>
                        <code style={{ fontSize: "12px", color: "#fff" }}>{api.path}</code>
                      </div>
                      <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>{api.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 9. CODE SEARCH */}
            {activeTab === "search" && (
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "900", margin: "0 0 16px 0" }}>Semantic Code Search</h3>
                <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                  <input
                    type="text"
                    placeholder="e.g. JWT token middleware verify..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      flex: 1, backgroundColor: "#111827", border: "1px solid #374151",
                      borderRadius: "8px", padding: "10px 14px", color: "#fff", fontSize: "12px", outline: "none"
                    }}
                  />
                  <button type="submit" style={{ backgroundColor: "#06b6d4", border: "none", color: "#fff", padding: "0 20px", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>
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
                      <div key={res.path} style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "16px" }}>
                        <div style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", fontWeight: "700", marginBottom: "6px" }}>{res.type}</div>
                        <code style={{ fontSize: "11px", color: "#06b6d4" }}>{res.path}</code>
                        <div style={{ marginTop: "10px", backgroundColor: "#0a0f1e", padding: "8px 12px", borderRadius: "6px" }}>
                          {res.matches.map((m, i) => <pre key={i} style={{ fontSize: "11px", margin: 0, color: "#fff" }}>{m}</pre>)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: "40px", backgroundColor: "#111827", borderRadius: "12px", textAlign: "center", color: "#6b7280" }}>
                    Run semantic queries to search logic blocks across all workspaces.
                  </div>
                )}
              </div>
            )}

            {/* 10. DEPENDENCY GRAPH */}
            {activeTab === "graph" && (
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "900", margin: "0 0 4px 0" }}>Dependency Graph</h3>
                <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 20px 0" }}>Click on any microservice block to audit owner nodes and risk telemetry.</p>

                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                  <div style={{
                    flex: "2 1 400px", backgroundColor: "#111827", border: "1px solid #1f2937",
                    borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column",
                    alignItems: "center", gap: "16px", minHeight: "300px", justifyContent: "center"
                  }}>
                    {[
                      { id: "front", label: "Vite Client SPA", type: "Frontend" },
                      { id: "gateway", label: "SSO Gateway", type: "Security" },
                      { id: "auth", label: "Auth Controller", type: "Service" },
                      { id: "redis", label: "Redis Cache", type: "Cache" }
                    ].map((node) => (
                      <div
                        key={node.id}
                        onClick={() => setSelectedNode(node)}
                        style={{
                          width: "180px", backgroundColor: "#0a0f1e", border: "1px solid #374151",
                          borderRadius: "8px", padding: "12px", textAlign: "center", cursor: "pointer",
                          borderColor: selectedNode?.id === node.id ? "#06b6d4" : "#374151"
                        }}
                      >
                        <div style={{ fontSize: "12px", fontWeight: "700" }}>{node.label}</div>
                        <div style={{ fontSize: "9px", color: "#6b7280", textTransform: "uppercase", marginTop: "4px" }}>{node.type}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ flex: "1 1 240px", backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "20px" }}>
                    <h4 style={{ fontSize: "11px", textTransform: "uppercase", color: "#6b7280", margin: "0 0 12px 0" }}>Node Inspector</h4>
                    {selectedNode ? (
                      <div>
                        <h5 style={{ fontSize: "13px", fontWeight: "900", margin: "0 0 8px 0" }}>{selectedNode.label}</h5>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "11px" }}>
                          <div>👥 <strong>Owner:</strong> {profile?.name || "Saavi"}</div>
                          <div>🔧 <strong>Last modified:</strong> 2 hours ago</div>
                          <div>⚠️ <strong>Risk Level:</strong> low risk</div>
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>Click any graph block to audit its properties.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 11. MY ANALYTICS */}
            {activeTab === "analytics" && (
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "900", margin: "0 0 16px 0" }}>Personal Engineering Growth</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px", marginBottom: "20px" }}>
                  <div style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "20px" }}>
                    <h4 style={{ fontSize: "11px", textTransform: "uppercase", color: "#6b7280", margin: "0 0 12px 0" }}>Total Commits</h4>
                    <span style={{ fontSize: "28px", fontWeight: "900" }}>{analytics?.commits}</span>
                  </div>
                  <div style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "20px" }}>
                    <h4 style={{ fontSize: "11px", textTransform: "uppercase", color: "#6b7280", margin: "0 0 12px 0" }}>PRs Completed</h4>
                    <span style={{ fontSize: "28px", fontWeight: "900" }}>{analytics?.prs}</span>
                  </div>
                  <div style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "20px" }}>
                    <h4 style={{ fontSize: "11px", textTransform: "uppercase", color: "#6b7280", margin: "0 0 12px 0" }}>Lines of Code Added</h4>
                    <span style={{ fontSize: "28px", fontWeight: "900" }}>{analytics?.linesAdded}</span>
                  </div>
                  <div style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "20px" }}>
                    <h4 style={{ fontSize: "11px", textTransform: "uppercase", color: "#6b7280", margin: "0 0 12px 0" }}>AI Suggestions Accepted</h4>
                    <span style={{ fontSize: "28px", fontWeight: "900" }}>{analytics?.aiSuggestionsAccepted}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* 12. CHANGE TIMELINE */}
            {activeTab === "timeline" && (
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "900", margin: "0 0 16px 0" }}>Change Timeline</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {timeline?.length === 0 ? (
                    <div style={{ padding: "40px", backgroundColor: "#111827", borderRadius: "12px", textAlign: "center", color: "#6b7280" }}>
                      No timeline elements found.
                    </div>
                  ) : (
                    timeline?.map((ver, i) => (
                      <div key={i} style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "16px" }}>
                        <div style={{ display: "flex", justify: "space-between", marginBottom: "8px" }}>
                          <span style={{ fontSize: "12px", fontWeight: "800", color: "#06b6d4" }}>{ver.version}</span>
                          <span style={{ fontSize: "11px", color: "#6b7280" }}>{new Date(ver.date).toLocaleDateString()} by {ver.developer}</span>
                        </div>
                        <p style={{ fontSize: "12px", color: "#d1d5db", margin: "0 0 10px 0" }}>{ver.reason}</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", color: "#6b7280", borderTop: "1px solid #1f2937", paddingTop: "8px" }}>
                          <div>💼 <strong>Business Context:</strong> {ver.businessContext}</div>
                          <div>🔧 <strong>Architecture:</strong> {ver.architectureDecision}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 13. PULL REQUESTS */}
            {activeTab === "prs" && (
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "900", margin: "0 0 16px 0" }}>Pull Requests</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {[
                    { id: "#431", title: "Enterprise SSO Callback validation", status: "Needs Review", branch: "feature/sso-validation" },
                    { id: "#429", title: "Redis connection pool parameters setup", status: "Merged", branch: "hotfix/redis-pool" }
                  ].map((pr) => (
                    <div key={pr.id} style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h4 style={{ fontSize: "12px", fontWeight: "700", color: "#fff", margin: "0 0 4px 0" }}>{pr.title}</h4>
                        <span style={{ fontSize: "10px", color: "#6b7280" }}>{pr.id} • {pr.branch}</span>
                      </div>
                      <span style={{
                        fontSize: "9px", fontWeight: "900", padding: "3px 8px", borderRadius: "6px",
                        backgroundColor: pr.status === "Merged" ? "rgba(16,185,129,0.06)" : "rgba(234,179,8,0.06)",
                        color: pr.status === "Merged" ? "#10b981" : "#eab308"
                      }}>
                        {pr.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 14. ASSIGNED TASKS */}
            {activeTab === "tasks" && (
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "900", margin: "0 0 16px 0" }}>My Assigned Tasks</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "20px" }}>
                    <div style={{ display: "flex", justify: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "800" }}>CM-89: Verify passwordless employee route</span>
                      <span style={{ fontSize: "10px", color: "#ef4444", fontWeight: "800" }}>High Priority</span>
                    </div>
                    <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 16px 0" }}>Ensure error codes match standard payload specifications.</p>
                    <div style={{ borderTop: "1px solid #1f2937", paddingTop: "12px" }}>
                      <div style={{ fontSize: "10px", color: "#06b6d4", textTransform: "uppercase", fontWeight: "700", marginBottom: "4px" }}>AI Suggested Files:</div>
                      <code style={{ fontSize: "11px", color: "#d1d5db" }}>server/controllers/authController.js</code>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 15. SETTINGS */}
            {activeTab === "settings" && (
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "900", margin: "0 0 16px 0" }}>Employee settings</h3>
                <div style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "24px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#6b7280", display: "block", marginBottom: "6px" }}>Theme Mode</label>
                      <select style={{ backgroundColor: "#0a0f1e", border: "1px solid #374151", color: "#fff", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", width: "100%" }}>
                        <option>Dark Mode (Default)</option>
                        <option>AMOLED Midnight</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#6b7280", display: "block", marginBottom: "6px" }}>Keyboard Shortcuts</label>
                      <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                        <div>Press <code>Ctrl + /</code> to trigger AI chat from any workspace panel.</div>
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
        <div style={{
          position: "fixed", top: 0, right: 0, width: "420px", height: "100vh",
          backgroundColor: "#0d1424", borderLeft: "1px solid #1f2937", padding: "32px",
          boxSizing: "border-box", zIndex: 10000, overflowY: "auto", boxShadow: "-8px 0 24px rgba(0,0,0,0.5)"
        }}>
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
                  position: "absolute", top: "20px", right: "20px", background: "none",
                  border: "none", color: "#6b7280", cursor: "pointer", fontSize: "16px"
                }}
              >
                ✕
              </button>

              {/* Profile Card */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px" }}>
                <div style={{
                  width: "56px", height: "56px", borderRadius: "50%",
                  background: "linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "900", color: "#fff"
                }}>
                  {teammateDetail.profile.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: "900", margin: 0 }}>{teammateDetail.profile.name}</h3>
                  <p style={{ fontSize: "12px", color: "#6b7280", margin: "2px 0 0 0" }}>
                    {teammateDetail.profile.designation} • {teammateDetail.profile.companyName}
                  </p>
                </div>
              </div>

              {/* AI Expert Profile Summary */}
              <div style={{
                backgroundColor: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.15)",
                borderRadius: "12px", padding: "16px", marginBottom: "24px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#06b6d4", marginBottom: "8px" }}>
                  <Sparkles size={14} />
                  <span style={{ fontSize: "11px", fontWeight: "800", textTransform: "uppercase" }}>AI Team Insight</span>
                </div>
                <p style={{ fontSize: "12px", color: "#d1d5db", lineHeight: "1.5", margin: 0 }}>
                  {teammateDetail.aiSummary}
                </p>
              </div>

              {/* Repositories */}
              <div style={{ marginBottom: "24px" }}>
                <span style={{ fontSize: "11px", fontWeight: "800", textTransform: "uppercase", color: "#6b7280", display: "block", marginBottom: "8px" }}>
                  Assigned Repositories
                </span>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {teammateDetail.repositories.map((repo, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: "11px", color: "#fff", backgroundColor: "#1f2937",
                        padding: "4px 10px", borderRadius: "6px", fontWeight: "600"
                      }}
                    >
                      {repo}
                    </span>
                  ))}
                </div>
              </div>

              {/* Recent Commits */}
              <div>
                <span style={{ fontSize: "11px", fontWeight: "800", textTransform: "uppercase", color: "#6b7280", display: "block", marginBottom: "12px" }}>
                  Recent Contributions
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {teammateDetail.commits.map((c) => (
                    <div key={c.sha} style={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "8px", padding: "12px" }}>
                      <div style={{ display: "flex", justify: "space-between", marginBottom: "4px" }}>
                        <code style={{ fontSize: "11px", color: "#06b6d4" }}>{c.sha}</code>
                        <span style={{ fontSize: "10px", color: "#6b7280" }}>{c.repo}</span>
                      </div>
                      <p style={{ fontSize: "12px", color: "#d1d5db", margin: 0 }}>{c.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: "#6b7280", fontSize: "12px" }}>Teammate details unavailable.</p>
          )}
        </div>
      )}
    </div>
  );
}

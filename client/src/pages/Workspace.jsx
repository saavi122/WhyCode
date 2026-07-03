import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../context/ThemeContext";
import { useSprint } from "../context/SprintContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sliders, Users, Mail, GitFork, MessageSquare, Settings, CheckCircle2,
  Folder, Search, Sparkles, Send,
  Terminal, ShieldCheck, FileText, Share2, TrendingUp, LogOut, Play,
  Menu, X, ChevronLeft, ChevronRight, Flame, RefreshCw, Clock
} from "lucide-react";
import API from "../services/api";
import CodeWorkspace from "../components/CodeWorkspace";
import LoadingSpinner from "../components/LoadingSpinner";
import "./Workspace.css";

export default function Workspace() {
  const { logout, user } = useAuth();
  const { showToast } = useToast();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const { selectedRepoId, setSelectedRepoId, telemetry } = useSprint();

  const [activeTab, setActiveTab] = useState("overview");
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [fileLoading, setFileLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResults, setScanResults] = useState(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // QA state
  const [qaQuery, setQaQuery] = useState("");
  const [qaMessages, setQaMessages] = useState([
    { role: "assistant", text: "Welcome to the WhyCode QA system. Ask me questions about database schemas, API routers, or SSO callbacks." }
  ]);

  // Teammates details
  const [selectedTeammateId, setSelectedTeammateId] = useState(null);

  // Collapsible sidebar state
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("workspace_sidebar_collapsed") === "true");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const chatEndRef = useRef(null);

  // --- API queries ---
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["employeeProfile"],
    queryFn: async () => {
      const res = await API.get("/employee/profile");
      return res.data;
    }
  });

  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ["employeeDashboard"],
    queryFn: async () => {
      const res = await API.get("/employee/dashboard");
      return res.data;
    }
  });

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["employeeProjects"],
    queryFn: async () => {
      const res = await API.get("/employee/projects");
      return res.data;
    }
  });

  const { data: repositories, isLoading: reposLoading } = useQuery({
    queryKey: ["employeeRepositories"],
    queryFn: async () => {
      const res = await API.get("/employee/repositories");
      return res.data;
    }
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ["employeeActivity"],
    queryFn: async () => {
      const res = await API.get("/team/activity");
      return res.data;
    }
  });

  const { data: teammates, isLoading: teammatesLoading } = useQuery({
    queryKey: ["teamMembers"],
    queryFn: async () => {
      const res = await API.get("/team");
      return res.data;
    }
  });

  // Auto-select first repo
  useEffect(() => {
    if (repositories && repositories.length > 0 && !selectedRepoId) {
      setSelectedRepoId(repositories[0]._id);
    }
  }, [repositories, selectedRepoId, setSelectedRepoId]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [qaMessages]);

  // File list
  const filesList = [
    "server/app.js",
    "server/controllers/authController.js",
    "server/middleware/authMiddleware.js",
    "client/src/App.jsx"
  ];

  const handleSelectFile = (file) => {
    setSelectedFile(file);
    setFileLoading(true);
    setTimeout(() => {
      let code = "";
      if (file === "server/app.js") {
        code = `import express from "express";\nimport cors from "cors";\nimport dotenv from "dotenv";\nimport connectDB from "./config/db.js";\nimport authRoutes from "./routes/authRoutes.js";\n\nconst app = express();\napp.use(cors());\napp.use(express.json());\n\napp.use("/api/auth", authRoutes);\n\nconst PORT = process.env.PORT || 5000;\napp.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));`;
      } else if (file === "server/controllers/authController.js") {
        code = `import jwt from "jsonwebtoken";\nimport bcrypt from "bcryptjs";\nimport User from "../models/User.js";\n\nexport const register = async (req, res, next) => {\n  const { companyName, name, email, password } = req.body;\n  const hashedPassword = await bcrypt.hash(password, 12);\n  const user = await User.create({ name, email, password: hashedPassword });\n  res.status(201).json({ user });\n};\n\nexport const login = async (req, res, next) => {\n  const { email, password } = req.body;\n  const user = await User.findOne({ email });\n  if (!user) return res.status(401).json({ message: "Invalid credentials" });\n  const isValid = await bcrypt.compare(password, user.password);\n  if (!isValid) return res.status(401).json({ message: "Invalid credentials" });\n  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });\n  res.json({ token, user });\n};`;
      } else if (file === "server/middleware/authMiddleware.js") {
        code = `import jwt from "jsonwebtoken";\nimport User from "../models/User.js";\n\nconst protect = async (req, res, next) => {\n  const authHeader = req.headers.authorization;\n  if (!authHeader || !authHeader.startsWith("Bearer ")) {\n    return res.status(401).json({ message: "Not authorized" });\n  }\n  const token = authHeader.split(" ")[1];\n  const decoded = jwt.verify(token, process.env.JWT_SECRET);\n  req.user = { id: decoded.id };\n  next();\n};\n\nexport default protect;`;
      } else if (file === "client/src/App.jsx") {
        code = `import React from "react";\nimport { Routes, Route } from "react-router-dom";\nimport Landing from "./pages/LandingOS";\nimport Workspace from "./pages/Workspace";\n\nexport default function App() {\n  return (\n    <Routes>\n      <Route path="/" element={<Landing />} />\n      <Route path="/dashboard" element={<Workspace />} />\n    </Routes>\n  );\n}`;
      }
      setFileContent(code);
      setFileLoading(false);
    }, 450);
  };

  const handleRunScan = () => {
    setScanLoading(true);
    setScanResults(null);
    setTimeout(() => {
      setScanResults({
        status: "COMPLETED",
        score: 96,
        findings: [
          { severity: "LOW", title: "Missing HTTP Security headers", desc: "Recommendation: Configure helmet middleware." }
        ]
      });
      setScanLoading(false);
      showToast("Security scan completed!", "success");
    }, 1500);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setTimeout(() => {
      setSearchResults([
        { type: "Middleware", path: "server/middleware/authMiddleware.js", matches: ["const protect = async (req, res, next) =>"] },
        { type: "Controller", path: "server/controllers/authController.js", matches: ["export const login = async (req, res, next) =>"] }
      ]);
      setSearchLoading(false);
    }, 700);
  };

  const handleQaSubmit = async (e) => {
    e.preventDefault();
    if (!qaQuery.trim()) return;
    const q = qaQuery;
    setQaMessages(prev => [...prev, { role: "user", text: q }]);
    setQaQuery("");
    try {
      if (selectedRepoId) {
        const res = await API.post(`/chat/${selectedRepoId}`, { question: q });
        setQaMessages(prev => [...prev, { role: "assistant", text: res.data.answer }]);
      } else {
        setTimeout(() => {
          setQaMessages(prev => [...prev, { role: "assistant", text: "Please select a repository first to query active knowledge graphs." }]);
        }, 800);
      }
    } catch (err) {
      setQaMessages(prev => [...prev, { role: "assistant", text: "Error connecting to AI service." }]);
    }
  };

  const dashboardStats = dashboard || { totalRooms: 3, totalRepos: 1, totalCommits: 42, avgDocHealth: 88 };
  const employeeName = profile?.name || "Developer";
  const teammateDetail = teammates?.find(t => t._id === selectedTeammateId);

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
    { id: "overview",     label: "Dashboard",      icon: Sliders       },
    { id: "projects",     label: "My Projects",    icon: Folder        },
    { id: "tasks",        label: "Assigned Tasks", icon: CheckCircle2  },
    { id: "explorer",     label: "Repositories",   icon: GitFork       },
    { id: "qa",           label: "AI Assistant",   icon: MessageSquare },
    { id: "activity",     label: "Activity",       icon: Clock         },
    { id: "analytics",    label: "Analytics",      icon: TrendingUp    },
    { id: "settings",     label: "Settings",       icon: Settings      },
  ];

  const isLoading = profileLoading || dashboardLoading || reposLoading;

  return (
    <div className="workspace-portal-root">
      <div className="workspace-grid-pattern" />

      {/* SIDEBAR */}
      <motion.aside
        animate={{ width: collapsed ? 52 : 220 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="workspace-sidebar"
      >
        {/* Toggle Button */}
        <button
          onClick={() => {
            const next = !collapsed;
            setCollapsed(next);
            localStorage.setItem("workspace_sidebar_collapsed", String(next));
          }}
          className="workspace-sidebar-toggle"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
        </button>

        {/* Logo */}
        <div className="sidebar-logo-row">
          <div className="workspace-logo-box">
            <span style={{ color: "#00D9FF", fontWeight: 900, fontSize: 13 }}>W</span>
          </div>
          {!collapsed && (
            <span className="workspace-logo-text">WhyCode</span>
          )}
        </div>

        {/* Nav */}
        <div className="sidebar-nav-container">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={collapsed ? item.label : undefined}
              className={`workspace-link-item ${activeTab === item.id ? "active" : ""}`}
            >
              {activeTab === item.id && <div className="workspace-active-tag" />}
              <item.icon size={15} style={{ flexShrink: 0 }} />
              {!collapsed && <span style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>}
            </button>
          ))}
        </div>

        {/* Profile + Logout */}
        <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {!collapsed && (
            <div className="workspace-profile-box">
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "rgba(0,217,255,0.1)", border: "1px solid rgba(0,217,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#00D9FF", fontSize: 10, fontWeight: 800, flexShrink: 0
              }}>
                {profile?.initials || employeeName.substring(0, 2).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{employeeName}</p>
                <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>Teammate</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            title={collapsed ? "Sign Out" : undefined}
            className="btn-workspace-signout"
          >
            <LogOut size={13} style={{ flexShrink: 0 }} />
            {!collapsed && <span style={{ fontSize: 12 }}>Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflowY: "auto", position: "relative", zIndex: 2 }}>
        <div className="dashboard-content-viewport">

          {/* ── OVERVIEW TAB ─────────────────────────────────────────── */}
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

              {/* Welcome Header */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <Flame size={18} style={{ color: "#00D9FF" }} />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Developer Workspace</span>
                </div>
                <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>
                  Good evening, {employeeName.split(" ")[0]} 👋
                </h1>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>
                  Here's your developer activity overview for today.
                </p>
              </div>

              {/* KPI Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 28 }}>
                {[
                  { label: "Sprint Rooms",  value: dashboardStats.totalRooms,           color: "#00D9FF", sub: "Active this week" },
                  { label: "Repositories",  value: dashboardStats.totalRepos,           color: "#8b5cf6", sub: "Indexed"           },
                  { label: "Total Commits", value: dashboardStats.totalCommits,         color: "#10b981", sub: "This sprint"       },
                  { label: "Doc Health",    value: `${dashboardStats.avgDocHealth}%`,   color: "#f59e0b", sub: "Average score"     },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="glass-panel-premium"
                    style={{ padding: 18 }}
                  >
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 8 }}>{s.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", marginTop: 6 }}>{s.sub}</div>
                  </motion.div>
                ))}
              </div>

              {/* Two-column layout */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}>

                {/* Contribution Heatmap */}
                <div className="glass-panel-premium">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Branch Commit Activity</span>
                    <span style={{ fontSize: 10, color: "#00D9FF", fontWeight: 600 }}>16 weeks</span>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <div style={{ display: "grid", gridAutoFlow: "column", gridTemplateRows: "repeat(7, 10px)", gap: 4, width: "max-content" }}>
                      {heatmapCells.map((val, i) => {
                        const bg = val === 0 ? "rgba(255,255,255,0.04)" : val === 1 ? "rgba(0,217,255,0.2)" : val === 2 ? "rgba(0,217,255,0.4)" : val === 3 ? "rgba(0,217,255,0.65)" : "#00D9FF";
                        return <div key={i} className="heatmap-cell" style={{ background: bg }} />;
                      })}
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="glass-panel-premium">
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Recent Activity</div>
                  {activityLoading
                    ? <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Loading…</div>
                    : activity?.slice(0, 4).map((act, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00D9FF", marginTop: 5, flexShrink: 0 }} />
                          <div>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>@{act.author || "user"}: </span>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{act.message}</span>
                          </div>
                        </div>
                      ))
                  }
                </div>
              </div>

              {/* Task Board */}
              <div className="glass-panel-premium" style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Sprint Task Board</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                  {[
                    { label: "To Do",       color: "#71717a", tasks: [{ id: "CM-92", desc: "Setup Redis pool parameters" }] },
                    { label: "In Progress", color: "#00D9FF", tasks: [{ id: "CM-89", desc: "Verify passwordless login route" }] },
                    { label: "In Review",   color: "#8b5cf6", tasks: [{ id: "CM-84", desc: "Bind Client SPA routes" }] },
                    { label: "Completed",   color: "#10b981", tasks: [{ id: "CM-72", desc: "Hydrate SSO callback payloads" }] },
                  ].map(col => (
                    <div key={col.label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12, padding: 12 }}>
                      <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: col.color, marginBottom: 10 }}>{col.label}</div>
                      {col.tasks.map(t => (
                        <div key={t.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: "8px 10px" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 3 }}>{t.id}</div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{t.desc}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="glass-panel-premium">
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Quick Actions</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                  {[
                    { label: "Open Repository",      icon: GitFork,    color: "#00D9FF", tab: "explorer"  },
                    { label: "Start Coding Session",  icon: Terminal,   color: "#8b5cf6", tab: "explorer"  },
                    { label: "Ask AI Assistant",      icon: MessageSquare, color: "#10b981", tab: "qa"    },
                    { label: "View Analytics",        icon: TrendingUp, color: "#f59e0b", tab: "analytics" },
                    { label: "View Activity",         icon: Flame,      color: "#ef4444", tab: "activity"  },
                  ].map(action => (
                    <button
                      key={action.label}
                      onClick={() => setActiveTab(action.tab)}
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8,
                        padding: "14px 14px", borderRadius: 12, cursor: "pointer", textAlign: "left",
                        background: `${action.color}08`, border: `1px solid ${action.color}20`,
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${action.color}14`; e.currentTarget.style.borderColor = `${action.color}40`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = `${action.color}08`; e.currentTarget.style.borderColor = `${action.color}20`; }}
                    >
                      <action.icon size={16} style={{ color: action.color }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── PROJECTS TAB ──────────────────────────────────────────── */}
          {activeTab === "projects" && (
            <motion.div key="projects" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 20, letterSpacing: "-0.02em" }}>My Projects</h2>
              {projectsLoading
                ? <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Loading projects…</div>
                : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
                    {projects?.map(p => (
                      <div key={p._id} className="glass-panel-premium" style={{ padding: 20 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <div>
                            <h4 style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>{p.name}</h4>
                            <code style={{ fontSize: 10, color: "rgba(0,217,255,0.7)", marginTop: 3, display: "block", fontFamily: "monospace" }}>{p.githubRepo}</code>
                          </div>
                          <span className="status-badge-custom badge-cyan">{p.knowledgeScore || 0}%</span>
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{p.description || "No description provided."}</div>
                        <div style={{ marginTop: 12, height: 3, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                          <div style={{ width: `${p.knowledgeScore || 0}%`, height: "100%", background: "linear-gradient(90deg, #00D9FF, #8b5cf6)", borderRadius: 99 }} />
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </motion.div>
          )}

          {/* ── TASKS TAB ─────────────────────────────────────────────── */}
          {activeTab === "tasks" && (
            <motion.div key="tasks" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 20, letterSpacing: "-0.02em" }}>Assigned Tasks</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
                {[
                  { label: "To Do",       color: "#71717a", tasks: [{ id: "CM-92", desc: "Setup Redis pool parameters" }] },
                  { label: "In Progress", color: "#00D9FF", tasks: [{ id: "CM-89", desc: "Verify passwordless login route" }] },
                  { label: "In Review",   color: "#8b5cf6", tasks: [{ id: "CM-84", desc: "Bind Client SPA routes" }] },
                  { label: "Completed",   color: "#10b981", tasks: [{ id: "CM-72", desc: "Hydrate SSO callback payloads" }] },
                ].map(col => (
                  <div key={col.label} className="glass-panel-premium" style={{ padding: 16 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: col.color, marginBottom: 12 }}>{col.label}</div>
                    {col.tasks.map(t => (
                      <div key={t.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 12px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>{t.id}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{t.desc}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── EXPLORER / REPOSITORIES TAB ───────────────────────────── */}
          {activeTab === "explorer" && (
            <motion.div key="explorer" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 20, letterSpacing: "-0.02em" }}>Repositories</h2>
              <CodeWorkspace
                repositories={repositories}
                files={filesList}
                selectedFile={selectedFile}
                onSelectFile={handleSelectFile}
                fileContent={fileContent}
                fileLoading={fileLoading}
                onRunScan={handleRunScan}
                scanLoading={scanLoading}
                scanResults={scanResults}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSearchSubmit={handleSearchSubmit}
                searchResults={searchResults}
                searchLoading={searchLoading}
                selectedRepoId={selectedRepoId}
                onSelectRepo={setSelectedRepoId}
              />
            </motion.div>
          )}

          {/* ── QA / AI ASSISTANT TAB ─────────────────────────────────── */}
          {activeTab === "qa" && (
            <motion.div key="qa" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 20, letterSpacing: "-0.02em" }}>AI Assistant</h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                {/* Teammates */}
                <div className="glass-panel-premium" style={{ padding: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>AI Teammates</div>
                  {teammatesLoading
                    ? <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Loading…</div>
                    : teammates?.map(tm => (
                        <div
                          key={tm._id}
                          onClick={() => setSelectedTeammateId(tm._id === selectedTeammateId ? null : tm._id)}
                          style={{
                            display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                            borderRadius: 12, cursor: "pointer", marginBottom: 6,
                            background: selectedTeammateId === tm._id ? "rgba(0,217,255,0.06)" : "rgba(255,255,255,0.02)",
                            border: `1px solid ${selectedTeammateId === tm._id ? "rgba(0,217,255,0.2)" : "rgba(255,255,255,0.05)"}`,
                            transition: "all 0.2s"
                          }}
                        >
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#fff", fontWeight: 800, fontSize: 12, flexShrink: 0
                          }}>
                            {tm.name ? tm.name.substring(0, 2).toUpperCase() : "TM"}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>@{tm.githubUsername || tm.name}</div>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.38)" }}>{tm.designation || "Developer"}</div>
                          </div>
                          <div style={{ marginLeft: "auto", textAlign: "right" }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#10b981" }}>{tm.knowledgeScore || 85}%</div>
                            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", textTransform: "uppercase" }}>Score</div>
                          </div>
                        </div>
                      ))
                  }
                  {teammateDetail && (
                    <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "rgba(0,217,255,0.04)", border: "1px solid rgba(0,217,255,0.12)" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#00D9FF", marginBottom: 4 }}>{teammateDetail.name}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                        Contributes to {teammateDetail.projects?.length || 0} projects · Knowledge Score: {teammateDetail.knowledgeScore || 85}%
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat */}
                <div className="glass-panel-premium" style={{ padding: 20, display: "flex", flexDirection: "column", height: 460 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Knowledge Chat</div>
                  <div className="chat-messages-container" style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
                    {qaMessages.map((msg, i) => (
                      <div key={i} className={`chat-bubble ${msg.role}`}>{msg.text}</div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <form onSubmit={handleQaSubmit} style={{ display: "flex", gap: 8 }}>
                    <input
                      value={qaQuery}
                      onChange={e => setQaQuery(e.target.value)}
                      placeholder="Ask about schemas, routes, callbacks..."
                      className="glass-input-field"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="submit"
                      className="btn-glass-primary"
                      disabled={!qaQuery.trim()}
                      style={{ padding: "10px 16px", flexShrink: 0 }}
                    >
                      <Send size={13} />
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── ACTIVITY TAB ──────────────────────────────────────────── */}
          {activeTab === "activity" && (
            <motion.div key="activity" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 20, letterSpacing: "-0.02em" }}>Activity Timeline</h2>
              <div className="glass-panel-premium">
                {activityLoading
                  ? <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Loading…</div>
                  : activity?.map((act, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingBottom: 14, marginBottom: 14, borderBottom: i < activity.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(0,217,255,0.08)", border: "1px solid rgba(0,217,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <GitFork size={13} style={{ color: "#00D9FF" }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 2 }}>@{act.author || "user"}</div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{act.message}</div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 4 }}>{act.timestamp || "Recently"}</div>
                        </div>
                      </div>
                    ))
                }
              </div>
            </motion.div>
          )}

          {/* ── ANALYTICS TAB ─────────────────────────────────────────── */}
          {activeTab === "analytics" && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 20, letterSpacing: "-0.02em" }}>Analytics</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 20 }}>
                {[
                  { label: "Sprint Rooms",  val: dashboardStats.totalRooms,          color: "#00D9FF" },
                  { label: "Repositories",  val: dashboardStats.totalRepos,          color: "#8b5cf6" },
                  { label: "Total Commits", val: dashboardStats.totalCommits,        color: "#10b981" },
                  { label: "Doc Health",    val: `${dashboardStats.avgDocHealth}%`,  color: "#f59e0b" },
                ].map(s => (
                  <div key={s.label} className="glass-panel-premium" style={{ padding: 18 }}>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 8 }}>{s.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.val}</div>
                  </div>
                ))}
              </div>

              <div className="glass-panel-premium">
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Branch Commit Heatmap (16 weeks)</div>
                <div style={{ overflowX: "auto" }}>
                  <div style={{ display: "grid", gridAutoFlow: "column", gridTemplateRows: "repeat(7, 10px)", gap: 4, width: "max-content" }}>
                    {heatmapCells.map((val, i) => {
                      const bg = val === 0 ? "rgba(255,255,255,0.04)" : val === 1 ? "rgba(0,217,255,0.2)" : val === 2 ? "rgba(0,217,255,0.4)" : val === 3 ? "rgba(0,217,255,0.65)" : "#00D9FF";
                      return <div key={i} className="heatmap-cell" style={{ background: bg }} />;
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── SETTINGS TAB ──────────────────────────────────────────── */}
          {activeTab === "settings" && (
            <motion.div key="settings" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 20, letterSpacing: "-0.02em" }}>Settings</h2>
              <div className="glass-panel-premium" style={{ maxWidth: 480 }}>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>Connected Account</label>
                  <input disabled value={profile?.email || "developer@whycode.io"} className="glass-input-field" />
                </div>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>Workspace Scope</label>
                  <input disabled value={profile?.companyName || "WhyCode Inc"} className="glass-input-field" />
                </div>
                <div style={{ paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Telemetry Sync</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Real-time performance monitoring</div>
                  </div>
                  <span className="status-badge-custom badge-cyan">ACTIVE</span>
                </div>
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}

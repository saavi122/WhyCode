import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  GitCommit, Terminal, Cpu, Layers, Network, Brain, FileText, 
  Users, Boxes, Search, ArrowRight, Play, Check, ChevronDown, 
  Code, Sparkles, Activity, Shield, ArrowUpRight, MessageSquare 
} from "lucide-react";
import "./Landing.css";

// Custom Github Icon component to avoid missing export issues
const GithubIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export default function Landing() {
  const navigate = useNavigate();
  
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Basic states
  const [scrolled, setScrolled] = useState(false);
  const [isHeroCompressed, setIsHeroCompressed] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [activeDemoStep, setActiveDemoStep] = useState(0);

  // Parallax Mouse tilt variables
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // 1. TYPING ENGINE STATE
  const typingWords = [
    "commit.", "pull request.", "hotfix.", "merge.", "rollback.", 
    "refactor.", "bug fix.", "production incident.", "deployment.", 
    "architecture decision.", "code review.", "repository.", 
    "feature release.", "microservice.", "API change."
  ];
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // 2. ROTATING SUBTITLE STATE
  const subtitles = [
    "AI that remembers engineering decisions.",
    "Never lose code context again.",
    "Explain every commit in seconds.",
    "Onboard developers 10x faster.",
    "Build engineering memory automatically."
  ];
  const [activeSubtitleIdx, setActiveSubtitleIdx] = useState(0);

  // 3. LIVE METRICS STATES (Ticking up)
  const [metricRepos, setMetricRepos] = useState(2800);
  const [metricNodes, setMetricNodes] = useState(1.78); // Millions
  const [metricCommits, setMetricCommits] = useState(47.9); // Millions
  const [metricHours, setMetricHours] = useState(1.19); // Millions

  // 4. FLOATING WINDOWS SIMULATORS
  // Window 1: Commit Timeline Stream
  const [commitTimeline, setCommitTimeline] = useState([
    { id: "c7d8ef", msg: "refactor: optimize token verification", author: "Alex R.", time: "Just now" },
    { id: "e1f2a3", msg: "fix: prevent pool connection leaks", author: "Jane K.", time: "2m ago" },
    { id: "b3d4c5", msg: "feat: add schema registry validator", author: "Mark M.", time: "15m ago" }
  ]);
  
  // Window 2: AI Explanation (Linked to the top commit)
  const [aiExplanation, setAiExplanation] = useState(
    "Switches auth logic to local central crypto utility. Prevents token replay vectors and aligns with security audits."
  );

  // Window 4: Wave oscillator simulation for health chart
  const [waveOffset, setWaveOffset] = useState(0);
  
  // Window 6: Streaming AI Thinking tokens
  const [thinkingStream, setThinkingStream] = useState("");

  // Live Terminal Stream logs
  const [terminalLogs, setTerminalLogs] = useState([
    "System: Connected to GitHub webhook gateways...",
    "System: Workspace initialized. Memory nodes online."
  ]);

  // Handle global scroll for navbar and hero morphing
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }

      if (window.scrollY > 120) {
        setIsHeroCompressed(true);
      } else {
        setIsHeroCompressed(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Update mouse coordinates for backdrop spotlight and card tilts
  const handleGlobalMouseMove = (e) => {
    const x = e.clientX;
    const y = e.clientY;
    document.documentElement.style.setProperty("--mouse-global-x", `${x}px`);
    document.documentElement.style.setProperty("--mouse-global-y", `${y}px`);

    // Normalized coordinates (-0.5 to 0.5) from center of window
    const normX = (x / window.innerWidth) - 0.5;
    const normY = (y / window.innerHeight) - 0.5;
    setMousePos({ x: normX, y: normY });
  };

  // individual spotlight listener for hover cards
  const handleCardMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
  };

  // 1. TYPING ENGINE TIMERS
  useEffect(() => {
    let timer;
    const currentFullWord = typingWords[currentWordIdx];

    if (isDeleting) {
      // Erase effect
      timer = setTimeout(() => {
        setTypedText(prev => prev.slice(0, -1));
      }, 40); // Fast deletion speed
    } else {
      // Typing effect
      timer = setTimeout(() => {
        setTypedText(currentFullWord.slice(0, typedText.length + 1));
      }, 75); // Realistic typing delay
    }

    // Word complete -> Pause -> Switch to delete mode
    if (!isDeleting && typedText === currentFullWord) {
      timer = setTimeout(() => {
        setIsDeleting(true);
      }, 2500); // Hold word for 2.5s
    }

    // Deletion complete -> Switch to next word
    if (isDeleting && typedText === "") {
      setIsDeleting(false);
      setCurrentWordIdx((prev) => (prev + 1) % typingWords.length);
    }

    return () => clearTimeout(timer);
  }, [typedText, isDeleting, currentWordIdx]);

  // 2. SUBTITLE ROTATOR TIMERS
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSubtitleIdx((prev) => (prev + 1) % subtitles.length);
    }, 3800); // Transition every 3.8s
    return () => clearInterval(interval);
  }, []);

  // 3. LIVE METRICS UPWARD TICKET
  useEffect(() => {
    // Fast initial count-up
    const duration = 2000;
    const steps = 40;
    const stepTime = duration / steps;
    let stepCount = 0;

    const timer = setInterval(() => {
      stepCount++;
      setMetricRepos(Math.floor(2000 + (847 / steps) * stepCount));
      setMetricNodes(Number((1.2 + (0.6 / steps) * stepCount).toFixed(2)));
      setMetricCommits(Number((40 + (8.0 / steps) * stepCount).toFixed(1)));
      setMetricHours(Number((0.8 + (0.4 / steps) * stepCount).toFixed(1)));

      if (stepCount >= steps) {
        clearInterval(timer);
        // Slowly increment continuously
        setInterval(() => {
          setMetricRepos(prev => prev + (Math.random() > 0.7 ? 1 : 0));
          setMetricNodes(prev => Number((prev + 0.01).toFixed(2)));
          setMetricCommits(prev => Number((prev + 0.1).toFixed(1)));
          setMetricHours(prev => Number((prev + 0.1).toFixed(1)));
        }, 4000);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, []);

  // 4. FLOATING WINDOWS SIMULATIONS
  useEffect(() => {
    // A. Wave Oscillation loop for Health Chart (Window 4)
    let animationFrame;
    let localTime = 0;
    const animateWave = () => {
      localTime += 0.05;
      setWaveOffset(localTime);
      animationFrame = requestAnimationFrame(animateWave);
    };
    animateWave();

    // B. Git Commit Timeline simulator (Window 1) pushes a new commit every 5s
    const mockMsgs = [
      "docs: clarify webhook endpoint routing",
      "fix: patch websocket reconnect bounds",
      "feat: bundle custom AST tree parser",
      "refactor: merge memory nodes vector map",
      "security: rotate database encryption salts"
    ];
    const mockAuthors = ["Sarah P.", "John D.", "Liam O.", "Sophia V.", "Nathan B."];
    const mockExplanations = [
      "Updates route tables inside the webhook module to prevent redundant index scans on non-push configurations.",
      "Introduces backoff logic to the socket client handler. Mitigates server socket exhaustion during system restarts.",
      "Builds an AST parser to index multi-file dependency trees during push payload evaluations.",
      "Compresses vector structures into a unified index matrix, reducing graph retrieval times by 40%.",
      "Rotates AES-256 database keys for vault assets, ensuring continuous compliance standards."
    ];

    const timelineInterval = setInterval(() => {
      const idx = Math.floor(Math.random() * mockMsgs.length);
      const newCommit = {
        id: Math.random().toString(16).substring(2, 8),
        msg: mockMsgs[idx],
        author: mockAuthors[idx],
        time: "Just now"
      };

      setCommitTimeline(prev => {
        const updated = [newCommit, ...prev.slice(0, 2)];
        // Update connected Window 2 AI Explanation automatically!
        setAiExplanation(mockExplanations[idx]);
        return updated;
      });

      // Append terminal output log as well
      const logs = [
        `[pipeline] Pushed commit ${newCommit.id} by ${newCommit.author}`,
        `[pipeline] Parsing AST structures...`,
        `[pipeline] AST synced. Memory nodes mapping complete.`
      ];
      setTerminalLogs(prev => [...prev.slice(-3), ...logs]);

    }, 6000);

    // C. Streaming AI Thinking Tokens simulator (Window 6)
    const thinkingPhrases = [
      "Evaluating branch nodes...",
      "Analyzing import hashes...",
      "Centralizing cryptographic tokens...",
      "AST structural changes verified.",
      "Vector indexes updated. OK.",
      "Reviewing compliance constraints..."
    ];
    let phraseIdx = 0;
    let charIdx = 0;
    const thinkingInterval = setInterval(() => {
      const phrase = thinkingPhrases[phraseIdx];
      setThinkingStream(phrase.slice(0, charIdx + 1));
      charIdx++;

      if (charIdx >= phrase.length) {
        charIdx = 0;
        phraseIdx = (phraseIdx + 1) % thinkingPhrases.length;
      }
    }, 150);

    return () => {
      cancelAnimationFrame(animationFrame);
      clearInterval(timelineInterval);
      clearInterval(thinkingInterval);
    };
  }, []);

  // FAQS Data
  const faqs = [
    {
      q: "How does WhyCode extract the 'why' from commits?",
      a: "WhyCode doesn't just look at file diffs. It parses your abstract syntax trees (AST), reviews commit history graphs, scans connected issue trackers (Jira, GitHub issues), and runs a local LLM analyzer to map technical changes back to structural business rationale."
    },
    {
      q: "Does our source code leave our secure network?",
      a: "No. WhyCode offers enterprise deployment with self-hosted VPC orchestration. Your source code and commit indices remain completely within your secure networks while utilizing local or private AI inference endpoints."
    },
    {
      q: "Can we integrate WhyCode into our custom CI/CD pipelines?",
      a: "Absolutely. WhyCode has an official CLI wrapper and webhook gateways for GitHub Actions, GitLab CI, Bitbucket Pipelines, and custom webhooks, enabling automated memory builds on every branch pull request."
    },
    {
      q: "Is there a limit on repository index sizes?",
      a: "Developer workspace indices are completely unlimited. For Team and Enterprise accounts, WhyCode dynamically chunks and indexes massive mono-repos with over 50M+ lines of code without degradation in search speed."
    }
  ];

  // Features Data
  const features = [
    {
      title: "AI Commit Analysis",
      desc: "Instant multi-layered contextual breakdowns of syntax modifications, mapping diff changes to logic updates.",
      icon: GitCommit,
      accent: "spotlight-purple",
      badge: "Intel"
    },
    {
      title: "Architecture Map",
      desc: "Visualize system components, libraries, and class hierarchies dynamically updated with every commit.",
      icon: Layers,
      accent: "spotlight-emerald",
      badge: "Visual"
    },
    {
      title: "Knowledge Graph",
      desc: "Connect files, developers, requirements, and historical PR issues in a fast semantic graph database.",
      icon: Network,
      accent: "spotlight-purple",
      badge: "Query"
    },
    {
      title: "Repository Intelligence",
      desc: "Search, analyze, and query the entire codebase structure in natural language via a fast vector store index.",
      icon: Brain,
      accent: "spotlight-emerald",
      badge: "Search"
    },
    {
      title: "Engineering Memory",
      desc: "Retain institutional intelligence when developers cycle out. Complete logs of design rationales are preserved.",
      icon: Cpu,
      accent: "spotlight-purple",
      badge: "Memory"
    },
    {
      title: "Auto Documentation",
      desc: "Dynamic markdown file generation, schema validation files, and API endpoints documentation are updated automatically.",
      icon: FileText,
      accent: "spotlight-emerald",
      badge: "Sync"
    },
    {
      title: "Code Ownership",
      desc: "Intelligent analytics dashboard identifying core component experts and domain knowledge distribution.",
      icon: Users,
      accent: "spotlight-purple",
      badge: "Teams"
    },
    {
      title: "Dependency Mapping",
      desc: "Real-time alerts when PRs import conflicting library versions or trigger potential architectural breaks.",
      icon: Boxes,
      accent: "spotlight-emerald",
      badge: "CI/CD"
    }
  ];

  // Pipeline Interactive Demo steps data
  const pipelineSteps = [
    {
      label: "Git Commit",
      title: "1. Developers push changes",
      desc: "A developer commits a codebase change introducing a refactored auth utility.",
      code: `// developer_commit.diff
- import jwt from 'jsonwebtoken';
- const token = jwt.sign({ id: user.id }, SECRET);
+ import { createSecureToken } from './utils/crypto';
+ const token = createSecureToken({ id: user.id });`,
      type: "diff"
    },
    {
      label: "AI Analysis",
      title: "2. Deep Context Parsing",
      desc: "WhyCode triggers a webhook parser to analyze AST transitions and trace import variables.",
      code: `// WhyCode AST Engine
Analyzing: authService.js (Lines 12-18)
Change: Replacing raw jsonwebtoken library with local crypto module.
Tracing dependencies: [./utils/crypto.js] ➔ loading subroutines.
Status: Success. AST alignment verified.`,
      type: "log"
    },
    {
      label: "Generated Explanation",
      title: "3. Semantic Why-Explanation",
      desc: "An AI-powered explanation is generated, identifying architectural goals and security compliance reasons.",
      code: `# AI Commit Explanation (ID: c7d8ef)
## Architectural Goal
Migrate raw token creation to centralized crypto utility to enforce SHA-256 integrity rules.

## Why this changed
Ensures compliance with OWASP ASVS v4.0.3 requirements. Prevents secret rotation leaks.`,
      type: "doc"
    },
    {
      label: "Knowledge Graph",
      title: "4. Network Mapping",
      desc: "The node is connected into the global repository schema showing new dependencies.",
      code: `// Repository Graph State Update
Node [authService.js] ➔ Connected To [./utils/crypto.js] (Primary)
Deleted Dependency: [jsonwebtoken] (Unused)
Index Update: Vector indices updated for 4 related files.`,
      type: "graph"
    },
    {
      label: "Documentation Sync",
      title: "5. Automated Docs Write",
      desc: "The system updates the developer markdown documentation and readme structures.",
      code: `## Cryptographic Tokens
Created token utility using centralized crypto module.
All handlers importing JWT functions must use:
\`\`\`js
import { createSecureToken } from './utils/crypto';
\`\`\`
Last Synced: 2 mins ago via WhyCode Bot.`,
      type: "doc"
    }
  ];

  return (
    <div className="landing-container" onMouseMove={handleGlobalMouseMove}>
      {/* Background decoration layers */}
      <div className="noise-overlay"></div>
      <div className="aurora-container">
        <div className="aurora-light-purple"></div>
        <div className="aurora-light-emerald"></div>
        <div className="aurora-light-indigo"></div>
      </div>
      <div className="bg-grid"></div>
      <div className="mouse-light-spotlight"></div>

      {/* Floating 3D/Parallax background assets */}
      <div className="floating-decor-snippet" style={{ top: "15%", left: "10%", transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 20}px)` }}>
        {`const index = whycode.map(ast => ast.node);`}
      </div>
      <div className="floating-decor-snippet" style={{ top: "50%", left: "5%", transform: `translate(${mousePos.x * -15}px, ${mousePos.y * 25}px)` }}>
        {`schemaGraph.connect(commitHash).verifySync();`}
      </div>
      <div className="floating-decor-snippet" style={{ top: "25%", right: "8%", transform: `translate(${mousePos.x * 30}px, ${mousePos.y * -15}px)` }}>
        {`@whycode/core::resolver [OK]`}
      </div>
      
      {/* Floating dots representing drifting nodes */}
      <div className="floating-decor-dot" style={{ top: "20%", left: "30%" }}></div>
      <div className="floating-decor-dot" style={{ top: "60%", left: "15%" }}></div>
      <div className="floating-decor-dot" style={{ top: "35%", right: "25%" }}></div>
      <div className="floating-decor-dot" style={{ top: "70%", right: "40%" }}></div>

      {/* Floating Glass Navbar */}
      <div className={`navbar-wrapper ${scrolled ? "navbar-scrolled" : ""}`}>
        <nav className="navbar-glass">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => navigate("/")}>
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #10b981 0%, #8b5cf6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Code size={18} color="#000" strokeWidth={3} />
            </div>
            <span style={{ fontSize: "16px", fontWeight: "800", letterSpacing: "-0.03em" }}>WhyCode</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }} className="nav-links-desktop">
            <span className="nav-link" onClick={() => scrollToSection("hero")}>Product</span>
            <span className="nav-link" onClick={() => scrollToSection("features")}>Features</span>
            <span className="nav-link" onClick={() => scrollToSection("demo")}>Solutions</span>
            <span className="nav-link" onClick={() => scrollToSection("pricing")}>Pricing</span>
            <span className="nav-link" onClick={() => scrollToSection("faq")}>Docs</span>
            <span className="nav-link" onClick={() => scrollToSection("testimonials")}>Company</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "99px",
              padding: "4px 12px",
              width: "160px"
            }} className="nav-search-bar">
              <Search size={14} color="#52525b" />
              <input 
                type="text" 
                placeholder="Search index..." 
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: "11px",
                  color: "#fff",
                  marginLeft: "6px",
                  width: "100%"
                }}
                disabled
              />
              <span style={{
                fontSize: "9px",
                background: "rgba(255,255,255,0.08)",
                padding: "2px 6px",
                borderRadius: "4px",
                color: "#52525b",
                fontWeight: "700"
              }}>⌘K</span>
            </div>

            <button 
              className="nav-link" 
              onClick={() => navigate("/company/login")}
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              Sign In
            </button>
            
            <button 
              onClick={() => navigate("/company/signup")}
              style={{
                background: "#ffffff",
                color: "#020202",
                border: "none",
                borderRadius: "99px",
                padding: "8px 16px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow = "0 0 15px rgba(255,255,255,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              Get Started
            </button>
          </div>
        </nav>
      </div>

      {/* Dynamic Cinematic Hero Container */}
      <section id="hero" className={`hero-wrapper-dynamic hero-section-cinematic ${isHeroCompressed ? "hero-compressed" : ""}`}>
        
        {/* LEFT COLUMN: Title & Metrics */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(139, 92, 246, 0.04)",
            border: "1px solid rgba(139, 92, 246, 0.12)",
            padding: "6px 12px",
            borderRadius: "99px",
            width: "fit-content"
          }}>
            <Sparkles size={12} color="#8b5cf6" />
            <span style={{ fontSize: "10px", fontWeight: "700", color: "#8b5cf6", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Next-Gen Repository Graph Intelligence
            </span>
          </div>

          {/* Animated typing headline */}
          <h1 className="text-hero-main">
            Understand the WHY behind every<br />
            <span style={{ display: "inline-block", whiteSpace: "nowrap" }}>
              <span style={{
                background: "linear-gradient(135deg, #10b981 0%, #8b5cf6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontWeight: "900"
              }}>
                {typedText}
              </span>
              <span className="cursor-blink"></span>
            </span>
          </h1>

          {/* Rotating subtitle */}
          <div className="rotating-subtitle-container">
            <div className="rotating-subtitle-text" style={{ transform: `translateY(${-activeSubtitleIdx * 28}px)` }}>
              {subtitles.map((sub, i) => (
                <div key={i} style={{ height: "28px", display: "flex", alignItems: "center" }}>{sub}</div>
              ))}
            </div>
          </div>

          {/* CTA Buttons with micro-interactions */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", marginTop: "10px" }}>
            <button 
              className="btn-premium-primary" 
              onClick={() => navigate("/company/signup")}
              style={{
                position: "relative",
                overflow: "hidden"
              }}
              onMouseDown={(e) => {
                // Simple ripple effect simulation
                const ripple = document.createElement("span");
                ripple.style.position = "absolute";
                ripple.style.width = "100px";
                ripple.style.height = "100px";
                ripple.style.background = "rgba(0,0,0,0.15)";
                ripple.style.borderRadius = "50%";
                ripple.style.transform = "scale(0)";
                ripple.style.animation = "ripple-effect 0.4s linear";
                ripple.style.left = `${e.clientX - e.currentTarget.getBoundingClientRect().left - 50}px`;
                ripple.style.top = `${e.clientY - e.currentTarget.getBoundingClientRect().top - 50}px`;
                e.currentTarget.appendChild(ripple);
                setTimeout(() => ripple.remove(), 400);
              }}
            >
              Launch Workspace
              <ArrowRight size={16} />
            </button>
            <button className="btn-premium-secondary" onClick={() => setShowDemoModal(true)}>
              <Play size={14} fill="#fff" style={{ animation: "pulse-glow 1.5s infinite alternate" }} />
              Watch Live Demo
            </button>
          </div>

          {/* Live Metrics Counters ticking upward */}
          <div className="live-metrics-row">
            <div className="metric-item">
              <span className="metric-number">{metricRepos.toLocaleString()}</span>
              <span className="metric-label">Repositories Indexed</span>
            </div>
            <div className="metric-item">
              <span className="metric-number">{metricNodes}M</span>
              <span className="metric-label">Knowledge Nodes</span>
            </div>
            <div className="metric-item">
              <span className="metric-number">{metricCommits}M</span>
              <span className="metric-label">Commits Explained</span>
            </div>
            <div className="metric-item">
              <span className="metric-number">{metricHours}M</span>
              <span className="metric-label">Developer Hours Saved</span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Cinematic Dashboard & Live Terminal */}
        <div style={{ position: "relative" }}>
          
          <div className="dashboard-grid-container" style={{
            transform: `rotateY(${mousePos.x * 12}deg) rotateX(${mousePos.y * -12}deg)`
          }}>
            
            {/* Window 1: Commit Timeline Stream */}
            <div className="floating-win win-commit-timeline glass-panel spotlight-card" 
                 onMouseMove={handleCardMouseMove}
                 style={{ transform: `translate3d(${mousePos.x * 20}px, ${mousePos.y * 20}px, 0)` }}>
              <div className="win-header">
                <span className="win-title">
                  <GitCommit size={10} color="#8b5cf6" /> Commit Stream
                </span>
                <span style={{ fontSize: "8px", background: "rgba(139,92,246,0.1)", color: "#8b5cf6", padding: "1px 4px", borderRadius: "3px" }}>Live</span>
              </div>
              <div className="win-body">
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {commitTimeline.map((item, i) => (
                    <div key={i} style={{
                      padding: "8px",
                      borderRadius: "8px",
                      background: i === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                      border: i === 0 ? "1px solid rgba(255,255,255,0.05)" : "1px solid transparent",
                      transition: "all 0.3s"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", color: "#6e6e73", marginBottom: "2px" }}>
                        <span style={{ fontFamily: "monospace", color: "#8b5cf6" }}>{item.id}</span>
                        <span>{item.time}</span>
                      </div>
                      <div style={{ fontSize: "10px", fontWeight: "600", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {item.msg}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Window 2: AI Explanation (Updates match top commit) */}
            <div className="floating-win win-ai-explanation glass-panel spotlight-card"
                 onMouseMove={handleCardMouseMove}
                 style={{ transform: `translate3d(${mousePos.x * -15}px, ${mousePos.y * 30}px, 0)` }}>
              <div className="win-header">
                <span className="win-title">
                  <Sparkles size={10} color="#10b981" /> AST AI Explainer
                </span>
                <span style={{ fontSize: "8px", color: "#6e6e73" }}>v1.2</span>
              </div>
              <div className="win-body" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <p style={{ margin: 0, color: "#a1a1aa", lineHeight: "1.4", fontSize: "10px" }}>
                  {aiExplanation}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "8px", color: "#6e6e73", borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "6px" }}>
                  <span>Scope: authService.js</span>
                  <span style={{ color: "#10b981", fontWeight: "700" }}>96% confidence</span>
                </div>
              </div>
            </div>

            {/* Window 3: Knowledge Graph nodes */}
            <div className="floating-win win-knowledge-graph glass-panel spotlight-card"
                 onMouseMove={handleCardMouseMove}
                 style={{ transform: `translate3d(${mousePos.x * 25}px, ${mousePos.y * -15}px, 0)` }}>
              <div className="win-header">
                <span className="win-title">
                  <Network size={10} color="#8b5cf6" /> Context Schema
                </span>
              </div>
              <div className="win-body" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                {/* SVG connection graph */}
                <svg width="100%" height="100%" viewBox="0 0 100 80">
                  <line x1="20" y1="40" x2="50" y2="20" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  <line x1="50" y1="20" x2="80" y2="40" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  <line x1="50" y1="20" x2="50" y2="60" stroke="rgba(139,92,246,0.3)" strokeWidth="1" />
                  <line x1="20" y1="40" x2="50" y2="60" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  <line x1="80" y1="40" x2="50" y2="60" stroke="rgba(16,185,129,0.3)" strokeWidth="1" />
                  
                  {/* Nodes */}
                  <circle cx="20" cy="40" r="4" fill="#6e6e73" />
                  <circle cx="50" cy="20" r="5" fill="#8b5cf6" style={{ animation: "pulse-glow 1.5s infinite alternate" }} />
                  <circle cx="80" cy="40" r="4" fill="#6e6e73" />
                  <circle cx="50" cy="60" r="6" fill="#10b981" />
                </svg>
              </div>
            </div>

            {/* Window 4: Repository Health Live Chart */}
            <div className="floating-win win-repo-health glass-panel spotlight-card"
                 onMouseMove={handleCardMouseMove}
                 style={{ transform: `translate3d(${mousePos.x * -25}px, ${mousePos.y * -20}px, 0)` }}>
              <div className="win-header">
                <span className="win-title">
                  <Activity size={10} color="#10b981" /> Codebase Health
                </span>
                <span style={{ fontSize: "9px", fontWeight: "700", color: "#10b981" }}>94.2 Excellent</span>
              </div>
              <div className="win-body" style={{ padding: "8px 0 0 0" }}>
                {/* Simulated live chart oscilloscope using waveOffset */}
                <svg width="100%" height="100%" viewBox="0 0 100 40">
                  <path 
                    d={`M 0 ${20 + Math.sin(waveOffset) * 6} 
                       Q 25 ${20 + Math.sin(waveOffset + 1.5) * 12} 50 ${20 + Math.sin(waveOffset + 3) * 6} 
                       T 100 ${20 + Math.sin(waveOffset + 4.5) * 8}`}
                    fill="none" 
                    stroke="#10b981" 
                    strokeWidth="1.5" 
                  />
                  <path 
                    d={`M 0 35 L 0 ${20 + Math.sin(waveOffset) * 6} 
                       Q 25 ${20 + Math.sin(waveOffset + 1.5) * 12} 50 ${20 + Math.sin(waveOffset + 3) * 6} 
                       T 100 ${20 + Math.sin(waveOffset + 4.5) * 8} L 100 35 Z`}
                    fill="url(#health-glow-gradient)"
                    opacity="0.1"
                  />
                  <defs>
                    <linearGradient id="health-glow-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            {/* Window 5: Developer Activity Heatmap */}
            <div className="floating-win win-dev-activity glass-panel"
                 style={{ transform: `translate3d(${mousePos.x * 10}px, ${mousePos.y * 35}px, 0)` }}>
              <div className="win-header">
                <span className="win-title">
                  <Users size={10} color="#a1a1aa" /> Push Freq Matrix
                </span>
              </div>
              <div className="win-body" style={{ padding: "8px 12px" }}>
                {/* 3x12 activity grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(15, 1fr)", gap: "3px" }}>
                  {Array.from({ length: 30 }).map((_, i) => {
                    const intensities = [0.03, 0.1, 0.4, 0.8, 0.2, 0.05, 0.6];
                    const val = intensities[i % intensities.length];
                    return (
                      <div 
                        key={i} 
                        style={{
                          aspectRatio: "1",
                          borderRadius: "2px",
                          background: `rgba(16, 185, 129, ${val})`,
                          border: val === 0.03 ? "1px solid rgba(255,255,255,0.02)" : "none"
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Window 6: AI Thinking Token Stream */}
            <div className="floating-win win-ai-thinking glass-panel"
                 style={{ transform: `translate3d(${mousePos.x * -30}px, ${mousePos.y * 10}px, 0)` }}>
              <div className="win-header">
                <span className="win-title" style={{ color: "#8b5cf6" }}>
                  <Cpu size={10} color="#8b5cf6" /> Parser Engine
                </span>
                <span className="cursor-blink" style={{ width: "3px", height: "10px", margin: 0 }}></span>
              </div>
              <div className="win-body" style={{ fontFamily: "monospace", fontSize: "9px", color: "#8b5cf6" }}>
                {thinkingStream}_
              </div>
            </div>

          </div>

          {/* Bottom Right Live Terminal Stream */}
          <div className="live-terminal" style={{ transform: `translate3d(${mousePos.x * -10}px, ${mousePos.y * 15}px, 0)` }}>
            <div className="terminal-header">
              <span>whycode-analyzer::console</span>
              <span>online</span>
            </div>
            <div className="terminal-scroll">
              {terminalLogs.map((log, idx) => (
                <div key={idx} style={{ opacity: idx === terminalLogs.length - 1 ? 1 : 0.4 }}>
                  {log}
                </div>
              ))}
              <div style={{ color: "#ffffff" }}>
                whycode-console:~$ <span className="cursor-blink" style={{ width: "4px", height: "8px", margin: 0, backgroundColor: "#fff" }}></span>
              </div>
            </div>
          </div>

        </div>

      </section>

      {/* Trusted Companies scrolling marquee */}
      <section style={{ background: "#050505", borderTop: "1px solid rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.02)", padding: "12px 0", zIndex: 6, position: "relative" }}>
        <div className="marquee-container">
          <div className="marquee-content">
            {Array.from({ length: 4 }).map((_, repeatIdx) => (
              <React.Fragment key={repeatIdx}>
                <div className="marquee-logo"><GithubIcon size={16} /> GITHUB</div>
                <div className="marquee-logo"><span style={{ fontWeight: "800" }}>▲</span> VERCEL</div>
                <div className="marquee-logo"><span style={{ letterSpacing: "-1.2px", fontWeight: "700" }}>stripe</span></div>
                <div className="marquee-logo"><Sparkles size={14} color="#8b5cf6" /> OPENAI</div>
                <div className="marquee-logo"><span style={{ fontWeight: "600" }}>CLOUDFLARE</span></div>
                <div className="marquee-logo"><span style={{ fontWeight: "800" }}>MongoDB</span></div>
                <div className="marquee-logo"><span style={{ fontWeight: "600" }}>Linear</span></div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" style={{
        padding: "100px 0",
        width: "90%",
        maxWidth: "1200px",
        margin: "0 auto",
        zIndex: 5,
        position: "relative"
      }}>
        
        <div style={{ textAlign: "center", marginBottom: "64px" }}>
          <span style={{ fontSize: "11px", fontWeight: "700", color: "#10b981", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Unrivaled Feature Depth
          </span>
          <h2 style={{ fontSize: "36px", fontWeight: "800", letterSpacing: "-0.03em", marginTop: "12px" }}>
            Engineered for high-integrity codebases
          </h2>
          <p style={{ color: "#a1a1aa", fontSize: "15px", maxWidth: "500px", margin: "12px auto 0" }}>
            Stop guessing why lines changed. Tap into the automated memory bank.
          </p>
        </div>

        <div className="grid-cols-responsive">
          {features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <div 
                key={idx} 
                className={`glass-panel feature-card spotlight-card ${f.accent}`} 
                onMouseMove={handleCardMouseMove}
              >
                <div>
                  <div className="feature-card-icon">
                    <Icon size={20} color={f.accent.includes("emerald") ? "#10b981" : "#8b5cf6"} />
                  </div>
                  <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                    {f.title}
                    <span style={{
                      fontSize: "9px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      color: "#6e6e73"
                    }}>{f.badge}</span>
                  </h3>
                  <p style={{ fontSize: "13px", color: "#a1a1aa", lineHeight: "1.6", margin: 0 }}>
                    {f.desc}
                  </p>
                </div>
                
                <div style={{
                  marginTop: "24px",
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "#6e6e73",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}>
                  Explore capabilities <ArrowUpRight size={10} />
                </div>
              </div>
            );
          })}
        </div>

      </section>

      {/* Interactive Demo Section */}
      <section id="demo" style={{
        padding: "100px 0",
        background: "#050505",
        borderTop: "1px solid rgba(255,255,255,0.03)",
        borderBottom: "1px solid rgba(255,255,255,0.03)"
      }}>
        <div style={{
          width: "90%",
          maxWidth: "1200px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "0.9fr 1.1fr",
          gap: "60px",
          alignItems: "center"
        }} className="hero-grid">
          
          {/* Left panel: Step checklist */}
          <div>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Interactive Live Flow
            </span>
            <h2 style={{ fontSize: "36px", fontWeight: "800", letterSpacing: "-0.03em", marginTop: "12px", marginBottom: "32px" }}>
              Watch WhyCode process a PR
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {pipelineSteps.map((step, idx) => (
                <div 
                  key={idx}
                  className={`demo-step ${activeDemoStep === idx ? "active" : ""}`}
                  onClick={() => setActiveDemoStep(idx)}
                >
                  <span className="demo-step-num">Step 0{idx + 1}</span>
                  <h4 style={{
                    fontSize: "15px",
                    fontWeight: "750",
                    color: activeDemoStep === idx ? "#ffffff" : "#c5c5c7",
                    marginBottom: "4px"
                  }}>
                    {step.label}
                  </h4>
                  <p style={{
                    fontSize: "12px",
                    color: activeDemoStep === idx ? "#a1a1aa" : "#6e6e73",
                    margin: 0,
                    lineHeight: "1.5"
                  }}>
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: Editor simulator */}
          <div>
            <div className="editor-glass">
              <div className="editor-header">
                <div className="editor-dots">
                  <span className="editor-dot" style={{ background: "#ef4444" }}></span>
                  <span className="editor-dot" style={{ background: "#f59e0b" }}></span>
                  <span className="editor-dot" style={{ background: "#10b981" }}></span>
                </div>
                <span style={{ fontSize: "11px", color: "#6e6e73", fontFamily: "monospace" }}>
                  {pipelineSteps[activeDemoStep].title}
                </span>
                <span style={{ fontSize: "10px", background: "rgba(255,255,255,0.03)", padding: "2px 6px", borderRadius: "4px", color: "#6e6e73" }}>
                  {pipelineSteps[activeDemoStep].type.toUpperCase()}
                </span>
              </div>
              <pre className="editor-code">
                <code>
                  {pipelineSteps[activeDemoStep].code}
                </code>
              </pre>
            </div>
          </div>

        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" style={{
        padding: "100px 0",
        width: "90%",
        maxWidth: "1200px",
        margin: "0 auto"
      }}>
        
        <div style={{ textAlign: "center", marginBottom: "64px" }}>
          <span style={{ fontSize: "11px", fontWeight: "700", color: "#10b981", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Developer Feedback
          </span>
          <h2 style={{ fontSize: "36px", fontWeight: "800", letterSpacing: "-0.03em", marginTop: "12px" }}>
            Validated by global code architectures
          </h2>
        </div>

        <div className="grid-cols-responsive">
          
          <div className="glass-panel" style={{ padding: "32px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "220px" }}>
            <p style={{ fontSize: "14px", color: "#d1d5db", lineHeight: "1.6", fontStyle: "italic", margin: 0 }}>
              "Before WhyCode, understanding why an architectural pathway was built in 2024 took 3 days of Slack digging. Now we query the graph. Immediate productivity jump."
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "24px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#a855f7", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "13px" }}>
                DS
              </div>
              <div>
                <h4 style={{ fontSize: "13px", fontWeight: "700", margin: 0 }}>Daniel Spenser</h4>
                <span style={{ fontSize: "11px", color: "#6e6e73" }}>@spensercode (GitHub)</span>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "32px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "220px" }}>
            <p style={{ fontSize: "14px", color: "#d1d5db", lineHeight: "1.6", fontStyle: "italic", margin: 0 }}>
              "Integrates right into our GitHub pipelines. The AST explanations written to the markdown docs are surprisingly accurate. Onboarding new engineers is seamless."
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "24px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "13px" }}>
                TL
              </div>
              <div>
                <h4 style={{ fontSize: "13px", fontWeight: "700", margin: 0 }}>Tanya Lee</h4>
                <span style={{ fontSize: "11px", color: "#6e6e73" }}>@tanyacrypt (GitHub)</span>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "32px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "220px" }}>
            <p style={{ fontSize: "14px", color: "#d1d5db", lineHeight: "1.6", fontStyle: "italic", margin: 0 }}>
              "The self-hosted VPC deployment is exactly what our compliance team required. Total security, zero data leaks, with absolute intelligence capability."
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "24px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "13px" }}>
                RB
              </div>
              <div>
                <h4 style={{ fontSize: "13px", fontWeight: "700", margin: 0 }}>Rick Branden</h4>
                <span style={{ fontSize: "11px", color: "#6e6e73" }}>@rbranden_dev (GitHub)</span>
              </div>
            </div>
          </div>

        </div>

      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{
        padding: "100px 0",
        background: "#050505",
        borderTop: "1px solid rgba(255,255,255,0.03)",
        borderBottom: "1px solid rgba(255,255,255,0.03)"
      }}>
        <div style={{ width: "90%", maxWidth: "1200px", margin: "0 auto" }}>
          
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Transparent Models
            </span>
            <h2 style={{ fontSize: "36px", fontWeight: "800", letterSpacing: "-0.03em", marginTop: "12px" }}>
              Pricing scaled for active environments
            </h2>
          </div>

          <div className="grid-cols-responsive" style={{ maxWidth: "1000px", margin: "0 auto" }}>
            
            {/* Free tier */}
            <div className="glass-panel price-card">
              <div>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#6e6e73", textTransform: "uppercase", letterSpacing: "0.05em" }}>Developer</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px", margin: "16px 0" }}>
                  <span style={{ fontSize: "36px", fontWeight: "800" }}>$0</span>
                  <span style={{ fontSize: "13px", color: "#6e6e73" }}>/ forever</span>
                </div>
                <p style={{ fontSize: "13px", color: "#a1a1aa", marginBottom: "28px" }}>For individuals seeking basic repository context indexing.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}><Check size={14} color="#10b981" /> 1 Repository workspace</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}><Check size={14} color="#10b981" /> AST commit explanations</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}><Check size={14} color="#10b981" /> Local markdown outputs</div>
                </div>
              </div>
              <button 
                onClick={() => navigate("/company/signup")}
                style={{
                  width: "100%",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "10px",
                  padding: "12px",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#fff",
                  marginTop: "32px",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)"}
              >
                Start for Free
              </button>
            </div>

            {/* Team Tier (Recommended) */}
            <div className="glass-panel price-card recommended">
              <span className="price-badge">RECOMMENDED</span>
              <div>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.05em" }}>Team Workspace</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px", margin: "16px 0" }}>
                  <span style={{ fontSize: "36px", fontWeight: "800" }}>$19</span>
                  <span style={{ fontSize: "13px", color: "#6e6e73" }}>/ seat / mo</span>
                </div>
                <p style={{ fontSize: "13px", color: "#a1a1aa", marginBottom: "28px" }}>Centralized context mapping and sync logs for core projects.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}><Check size={14} color="#10b981" /> Unlimited repositories</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}><Check size={14} color="#10b981" /> Live Knowledge Graph updates</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}><Check size={14} color="#10b981" /> Slack & Teams webhook alerts</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}><Check size={14} color="#10b981" /> Vector-based natural language search</div>
                </div>
              </div>
              <button 
                onClick={() => navigate("/company/signup")}
                style={{
                  width: "100%",
                  background: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "12px",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#020202",
                  marginTop: "32px",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 15px rgba(255,255,255,0.3)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                Launch Team Hub
              </button>
            </div>

            {/* Custom Enterprise */}
            <div className="glass-panel price-card">
              <div>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#6e6e73", textTransform: "uppercase", letterSpacing: "0.05em" }}>Enterprise</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px", margin: "16px 0" }}>
                  <span style={{ fontSize: "36px", fontWeight: "800" }}>Custom</span>
                </div>
                <p style={{ fontSize: "13px", color: "#a1a1aa", marginBottom: "28px" }}>Self-hosted environments with robust security configurations.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}><Check size={14} color="#10b981" /> VPC self-hosted deployment</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}><Check size={14} color="#10b981" /> Custom SSO & SAML providers</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}><Check size={14} color="#10b981" /> Dedicated support engineer</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}><Check size={14} color="#10b981" /> SLA runtime guarantees</div>
                </div>
              </div>
              <button 
                onClick={() => navigate("/company/signup")}
                style={{
                  width: "100%",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "10px",
                  padding: "12px",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#fff",
                  marginTop: "32px",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)"}
              >
                Contact Sales
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* Accordion FAQs Section */}
      <section id="faq" style={{
        padding: "100px 0",
        width: "90%",
        maxWidth: "800px",
        margin: "0 auto"
      }}>
        
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h2 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.02em" }}>
            Frequently Asked Questions
          </h2>
        </div>

        <div>
          {faqs.map((faq, idx) => (
            <div 
              key={idx} 
              className={`faq-item ${activeFaq === idx ? "active" : ""}`}
              onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
            >
              <div className="faq-question">
                <span>{faq.q}</span>
                <ChevronDown 
                  size={16} 
                  style={{ 
                    transform: activeFaq === idx ? "rotate(180deg)" : "rotate(0deg)", 
                    transition: "transform 0.2s" 
                  }} 
                />
              </div>
              <div className="faq-answer">
                {faq.a}
              </div>
            </div>
          ))}
        </div>

      </section>

      {/* Footer */}
      <footer style={{
        background: "#020202",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "64px 0",
        color: "#6e6e73",
        fontSize: "13px"
      }}>
        <div style={{
          width: "90%",
          maxWidth: "1200px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1.5fr repeat(4, 1fr)",
          gap: "40px"
        }} className="hero-grid">
          
          {/* Logo & Info column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#fff" }}>
              <div style={{
                width: "24px",
                height: "24px",
                borderRadius: "6px",
                background: "linear-gradient(135deg, #10b981 0%, #8b5cf6 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <Code size={14} color="#000" strokeWidth={3} />
              </div>
              <span style={{ fontSize: "14px", fontWeight: "800", letterSpacing: "-0.03em" }}>WhyCode</span>
            </div>
            <p style={{ fontSize: "12px", lineHeight: "1.6", maxWidth: "240px", margin: 0 }}>
              The elite AI repository indexer built to document logical structure and engineering intent.
            </p>
            <span style={{ fontSize: "11px", color: "#4b5563", marginTop: "12px" }}>
              © 2026 WhyCode Technologies Inc.
            </span>
          </div>

          {/* Links columns */}
          <div>
            <h4 style={{ color: "#fff", fontSize: "12px", fontWeight: "700", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Resources</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <span className="nav-link" style={{ padding: 0, borderRadius: 0, fontSize: "12px" }}>API Docs</span>
              <span className="nav-link" style={{ padding: 0, borderRadius: 0, fontSize: "12px" }}>CLI Tools</span>
              <span className="nav-link" style={{ padding: 0, borderRadius: 0, fontSize: "12px" }}>Status logs</span>
              <span className="nav-link" style={{ padding: 0, borderRadius: 0, fontSize: "12px" }}>Integrations</span>
            </div>
          </div>

          <div>
            <h4 style={{ color: "#fff", fontSize: "12px", fontWeight: "700", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Community</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <span className="nav-link" style={{ padding: 0, borderRadius: 0, fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <GithubIcon size={12} /> GitHub
              </span>
              <span className="nav-link" style={{ padding: 0, borderRadius: 0, fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <MessageSquare size={12} /> Discord
              </span>
              <span className="nav-link" style={{ padding: 0, borderRadius: 0, fontSize: "12px" }}>Developer Forums</span>
              <span className="nav-link" style={{ padding: 0, borderRadius: 0, fontSize: "12px" }}>Roadmap</span>
            </div>
          </div>

          <div>
            <h4 style={{ color: "#fff", fontSize: "12px", fontWeight: "700", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Company</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <span className="nav-link" style={{ padding: 0, borderRadius: 0, fontSize: "12px" }}>About Us</span>
              <span className="nav-link" style={{ padding: 0, borderRadius: 0, fontSize: "12px" }}>Careers</span>
              <span className="nav-link" style={{ padding: 0, borderRadius: 0, fontSize: "12px" }}>Security Hub</span>
              <span className="nav-link" style={{ padding: 0, borderRadius: 0, fontSize: "12px" }}>Contact</span>
            </div>
          </div>

          <div>
            <h4 style={{ color: "#fff", fontSize: "12px", fontWeight: "700", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Legal</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <span className="nav-link" style={{ padding: 0, borderRadius: 0, fontSize: "12px" }}>Privacy Policy</span>
              <span className="nav-link" style={{ padding: 0, borderRadius: 0, fontSize: "12px" }}>Terms of Service</span>
              <span className="nav-link" style={{ padding: 0, borderRadius: 0, fontSize: "12px" }}>CCPA Disclosure</span>
            </div>
          </div>

        </div>
      </footer>

      {/* Watch Demo Modal Overlay */}
      {showDemoModal && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(12px)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px"
        }} onClick={() => setShowDemoModal(false)}>
          <div 
            style={{
              width: "100%",
              maxWidth: "800px",
              aspectRatio: "16/9",
              background: "#070707",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "20px",
              boxShadow: "0 50px 100px -20px rgba(0,0,0,0.9)",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              position: "absolute",
              top: 0, left: 0, right: 0, bottom: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "24px",
              background: "linear-gradient(rgba(0,0,0,0.1) 80%, rgba(0,0,0,0.8))"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#a1a1aa", fontSize: "12px" }}>
                <span>WhyCode Platform Demo</span>
                <span style={{ cursor: "pointer" }} onClick={() => setShowDemoModal(false)}>Close (Esc)</span>
              </div>

              <div style={{
                alignSelf: "center",
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#000",
                cursor: "pointer",
                boxShadow: "0 0 30px rgba(255,255,255,0.4)"
              }}>
                <Play size={24} fill="#000" style={{ transform: "translateX(2px)" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ height: "4px", background: "rgba(255,255,255,0.2)", borderRadius: "2px", width: "100%", position: "relative" }}>
                  <div style={{ height: "100%", width: "35%", background: "#10b981", borderRadius: "2px" }}></div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <Play size={14} fill="#fff" />
                    <span>0:42 / 2:30</span>
                  </div>
                  <span>1080p HD</span>
                </div>
              </div>
            </div>

            <div style={{
              position: "absolute",
              width: "300px",
              height: "300px",
              background: "radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)",
              filter: "blur(40px)",
              pointerEvents: "none"
            }} />
          </div>
        </div>
      )}

    </div>
  );
}

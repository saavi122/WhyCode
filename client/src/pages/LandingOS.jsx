import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Lenis from "lenis";
import { 
  Sparkles, Cpu, Layers, GitBranch, ArrowRight, MessageSquare, 
  HelpCircle, Check, CheckCircle2, TrendingUp, GitPullRequest, FileText, 
  Terminal, Lock, Settings, Shield, Activity, Users, Clock,
  ChevronRight, Database
} from "lucide-react";
import HeroTechBackground from "../components/HeroTechBackground";
import InteractiveProductShowcase from "../components/InteractiveProductShowcase";
import OrbitalTypeGlobe from "../components/OrbitalTypeGlobe";
import "./LandingOS.css";

export default function LandingOS() {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  // States for navbar visibility and scroll positions
  const [scrolled, setScrolled] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  // State for mouse hover coordinates
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Active showcase tab
  const [activeTab, setActiveTab] = useState("dashboard");
  const [activeNode, setActiveNode] = useState(null);
  const [activeIsland, setActiveIsland] = useState(null);

  // State for example interaction tab ('cited' or 'refusal')
  const [exampleTab, setExampleTab] = useState("cited");

  // Example interactions (obviously fictional names, no commit SHAs or PR numbers)
  const exampleData = {
    cited: {
      question: "How does the retry queue handle backoff?",
      answer: "The retry queue applies exponential backoff with randomized jitter to prevent server contention during transient errors.",
      citations: [
        { label: "src/utils/retry.js#L14-L38", type: "file" }
      ],
      isRefusal: false,
    },
    refusal: {
      question: "What is the Bitcoin lightning channel settlement logic?",
      answer: "I couldn't find sufficient evidence in the connected repository",
      citations: [],
      isRefusal: true,
    }
  };

  // Measured benchmark metrics from eval/REPORT.md (40 questions on 1 repository)
  const benchmarkStats = [
    { label: "DEV Split Recall@10", value: "85.0%", note: "40 questions on 1 repository" },
    { label: "DEV Split Recall@5", value: "70.0%", note: "40 questions on 1 repository" },
    { label: "Refusal Precision", value: "100%", note: "Out-of-scope queries (10/10)" },
    { label: "Citation Validity", value: "100%", note: "Pinned permalinks" },
  ];

  // Companies data
  const companies = [
    { name: "Stripe", icon: <Layers size={16} /> },
    { name: "Linear", icon: <Cpu size={16} /> },
    { name: "Vercel", icon: <Sparkles size={16} /> },
    { name: "Apple", icon: <Lock size={16} /> },
    { name: "Framer", icon: <Layers size={16} /> },
    { name: "GitHub", icon: <GitBranch size={16} /> },
    { name: "Datadog", icon: <Activity size={16} /> },
    { name: "MongoDB", icon: <Database size={16} /> }
  ];

  // How it works steps
  const workflowSteps = [
    { title: "Connect GitHub", desc: "Link repositories securely with standard OAuth in seconds.", step: "01" },
    { title: "Import Repository", desc: "Index full repository trees including branches and submodules.", step: "02" },
    { title: "Scan History", desc: "Map commit timelines, authors, and abstract syntax tree shifts.", step: "03" },
    { title: "Build Knowledge", desc: "Generate an intent-mapped knowledge graph using Gemini Models.", step: "04" },
    { title: "Detect Drift", desc: "Auto-scan code vs. comments and flag drift indices instantly.", step: "05" },
    { title: "Ask AI", desc: "Query repository logic with fully cited evidence backings.", step: "06" }
  ];

  // AI evidence streams data (obviously fictional example paths)
  const citations = [
    "src/utils/retry.js#L14-L38", "src/context/AuthContext.jsx#L10-L45", "src/components/Header.jsx#L5-L25",
    "src/services/api.js#L20-L50", "docs/ARCHITECTURE.md#L1-L30", "src/hooks/useData.js#L8-L24",
    "src/middleware/guard.js#L12-L36", "src/routes/appRoutes.jsx#L1-L40"
  ];

  // Features grid items
  const featuresList = [
    { title: "Documentation Drift", desc: "Identify docstrings that differ from AST changes." },
    { title: "Intent Reconstruction", desc: "Determine why lines of code exist using history graphs." },
    { title: "Knowledge Graph", desc: "Map how files connect structurally and historically." },
    { title: "Commit Timeline", desc: "Explore a chronologically aligned developer action log." },
    { title: "GitHub OAuth", desc: "Connect enterprise repositories with industry-standard safety." },
    { title: "AI Search", desc: "Contextual query system grounded in real evidence." },
    { title: "Repository Health", desc: "Evaluate overall logic health scores and structure." },
    { title: "Evidence-backed Answers", desc: "Every answer links directly to verified source line ranges." }
  ];

  // Initialize smooth scroll & navbar listener
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
    });

    let animId;
    function raf(time) {
      lenis.raf(time);
      animId = requestAnimationFrame(raf);
    }
    animId = requestAnimationFrame(raf);

    const onScroll = (e) => {
      const currentScrollY = e.scroll ?? window.scrollY ?? 0;
      if (currentScrollY > 60) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }

      if (currentScrollY > lastScrollYRef.current && currentScrollY > 120) {
        setNavVisible(false);
      } else {
        setNavVisible(true);
      }
      lastScrollYRef.current = currentScrollY;
    };

    lenis.on("scroll", onScroll);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      lenis.destroy();
    };
  }, []);

  // Handle mouse move for parallax coordinates
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
    setIsHovered(true);
  };

  // Navigation redirect handler
  const handleNavRedirect = (path) => {
    if (path.startsWith("http")) {
      window.location.href = path;
    } else {
      navigate(path);
    }
  };

  return (
    <div 
      className="landing-os-body" 
      ref={containerRef}
      onMouseMove={handleMouseMove}
    >
      {/* Futuristic Background Overlays */}
      <div className="noise-overlay" />

      {/* Large Custom Cursor Glow */}
      <div 
        className={`cursor-glow ${isHovered ? "active" : ""}`}
        style={{
          left: `${(mousePos.x + 0.5) * window.innerWidth}px`,
          top: `${(mousePos.y + 0.5) * window.innerHeight}px`
        }}
      />

      {/* =========================================
          NAVIGATION BAR
          ========================================= */}
      <header className={`navbar-floating ${navVisible ? "visible" : "hidden"}`}>
        <div className="nav-logo" onClick={() => handleNavRedirect("/")}>
          <GitBranch size={18} color="#00e5ff" style={{ filter: "drop-shadow(0 0 5px #00e5ff)" }} />
          <span>Why<span className="logo-accent">Code</span></span>
        </div>
        
        <nav className="nav-links">
          <a href="#product" className="nav-link">Product</a>
          <a href="#how-it-works" className="nav-link">How It Works</a>
          <a href="#architecture" className="nav-link">Architecture</a>
          <a href="#features" className="nav-link">Features</a>
          <a href="/pricing" onClick={(e) => { e.preventDefault(); handleNavRedirect("/pricing"); }} className="nav-link">Pricing</a>
        </nav>

        <div className="nav-actions">
          <button 
            className="btn-nav btn-nav-secondary" 
            onClick={() => handleNavRedirect("/company/login")}
          >
            Login
          </button>
          <button 
            className="btn-nav btn-nav-primary"
            onClick={() => handleNavRedirect("/company/signup")}
          >
            Get Started
          </button>
        </div>
      </header>

      {/* =========================================
          HERO SECTION (100vh)
          ========================================= */}
      {/* =========================================
          HERO SECTION (CENTERED TRIPTYCH DASHBOARD)
          ========================================= */}
      <section className="hero-section" id="product">
        {/* Minimal Premium Tech Background for Hero */}
        <HeroTechBackground />

        <div className="hero-split-wrapper">
          {/* Left Column: WhyCode Hero Copy & CTAs */}
          <div className="hero-text-col">
            {/* 1. Header Badge */}
            <div className="hero-split-badge">
              <span className="hero-split-badge-dot" />
              <span>PRESERVE CONTEXT. EMPOWER TEAMS.</span>
            </div>

            {/* 2. Headline */}
            <h1 className="hero-split-headline">
              <span className="hero-line-reveal block" style={{ color: "#F5F1E8" }}>Your codebase</span>
              <span className="hero-line-reveal block" style={{ color: "#F5F1E8" }}>remembers.</span>
              <span className="hero-line-reveal block hero-headline-highlight">Your team doesn't.</span>
            </h1>

            {/* 3. Subtitle */}
            <p className="hero-split-desc">
              WhyCode captures the intent behind your code across commits, pull requests, discussions and documentation, so engineering knowledge never gets lost.
            </p>

            {/* 4. Action Buttons */}
            <div className="hero-split-actions">
              <div 
                className="magnetic-btn-wrap"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <button 
                  className="btn-whycode-primary"
                  onClick={() => handleNavRedirect("/company/signup")}
                  style={{
                    transform: isHovered ? `translate(${mousePos.x * 12}px, ${mousePos.y * 12}px) scale(1.03)` : "none"
                  }}
                >
                  <span>Get Started Free</span>
                  <ArrowRight size={16} />
                </button>
              </div>

              <div 
                className="magnetic-btn-wrap"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <button 
                  className="btn-whycode-secondary"
                  style={{
                    transform: isHovered ? `translate(${mousePos.x * 8}px, ${mousePos.y * 8}px)` : "none"
                  }}
                  onClick={() => {
                    const el = document.getElementById("how-it-works");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <span>Explore GitHub</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: React Bits Pro Orbital Type 3D Globe */}
          <div className="hero-globe-col">
            <OrbitalTypeGlobe width={490} height={490} />
          </div>
        </div>

        <div className="hero-scroll-indicator">
          <span>Scroll to explore</span>
          <div className="scroll-mouse">
            <div className="scroll-wheel" />
          </div>
        </div>
      </section>

      {/* =========================================
          TRUSTED COMPANIES SLIDER
          ========================================= */}
      <section className="logos-section">
        <div className="logos-slider">
          {[...companies, ...companies].map((company, index) => (
            <div key={index} className="logo-card">
              {company.icon}
              <span>{company.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================
          ARCHITECTURE SECTION (NETWORK GRAPH)
          ========================================= */}
      <section className="architecture-section" id="architecture">
        <div className="section-header">
          <div className="hero-badge">
            <span className="hero-badge-dot" style={{ backgroundColor: "#00e5ff", boxShadow: "0 0 8px #00e5ff" }}></span>
            <span>Data Ingestion Schema</span>
          </div>
          <h2 className="section-title">Continuous Context Extraction</h2>
          <p className="section-desc">
            How code transitions, commit comments, and PR contexts translate into searchable repository intelligence.
          </p>
        </div>

        <div className="network-container">
          <svg className="network-svg" viewBox="0 0 900 450">
            <defs>
              <linearGradient id="path-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00e5ff" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            
            {/* Background glowing connection tracks (highlights active connections on hover) */}
            <path d="M 450,40 L 450,130" className="network-track-bg" style={{ stroke: activeNode === "github" || activeNode === "backend" ? "rgba(0, 229, 255, 0.4)" : "rgba(79, 70, 229, 0.12)" }} />
            <path d="M 450,130 L 250,220" className="network-track-bg" style={{ stroke: activeNode === "backend" || activeNode === "mongo" ? "rgba(0, 229, 255, 0.4)" : "rgba(79, 70, 229, 0.12)" }} />
            <path d="M 450,130 L 650,220" className="network-track-bg" style={{ stroke: activeNode === "backend" || activeNode === "gemini" ? "rgba(139, 92, 246, 0.4)" : "rgba(79, 70, 229, 0.12)" }} />
            <path d="M 250,220 L 450,310" className="network-track-bg" style={{ stroke: activeNode === "mongo" || activeNode === "graph" ? "rgba(0, 229, 255, 0.4)" : "rgba(79, 70, 229, 0.12)" }} />
            <path d="M 650,220 L 450,310" className="network-track-bg" style={{ stroke: activeNode === "gemini" || activeNode === "graph" ? "rgba(139, 92, 246, 0.4)" : "rgba(79, 70, 229, 0.12)" }} />
            <path d="M 450,310 L 450,400" className="network-track-bg" style={{ stroke: activeNode === "graph" || activeNode === "dashboard" ? "rgba(139, 92, 246, 0.4)" : "rgba(79, 70, 229, 0.12)" }} />

            {/* Glowing active wire dashed lines */}
            <path d="M 450,40 L 450,130" className="network-track-wire" />
            <path d="M 450,130 L 250,220" className="network-track-wire" />
            <path d="M 450,130 L 650,220" className="network-track-wire" />
            <path d="M 250,220 L 450,310" className="network-track-wire" />
            <path d="M 650,220 L 450,310" className="network-track-wire" />
            <path d="M 450,310 L 450,400" className="network-track-wire" />

            {/* Animated data packets (glowing flow circles) */}
            <circle r="4.5" fill="#00e5ff" className="network-packet">
              <animateMotion dur="2.8s" repeatCount="indefinite" path="M 450,40 L 450,130" />
            </circle>
            <circle r="4.5" fill="#00e5ff" className="network-packet">
              <animateMotion dur="3.5s" repeatCount="indefinite" path="M 450,130 L 250,220" />
            </circle>
            <circle r="4.5" fill="#8b5cf6" className="network-packet-violet">
              <animateMotion dur="3.5s" repeatCount="indefinite" path="M 450,130 L 650,220" />
            </circle>
            <circle r="4.5" fill="#00e5ff" className="network-packet">
              <animateMotion dur="3.5s" repeatCount="indefinite" path="M 250,220 L 450,310" />
            </circle>
            <circle r="4.5" fill="#8b5cf6" className="network-packet-violet">
              <animateMotion dur="3.5s" repeatCount="indefinite" path="M 650,220 L 450,310" />
            </circle>
            <circle r="4.5" fill="#8b5cf6" className="network-packet-violet">
              <animateMotion dur="2.8s" repeatCount="indefinite" path="M 450,310 L 450,400" />
            </circle>
          </svg>

          <div className="network-nodes">
            {/* Row 1: Source */}
            <div 
              className="network-node node-vertical"
              onMouseEnter={() => setActiveNode("github")}
              onMouseLeave={() => setActiveNode(null)}
              style={{ 
                left: "50%", 
                top: "8.8%",
                boxShadow: activeNode === "github" ? "0 0 25px #00e5ff" : "none",
                borderColor: activeNode === "github" ? "#00e5ff" : "var(--glass-border)"
              }}
            >
              <GitBranch size={20} />
              <span className="node-desc">GitHub</span>
              <div className="node-pulse-ring" />
            </div>

            {/* Row 2: Ingestion Server */}
            <div 
              className="network-node node-vertical"
              onMouseEnter={() => setActiveNode("backend")}
              onMouseLeave={() => setActiveNode(null)}
              style={{ 
                left: "50%", 
                top: "28.8%",
                boxShadow: activeNode === "backend" ? "0 0 25px #8b5cf6" : "none",
                borderColor: activeNode === "backend" ? "#8b5cf6" : "var(--glass-border)"
              }}
            >
              <Cpu size={20} />
              <span className="node-desc">Backend</span>
            </div>

            {/* Row 3: Dual pipelines */}
            <div 
              className="network-node node-left"
              onMouseEnter={() => setActiveNode("mongo")}
              onMouseLeave={() => setActiveNode(null)}
              style={{ 
                left: "27.7%", 
                top: "48.8%",
                boxShadow: activeNode === "mongo" ? "0 0 25px #00e5ff" : "none",
                borderColor: activeNode === "mongo" ? "#00e5ff" : "var(--glass-border)"
              }}
            >
              <Database size={20} />
              <span className="node-desc">MongoDB</span>
            </div>

            <div 
              className="network-node node-right"
              onMouseEnter={() => setActiveNode("gemini")}
              onMouseLeave={() => setActiveNode(null)}
              style={{ 
                left: "72.2%", 
                top: "48.8%",
                boxShadow: activeNode === "gemini" ? "0 0 25px #8b5cf6" : "none",
                borderColor: activeNode === "gemini" ? "#8b5cf6" : "var(--glass-border)"
              }}
            >
              <Sparkles size={20} />
              <span className="node-desc">Gemini</span>
            </div>

            {/* Row 4: Processing node */}
            <div 
              className="network-node node-vertical"
              onMouseEnter={() => setActiveNode("graph")}
              onMouseLeave={() => setActiveNode(null)}
              style={{ 
                left: "50%", 
                top: "68.8%",
                boxShadow: activeNode === "graph" ? "0 0 25px #00e5ff" : "none",
                borderColor: activeNode === "graph" ? "#00e5ff" : "var(--glass-border)"
              }}
            >
              <Layers size={20} />
              <span className="node-desc">Knowledge Graph</span>
            </div>

            {/* Row 5: Dashboard Output */}
            <div 
              className="network-node node-vertical"
              onMouseEnter={() => setActiveNode("dashboard")}
              onMouseLeave={() => setActiveNode(null)}
              style={{ 
                left: "50%", 
                top: "88.8%",
                boxShadow: activeNode === "dashboard" ? "0 0 25px #8b5cf6" : "none",
                borderColor: activeNode === "dashboard" ? "#8b5cf6" : "var(--glass-border)"
              }}
            >
              <Terminal size={20} />
              <span className="node-desc">Dashboard</span>
              <div className="node-pulse-ring" />
            </div>
          </div>
        </div>
      </section>

      {/* =========================================
          HOW IT WORKS (FLOATING ISLANDS)
          ========================================= */}
      <section className="how-it-works-section" id="how-it-works">
        <div className="section-header">
          <div className="hero-badge">
            <span className="hero-badge-dot" style={{ backgroundColor: "#8b5cf6", boxShadow: "0 0 8px #8b5cf6" }}></span>
            <span>Workflow Flowchart</span>
          </div>
          <h2 className="section-title">Simple integration logic</h2>
          <p className="section-desc">
            Getting repository context explanations is built around six easy floating steps.
          </p>
        </div>

        <div className="islands-grid">
          {workflowSteps.map((step, idx) => (
            <div 
              key={idx} 
              className="island-card"
              onMouseEnter={() => setActiveIsland(idx)}
              onMouseLeave={() => setActiveIsland(null)}
              style={{
                transform: activeIsland === idx ? "translateY(-10px) scale(1.03)" : "none"
              }}
            >
              <div className="island-step">Step {step.step}</div>
              <h3 className="island-title">{step.title}</h3>
              <p className="island-desc">{step.desc}</p>
              <div className="island-icon">
                <Cpu size={24} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================
          PRODUCT SHOWCASE (INTERACTIVE DEMO)
          ========================================= */}
      <section className="showcase-section" id="showcase">
        <div className="section-header">
          <div className="hero-badge">
            <span className="hero-badge-dot" style={{ backgroundColor: "#00e5ff", boxShadow: "0 0 8px #00e5ff" }}></span>
            <span>Interactive Demo</span>
          </div>
          <h2 className="section-title">See WhyCode understand your codebase.</h2>
          <p className="section-desc">
            Explore repository intelligence, engineering context, and documentation health in one workspace.
          </p>
        </div>

        <InteractiveProductShowcase />
      </section>

      {/* =========================================
          AI SECTION (EVERY ANSWER HAS EVIDENCE)
          ========================================= */}
      <section className="ai-section">
        <div className="section-header" style={{ marginBottom: "40px" }}>
          <div className="hero-badge">
            <span className="hero-badge-dot" style={{ backgroundColor: "#8b5cf6", boxShadow: "0 0 8px #8b5cf6" }}></span>
            <span>Proof of Logic</span>
          </div>
          <h2 className="section-title" style={{ fontSize: "3.5rem" }}>Every answer has evidence.</h2>
          <p className="section-desc">
            No hallucinations. Every answer cites exact file paths and line ranges grounded in connected repository source.
          </p>
        </div>

        <div className="citations-marquee">
          <div className="marquee-row marquee-row-left">
            {[...citations, ...citations].map((cite, i) => (
              <div key={i} className="citation-card">
                <FileText size={12} color="#00e5ff" />
                <span>{cite}</span>
              </div>
            ))}
          </div>

          <div className="marquee-row marquee-row-right">
            {[...citations, ...citations].map((cite, i) => (
              <div key={i} className="citation-card">
                <FileText size={12} color="#8b5cf6" />
                <span>{cite}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="text-center text-[10px] text-[#71717a] mt-4 italic">
          * Illustrative example, not real data
        </div>
      </section>

      {/* =========================================
          FEATURES CAPSULES (PILLS)
          ========================================= */}
      <section className="features-section" id="features">
        <div className="section-header">
          <h2 className="section-title">Robust platform utilities</h2>
          <p className="section-desc">
            All elements built from the ground up to support modern git development flows.
          </p>
        </div>

        <div className="capsules-grid">
          {featuresList.map((feat, idx) => (
            <div key={idx} className="feature-capsule">
              <Sparkles size={16} color="#00e5ff" />
              <span>{feat.title}</span>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================
          TESTIMONIALS (FLOATING BUBBLES)
          ========================================= */}
      <section className="testimonials-section">
        <div className="section-header">
          <h2 className="section-title">Developer feedbacks</h2>
          <p className="section-desc">
            How teammates across organizations use WhyCode to expedite codebase onboarding.
          </p>
        </div>

        <div className="bubbles-container">
          <div 
            className="testimonial-bubble"
            style={{
              top: "10%",
              left: "5%",
              transform: `translate(${mousePos.x * 15}px, ${mousePos.y * 25}px)`
            }}
          >
            <div className="bubble-author">
              <div className="bubble-avatar">JD</div>
              <div>
                <div className="bubble-name">John Doe</div>
                <div className="bubble-company">Principal Engineer, Stripe</div>
              </div>
            </div>
            <p className="bubble-text">
              "WhyCode saved me hours of going through git history. I just ask the AI and it shows me the exact PR description."
            </p>
          </div>

          <div 
            className="testimonial-bubble"
            style={{
              top: "35%",
              right: "8%",
              transform: `translate(${-mousePos.x * 20}px, ${mousePos.y * 15}px)`
            }}
          >
            <div className="bubble-author">
              <div className="bubble-avatar" style={{ background: "linear-gradient(135deg, var(--color-violet), var(--color-indigo))" }}>AM</div>
              <div>
                <div className="bubble-name">Anna Martinez</div>
                <div className="bubble-company">Engineering Lead, Linear</div>
              </div>
            </div>
            <p className="bubble-text">
              "We connected our repos in 5 minutes. The drift detector instantly caught three outdated documentation pages."
            </p>
          </div>

          <div 
            className="testimonial-bubble"
            style={{
              bottom: "5%",
              left: "35%",
              transform: `translate(${mousePos.x * 25}px, ${-mousePos.y * 10}px)`
            }}
          >
            <div className="bubble-author">
              <div className="bubble-avatar">SG</div>
              <div>
                <div className="bubble-name">Sam Green</div>
                <div className="bubble-company">Staff Architect, Vercel</div>
              </div>
            </div>
            <p className="bubble-text">
              "Having our engineering memory auto-update on every PR merge is extremely valuable. Perfect for onboarding new hires."
            </p>
          </div>
        </div>
      </section>

      {/* =========================================
          FINAL CALL TO ACTION
          ========================================= */}
      <section className="cta-banner-section">
        <div className="cta-banner-container">
          <div className="hero-split-badge">
            <span className="hero-split-badge-dot"></span>
            <span>Get Started with WhyCode</span>
          </div>
          <h2 className="cta-banner-title">
            Give your code a memory.
          </h2>
          <p className="cta-banner-sub">
            Connect your repository in under 2 minutes. Stop guessing why code was written and start knowing.
          </p>
          <div className="cta-banner-actions">
            <button 
              className="btn-whycode-primary"
              onClick={() => handleNavRedirect("/company/signup")}
            >
              <span>Get Started Free</span>
              <ArrowRight size={16} />
            </button>
            <a 
              href="https://github.com/saavi122/WhyCode"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whycode-secondary"
            >
              <GitBranch size={16} />
              <span>Explore GitHub</span>
            </a>
          </div>
        </div>
      </section>

      {/* =========================================
          MASSIVE CINEMATIC FOOTER
          ========================================= */}
      <footer className="footer-cinematic">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="nav-logo" onClick={() => handleNavRedirect("/")}>
              <GitBranch size={20} color="#00e5ff" />
              <span>Why<span className="logo-accent">Code</span></span>
            </div>
            <p className="footer-tagline">
              Reconstructing engineering decisions from commits, pull requests, and repository history automatically.
            </p>
          </div>

          <div className="footer-links-grid">
            <div className="footer-column">
              <span className="footer-col-title">Product</span>
              <a href="#product" className="footer-col-link">Features</a>
              <a href="#architecture" className="footer-col-link">Architecture</a>
              <a href="/pricing" onClick={(e) => { e.preventDefault(); handleNavRedirect("/pricing"); }} className="footer-col-link">Pricing</a>
            </div>
            <div className="footer-column">
              <span className="footer-col-title">Resources</span>
              <a href="https://github.com/saavi122/WhyCode" target="_blank" rel="noopener noreferrer" className="footer-col-link">GitHub</a>
              <a href="#docs" className="footer-col-link">Documentation</a>
              <a href="#privacy" className="footer-col-link">Privacy Policy</a>
            </div>
          </div>
        </div>

        <div className="footer-huge-text">
          WHYCODE
        </div>

        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} WhyCode Inc. All rights reserved.</span>
          <div className="footer-socials">
            <a href="https://github.com/saavi122/WhyCode" target="_blank" rel="noopener noreferrer" className="footer-social-link">GitHub</a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="footer-social-link">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

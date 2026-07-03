import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Lenis from "lenis";
import { 
  Sparkles, Cpu, Layers, GitBranch, ArrowRight, Search, MessageSquare, 
  HelpCircle, Check, CheckCircle2, TrendingUp, GitPullRequest, FileText, 
  Terminal, ArrowUpRight, Lock, Settings, Shield, Activity, Users, Clock,
  ChevronRight, Database
} from "lucide-react";
import "./LandingOS.css";

export default function LandingOS() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // States for navbar visibility and scroll positions
  const [scrolled, setScrolled] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // State for mouse hover coordinates
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Active showcase tab
  const [activeTab, setActiveTab] = useState("dashboard");

  // Dynamic Metrics ticking state
  const [metrics, setMetrics] = useState({
    repos: 2847,
    nodes: 1.81,
    commits: 48.1,
    hours: 1.3
  });

  // State for simulation of Knowledge Chat typing
  const [chatProgress, setChatProgress] = useState(0);
  const [chatAnswerVisible, setChatAnswerVisible] = useState(false);
  const chatQuestion = "Why does retryQueue use exponential backoff?";
  const chatAnswer = "To prevent thundering herd problems by adding randomized jitter, ensuring the backend server recovers during load spikes.";

  // State for active island in How it works
  const [activeIsland, setActiveIsland] = useState(null);

  // State for active node in architecture
  const [activeNode, setActiveNode] = useState(null);

  // Initialize Lenis Smooth Scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  // Track scroll direction for Navbar visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrolled(currentScrollY > 50);

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setNavVisible(false);
      } else {
        setNavVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Track cursor position for interactive glows
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    // Normalized coordinates (-0.5 to 0.5) from center
    const x = clientX / innerWidth - 0.5;
    const y = clientY / innerHeight - 0.5;
    setMousePos({ x, y });

    // Track mouse globally in CSS variables
    document.documentElement.style.setProperty("--mouse-global-x", `${clientX}px`);
    document.documentElement.style.setProperty("--mouse-global-y", `${clientY}px`);
  };

  // HTML5 Canvas Waterfall and Water Ripples Background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Ripple collection
    const ripples = [];
    const createRipple = (x, y, color) => {
      ripples.push({
        x,
        y,
        r: 1,
        maxR: 120 + Math.random() * 100, // slightly larger ripples for better visibility
        speed: 0.6 + Math.random() * 1.0,
        color: color || "rgba(0, 229, 255, 0.45)",
        alpha: 1
      });
    };

    const createSoftRipple = (x, y, color) => {
      ripples.push({
        x,
        y,
        r: 1,
        maxR: 45 + Math.random() * 25, // smaller max radius for soft raindrop look!
        speed: 0.4 + Math.random() * 0.4, // slower expansion speed
        color: color || "rgba(0, 229, 255, 0.35)",
        alpha: 1
      });
    };

    // Droplet rebound collection
    const droplets = [];
    const createDroplet = (x, y, color) => {
      droplets.push({
        x,
        startY: y,
        y: y,
        vy: -2.0 - Math.random() * 1.8, // initial upward bounce speed
        gravity: 0.12, // gravity pulling it down
        size: 1.5 + Math.random() * 1.5,
        color: color || "rgba(0, 229, 255, 0.8)"
      });
    };

    let time = 0;

    let mouseCanvasPos = { x: -1000, y: -1000 };
    const handleMouseMoveCanvas = (e) => {
      mouseCanvasPos.x = e.clientX;
      mouseCanvasPos.y = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMoveCanvas);

    const render = () => {
      time += 0.008;
      // Semi-transparent overlay to keep smooth trailing cascade flows
      ctx.fillStyle = "rgba(4, 4, 4, 0.09)";
      ctx.fillRect(0, 0, width, height);

      // Render special Indigo Waterfall column hitting the hero right card
      const targetEl = document.querySelector(".hero-right-card");
      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        if (rect.top > -300 && rect.top < height + 100) {
          const cardCenterX = rect.left + rect.width * 0.5;
          const beamTopY = 0; // cascading from top of viewport
          const beamBottomY = rect.top + window.scrollY;

          // Create the horizontal gradient for the volumetric pillar (white core in center, cyan mid, indigo edges)
          const leftX = rect.left - 30;
          const rightX = rect.right + 30;
          const hzGrad = ctx.createLinearGradient(leftX, 0, rightX, 0);
          hzGrad.addColorStop(0, "rgba(79, 70, 229, 0)");
          hzGrad.addColorStop(0.2, "rgba(79, 70, 229, 0.15)");
          hzGrad.addColorStop(0.4, "rgba(0, 229, 255, 0.55)");
          hzGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.95)"); // intense white core center
          hzGrad.addColorStop(0.6, "rgba(0, 229, 255, 0.55)");
          hzGrad.addColorStop(0.8, "rgba(79, 70, 229, 0.15)");
          hzGrad.addColorStop(1, "rgba(79, 70, 229, 0)");

          // 1. Draw blurred outer volumetric glow aura
          ctx.filter = "blur(18px)";
          ctx.beginPath();
          ctx.moveTo(cardCenterX - 18, beamTopY);
          ctx.bezierCurveTo(
            cardCenterX - 6 + Math.sin(time * 3) * 4, beamBottomY * 0.45,
            cardCenterX - 50 + Math.sin(time * 2) * 10, beamBottomY * 0.82,
            rect.left - 25, beamBottomY
          );
          ctx.lineTo(rect.right + 25, beamBottomY);
          ctx.bezierCurveTo(
            cardCenterX + 50 + Math.cos(time * 2) * 10, beamBottomY * 0.82,
            cardCenterX + 6 + Math.cos(time * 3) * 4, beamBottomY * 0.45,
            cardCenterX + 18, beamTopY
          );
          ctx.closePath();
          ctx.fillStyle = hzGrad;
          ctx.fill();

          // 2. Draw slightly sharper inner glowing liquid core
          ctx.filter = "blur(6px)";
          ctx.beginPath();
          ctx.moveTo(cardCenterX - 8, beamTopY);
          ctx.bezierCurveTo(
            cardCenterX - 3 + Math.sin(time * 3) * 2, beamBottomY * 0.45,
            cardCenterX - 20 + Math.sin(time * 2) * 6, beamBottomY * 0.82,
            rect.left + 15, beamBottomY
          );
          ctx.lineTo(rect.right - 15, beamBottomY);
          ctx.bezierCurveTo(
            cardCenterX + 20 + Math.cos(time * 2) * 6, beamBottomY * 0.82,
            cardCenterX + 3 + Math.cos(time * 3) * 2, beamBottomY * 0.45,
            cardCenterX + 8, beamTopY
          );
          ctx.closePath();
          ctx.fillStyle = hzGrad;
          ctx.fill();

          // 2.5 Draw moving vertical flow waves inside the column using masking composite operation (creates downward waterfall movement!)
          ctx.globalCompositeOperation = "source-atop";
          ctx.filter = "blur(14px)";
          const waveSpacing = 160;
          const speed = 260; // Downward flow speed in pixels per second
          const startY = beamTopY - 200;
          const endY = beamBottomY + 200;
          const totalDist = endY - startY;

          for (let yOffset = (time * speed) % waveSpacing; yOffset < totalDist; yOffset += waveSpacing) {
            const waveY = startY + yOffset;

            // Bright horizontal glowing wave sliding down
            const waveGrad = ctx.createRadialGradient(cardCenterX, waveY, 5, cardCenterX, waveY, 80);
            waveGrad.addColorStop(0, "rgba(255, 255, 255, 0.8)");
            waveGrad.addColorStop(0.35, "rgba(0, 229, 255, 0.55)");
            waveGrad.addColorStop(1, "rgba(0, 229, 255, 0)");

            ctx.fillStyle = waveGrad;
            ctx.beginPath();
            ctx.ellipse(cardCenterX, waveY, 120, 30, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalCompositeOperation = "source-over"; // Reset composite operation

          // 3. Draw a few subtle flowing stream threads inside the column for water texture
          ctx.filter = "none"; // Reset filter
          const numThreads = 6;
          for (let i = 0; i < numThreads; i++) {
            const pct = i / (numThreads - 1);
            const topX = cardCenterX + (i - numThreads / 2) * 1.5 + Math.sin(time * 2 + i) * 1.2;
            const bottomX = rect.left + rect.width * pct + Math.sin(time * 3 + i) * 2;

            ctx.beginPath();
            ctx.moveTo(topX, beamTopY);
            
            const cp1x = cardCenterX + (pct - 0.5) * 10 + Math.sin(time * 1.8 + i * 0.4) * 6;
            const cp1y = beamBottomY * 0.45;
            const cp2x = cardCenterX + (pct - 0.5) * rect.width * 0.65 + Math.cos(time * 2 + i * 0.3) * 12;
            const cp2y = beamBottomY * 0.8;
            
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, bottomX, beamBottomY);
            ctx.strokeStyle = i % 2 === 0 ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 229, 255, 0.3)";
            ctx.lineWidth = i % 2 === 0 ? 1.0 : 1.6;
            ctx.stroke();
          }

          // 3. Draw landing splash highlights (flat perspective-compressed ellipse)
          const splashGlow = ctx.createRadialGradient(cardCenterX, beamBottomY, 5, cardCenterX, beamBottomY, 80);
          splashGlow.addColorStop(0, "rgba(255, 255, 255, 0.95)");
          splashGlow.addColorStop(0.2, "rgba(0, 229, 255, 0.75)");
          splashGlow.addColorStop(0.6, "rgba(79, 70, 229, 0.35)");
          splashGlow.addColorStop(1, "rgba(79, 70, 229, 0)");
          
          ctx.beginPath();
          ctx.ellipse(cardCenterX, beamBottomY, 80, 24, 0, 0, Math.PI * 2);
          ctx.fillStyle = splashGlow;
          ctx.fill();

          // 4. Draw split flows running down the left and right borders of the card (wiggling trickle!)
          const flowBaseY = height - 85; // Raised slightly to ensure ripples are fully visible above screen bottom

          // Left split flow border (wavy water trickle)
          ctx.beginPath();
          ctx.moveTo(rect.left, rect.top + window.scrollY);
          for (let y = rect.top + window.scrollY; y <= flowBaseY; y += 12) {
            const waveX = rect.left + Math.sin(y * 0.055 + time * 6.5) * 1.8;
            ctx.lineTo(waveX, y);
          }
          ctx.strokeStyle = "rgba(79, 70, 229, 0.4)";
          ctx.lineWidth = 4.5;
          ctx.shadowBlur = 8;
          ctx.shadowColor = "rgba(79, 70, 229, 0.4)";
          ctx.stroke();

          ctx.strokeStyle = "rgba(0, 229, 255, 0.8)";
          ctx.lineWidth = 1.8;
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Right split flow border (wavy water trickle)
          ctx.beginPath();
          ctx.moveTo(rect.right, rect.top + window.scrollY);
          for (let y = rect.top + window.scrollY; y <= flowBaseY; y += 12) {
            const waveX = rect.right + Math.sin(y * 0.055 - time * 6.5) * 1.8;
            ctx.lineTo(waveX, y);
          }
          ctx.strokeStyle = "rgba(79, 70, 229, 0.4)";
          ctx.lineWidth = 4.5;
          ctx.shadowBlur = 8;
          ctx.shadowColor = "rgba(79, 70, 229, 0.4)";
          ctx.stroke();

          ctx.strokeStyle = "rgba(0, 229, 255, 0.8)";
          ctx.lineWidth = 1.8;
          ctx.stroke();
          ctx.shadowBlur = 0;

          // 5. Draw 3 animated glowing drops sliding down the split side paths for heavy stream look
          const dropOffsets = [0, 0.33, 0.66];
          dropOffsets.forEach((offset) => {
            const dropYLeft = ((time + offset) * 130) % (flowBaseY - (rect.top + window.scrollY)) + (rect.top + window.scrollY);
            const dropYRight = ((time + offset + 0.16) * 130) % (flowBaseY - (rect.top + window.scrollY)) + (rect.top + window.scrollY);

            ctx.beginPath();
            ctx.arc(rect.left, dropYLeft, 3.2, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(0, 229, 255, 0.95)";
            ctx.fill();

            ctx.beginPath();
            ctx.arc(rect.right, dropYRight, 3.2, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(139, 92, 246, 0.95)";
            ctx.fill();
          });

          // 6. Spawn soft ripples and rebound droplets at the base of the Hero section (increased frequency)
          if (Math.random() < 0.16) {
            createSoftRipple(rect.left, flowBaseY, "rgba(0, 229, 255, 0.45)");
            createDroplet(rect.left, flowBaseY, "rgba(0, 229, 255, 0.85)");
          }
          if (Math.random() < 0.16) {
            createSoftRipple(rect.right, flowBaseY, "rgba(139, 92, 246, 0.4)");
            createDroplet(rect.right, flowBaseY, "rgba(139, 92, 246, 0.85)");
          }
        }
      }

      // Update and draw physics rebound droplets
      for (let i = droplets.length - 1; i >= 0; i--) {
        const d = droplets[i];
        d.vy += d.gravity;
        d.y += d.vy;

        // Draw droplet (smooth glowing circle)
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
        ctx.fillStyle = d.color;
        ctx.fill();

        // Droplet specular highlight
        ctx.beginPath();
        ctx.arc(d.x - d.size * 0.3, d.y - d.size * 0.3, d.size * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        // Detect collision with landing plane startY
        if (d.y >= d.startY && d.vy > 0) {
          // Spawn tiny secondary ripples when the drop splashes back down!
          createSoftRipple(d.x, d.startY, d.color.replace(/[\d.]+\)$/, "0.35)"));
          droplets.splice(i, 1);
        }
      }

      // Draw and update active ripples using perspective horizontal ellipses
      for (let i = ripples.length - 1; i >= 0; i--) {
        const ripple = ripples[i];
        ripple.r += ripple.speed;
        ripple.alpha = 1 - ripple.r / ripple.maxR;

        if (ripple.alpha <= 0) {
          ripples.splice(i, 1);
          continue;
        }

        const aspect = 0.32; // Perspective compression (flat horizontal water effect!)

        // 1. Soft glowing outer outline
        ctx.beginPath();
        ctx.ellipse(ripple.x, ripple.y, ripple.r, ripple.r * aspect, 0, 0, Math.PI * 2);
        ctx.strokeStyle = ripple.color.replace(/[\d.]+\)$/, `${ripple.alpha * 0.25})`);
        ctx.lineWidth = 4.0;
        ctx.stroke();

        // 2. Core sharp highlight
        ctx.beginPath();
        ctx.ellipse(ripple.x, ripple.y, ripple.r, ripple.r * aspect, 0, 0, Math.PI * 2);
        ctx.strokeStyle = ripple.color.replace(/[\d.]+\)$/, `${ripple.alpha * 0.85})`);
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // 3. Offset dark refraction line (adds depth/volume to the ripple crest!)
        ctx.beginPath();
        const darkR = Math.max(0.1, ripple.r - 1.5);
        ctx.ellipse(ripple.x, ripple.y + 1.2, darkR, darkR * aspect, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(4, 4, 10, ${ripple.alpha * 0.35})`;
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Spawns ripple on page click
    const handleMouseClick = (e) => {
      // Ignore click ripples below the first page (Hero section)
      if (e.clientY + window.scrollY > window.innerHeight) return;

      createRipple(e.clientX, e.clientY + window.scrollY, "rgba(0, 229, 255, 0.65)");
      // Spawn 3 small droplets flying upwards on click
      for (let i = 0; i < 3; i++) {
        createDroplet(
          e.clientX + (Math.random() - 0.5) * 12, 
          e.clientY + window.scrollY, 
          Math.random() > 0.5 ? "rgba(0, 229, 255, 0.85)" : "rgba(139, 92, 246, 0.85)"
        );
      }
    };
    window.addEventListener("click", handleMouseClick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("click", handleMouseClick);
      window.removeEventListener("mousemove", handleMouseMoveCanvas);
    };
  }, []);

  // Simulate Knowledge Chat typing loop
  useEffect(() => {
    const typingInterval = setInterval(() => {
      setChatProgress((prev) => {
        if (prev < chatQuestion.length) {
          return prev + 1;
        } else {
          // Pause, then reveal answer
          if (!chatAnswerVisible) {
            setTimeout(() => setChatAnswerVisible(true), 600);
          }
          // Reset cycle after showing answer
          if (chatAnswerVisible) {
            setTimeout(() => {
              setChatProgress(0);
              setChatAnswerVisible(false);
            }, 6000);
          }
          return prev;
        }
      });
    }, 45);

    return () => clearInterval(typingInterval);
  }, [chatAnswerVisible]);

  // Slowly increment metrics to feel alive
  useEffect(() => {
    const metricsInterval = setInterval(() => {
      setMetrics((prev) => ({
        repos: prev.repos + (Math.random() > 0.85 ? 1 : 0),
        nodes: Number((prev.nodes + 0.005).toFixed(3)),
        commits: Number((prev.commits + 0.02).toFixed(2)),
        hours: Number((prev.hours + 0.01).toFixed(2))
      }));
    }, 2500);

    return () => clearInterval(metricsInterval);
  }, []);

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

  // AI evidence streams data
  const citations = [
    "commit 7c32bf1", "PR #124", "git blame: Alex R.", "retryQueue.ts",
    "commit a9d2e1f", "PR #392", "git blame: Elena S.", "authGateway.js",
    "commit f3d8a7c", "PR #87", "git blame: Jordan K.", "dbConnector.go",
    "commit b2e4c19", "PR #512", "git blame: Liam M.", "cacheManager.py"
  ];

  // Features grid items
  const featuresList = [
    { title: "Documentation Drift", desc: "Identify docstrings that differ from AST changes." },
    { title: "Intent Reconstruction", desc: "Determine why lines of code exist using history graphs." },
    { title: "Knowledge Graph", desc: "Map how files connect structurally and historically." },
    { title: "Commit Timeline", desc: "Explore a chronologically aligned developer action log." },
    { title: "GitHub OAuth", desc: "Connect enterprise repositories with industry-standard safety." },
    { title: "AI Search", desc: "Contextual query system grounded in real evidence." },
    { title: "Repository Health", desc: "Evaluate overall logic health scores and bus-factor alerts." },
    { title: "Evidence-backed Answers", desc: "Every answer links directly to a commit hash or PR number." }
  ];

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
      {/* HTML5 Liquid Waterfall Background */}
      <canvas ref={canvasRef} className="fluid-bg-canvas" />

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
          <span>WhyCode<span className="logo-accent">OS</span></span>
        </div>
        
        <nav className="nav-links">
          <a href="#product" className="nav-link">Product</a>
          <a href="#architecture" className="nav-link">Architecture</a>
          <a href="#features" className="nav-link">Features</a>
          <a href="#pricing" className="nav-link">Pricing</a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="nav-link">GitHub</a>
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
      <section className="hero-section" id="product">
        <div className="hero-video-container">
          <video 
            className="hero-video"
            autoPlay 
            muted 
            loop 
            playsInline
            src="https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-loop-41851-large.mp4"
            style={{
              transform: `scale(1.06) translate(${-mousePos.x * 25}px, ${-mousePos.y * 25}px)`
            }}
          />
          <div className="hero-edge-blur" />
          <div className="hero-dark-overlay" />
        </div>

        <div 
          className="hero-content"
          style={{
            transform: `translate3d(${mousePos.x * 12}px, ${mousePos.y * 12}px, 0)`
          }}
        >
          <div className="hero-left-text">
            <div className="hero-badge">
              <span className="hero-badge-dot"></span>
              <span>Documentation Intelligence Platform</span>
            </div>

            <h1 className="hero-headline">
              <div className="hero-line-reveal">Stop asking why</div>
              <div className="hero-line-reveal">this code exists.</div>
              <div className="hero-line-reveal">
                Start <span className="gradient-text-knowing">knowing.</span>
              </div>
            </h1>

            <p className="hero-subtext">
              WhyCode reconstructs engineering decisions from commits, PRs and Git history so every answer is backed by evidence.
            </p>

            <div className="hero-actions">
              <div 
                className="magnetic-btn-wrap"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <button 
                  className="btn-hero btn-hero-primary"
                  onClick={() => handleNavRedirect("/company/signup")}
                  style={{
                    transform: isHovered ? `translate(${mousePos.x * 14}px, ${mousePos.y * 14}px) scale(1.05)` : "none"
                  }}
                >
                  <span>Get Started</span>
                  <ArrowRight size={16} />
                </button>
              </div>

              <div 
                className="magnetic-btn-wrap"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <button 
                  className="btn-hero btn-hero-secondary"
                  style={{
                    transform: isHovered ? `translate(${mousePos.x * 10}px, ${mousePos.y * 10}px) scale(1.02)` : "none"
                  }}
                  onClick={() => {
                    const el = document.getElementById("showcase");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <span>Watch Demo</span>
                </button>
              </div>
            </div>
          </div>

          <div className="hero-right-wrap">
            <div className="hero-right-card">
              <div className="window-header">
                <div className="window-dots">
                  <div className="window-dot window-dot-red" />
                  <div className="window-dot window-dot-yellow" />
                  <div className="window-dot window-dot-green" />
                </div>
                <div className="window-title">
                  <GitBranch className="window-icon" color="#4f46e5" />
                  <span>whycode-telemetry</span>
                </div>
                <div style={{ width: "24px" }} />
              </div>
              <div className="window-content" style={{ textAlign: "left" }}>
                <span className="window-label" style={{ fontSize: "1rem" }}>System Diagnostics</span>
                <div className="repo-tree" style={{ fontSize: "0.75rem", gap: "8px" }}>
                  <div className="tree-node">
                    <span className="pulse-node"></span>
                    <span style={{ color: "#ffffff" }}>📄 indexMemory.bin</span>
                  </div>
                  <div className="tree-node">
                    <span>📄 graphIndex.db</span>
                  </div>
                  <div className="tree-node">
                    <span style={{ color: "#00e5ff" }}>📄 vectorStore.json</span>
                  </div>
                </div>
                <div className="git-commits-stream" style={{ marginTop: "auto", borderTop: "1px dashed rgba(255,255,255,0.06)", paddingTop: "12px" }}>
                  <div className="commit-log-row" style={{ fontSize: "0.7rem" }}>
                    <span className="commit-hash" style={{ color: "#8b5cf6" }}>PR #49</span>
                    <span style={{ color: "#e2e8f0" }}>Merged database schema</span>
                  </div>
                </div>
              </div>
            </div>
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
          FLOATING GLASS WINDOWS (FEATURES)
          ========================================= */}
      <section className="windows-section">
        <div className="section-header">
          <div className="hero-badge">
            <span className="hero-badge-dot" style={{ backgroundColor: "#8b5cf6", boxShadow: "0 0 8px #8b5cf6" }}></span>
            <span>Operating Architecture</span>
          </div>
          <h2 className="section-title">The living workspace</h2>
          <p className="section-desc">
            Instead of searching static docs, view your repository logic dynamically evolving through live code graph analysis.
          </p>
        </div>

        <div className="windows-container">
          {/* Window 1: Repository Intelligence */}
          <div 
            className="floating-window"
            style={{
              transform: `translate3d(${-mousePos.x * 18}px, ${-mousePos.y * 22}px, 0) rotateY(${mousePos.x * -10}deg) rotateX(${mousePos.y * 10}deg)`
            }}
          >
            <div className="window-header">
              <div className="window-dots">
                <div className="window-dot window-dot-red" />
                <div className="window-dot window-dot-yellow" />
                <div className="window-dot window-dot-green" />
              </div>
              <div className="window-title">
                <GitBranch className="window-icon" color="#00e5ff" />
                <span>repository-tree</span>
              </div>
              <div style={{ width: "24px" }} />
            </div>
            <div className="window-content">
              <span className="window-label">Repository Intelligence</span>
              
              <div className="repo-tree">
                <div className="tree-node">
                  <span className="pulse-node"></span>
                  <span style={{ color: "#ffffff" }}>📂 src</span>
                </div>
                <div className="tree-node tree-indent">
                  <span>📂 components</span>
                </div>
                <div className="tree-node tree-indent" style={{ marginLeft: "32px" }}>
                  <span>📄 QueueProvider.tsx</span>
                </div>
                <div className="tree-node tree-indent">
                  <span>📂 services</span>
                </div>
                <div className="tree-node tree-indent" style={{ marginLeft: "32px" }}>
                  <span style={{ color: "#00e5ff" }}>📄 retryQueue.ts</span>
                </div>
                <div className="tree-node tree-indent">
                  <span>📄 main.tsx</span>
                </div>
              </div>

              <div className="git-commits-stream">
                <div className="commit-log-row">
                  <span className="commit-hash">c7d8ef0</span>
                  <span className="commit-msg">optimize token verification</span>
                  <span style={{ color: "#71717a" }}>2m ago</span>
                </div>
                <div className="commit-log-row">
                  <span className="commit-hash">e1f2a34</span>
                  <span className="commit-msg">prevent connection pool leak</span>
                  <span style={{ color: "#71717a" }}>10m ago</span>
                </div>
                <div className="commit-log-row">
                  <span className="commit-hash">a8b9c1d</span>
                  <span className="commit-msg">add schema validator</span>
                  <span style={{ color: "#71717a" }}>1h ago</span>
                </div>
              </div>
            </div>
          </div>

          {/* Window 2: Knowledge Chat */}
          <div 
            className="floating-window"
            style={{
              transform: `translate3d(${mousePos.x * 20}px, ${-mousePos.y * 12}px, 0) rotateY(${mousePos.x * -8}deg) rotateX(${mousePos.y * 8}deg)`
            }}
          >
            <div className="window-header">
              <div className="window-dots">
                <div className="window-dot window-dot-red" />
                <div className="window-dot window-dot-yellow" />
                <div className="window-dot window-dot-green" />
              </div>
              <div className="window-title">
                <MessageSquare className="window-icon" color="#8b5cf6" />
                <span>knowledge-chat</span>
              </div>
              <div style={{ width: "24px" }} />
            </div>
            <div className="window-content">
              <span className="window-label">Knowledge Chat</span>

              <div className="chat-console">
                <div className="chat-bubble-q">
                  <span>{chatQuestion.substring(0, chatProgress)}</span>
                  {chatProgress < chatQuestion.length && <span className="typing-cursor"></span>}
                </div>

                {chatAnswerVisible && (
                  <div className="chat-bubble-a" style={{ animation: "revealLine 0.5s ease-out forwards" }}>
                    <span>{chatAnswer}</span>
                    <div className="evidence-citations">
                      <div className="citation-tag">
                        <GitBranch size={10} />
                        <span>c7d8ef0</span>
                      </div>
                      <div className="citation-tag">
                        <FileText size={10} />
                        <span>PR #24</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Window 3: Documentation Drift */}
          <div 
            className="floating-window"
            style={{
              transform: `translate3d(${-mousePos.x * 12}px, ${mousePos.y * 20}px, 0) rotateY(${mousePos.x * -12}deg) rotateX(${mousePos.y * 12}deg)`
            }}
          >
            <div className="window-header">
              <div className="window-dots">
                <div className="window-dot window-dot-red" />
                <div className="window-dot window-dot-yellow" />
                <div className="window-dot window-dot-green" />
              </div>
              <div className="window-title">
                <Activity className="window-icon" color="#00e5ff" />
                <span>drift-monitor</span>
              </div>
              <div style={{ width: "24px" }} />
            </div>
            <div className="window-content">
              <span className="window-label">Documentation Drift</span>

              <div className="drift-circle-container">
                <svg className="drift-circle-svg">
                  <circle className="drift-circle-bg" cx="70" cy="70" r="60" />
                  <circle className="drift-circle-progress" cx="70" cy="70" r="60" />
                  <defs>
                    <linearGradient id="cyan-violet-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00e5ff" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="drift-circle-value">72%</div>
              </div>

              <div className="drift-files-list">
                <div className="drift-file-row">
                  <span className="drift-file-name">retryQueue.ts</span>
                  <span className="drift-severity severity-high">High</span>
                </div>
                <div className="drift-file-row">
                  <span className="drift-file-name">authGateway.js</span>
                  <span className="drift-severity severity-medium">Medium</span>
                </div>
                <div className="drift-file-row">
                  <span className="drift-file-name">cacheManager.py</span>
                  <span className="drift-severity severity-low">Low</span>
                </div>
              </div>
            </div>
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
      <section className="how-it-works-section">
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
          PRODUCT SHOWCASE (INTERACTIVE DASHBOARD)
          ========================================= */}
      <section className="showcase-section" id="showcase">
        <div className="section-header">
          <div className="hero-badge">
            <span className="hero-badge-dot" style={{ backgroundColor: "#00e5ff", boxShadow: "0 0 8px #00e5ff" }}></span>
            <span>Interactive Demo</span>
          </div>
          <h2 className="section-title">The dashboard UI overview</h2>
          <p className="section-desc">
            Explore a mockup presentation of the active workspace console and context metrics.
          </p>
        </div>

        <div className="dashboard-showcase-wrap">
          <div className="dashboard-showcase">
            <div className="showcase-sidebar">
              <div 
                className={`showcase-sidebar-item ${activeTab === "dashboard" ? "active" : ""}`}
                onClick={() => setActiveTab("dashboard")}
              >
                <Cpu size={16} />
                <span>Dashboard</span>
              </div>
              <div 
                className={`showcase-sidebar-item ${activeTab === "repositories" ? "active" : ""}`}
                onClick={() => setActiveTab("repositories")}
              >
                <GitBranch size={16} />
                <span>Repositories</span>
              </div>
              <div 
                className={`showcase-sidebar-item ${activeTab === "drift" ? "active" : ""}`}
                onClick={() => setActiveTab("drift")}
              >
                <Activity size={16} />
                <span>Drift Status</span>
              </div>
              <div 
                className={`showcase-sidebar-item ${activeTab === "settings" ? "active" : ""}`}
                onClick={() => setActiveTab("settings")}
              >
                <Settings size={16} />
                <span>Settings</span>
              </div>
            </div>

            <div className="showcase-main">
              {activeTab === "dashboard" && (
                <>
                  <div className="showcase-grid-3">
                    <div className="showcase-panel">
                      <div className="panel-header-sub">Index Coverage</div>
                      <div className="panel-big-number">100%</div>
                    </div>
                    <div className="showcase-panel">
                      <div className="panel-header-sub">Drift Files</div>
                      <div className="panel-big-number">3 flagged</div>
                    </div>
                    <div className="showcase-panel">
                      <div className="panel-header-sub">API Requests</div>
                      <div className="panel-big-number">12,492</div>
                    </div>
                  </div>

                  <div className="showcase-main-chart">
                    <div className="panel-header-sub">Daily Scans Activity</div>
                    <div className="chart-bars-container">
                      {[65, 80, 45, 90, 70, 85, 100, 50, 75, 95, 60, 80].map((val, idx) => (
                        <div key={idx} className="chart-bar-wrap">
                          <div className="chart-bar-fill" style={{ height: `${val}%` }} />
                          <span className="chart-bar-label">M{idx+1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeTab === "repositories" && (
                <div style={{ textAlign: "left" }}>
                  <h3 className="window-label">Indexed Repositories</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                    {["main-backend-api", "client-auth-flow", "schema-registry-validator"].map((repo, i) => (
                      <div key={i} className="drift-file-row" style={{ padding: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <GitBranch size={16} color="#00e5ff" />
                          <span style={{ fontWeight: "700" }}>{repo}</span>
                        </div>
                        <span style={{ color: "#71717a", fontSize: "0.8rem" }}>Updated 12m ago</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "drift" && (
                <div style={{ textAlign: "left" }}>
                  <h3 className="window-label">Active Drift Detections</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
                    <div className="drift-file-row">
                      <span>src/components/QueueProvider.tsx</span>
                      <span className="drift-severity severity-high">High Drift</span>
                    </div>
                    <div className="drift-file-row">
                      <span>src/services/authGateway.js</span>
                      <span className="drift-severity severity-medium">Medium Drift</span>
                    </div>
                    <div className="drift-file-row">
                      <span>src/services/cacheManager.py</span>
                      <span className="drift-severity severity-low">Low Drift</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "settings" && (
                <div style={{ textAlign: "left" }}>
                  <h3 className="window-label">Workspace Settings</h3>
                  <p style={{ color: "#a1a1aa", fontSize: "0.9rem", marginBottom: "20px" }}>Configure Gemini Model parameters and Webhook targets.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div className="drift-file-row">
                      <span>AST Analyzer Model</span>
                      <span style={{ color: "#00e5ff" }}>Gemini 1.5 Pro</span>
                    </div>
                    <div className="drift-file-row">
                      <span>Scan Frequency</span>
                      <span>On Push / Merge</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
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
            No hallucinations. Every generated doc or chat answer citations links to code authors, commits, and PR lines.
          </p>
        </div>

        <div className="citations-marquee">
          <div className="marquee-row marquee-row-left">
            {[...citations, ...citations].map((cite, i) => (
              <div key={i} className="citation-card">
                <GitBranch size={12} color="#00e5ff" />
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
          PRICING PANELS
          ========================================= */}
      <section className="pricing-section" id="pricing">
        <div className="section-header">
          <h2 className="section-title">Clear development pricing</h2>
          <p className="section-desc">
            Pick a tier that aligns with your repository scale and team requirements.
          </p>
        </div>

        <div className="pricing-grid">
          {/* Starter Plan */}
          <div className="pricing-panel">
            <span className="plan-name">Starter</span>
            <div className="plan-price">$29<span>/mo</span></div>
            <p style={{ color: "#a1a1aa", fontSize: "0.85rem" }}>Perfect for smaller teams wanting basic documentation indexing capabilities.</p>
            <div className="plan-features-list">
              <div className="plan-feature-item">
                <Check size={14} color="#00e5ff" />
                <span>Up to 5 Repositories</span>
              </div>
              <div className="plan-feature-item">
                <Check size={14} color="#00e5ff" />
                <span>100 AI explanations / month</span>
              </div>
              <div className="plan-feature-item">
                <Check size={14} color="#00e5ff" />
                <span>Daily automatic drift scans</span>
              </div>
            </div>
            <button 
              className="btn-pricing btn-pricing-secondary"
              onClick={() => handleNavRedirect("/company/signup")}
            >
              Start Free Trial
            </button>
          </div>

          {/* Pro Plan */}
          <div className="pricing-panel popular">
            <span className="popular-badge">Most Popular</span>
            <span className="plan-name">Pro</span>
            <div className="plan-price">$79<span>/mo</span></div>
            <p style={{ color: "#a1a1aa", fontSize: "0.85rem" }}>Ideal for growing engineering groups looking for continuous sync coverage.</p>
            <div className="plan-features-list">
              <div className="plan-feature-item">
                <Check size={14} color="#8b5cf6" />
                <span>Unlimited Repositories</span>
              </div>
              <div className="plan-feature-item">
                <Check size={14} color="#8b5cf6" />
                <span>Unlimited AI explanations</span>
              </div>
              <div className="plan-feature-item">
                <Check size={14} color="#8b5cf6" />
                <span>Real-time webhook scan triggers</span>
              </div>
              <div className="plan-feature-item">
                <Check size={14} color="#8b5cf6" />
                <span>Slack & Teams notifications</span>
              </div>
            </div>
            <button 
              className="btn-pricing btn-pricing-primary"
              onClick={() => handleNavRedirect("/company/signup")}
              style={{
                background: "linear-gradient(135deg, var(--color-cyan), var(--color-violet))",
                color: "#ffffff"
              }}
            >
              Get Started Now
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className="pricing-panel">
            <span className="plan-name">Enterprise</span>
            <div className="plan-price">Custom</div>
            <p style={{ color: "#a1a1aa", fontSize: "0.85rem" }}>Custom solutions with self-hosted options and advanced security controls.</p>
            <div className="plan-features-list">
              <div className="plan-feature-item">
                <Check size={14} color="#00e5ff" />
                <span>Self-hosted VPC deployments</span>
              </div>
              <div className="plan-feature-item">
                <Check size={14} color="#00e5ff" />
                <span>Custom LLM tuning parameter controls</span>
              </div>
              <div className="plan-feature-item">
                <Check size={14} color="#00e5ff" />
                <span>24/7 dedicated system architect support</span>
              </div>
            </div>
            <button 
              className="btn-pricing btn-pricing-secondary"
              onClick={() => handleNavRedirect("/company/signup")}
            >
              Contact Sales
            </button>
          </div>
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
          MASSIVE CINEMATIC FOOTER
          ========================================= */}
      <footer className="footer-cinematic">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="nav-logo">
              <GitBranch size={20} color="#00e5ff" />
              <span>WhyCodeOS</span>
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
              <a href="#pricing" className="footer-col-link">Pricing</a>
            </div>
            <div className="footer-column">
              <span className="footer-col-title">Resources</span>
              <a href="https://github.com" className="footer-col-link">GitHub</a>
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
            <a href="https://github.com" className="footer-social-link">GitHub</a>
            <a href="https://linkedin.com" className="footer-social-link">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { GitBranch, Sparkles, ArrowRight, ShieldCheck, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import PricingCard from "../components/pricing/PricingCard";
import FeatureComparison from "../components/pricing/FeatureComparison";
import PricingFAQ from "../components/pricing/PricingFAQ";
import PricingCTA from "../components/pricing/PricingCTA";
import "./LandingOS.css";
import "./Pricing.css";

export default function PricingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [navVisible, setNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Set document title & SEO metadata
  useEffect(() => {
    document.title = "WhyCode Pricing | AI-Powered Code Intelligence";
    window.scrollTo(0, 0);
  }, []);

  // Navbar scroll hide/reveal
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
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

  // Four Pricing Plans Configuration (Concise & High-Impact Highlights)
  const pricingPlans = [
    {
      id: "free",
      name: "Free",
      price: "$0",
      period: "/month",
      description: "Essential code intelligence for individuals and personal projects.",
      target: "Individuals and very small teams",
      members: "Up to 3 members",
      repositories: "Up to 2 repos",
      popular: false,
      features: [
        "Basic repository AST indexing",
        "Codebase semantic search",
        "AI code explanations",
        "Basic documentation view",
        "Community support resources"
      ]
    },
    {
      id: "startup",
      name: "Startup",
      price: "$10",
      period: "/month",
      description: "Core repository intelligence for small growing startup teams.",
      target: "Small startup engineering teams",
      members: "Up to 10 members",
      repositories: "Multiple repos",
      popular: false,
      features: [
        "GitHub OAuth integration",
        "AI knowledge assistant & chat",
        "Documentation drift detection",
        "Commit memory tracking",
        "Developer activity insights"
      ]
    },
    {
      id: "team",
      name: "Team",
      price: "$40",
      period: "/month",
      description: "Advanced intelligence & collaboration for scaling engineering teams.",
      target: "Teams with 25–50 developers",
      members: "25–50 members",
      repositories: "Expanded repos",
      popular: true,
      features: [
        "Full deep repository indexing",
        "Real-time drift detection & alerts",
        "Developer management & dashboards",
        "Team & repository analytics",
        "Priority support & increased quotas"
      ]
    },
    {
      id: "custom",
      name: "Custom",
      price: "Custom",
      period: "",
      description: "Enterprise-grade scale, security, and dedicated controls.",
      target: "Large organizations and enterprise teams",
      members: "Unlimited members",
      repositories: "Unlimited repos",
      popular: false,
      features: [
        "Enterprise RAG knowledge engine",
        "Organization workspaces & RBAC",
        "Custom AI models & VPC deployment",
        "Advanced security & SOC2 compliance",
        "Dedicated SLA & Technical Account Manager"
      ]
    }
  ];

  // Feature Comparison Table Data
  const comparisonCategories = [
    {
      category: "Repositories & Scale",
      rows: [
        { name: "Team Members", free: "Up to 3", startup: "Up to 10", team: "25–50", custom: "Unlimited" },
        { name: "Git Repositories", free: "Up to 2", startup: "Multiple", team: "Expanded", custom: "Unlimited" },
        { name: "GitHub OAuth Integration", free: "✓", startup: "✓", team: "Advanced", custom: "Enterprise" },
        { name: "Repository Indexing Depth", free: "Basic", startup: "Standard", team: "Full AST", custom: "Deep AST & Multi-branch" }
      ]
    },
    {
      category: "Code Intelligence & AI",
      rows: [
        { name: "AI Code Explanations", free: "Limited", startup: "Standard", team: "Advanced", custom: "Unlimited High-Tier" },
        { name: "AI Knowledge Assistant", free: "—", startup: "✓", team: "Full Knowledge Chat", custom: "Custom RAG Model" },
        { name: "Documentation Drift Detection", free: "—", startup: "✓", team: "Real-time AST Scan", custom: "CI Pipeline Triggers" },
        { name: "Commit Memory & Timeline", free: "—", startup: "✓", team: "✓", custom: "Complete History Graph" },
        { name: "Codebase & Semantic Search", free: "Basic", startup: "Full", team: "Advanced Semantic", custom: "Enterprise Semantic" }
      ]
    },
    {
      category: "Developer Management & Analytics",
      rows: [
        { name: "Developer Management", free: "—", startup: "Basic", team: "✓", custom: "Role-based Access (RBAC)" },
        { name: "Developer Dashboard", free: "—", startup: "Basic", team: "✓", custom: "Organization-level" },
        { name: "Contribution & Team Analytics", free: "—", startup: "Basic", team: "Advanced", custom: "Custom Telemetry" },
        { name: "Repository Analytics & Health", free: "Basic", startup: "Standard", team: "Advanced", custom: "Enterprise Telemetry" }
      ]
    },
    {
      category: "Workspaces, Security & Support",
      rows: [
        { name: "Workspace Controls", free: "Basic", startup: "Team", team: "Advanced Controls", custom: "Multi-org Workspace" },
        { name: "Smart Notifications & Webhooks", free: "—", startup: "Basic", team: "Webhook & Alerts", custom: "Custom Event Routing" },
        { name: "Security & Access Controls", free: "Standard", startup: "Standard", team: "Enhanced", custom: "SOC2 & Custom SSO" },
        { name: "Support & SLAs", free: "Community", startup: "Email Support", team: "Priority Support", custom: "Dedicated SLA & TAM" }
      ]
    }
  ];

  // Handle plan selection routing
  const handleSelectPlan = (plan) => {
    if (plan.id === "free") {
      if (user) {
        navigate("/dashboard");
      } else {
        navigate("/company/signup?plan=free");
      }
    } else if (plan.id === "startup") {
      navigate("/checkout?plan=startup");
    } else if (plan.id === "team") {
      navigate("/checkout?plan=team");
    } else if (plan.id === "custom") {
      navigate("/company/signup?plan=custom");
    }
  };

  const handleNavRedirect = (path) => {
    if (path.startsWith("http")) {
      window.location.href = path;
    } else if (path.startsWith("/#")) {
      navigate("/" + path.replace("/", ""));
    } else {
      navigate(path);
    }
  };

  return (
    <div className="pricing-page-root">
      {/* Ambient background glows */}
      <div className="pricing-bg-glow-left" />
      <div className="pricing-bg-glow-right" />
      <div className="noise-overlay" />

      {/* Floating Navbar */}
      <header className={`navbar-floating ${navVisible ? "visible" : "hidden"}`}>
        <div className="nav-logo" onClick={() => handleNavRedirect("/")}>
          <GitBranch size={18} color="#00e5ff" style={{ filter: "drop-shadow(0 0 5px #00e5ff)" }} />
          <span>Why<span className="logo-accent">Code</span></span>
        </div>
        
        <nav className="nav-links">
          <a href="/#product" onClick={(e) => { e.preventDefault(); handleNavRedirect("/#product"); }} className="nav-link">Product</a>
          <a href="/#how-it-works" onClick={(e) => { e.preventDefault(); handleNavRedirect("/#how-it-works"); }} className="nav-link">How It Works</a>
          <a href="/#architecture" onClick={(e) => { e.preventDefault(); handleNavRedirect("/#architecture"); }} className="nav-link">Architecture</a>
          <a href="/#features" onClick={(e) => { e.preventDefault(); handleNavRedirect("/#features"); }} className="nav-link">Features</a>
          <a href="/pricing" onClick={(e) => { e.preventDefault(); handleNavRedirect("/pricing"); }} className="nav-link active-nav">Pricing</a>
        </nav>

        <div className="nav-actions">
          {user ? (
            <button 
              className="btn-nav btn-nav-primary"
              onClick={() => handleNavRedirect("/dashboard")}
            >
              Go to Dashboard
            </button>
          ) : (
            <>
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
            </>
          )}
        </div>
      </header>

      {/* Main Pricing Content */}
      <main className="pricing-main-wrapper">
        {/* HERO SECTION */}
        <section className="pricing-hero-section">
          

          <h1 className="pricing-hero-title">
            Simple pricing that scales with your team.
          </h1>

          <p className="pricing-hero-subtitle">
            Start small, connect your repositories, and unlock deeper AI-powered code intelligence as your engineering team grows.
          </p>

          {/* Monthly Billing Indicator */}
          <div className="billing-cadence-pill">
            <span>Monthly billing · Cancel or upgrade anytime</span>
          </div>
        </section>

        {/* FOUR PRICING CARDS GRID */}
        <section className="pricing-cards-section">
          <div className="pricing-cards-grid">
            {pricingPlans.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                userPlan={user?.plan}
                onSelectPlan={handleSelectPlan}
              />
            ))}
          </div>
        </section>

        {/* FEATURE COMPARISON MATRIX */}
        <section className="pricing-comparison-section">
          <FeatureComparison 
            categories={comparisonCategories} 
            plans={pricingPlans} 
          />
        </section>

        {/* FAQ ACCORDION */}
        <section className="pricing-faq-section">
          <PricingFAQ />
        </section>

        {/* FINAL CALL TO ACTION */}
        <section className="pricing-cta-section">
          <PricingCTA />
        </section>
      </main>

      {/* Cinematic Footer */}
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
              <a href="/#product" onClick={(e) => { e.preventDefault(); handleNavRedirect("/#product"); }} className="footer-col-link">Features</a>
              <a href="/#architecture" onClick={(e) => { e.preventDefault(); handleNavRedirect("/#architecture"); }} className="footer-col-link">Architecture</a>
              <a href="/pricing" className="footer-col-link">Pricing</a>
            </div>
            <div className="footer-column">
              <span className="footer-col-title">Resources</span>
              <a href="https://github.com/saavi122/WhyCode" target="_blank" rel="noopener noreferrer" className="footer-col-link">GitHub</a>
              <a href="https://github.com/saavi122/WhyCode#readme" target="_blank" rel="noopener noreferrer" className="footer-col-link">Documentation</a>
              <a href="https://github.com/saavi122/WhyCode/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="footer-col-link">Privacy Policy</a>
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

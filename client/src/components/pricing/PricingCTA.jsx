import React from "react";
import { ArrowRight, GitBranch, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PricingCTA() {
  const navigate = useNavigate();

  return (
    <div className="pricing-cta-card">
      <div className="cta-ambient-glow" />
      
      <div className="cta-inner-content">
        <div className="hero-badge">
          <Sparkles size={12} color="#00e5ff" />
          <span>Ready to Deploy</span>
        </div>

        <h2 className="cta-headline">
          Start understanding your codebase in minutes.
        </h2>

        <p className="cta-subtext">
          Connect your GitHub repository to index intent, detect documentation drift, and give your engineering team an instant knowledge layer.
        </p>

        <div className="cta-buttons-row">
          <button 
            className="btn-hero btn-hero-primary"
            onClick={() => navigate("/company/signup")}
          >
            <span>Start Free</span>
            <ArrowRight size={16} />
          </button>

          <a 
            href="https://github.com/saavi122/WhyCode"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-hero btn-hero-secondary"
          >
            <GitBranch size={16} />
            <span>Explore on GitHub</span>
          </a>
        </div>
      </div>
    </div>
  );
}

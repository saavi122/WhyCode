import React from "react";
import { Check, Sparkles, ArrowRight, Shield, Zap } from "lucide-react";

export default function PricingCard({ 
  plan, 
  userPlan, 
  onSelectPlan 
}) {
  const isCurrentPlan = userPlan && userPlan.toLowerCase() === plan.id.toLowerCase();
  const isPopular = plan.popular;

  const getButtonText = () => {
    if (isCurrentPlan) return "Current Plan";
    if (plan.id === "free") return userPlan ? "Switch to Free" : "Start Free";
    if (plan.id === "startup") return userPlan ? "Switch to Startup" : "Start with Startup";
    if (plan.id === "team") return userPlan ? "Upgrade to Team" : "Get Team";
    if (plan.id === "custom") return "Contact Sales";
    return plan.ctaText || "Select Plan";
  };

  return (
    <div className={`pricing-card ${isPopular ? "pricing-card-popular" : ""} ${isCurrentPlan ? "pricing-card-current" : ""}`}>
      {/* Popular Highlight Badge */}
      {isPopular && (
        <div className="popular-badge-wrap">
          <span className="popular-badge-pill">
            <Sparkles size={11} className="badge-sparkle" />
            Most Popular
          </span>
        </div>
      )}

      {/* Current Plan Indicator */}
      {isCurrentPlan && (
        <div className="current-plan-badge-wrap">
          <span className="current-plan-pill">Current Plan</span>
        </div>
      )}

      {/* Card Header */}
      <div className="card-header-top">
        <h3 className="plan-title">{plan.name}</h3>
        <p className="plan-tagline">{plan.description}</p>
      </div>

      {/* Pricing Figure */}
      <div className="card-price-row">
        <span className="price-amount">{plan.price}</span>
        {plan.period && <span className="price-period">{plan.period}</span>}
      </div>

      {/* Target & Limits Pill */}
      <div className="card-limits-badge">
        <span className="limits-members">{plan.members}</span>
        <span className="limits-separator">·</span>
        <span className="limits-repos">{plan.repositories}</span>
      </div>

      {/* Action Button */}
      <button 
        className={`btn-plan-action ${isPopular ? "btn-plan-popular" : "btn-plan-standard"} ${isCurrentPlan ? "btn-plan-disabled" : ""}`}
        onClick={() => !isCurrentPlan && onSelectPlan(plan)}
        disabled={isCurrentPlan}
      >
        <span>{getButtonText()}</span>
        {!isCurrentPlan && <ArrowRight size={15} className="btn-arrow" />}
      </button>

      {/* Features List */}
      <div className="card-features-block">
        <span className="features-block-label">WHAT'S INCLUDED:</span>
        <ul className="plan-features-list">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="plan-feature-item">
              <span className="feature-check-circle">
                <Check size={12} className="check-icon" />
              </span>
              <span className="feature-text">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

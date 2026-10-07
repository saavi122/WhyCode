import React, { useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";

export default function PricingFAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      q: "Can I upgrade, downgrade, or change my plan anytime?",
      a: "Yes. You can switch plans at any time from your organization settings. Plan upgrades apply immediately with prorated usage, and downgrades take effect at the end of the current billing cycle."
    },
    {
      q: "How does GitHub repository connection work?",
      a: "WhyCode uses standard OAuth 2.0 to securely connect to your GitHub account or organization. We index code structures, abstract syntax trees (ASTs), commit history, and pull request intent without altering your repository."
    },
    {
      q: "What is Documentation Drift Detection?",
      a: "WhyCode continuously parses AST changes and compared docstrings, comments, and README instructions against actual code logic. When implementation shifts ahead of docs, drift alerts flag desynchronized files instantly."
    },
    {
      q: "Is our proprietary code stored or used to train public AI models?",
      a: "No. Your proprietary source code and knowledge graphs are isolated, encrypted, and never used to train public AI models. Enterprise deployments can also configure self-hosted or private VPC endpoints."
    },
    {
      q: "Do you offer custom contracts, SLA options, and invoice billing for enterprise?",
      a: "Yes. The Custom enterprise plan includes custom billing schedules, invoicing, dedicated technical account management, and tailored SLAs."
    }
  ];

  return (
    <div className="pricing-faq-container">
      <div className="faq-header">
        <div className="hero-badge">
          <HelpCircle size={13} color="#00e5ff" />
          <span>Frequently Asked Questions</span>
        </div>
        <h2 className="faq-title">Got questions about WhyCode pricing?</h2>
      </div>

      <div className="faq-accordion-list">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div 
              key={idx} 
              className={`faq-accordion-item ${isOpen ? "open" : ""}`}
              onClick={() => setOpenIndex(isOpen ? -1 : idx)}
            >
              <div className="faq-question-row">
                <span className="faq-question-text">{faq.q}</span>
                <div className="faq-toggle-icon">
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
              {isOpen && (
                <div className="faq-answer-row">
                  <p className="faq-answer-text">{faq.a}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

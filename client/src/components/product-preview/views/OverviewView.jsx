import React, { useState, useEffect } from "react";
import { ExternalLink, CheckCircle2, ShieldAlert, Cpu } from "lucide-react";

export default function OverviewView({ data, isActive }) {
  const [counts, setCounts] = useState({ health: 0, coverage: 0, drift: 0 });

  useEffect(() => {
    if (!isActive) return;

    let start = 0;
    const duration = 800; // ms
    const startTime = performance.now();

    const animateCount = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic

      setCounts({
        health: Math.round(94 * ease),
        coverage: Math.round(87 * ease),
        drift: Math.round(3 * ease)
      });

      if (progress < 1) {
        requestAnimationFrame(animateCount);
      }
    };

    const animId = requestAnimationFrame(animateCount);
    return () => cancelAnimationFrame(animId);
  }, [isActive]);

  return (
    <div className="preview-view-container overview-view">
      {/* View Header */}
      <div className="view-header">
        <div className="view-header-left">
          <h3 className="view-headline">Repository Intelligence</h3>
          <a
            href={data.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="view-repo-badge"
            tabIndex={0}
          >
            <span>{data.repoName}</span>
            <ExternalLink size={12} className="view-badge-icon" />
          </a>
        </div>

        <div className="view-header-right">
          <div className="view-sync-status">
            <span className="sync-pulse-dot" />
            <span>{data.syncedTime}</span>
          </div>
        </div>
      </div>

      {/* Main Visual: 3 Focused Stat Cards */}
      <div className="overview-cards-grid">
        {/* Card 1: Health */}
        <div className="overview-stat-card card-health">
          <div className="stat-card-header">
            <span className="stat-label">Repository Health</span>
            <span className="stat-pill pill-cyan">Optimal</span>
          </div>
          <div className="stat-value-wrap">
            <span className="stat-number text-cyan">{counts.health}%</span>
          </div>
          <div className="stat-progress-bar">
            <div
              className="stat-progress-fill fill-cyan"
              style={{ width: `${counts.health}%` }}
            />
          </div>
          <p className="stat-desc">AST integrity and code-to-doc consistency</p>
        </div>

        {/* Card 2: Knowledge Coverage */}
        <div className="overview-stat-card card-coverage">
          <div className="stat-card-header">
            <span className="stat-label">Knowledge Coverage</span>
            <span className="stat-pill pill-indigo">AST Mapped</span>
          </div>
          <div className="stat-value-wrap">
            <span className="stat-number text-indigo">{counts.coverage}%</span>
          </div>
          <div className="stat-progress-bar">
            <div
              className="stat-progress-fill fill-indigo"
              style={{ width: `${counts.coverage}%` }}
            />
          </div>
          <p className="stat-desc">Functions and routes with extracted intent</p>
        </div>

        {/* Card 3: Documentation Drift */}
        <div className="overview-stat-card card-drift">
          <div className="stat-card-header">
            <span className="stat-label">Documentation Drift</span>
            <span className="stat-pill pill-warning">Action Needed</span>
          </div>
          <div className="stat-value-wrap">
            <span className="stat-number text-warning">{counts.drift} <span className="stat-unit">files</span></span>
          </div>
          <div className="stat-progress-bar">
            <div
              className="stat-progress-fill fill-warning"
              style={{ width: `${(counts.drift / 3) * 60}%` }}
            />
          </div>
          <p className="stat-desc">Docs requiring synchronized updates</p>
        </div>
      </div>

      {/* Secondary Element: 1-line Status Callout */}
      <div className="overview-footer-callout">
        <div className="callout-icon-wrap">
          <Cpu size={16} className="text-cyan" />
        </div>
        <p className="callout-text">{data.statusSummary}</p>
      </div>
    </div>
  );
}

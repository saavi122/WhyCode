import React from "react";
import { Users, ShieldCheck, GitCommit } from "lucide-react";

export default function TeamView({ data }) {
  return (
    <div className="preview-view-container team-view">
      {/* View Header */}
      <div className="view-header">
        <div className="view-header-left">
          <h3 className="view-headline">{data.title}</h3>
          <span className="view-team-badge">
            <Users size={12} className="text-cyan" />
            <span>{data.contributors.length} active maintainers</span>
          </span>
        </div>

        <div className="view-header-right">
          <div className="bus-factor-badge">
            <ShieldCheck size={13} className="text-cyan" />
            <span className="bus-factor-text">Bus factor: <strong>{data.busFactor}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Visual: Contributors List */}
      <div className="team-contributors-list">
        {data.contributors.map((c, idx) => (
          <div key={idx} className="contributor-row-card">
            {/* Avatar & Name */}
            <div className="contributor-identity">
              <div
                className="contributor-avatar"
                style={{
                  borderColor: c.color,
                  boxShadow: `0 0 10px ${c.color}33`
                }}
              >
                <span>{c.initials}</span>
              </div>
              <div className="contributor-info">
                <span className="contributor-name">{c.name}</span>
                <span className="contributor-role">{c.role}</span>
              </div>
            </div>

            {/* Commit Share Bar */}
            <div className="contributor-share-section">
              <div className="share-labels">
                <span className="share-text">Commit share</span>
                <span className="share-val" style={{ color: c.color }}>{c.commitShare}%</span>
              </div>
              <div className="share-progress-track">
                <div
                  className="share-progress-fill"
                  style={{
                    width: `${c.commitShare}%`,
                    backgroundColor: c.color
                  }}
                />
              </div>
            </div>

            {/* Ownership Areas */}
            <div className="contributor-ownership-pills">
              {c.areas.map((area, aIdx) => (
                <span key={aIdx} className="area-pill">
                  {area}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Secondary Element: Bus Factor Note */}
      <div className="team-bus-factor-callout">
        <ShieldCheck size={16} className="text-cyan" />
        <p className="bus-factor-note">{data.busFactorNote}</p>
      </div>
    </div>
  );
}

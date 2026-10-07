import React from "react";
import { LayoutGrid, GitBranch, Brain, ShieldAlert, Users } from "lucide-react";

export const TAB_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "repository", label: "Repository", icon: GitBranch, badge: "main", badgeType: "cyan" },
  { id: "knowledge", label: "Knowledge", icon: Brain },
  { id: "drift", label: "Drift Monitor", icon: ShieldAlert, badge: "3", badgeType: "warning" },
  { id: "team", label: "Team", icon: Users }
];

export default function PreviewSidebar({
  activeTab,
  onSelectTab,
  isAutoPlaying
}) {
  return (
    <aside className="preview-sidebar" aria-label="Product preview navigation">
      <div className="sidebar-section-header">WORKSPACE</div>

      <div
        className="sidebar-tab-list"
        role="tablist"
        aria-orientation="vertical"
      >
        {TAB_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              role="tab"
              id={`tab-${item.id}`}
              aria-controls={`panel-${item.id}`}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onSelectTab(item.id)}
              className={`sidebar-tab-button ${isActive ? "active" : ""}`}
            >
              {/* Active Tab Background Glow */}
              <Icon size={16} className={`sidebar-tab-icon ${isActive ? "text-cyan" : ""}`} />
              <span className="sidebar-tab-label">{item.label}</span>

              {/* Badges */}
              {item.badge && (
                <span className={`sidebar-tab-badge badge-${item.badgeType}`}>
                  {item.badge}
                </span>
              )}

              {/* Auto-play progress indicator */}
              {isActive && isAutoPlaying && (
                <div
                  key={activeTab}
                  className="tab-autoplay-progress"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Sidebar Footer Info Card */}
      <div className="sidebar-footer-wrapper">
        <div className="sidebar-repo-pill">
          <GitBranch size={13} className="text-cyan" />
          <div className="repo-pill-text">
            <span className="repo-pill-name">company/platform</span>
            <span className="repo-pill-status">v2.4.0 · 100% mapped</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

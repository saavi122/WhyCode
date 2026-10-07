import React, { useState, useEffect } from "react";
import PreviewSidebar, { TAB_ITEMS } from "./PreviewSidebar";
import OverviewView from "./views/OverviewView";
import RepositoryView from "./views/RepositoryView";
import KnowledgeView from "./views/KnowledgeView";
import DriftView from "./views/DriftView";
import TeamView from "./views/TeamView";
import { PREVIEW_DATA } from "./previewData";
import "./ProductPreview.css";

const AUTO_PLAY_INTERVAL = 5000; // 5 seconds per view

export default function ProductPreview() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-play interval: cleanly switches tab every 5s if auto-playing and not hovered
  useEffect(() => {
    if (!isAutoPlaying || isHovered) return;

    const timer = setTimeout(() => {
      setActiveTab((current) => {
        const currentIdx = TAB_ITEMS.findIndex((t) => t.id === current);
        const nextIdx = (currentIdx + 1) % TAB_ITEMS.length;
        return TAB_ITEMS[nextIdx].id;
      });
    }, AUTO_PLAY_INTERVAL);

    return () => clearTimeout(timer);
  }, [activeTab, isAutoPlaying, isHovered]);

  // Permanently stop auto-play on any user interaction
  const handleUserAction = () => {
    setIsAutoPlaying(false);
  };

  const handleSelectTab = (tabId) => {
    handleUserAction();
    setActiveTab(tabId);
  };

  return (
    <div
      className={`product-preview-wrapper ${isHovered ? "is-hovered" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Ambient Glows */}
      <div className="preview-ambient-glow-left" />
      <div className="preview-ambient-glow-right" />
      <div className="preview-ambient-grid" />

      {/* Main Window Frame */}
      <div className="preview-window-frame">
        {/* Window Chrome Header */}
        <div className="preview-window-header">
          <div className="window-controls">
            <span className="control-dot dot-close" />
            <span className="control-dot dot-min" />
            <span className="control-dot dot-max" />
          </div>

          <div className="window-breadcrumb">
            <span className="bc-root">WhyCode</span>
            <span className="bc-sep">/</span>
            <span className="bc-repo">platform-core</span>
            <span className="bc-sep">/</span>
            <span className="bc-branch">main</span>
          </div>

          <div className="window-status-badge">
            <span className="status-live-dot" />
            <span>AI Knowledge Engine Online</span>
          </div>
        </div>

        {/* Window Body (Sidebar + Focused View) */}
        <div className="preview-window-body">
          <PreviewSidebar
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            isAutoPlaying={isAutoPlaying}
          />

          <main
            className="preview-content-viewport"
            id={`panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
          >
            {/* View 1: Overview */}
            {activeTab === "overview" && (
              <div key="overview" className="view-animated-container">
                <OverviewView
                  data={PREVIEW_DATA.overview}
                  isActive={activeTab === "overview"}
                />
              </div>
            )}

            {/* View 2: Repository */}
            {activeTab === "repository" && (
              <div key="repository" className="view-animated-container">
                <RepositoryView
                  data={PREVIEW_DATA.repository}
                  onUserAction={handleUserAction}
                />
              </div>
            )}

            {/* View 3: Knowledge */}
            {activeTab === "knowledge" && (
              <div key="knowledge" className="view-animated-container">
                <KnowledgeView
                  data={PREVIEW_DATA.knowledge}
                  isActive={activeTab === "knowledge"}
                  onUserAction={handleUserAction}
                />
              </div>
            )}

            {/* View 4: Drift Monitor */}
            {activeTab === "drift" && (
              <div key="drift" className="view-animated-container">
                <DriftView
                  data={PREVIEW_DATA.drift}
                  onUserAction={handleUserAction}
                />
              </div>
            )}

            {/* View 5: Team */}
            {activeTab === "team" && (
              <div key="team" className="view-animated-container">
                <TeamView
                  data={PREVIEW_DATA.team}
                />
              </div>
            )}
          </main>
        </div>

        {/* Window Footer: Exactly ONE disclaimer */}
        <div className="preview-window-footer">
          <span className="footer-disclaimer-text">
            * Illustrative example, not real data
          </span>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { GitBranch, FolderTree, AlertCircle, CheckCircle2 } from "lucide-react";

export default function RepositoryView({ data, onUserAction }) {
  const [selectedNode, setSelectedNode] = useState(data.defaultNode || "auth");

  const handleSelectNode = (nodeId) => {
    setSelectedNode(nodeId);
    if (onUserAction) onUserAction();
  };

  const activeDetail = data.nodes[selectedNode] || data.nodes.auth;

  return (
    <div className="preview-view-container repository-view">
      {/* View Header */}
      <div className="view-header">
        <div className="view-header-left">
          <h3 className="view-headline">{data.title}</h3>
          <span className="view-branch-badge">
            <GitBranch size={12} className="text-cyan" />
            <span>{data.branch}</span>
          </span>
        </div>
        <div className="view-header-right">
          <span className="node-instruction-hint">Click any module to inspect intent</span>
        </div>
      </div>

      {/* Main Visual: Interactive Tree / Intent Map Canvas */}
      <div className="repo-map-canvas">
        <svg
          className="repo-svg-map"
          viewBox="0 0 680 230"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="edgeDefault" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="edgeWarning" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#c084fc" stopOpacity="0.9" />
            </linearGradient>
            <filter id="nodeGlowCyan" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="nodeGlowWarning" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Connection Lines */}
          <g className="repo-map-edges">
            {/* src -> components */}
            <path
              d="M 100 115 C 160 115, 180 50, 240 50"
              stroke="url(#edgeDefault)"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            {/* src -> services */}
            <path
              d="M 100 115 C 170 115, 230 115, 330 115"
              stroke="url(#edgeDefault)"
              strokeWidth="2"
            />
            {/* src -> utils */}
            <path
              d="M 100 115 C 160 115, 180 180, 240 180"
              stroke="url(#edgeDefault)"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            {/* services -> auth (Drift edge) */}
            <path
              d="M 330 115 C 410 115, 460 65, 540 65"
              stroke="url(#edgeWarning)"
              strokeWidth="2.5"
              strokeDasharray="5 3"
              className="edge-pulse-warning"
            />
            {/* services -> api */}
            <path
              d="M 330 115 C 410 115, 460 165, 540 165"
              stroke="url(#edgeDefault)"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          </g>

          {/* Interactive Clickable Nodes */}
          <g className="repo-map-nodes">
            {/* 1. src/ */}
            <g
              className={`svg-tree-node ${selectedNode === "src" ? "selected" : ""}`}
              onClick={() => handleSelectNode("src")}
              transform="translate(100, 115)"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleSelectNode("src")}
            >
              <circle r="22" className="node-hit-area" />
              <circle r="12" className="node-outer" stroke="#00e5ff" filter="url(#nodeGlowCyan)" />
              <circle r="4" fill="#00e5ff" />
              <text x="0" y="28" textAnchor="middle" className="node-text">src/</text>
            </g>

            {/* 2. components/ */}
            <g
              className={`svg-tree-node ${selectedNode === "components" ? "selected" : ""}`}
              onClick={() => handleSelectNode("components")}
              transform="translate(240, 50)"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleSelectNode("components")}
            >
              <circle r="22" className="node-hit-area" />
              <circle r="10" className="node-outer" stroke="#38bdf8" />
              <circle r="3" fill="#38bdf8" />
              <text x="0" y="-18" textAnchor="middle" className="node-text">components/</text>
            </g>

            {/* 3. services/ */}
            <g
              className={`svg-tree-node ${selectedNode === "services" ? "selected" : ""}`}
              onClick={() => handleSelectNode("services")}
              transform="translate(330, 115)"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleSelectNode("services")}
            >
              <circle r="22" className="node-hit-area" />
              <circle r="12" className="node-outer" stroke="#818cf8" filter="url(#nodeGlowCyan)" />
              <circle r="4" fill="#818cf8" />
              <text x="0" y="28" textAnchor="middle" className="node-text font-semibold">services/</text>
            </g>

            {/* 4. utils/ */}
            <g
              className={`svg-tree-node ${selectedNode === "utils" ? "selected" : ""}`}
              onClick={() => handleSelectNode("utils")}
              transform="translate(240, 180)"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleSelectNode("utils")}
            >
              <circle r="22" className="node-hit-area" />
              <circle r="10" className="node-outer" stroke="#818cf8" />
              <circle r="3" fill="#818cf8" />
              <text x="0" y="26" textAnchor="middle" className="node-text">utils/</text>
            </g>

            {/* 5. auth/ (DRIFT NODE - ONLY ONE WITH WARNING ACCENT) */}
            <g
              className={`svg-tree-node node-drift-highlight ${selectedNode === "auth" ? "selected" : ""}`}
              onClick={() => handleSelectNode("auth")}
              transform="translate(540, 65)"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleSelectNode("auth")}
            >
              <circle r="28" className="node-hit-area" />
              <circle r="20" className="node-halo-warning" fill="rgba(192, 132, 252, 0.15)" />
              <circle r="13" className="node-outer-warning" stroke="#c084fc" filter="url(#nodeGlowWarning)" />
              <circle r="5" fill="#c084fc" />
              <text x="0" y="30" textAnchor="middle" className="node-text text-warning font-semibold">auth/</text>
            </g>

            {/* 6. api/ */}
            <g
              className={`svg-tree-node ${selectedNode === "api" ? "selected" : ""}`}
              onClick={() => handleSelectNode("api")}
              transform="translate(540, 165)"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleSelectNode("api")}
            >
              <circle r="22" className="node-hit-area" />
              <circle r="10" className="node-outer" stroke="#00e5ff" />
              <circle r="3" fill="#00e5ff" />
              <text x="0" y="26" textAnchor="middle" className="node-text">api/</text>
            </g>
          </g>
        </svg>

        {/* Drift Callout Tooltip anchored near auth */}
        <div
          className="repo-drift-callout"
          onClick={() => handleSelectNode("auth")}
        >
          <span className="drift-dot-pulse" />
          <span>Documentation drift detected</span>
        </div>
      </div>

      {/* Secondary Element: Selected Node Detail Card Below */}
      <div className={`node-detail-card ${activeDetail.isDrift ? "drift-active" : ""}`}>
        <div className="node-detail-top">
          <span className="node-path-title">{activeDetail.path}</span>
          <span className={`node-type-pill ${activeDetail.isDrift ? "pill-warning" : "pill-cyan"}`}>
            {activeDetail.type}
          </span>
        </div>
        <p className="node-detail-desc">{activeDetail.desc}</p>
      </div>
    </div>
  );
}

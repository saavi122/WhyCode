import React from "react";

export default function HeroTechBackground() {
  return (
    <div className="hero-tech-bg-root" aria-hidden="true">
      {/* 1. Subtle Edge Ambient Glows */}
      <div className="hero-glow-edge-left" />
      <div className="hero-glow-edge-right" />
      <div className="hero-glow-center-depth" />

      {/* 2. SVG Layer: Faint Repo Knowledge Graph, Elegant Flow Lines & Glowing Nodes */}
      <svg
        className="hero-tech-svg"
        viewBox="0 0 1440 760"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Gradients for Curved Flow Lines (Fading smoothly before reaching center text) */}
          <linearGradient id="flowGradLeft1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#00e5ff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="flowGradLeft2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="55%" stopColor="#00e5ff" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="flowGradRight1" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#8b5cf6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="flowGradRight2" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
            <stop offset="55%" stopColor="#8b5cf6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>

          {/* Faint Graph Line Gradients */}
          <linearGradient id="graphGradLeft" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.05" />
          </linearGradient>

          <linearGradient id="graphGradRight" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05" />
          </linearGradient>

          {/* Radial Center Mask to ensure absolute text clarity */}
          <mask id="heroCenterMask">
            <rect width="1440" height="760" fill="white" />
            <radialGradient id="maskGrad" cx="50%" cy="40%" r="42%">
              <stop offset="0%" stopColor="black" />
              <stop offset="60%" stopColor="black" stopOpacity="0.8" />
              <stop offset="100%" stopColor="white" />
            </radialGradient>
            <rect width="1440" height="760" fill="url(#maskGrad)" />
          </mask>
        </defs>

        {/* ====================================================
            A. HEAVILY BLURRED, LOW-OPACITY REPO / CODE GRAPH STRUCTURE
            ==================================================== */}
        <g className="hero-repo-graph" mask="url(#heroCenterMask)">
          {/* Left Branch Architecture */}
          <path
            d="M 60 120 L 140 180 L 220 180 L 290 250 M 140 180 L 200 130 L 320 130 M 80 280 L 160 280 L 230 350 L 340 350"
            stroke="url(#graphGradLeft)"
            strokeWidth="1.2"
            fill="none"
          />
          <circle cx="60" cy="120" r="3" fill="#00e5ff" opacity="0.3" />
          <circle cx="140" cy="180" r="3.5" fill="#00e5ff" opacity="0.4" />
          <circle cx="220" cy="180" r="2.5" fill="#00e5ff" opacity="0.3" />
          <circle cx="200" cy="130" r="3" fill="#38bdf8" opacity="0.35" />
          <circle cx="320" cy="130" r="2" fill="#38bdf8" opacity="0.2" />
          <circle cx="290" cy="250" r="2.5" fill="#00e5ff" opacity="0.25" />
          <circle cx="80" cy="280" r="2" fill="#00e5ff" opacity="0.2" />
          <circle cx="160" cy="280" r="3" fill="#00e5ff" opacity="0.35" />
          <circle cx="230" cy="350" r="2.5" fill="#4f46e5" opacity="0.3" />

          {/* Right Branch Architecture */}
          <path
            d="M 1380 130 L 1300 190 L 1220 190 L 1150 260 M 1300 190 L 1240 130 L 1120 130 M 1360 290 L 1280 290 L 1210 360 L 1100 360"
            stroke="url(#graphGradRight)"
            strokeWidth="1.2"
            fill="none"
          />
          <circle cx="1380" cy="130" r="3" fill="#8b5cf6" opacity="0.3" />
          <circle cx="1300" cy="190" r="3.5" fill="#8b5cf6" opacity="0.4" />
          <circle cx="1220" cy="190" r="2.5" fill="#8b5cf6" opacity="0.3" />
          <circle cx="1240" cy="130" r="3" fill="#a855f7" opacity="0.35" />
          <circle cx="1120" cy="130" r="2" fill="#a855f7" opacity="0.2" />
          <circle cx="1150" cy="260" r="2.5" fill="#8b5cf6" opacity="0.25" />
          <circle cx="1360" cy="290" r="2" fill="#8b5cf6" opacity="0.2" />
          <circle cx="1280" cy="290" r="3" fill="#8b5cf6" opacity="0.35" />
          <circle cx="1210" cy="360" r="2.5" fill="#6366f1" opacity="0.3" />
        </g>

        {/* ====================================================
            B. EXTREMELY THIN ELEGANT CURVED DATA-FLOW LINES
            ==================================================== */}
        <g className="hero-flow-lines">
          {/* Left Flow Curves */}
          <path
            className="flow-line flow-line-1"
            d="M -40 180 C 180 150, 360 255, 520 275"
            stroke="url(#flowGradLeft1)"
            strokeWidth="0.9"
            fill="none"
          />
          <path
            className="flow-line flow-line-2"
            d="M -20 370 C 190 340, 350 300, 500 288"
            stroke="url(#flowGradLeft2)"
            strokeWidth="0.8"
            fill="none"
          />

          {/* Right Flow Curves */}
          <path
            className="flow-line flow-line-3"
            d="M 1480 170 C 1260 140, 1080 250, 920 275"
            stroke="url(#flowGradRight1)"
            strokeWidth="0.9"
            fill="none"
          />
          <path
            className="flow-line flow-line-4"
            d="M 1460 370 C 1250 345, 1090 300, 940 288"
            stroke="url(#flowGradRight2)"
            strokeWidth="0.8"
            fill="none"
          />
        </g>

        {/* ====================================================
            C. 4 TINY GLOWING NODES ALONG THE DATA-FLOW LINES
            ==================================================== */}
        <g className="hero-flow-nodes">
          {/* Node 1 - Upper Left Line (Cyan) */}
          <g className="tech-node tech-node-1" transform="translate(245, 195)">
            <circle r="7" fill="#00e5ff" opacity="0.18" className="tech-node-halo" />
            <circle r="2.2" fill="#00e5ff" className="tech-node-core" />
            <circle r="0.8" fill="#ffffff" />
          </g>

          {/* Node 2 - Lower Left Line (Electric Blue) */}
          <g className="tech-node tech-node-2" transform="translate(365, 308)">
            <circle r="6" fill="#38bdf8" opacity="0.18" className="tech-node-halo" />
            <circle r="1.8" fill="#38bdf8" className="tech-node-core" />
            <circle r="0.6" fill="#ffffff" />
          </g>

          {/* Node 3 - Upper Right Line (Violet) */}
          <g className="tech-node tech-node-3" transform="translate(1195, 185)">
            <circle r="7" fill="#8b5cf6" opacity="0.18" className="tech-node-halo" />
            <circle r="2.2" fill="#8b5cf6" className="tech-node-core" />
            <circle r="0.8" fill="#ffffff" />
          </g>

          {/* Node 4 - Lower Right Line (Purple) */}
          <g className="tech-node tech-node-4" transform="translate(1075, 310)">
            <circle r="6" fill="#a855f7" opacity="0.18" className="tech-node-halo" />
            <circle r="1.8" fill="#a855f7" className="tech-node-core" />
            <circle r="0.6" fill="#ffffff" />
          </g>
        </g>
      </svg>
    </div>
  );
}

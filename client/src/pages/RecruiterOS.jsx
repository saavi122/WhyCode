import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, Award, Calendar, CheckSquare, Search, 
  ChevronRight, ArrowLeft, Heart, Sun, Moon, Sparkles, Filter 
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import API from "../services/api";

export default function RecruiterOS() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  
  // Local storage shortlist state
  const [shortlist, setShortlist] = useState(() => {
    const saved = localStorage.getItem("whycode-shortlist");
    return saved ? JSON.parse(saved) : {};
  });

  const toggleShortlist = (id) => {
    setShortlist((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      localStorage.setItem("whycode-shortlist", JSON.stringify(updated));
      return updated;
    });
  };

  // Fetch candidate/developer data from the actual backend team contribution endpoint
  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ["recruiterCandidates"],
    queryFn: async () => {
      try {
        const res = await API.get("/team");
        return res.data;
      } catch (err) {
        console.error(err);
        return [];
      }
    }
  });

  // High-fidelity fallback candidate database representing candidate applicants
  const fallbackCandidates = [
    {
      _id: "c1",
      name: "Asha Varma",
      email: "asha@whycode.io",
      githubUsername: "ashacodes",
      designation: "Frontend Architect",
      knowledgeScore: 94,
      totalCommits: 48,
      prs: 12,
      reviews: 18,
      docContributions: 9,
      skills: { codeQuality: 95, testing: 82, architecture: 90, communication: 94, velocity: 88 }
    },
    {
      _id: "c2",
      name: "Ravi Patel",
      email: "ravi.patel@whycode.io",
      githubUsername: "ravitests",
      designation: "SDET Automation Lead",
      knowledgeScore: 87,
      totalCommits: 36,
      prs: 8,
      reviews: 14,
      docContributions: 6,
      skills: { codeQuality: 80, testing: 98, architecture: 82, communication: 86, velocity: 92 }
    },
    {
      _id: "c3",
      name: "Mira Sen",
      email: "mira.sen@whycode.io",
      githubUsername: "miradesigns",
      designation: "Backend Tech Lead",
      knowledgeScore: 96,
      totalCommits: 52,
      prs: 15,
      reviews: 22,
      docContributions: 11,
      skills: { codeQuality: 92, testing: 84, architecture: 98, communication: 90, velocity: 86 }
    },
    {
      _id: "c4",
      name: "Kenji Sato",
      email: "kenji@whycode.io",
      githubUsername: "kenjisec",
      designation: "DevSecOps Engineer",
      knowledgeScore: 89,
      totalCommits: 44,
      prs: 10,
      reviews: 16,
      docContributions: 7,
      skills: { codeQuality: 88, testing: 86, architecture: 89, communication: 82, velocity: 94 }
    },
    {
      _id: "c5",
      name: "Leah Miller",
      email: "leah@whycode.io",
      githubUsername: "leahdevops",
      designation: "Release Engineer",
      knowledgeScore: 91,
      totalCommits: 40,
      prs: 9,
      reviews: 12,
      docContributions: 8,
      skills: { codeQuality: 84, testing: 90, architecture: 88, communication: 89, velocity: 96 }
    }
  ];

  // Merge backend team members if any, else use fallback
  const candidates = teamMembers && teamMembers.length > 0
    ? teamMembers.map((m, idx) => ({
        ...m,
        skills: m.skills || {
          codeQuality: m.knowledgeScore || 78 + Math.floor(Math.random() * 20),
          testing: m.prs * 8 || 70 + Math.floor(Math.random() * 25),
          architecture: m.reviews * 7 || 75 + Math.floor(Math.random() * 20),
          communication: 80 + Math.floor(Math.random() * 15),
          velocity: m.totalCommits + 40 || 70 + Math.floor(Math.random() * 25)
        }
      }))
    : fallbackCandidates;

  useEffect(() => {
    if (candidates.length > 0 && !selectedCandidateId) {
      setSelectedCandidateId(candidates[0]._id);
    }
  }, [candidates, selectedCandidateId]);

  const selectedCandidate = candidates.find((c) => c._id === selectedCandidateId) || candidates[0];

  // Filter candidates list
  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "All" || 
                        (roleFilter === "Shortlisted" && shortlist[c._id]) ||
                        c.designation.includes(roleFilter);
    return matchesSearch && matchesRole;
  });

  // Calculate SVG Radar Chart Pentagon coordinates
  const renderRadarChart = (skills) => {
    if (!skills) return null;
    const center = 150;
    const maxVal = 100;
    const radius = 90;
    const points = [
      { name: "Code Quality", val: skills.codeQuality || 80, angle: 0 },
      { name: "Testing", val: skills.testing || 80, angle: (2 * Math.PI) / 5 },
      { name: "Architecture", val: skills.architecture || 80, angle: (4 * Math.PI) / 5 },
      { name: "Communication", val: skills.communication || 80, angle: (6 * Math.PI) / 5 },
      { name: "Velocity", val: skills.velocity || 80, angle: (8 * Math.PI) / 5 }
    ];

    // Compute polygon point strings
    const gridPoints50 = points.map((p) => {
      const r = radius * 0.5;
      const x = center + r * Math.sin(p.angle);
      const y = center - r * Math.cos(p.angle);
      return `${x},${y}`;
    }).join(" ");

    const gridPoints100 = points.map((p) => {
      const r = radius;
      const x = center + r * Math.sin(p.angle);
      const y = center - r * Math.cos(p.angle);
      return `${x},${y}`;
    }).join(" ");

    const activePolygonPoints = points.map((p) => {
      const r = radius * (p.val / maxVal);
      const x = center + r * Math.sin(p.angle);
      const y = center - r * Math.cos(p.angle);
      return `${x},${y}`;
    }).join(" ");

    return (
      <svg width="300" height="300" className="mx-auto select-none overflow-visible">
        {/* Outer grid pentagon */}
        <polygon points={gridPoints100} className="stroke-os-border fill-none" strokeWidth="1" />
        {/* Inner grid pentagon */}
        <polygon points={gridPoints50} className="stroke-os-border/50 fill-none" strokeWidth="1" strokeDasharray="3 3" />
        
        {/* Radar axes lines */}
        {points.map((p, idx) => {
          const x = center + radius * Math.sin(p.angle);
          const y = center - radius * Math.cos(p.angle);
          return (
            <line 
              key={idx} 
              x1={center} 
              y1={center} 
              x2={x} 
              y2={y} 
              className="stroke-os-border/60" 
              strokeWidth="1" 
            />
          );
        })}

        {/* Competency Labels */}
        {points.map((p, idx) => {
          const labelDist = radius + 22;
          const x = center + labelDist * Math.sin(p.angle);
          const y = center - labelDist * Math.cos(p.angle);
          let textAnchor = "middle";
          if (p.angle > 0.1 && p.angle < Math.PI) textAnchor = "start";
          if (p.angle > Math.PI && p.angle < 2 * Math.PI - 0.1) textAnchor = "end";
          return (
            <text
              key={idx}
              x={x}
              y={y + 4}
              textAnchor={textAnchor}
              className="text-[10px] font-extrabold fill-os-text-secondary"
            >
              {p.name} ({p.val})
            </text>
          );
        })}

        {/* Active Skill Area Polygon */}
        <polygon 
          points={activePolygonPoints} 
          className="fill-brand-cyan/20 stroke-brand-cyan" 
          strokeWidth="2" 
        />

        {/* Data points dots */}
        {points.map((p, idx) => {
          const r = radius * (p.val / maxVal);
          const x = center + r * Math.sin(p.angle);
          const y = center - r * Math.cos(p.angle);
          return (
            <circle 
              key={idx} 
              cx={x} 
              cy={y} 
              r="4" 
              className="fill-brand-blue stroke-white dark:stroke-black" 
              strokeWidth="1.5" 
            />
          );
        })}
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-os-bg text-os-text flex flex-col font-sans transition-colors duration-300">
      
      {/* Decorative Radials */}
      <div className="absolute top-0 left-0 w-[40vw] h-[40vw] rounded-full bg-brand-cyan/6 blur-[80px] pointer-events-none -z-10 animate-pulse-glow" />
      <div className="absolute bottom-0 right-0 w-[30vw] h-[30vw] rounded-full bg-brand-violet/5 blur-[90px] pointer-events-none -z-10" />

      {/* Recruiter Header Bar */}
      <header className="sticky top-0 z-40 bg-os-surface/70 backdrop-blur-xl border-b border-os-border px-8 py-4 flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate("/")}
            className="p-1.5 rounded-lg border border-os-border hover:bg-os-border/50 text-os-text-secondary transition"
          >
            <ArrowLeft size={14} />
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-violet animate-pulse"></span>
            <span className="font-extrabold text-sm text-os-text">WhyCode OS: Talent Directory</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-os-border glassmorphism hover:bg-os-border/40 text-os-text-secondary transition"
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/20">
            Recruiter Session
          </span>
        </div>
      </header>

      {/* Main Roster Body */}
      <main className="flex-grow p-8 max-w-6xl mx-auto w-full flex flex-col gap-6 select-none">
        
        {/* Filters and search block */}
        <div className="flex flex-col md:flex-row items-center gap-4 bg-os-surface/40 border border-os-border/60 p-4 rounded-2xl glassmorphism text-left">
          
          {/* Search bar */}
          <div className="relative flex-grow w-full">
            <Search className="absolute left-3.5 top-3.5 text-os-text-muted" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate profiles by name, role or email..."
              className="w-full bg-os-surface border border-os-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-os-text placeholder-os-text-muted focus:outline-none select-text"
            />
          </div>

          {/* Quick tab filters */}
          <div className="flex items-center gap-1 bg-os-bg-secondary p-1 rounded-xl border border-os-border/80 shrink-0 w-full md:w-auto overflow-x-auto">
            {["All", "Shortlisted", "Architect", "Lead", "Engineer"].map((filter) => (
              <button
                key={filter}
                onClick={() => setRoleFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-tight transition ${
                  roleFilter === filter
                    ? "bg-brand-blue/10 text-brand-blue dark:bg-brand-cyan/10 dark:text-brand-cyan font-black"
                    : "text-os-text-secondary hover:text-os-text"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

        </div>

        {/* Content split screen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow">
          
          {/* Left panel: Candidate directory list */}
          <div className="md:col-span-2 flex flex-col gap-3 overflow-y-auto max-h-[550px] pr-2">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-os-text-muted">Analyzing git logs & roster databases...</div>
            ) : filteredCandidates.length === 0 ? (
              <div className="p-8 text-center text-xs text-os-text-muted bg-os-surface/40 rounded-2xl border border-os-border">
                No candidates match the active directory query filters.
              </div>
            ) : (
              filteredCandidates.map((cand) => (
                <div
                  key={cand._id}
                  onClick={() => setSelectedCandidateId(cand._id)}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    selectedCandidateId === cand._id
                      ? "bg-brand-blue/6 border-brand-blue dark:bg-brand-cyan/6 dark:border-brand-cyan shadow-sm"
                      : "bg-os-surface/40 border-os-border/60 hover:bg-os-bg-secondary/40"
                  }`}
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-cyan via-brand-blue to-brand-violet flex items-center justify-center font-bold text-white shadow-sm">
                      {cand.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-os-text flex items-center gap-2">
                        <span>{cand.name}</span>
                        {shortlist[cand._id] && <Heart size={10} className="fill-red-500 text-red-500" />}
                      </h4>
                      <span className="text-[10px] font-bold text-os-text-muted">{cand.designation}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-xs text-right">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-os-text-muted uppercase">Git Commits</span>
                      <span className="font-extrabold text-os-text">{cand.totalCommits}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-os-text-muted uppercase">Quality Score</span>
                      <span className="font-bold text-brand-mint">{cand.knowledgeScore}%</span>
                    </div>
                    <ChevronRight size={14} className="text-os-text-muted" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right panel: Competency Radar visualizer details */}
          {selectedCandidate && (
            <div className="glassmorphism p-5 rounded-2xl border border-os-border flex flex-col justify-between text-left h-[550px] overflow-y-auto">
              <div>
                {/* Header card details */}
                <div className="flex items-center justify-between border-b border-os-border/40 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-brand-indigo to-brand-violet flex items-center justify-center font-black text-white text-base">
                      {selectedCandidate.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-os-text">{selectedCandidate.name}</h4>
                      <span className="text-[10px] font-bold text-os-text-muted">{selectedCandidate.email}</span>
                    </div>
                  </div>
                  
                  {/* Shortlist heart button switch */}
                  <button
                    onClick={() => toggleShortlist(selectedCandidate._id)}
                    className={`p-2 rounded-xl border transition ${
                      shortlist[selectedCandidate._id]
                        ? "bg-red-500/10 border-red-500 text-red-500"
                        : "border-os-border text-os-text-muted hover:text-os-text"
                    }`}
                    title="Shortlist Candidate"
                  >
                    <Heart size={14} className={shortlist[selectedCandidate._id] ? "fill-red-500" : ""} />
                  </button>
                </div>

                {/* Radar chart component canvas */}
                <div className="py-2">
                  {renderRadarChart(selectedCandidate.skills)}
                </div>
              </div>

              {/* Developer score counts */}
              <div className="flex flex-col gap-2.5 border-t border-os-border/40 pt-4 mt-auto">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-os-text-secondary font-bold">Contribution Score</span>
                  <span className="font-extrabold text-brand-mint">{selectedCandidate.knowledgeScore}%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-os-text-secondary font-bold">PR Approvals</span>
                  <span className="font-extrabold text-os-text">{selectedCandidate.prs}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-os-text-secondary font-bold">Shortlist Status</span>
                  <span className={`font-bold uppercase text-[9px] px-2 py-0.5 rounded-full ${
                    shortlist[selectedCandidate._id]
                      ? "bg-brand-mint/10 text-brand-mint border border-brand-mint/20"
                      : "bg-os-bg-secondary text-os-text-muted border border-os-border/80"
                  }`}>
                    {shortlist[selectedCandidate._id] ? "Shortlisted" : "Available"}
                  </span>
                </div>
              </div>

            </div>
          )}

        </div>

      </main>

    </div>
  );
}

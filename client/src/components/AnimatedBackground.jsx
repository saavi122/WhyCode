import React from "react";
import NodeNetwork from "./NodeNetwork";
import FloatingParticles from "./FloatingParticles";

export default function AnimatedBackground() {
  return (
    <div className="absolute inset-0 w-full h-full bg-[#040404] overflow-hidden" style={{ zIndex: 1 }}>
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-radial from-[#00D9FF]/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-radial from-[#7C3AED]/8 to-transparent blur-[140px] pointer-events-none" />
      <div className="absolute top-[40%] left-[30%] w-[350px] h-[350px] rounded-full bg-[#4F46E5]/4 blur-[100px] pointer-events-none animate-pulse" />

      {/* Interactive Constellations Grid */}
      <NodeNetwork />

      {/* Floating Sparkles Particles */}
      <FloatingParticles />
    </div>
  );
}

import React from "react";
import { motion } from "framer-motion";

export default function RepositoryCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
      className="relative w-full max-w-[440px] h-[110px] rounded-xl border border-white/5 bg-[#0c0c0e]/85 backdrop-blur-[16px] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col justify-between select-none text-left overflow-hidden"
    >
      {/* Scanning beam overlay */}
      <div className="scanning-beam" />

      {/* Row 1: Top File Details */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-2 h-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-ping absolute" />
            <span className="w-2 h-2 rounded-full bg-[#10B981] absolute" />
          </div>
          <span className="font-mono text-xs text-white font-bold pl-2.5">authService.js</span>
        </div>
        <span className="text-[9px] font-bold text-[#10B981] tracking-wider uppercase">Connected</span>
      </div>

      {/* Row 2: Horizontal Connection Pipeline */}
      <div className="relative w-full h-[2px] bg-white/5 my-2 z-10">
        {/* Animated flow particle dot sliding back and forth */}
        <motion.div
          animate={{
            x: [0, 360],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-[-4px] w-2.5 h-2.5 rounded-full bg-[#00D9FF] shadow-[0_0_8px_#00D9FF]"
        />
      </div>

      {/* Row 3: Bottom File Details */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2 pl-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#52525b]" />
          <span className="font-mono text-xs text-[#71717a] font-semibold pl-2">crypto.js</span>
        </div>
        <span className="text-[9px] font-semibold text-[#52525b] uppercase">Idle</span>
      </div>
    </motion.div>
  );
}

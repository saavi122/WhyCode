import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function WorkspaceCard() {
  const [fileCount, setFileCount] = useState(4720);

  // Tick up the files slowly to show live indexing activity
  useEffect(() => {
    const interval = setInterval(() => {
      setFileCount((prev) => {
        if (prev >= 5900) return 4720;
        return prev + Math.floor(Math.random() * 25) + 5;
      });
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const progressPercentage = (fileCount / 5900) * 100;

  return (
    <div className="flex flex-col gap-5 w-full max-w-[600px] select-none text-left">
      {/* Indexer Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="rounded-2xl border border-white/5 bg-[#0c0c0e]/85 backdrop-blur-[16px] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">Workspace Indexer</span>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold text-[#10B981] border border-[#10B981]/20 bg-[#10B981]/5 tracking-wider uppercase">Active</span>
        </div>

        <h4 className="font-mono text-sm text-white font-bold mb-3">whycode/gateway-engine</h4>

        {/* Progress Bar container */}
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-3">
          <motion.div
            style={{ width: `${progressPercentage}%` }}
            className="h-full bg-gradient-to-r from-[#00D9FF] via-[#4F46E5] to-[#7C3AED]"
          />
        </div>

        <div className="text-[10px] font-semibold text-[#71717a] font-mono">
          Indexing AST node graphs: <span className="text-white">{fileCount.toLocaleString()}</span> / 5,900 files
        </div>
      </motion.div>

      {/* Terminal Code Preview Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        className="rounded-2xl border border-white/5 bg-[#0c0c0e]/60 backdrop-blur-[16px] p-5 shadow-[0_25px_60px_rgba(0,0,0,0.6)] font-mono text-[10px] leading-relaxed text-[#71717a]"
      >
        {/* Editor controls */}
        <div className="flex items-center gap-1.5 mb-4">
          <span className="w-2 h-2 rounded-full bg-[#ef4444]/60" />
          <span className="w-2 h-2 rounded-full bg-[#eab308]/60" />
          <span className="w-2 h-2 rounded-full bg-[#22c55e]/60" />
        </div>

        {/* Code Block snippet */}
        <div className="text-left text-[#a1a1aa]">
          <div><span className="text-[#f87171]">export const</span> <span className="text-[#00D9FF]">registerTenant</span> = <span className="text-[#f87171]">async</span> (db, org) =&gt; &#123;</div>
          <div className="pl-4">const <span className="text-[#c084fc]">schema</span> = <span className="text-[#f87171]">await</span> db.createSchema(org.id);</div>
          <div className="pl-4"><span className="text-[#f87171]">await</span> schema.initializeGraphIndex();</div>
          <div className="pl-4">return schema.status; <span className="text-[#71717a]">// 'active'</span></div>
          <div>&#125;;</div>
        </div>
      </motion.div>
    </div>
  );
}

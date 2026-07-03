import React from "react";
import { motion } from "framer-motion";
import { 
  Sparkles, Code, ShieldCheck, Eye, Compass, Activity, 
  ChevronRight, Brain, Terminal, FileText, Send 
} from "lucide-react";

export default function OrbitMenu({ onSelectStep }) {
  const steps = [
    {
      id: "plan",
      title: "Plan",
      desc: "Turn ideas into structured plans",
      side: "left",
      icon: Sparkles,
      color: "from-brand-cyan to-brand-blue",
    },
    {
      id: "code",
      title: "Code",
      desc: "AI that writes clean, reliable code",
      side: "left",
      icon: Code,
      color: "from-brand-blue to-brand-indigo",
    },
    {
      id: "test",
      title: "Test",
      desc: "Automatic tests that catch issues early",
      side: "left",
      icon: ShieldCheck,
      color: "from-brand-indigo to-brand-violet",
    },
    {
      id: "review",
      title: "Review",
      desc: "Smart reviews that improve every PR",
      side: "right",
      icon: Eye,
      color: "from-brand-cyan to-brand-indigo",
    },
    {
      id: "deploy",
      title: "Deploy",
      desc: "Ship to production with confidence",
      side: "right",
      icon: Compass,
      color: "from-brand-violet to-brand-cyan",
    },
    {
      id: "observe",
      title: "Observe",
      desc: "Real-time insights that matter",
      side: "right",
      icon: Activity,
      color: "from-brand-mint to-brand-cyan",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = (side) => ({
    hidden: { 
      opacity: 0, 
      x: side === "left" ? -40 : 40 
    },
    show: { 
      opacity: 1, 
      x: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  });

  return (
    <div className="relative w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4 my-12 z-10 px-4">
      {/* Symmetrical Left Column */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="flex flex-col gap-6 w-full md:w-[300px]"
      >
        {steps.filter(s => s.side === "left").map((step) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.id}
              variants={cardVariants("left")}
              whileHover={{ 
                scale: 1.05, 
                x: 8,
                transition: { type: "spring", stiffness: 400, damping: 10 }
              }}
              onClick={() => onSelectStep?.(step.id)}
              className="glassmorphism p-5 rounded-2xl cursor-pointer shadow-sm hover:shadow-os-light dark:hover:shadow-os-dark flex items-start gap-4 transition-all duration-300 group border border-os-border"
            >
              <div className={`p-3 rounded-xl bg-gradient-to-br ${step.color} text-white shadow-sm`}>
                <Icon size={20} />
              </div>
              <div className="flex-grow">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-os-text text-sm group-hover:text-brand-blue dark:group-hover:text-[#00D9FF] transition-colors">
                    {step.title}
                  </h3>
                  <ChevronRight size={14} className="text-os-text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-xs text-os-text-secondary mt-1">{step.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Symmetrical Right Column */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="flex flex-col gap-6 w-full md:w-[300px] md:order-last"
      >
        {steps.filter(s => s.side === "right").map((step) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.id}
              variants={cardVariants("right")}
              whileHover={{ 
                scale: 1.05, 
                x: -8,
                transition: { type: "spring", stiffness: 400, damping: 10 }
              }}
              onClick={() => onSelectStep?.(step.id)}
              className="glassmorphism p-5 rounded-2xl cursor-pointer shadow-sm hover:shadow-os-light dark:hover:shadow-os-dark flex items-start gap-4 transition-all duration-300 group border border-os-border"
            >
              <div className={`p-3 rounded-xl bg-gradient-to-br ${step.color} text-white shadow-sm`}>
                <Icon size={20} />
              </div>
              <div className="flex-grow">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-os-text text-sm group-hover:text-brand-blue dark:group-hover:text-[#00D9FF] transition-colors">
                    {step.title}
                  </h3>
                  <ChevronRight size={14} className="text-os-text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-xs text-os-text-secondary mt-1">{step.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Backdrop connecting SVG lines */}
      <div className="absolute inset-0 pointer-events-none hidden md:block -z-10">
        <svg className="w-full h-full" viewBox="0 0 1152 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Orbital path connections */}
          <path d="M 300 80 Q 576 200 852 80" stroke="url(#line-gradient)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3"/>
          <path d="M 300 200 H 852" stroke="url(#line-gradient)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3"/>
          <path d="M 300 320 Q 576 200 852 320" stroke="url(#line-gradient)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3"/>
          
          <defs>
            <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00D9FF" />
              <stop offset="50%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

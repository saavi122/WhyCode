import React, { useState, useEffect } from "react";

export default function BootScreen({ onComplete }) {
  const [typed, setTyped] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);
  const [step, setStep] = useState("typing"); // 'typing' | 'blink' | 'glow' | 'loading' | 'fadeout'
  const [progress, setProgress] = useState(0);

  const fullWord = "WHYCODE";

  // Typewriter effect
  useEffect(() => {
    if (step !== "typing") return;
    let charIndex = 0;
    const interval = setInterval(() => {
      if (charIndex <= fullWord.length) {
        setTyped(fullWord.substring(0, charIndex));
        charIndex++;
      } else {
        clearInterval(interval);
        setStep("blink");
      }
    }, 120);

    return () => clearInterval(interval);
  }, [step]);

  // Cursor blink twice effect
  useEffect(() => {
    if (step !== "blink") return;
    let blinks = 0;
    const interval = setInterval(() => {
      setCursorVisible(prev => !prev);
      blinks++;
      if (blinks >= 4) { // 2 full blinks
        clearInterval(interval);
        setCursorVisible(true);
        setStep("glow");
      }
    }, 200);

    return () => clearInterval(interval);
  }, [step]);

  // Scaling and glow transition
  useEffect(() => {
    if (step !== "glow") return;
    const timer = setTimeout(() => {
      setStep("loading");
    }, 600);
    return () => clearTimeout(timer);
  }, [step]);

  // Loading progression
  useEffect(() => {
    if (step !== "loading") return;
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          return 100;
        }
        return prev + 10;
      });
    }, 55);

    return () => clearInterval(interval);
  }, [step]);

  // Handle completion when progress reaches 100
  useEffect(() => {
    if (step === "loading" && progress >= 100) {
      const timer1 = setTimeout(() => {
        setStep("fadeout");
        const timer2 = setTimeout(() => {
          if (onComplete) onComplete();
        }, 450);
        return () => clearTimeout(timer2);
      }, 250);
      return () => clearTimeout(timer1);
    }
  }, [progress, step, onComplete]);

  // Toggle cursor blinking in other steps
  useEffect(() => {
    if (step === "typing" || step === "glow") return;
    const interval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 450);
    return () => clearInterval(interval);
  }, [step]);

  // Percentage blocks helper
  const getProgressBlocks = () => {
    const totalBlocks = 16;
    const activeBlocks = Math.round((progress / 100) * totalBlocks);
    return "█".repeat(activeBlocks) + "░".repeat(totalBlocks - activeBlocks);
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-black text-[#00ffcc] font-mono flex flex-col items-center justify-center transition-opacity duration-500 ease-out select-none ${
        step === "fadeout" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Main WHYCODE Typewriter word */}
        <div className="relative">
          {/* Back cyan glow behind logo word */}
          <div
            className={`absolute inset-0 bg-brand-cyan/25 blur-xl rounded-full scale-150 transition-opacity duration-500 ${
              step === "glow" || step === "loading" ? "opacity-100" : "opacity-0"
            }`}
          />
          
          <h1
            className={`text-3xl md:text-5xl font-black tracking-[0.2em] relative transition-transform duration-500 ${
              step === "glow" || step === "loading" ? "scale-110 text-white font-extrabold" : "text-[#00ffcc]"
            }`}
          >
            {typed}
            <span
              className={`inline-block font-normal ml-1 ${
                cursorVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              █
            </span>
          </h1>
        </div>

        {/* Loading details */}
        <div
          className={`flex flex-col items-center gap-2 h-14 transition-opacity duration-300 ${
            step === "loading" ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="text-[10px] md:text-xs text-os-text-muted font-bold tracking-widest uppercase">
            Initializing AI Workspace...
          </div>
          <div className="text-[11px] md:text-sm text-[#00ffcc] font-bold font-mono">
            {getProgressBlocks()} {progress}%
          </div>
        </div>
      </div>
    </div>
  );
}

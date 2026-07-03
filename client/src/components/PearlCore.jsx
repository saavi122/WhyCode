import React, { useEffect, useRef } from "react";

export default function PearlCore({ isHovered = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;

    // Set dimensions
    const size = 680;
    canvas.width = size * 2;
    canvas.height = size * 2;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(2, 2);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = 235;
    const perspective = 380;

    // Initialize 3D nodes on a sphere surface
    const numPoints = 160;
    const points = [];

    for (let i = 0; i < numPoints; i++) {
      // Golden spiral distribution for uniform sphere coordinates
      const theta = Math.acos(1 - (2 * (i + 0.5)) / numPoints);
      const phi = Math.PI * (1 + Math.sqrt(5)) * i;

      points.push({
        x: radius * Math.sin(theta) * Math.cos(phi),
        y: radius * Math.sin(theta) * Math.sin(phi),
        z: radius * Math.cos(theta),
        char: Math.random() > 0.6 ? (Math.random() > 0.5 ? "1" : "0") : ".",
        color: Math.random() > 0.6 ? "#00E5FF" : (Math.random() > 0.5 ? "#3B82F6" : "#8B5CF6")
      });
    }

    // Motion parameters
    let angleY = 0.0025;
    let angleX = 0.0012;
    let mouseX = 0;
    let mouseY = 0;
    let targetRotY = 0;
    let targetRotX = 0;

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - centerX;
      const y = e.clientY - rect.top - centerY;
      // Map mouse coordinates to subtle rotation targets
      targetRotY = (x / centerX) * 0.015;
      targetRotX = (y / centerY) * 0.015;
    };

    canvas.addEventListener("mousemove", handleMouseMove);

    // Animation loop
    const animate = () => {
      animId = requestAnimationFrame(animate);
      ctx.clearRect(0, 0, size, size);

      // Smoothly interpolate rotation velocity towards target
      angleY += (targetRotY - angleY) * 0.08;
      angleX += (targetRotX - angleX) * 0.08;

      // Rotate all points in 3D space
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      points.forEach(p => {
        // Rotate Y
        let x1 = p.x * cosY - p.z * sinY;
        let z1 = p.x * sinY + p.z * cosY;

        // Rotate X
        let y2 = p.y * cosX - z1 * sinX;
        let z2 = p.y * sinX + z1 * cosX;

        p.x = x1;
        p.y = y2;
        p.z = z2;
      });

      // Depth sort points so back elements render before front ones
      const sortedPoints = [...points].sort((a, b) => b.z - a.z);

      // Draw lines between nearby points to create network wireframe
      ctx.lineWidth = 0.45;
      for (let i = 0; i < sortedPoints.length; i++) {
        const p1 = sortedPoints[i];
        
        // Calculate perspective coordinates for p1
        const scale1 = perspective / (perspective + p1.z);
        const scrX1 = centerX + p1.x * scale1;
        const scrY1 = centerY + p1.y * scale1;

        // Skip drawing connections for elements in the back to reduce visual clutter
        if (p1.z > 80) continue;

        for (let j = i + 1; j < sortedPoints.length; j++) {
          const p2 = sortedPoints[j];
          if (p2.z > 80) continue;

          // Compute 3D distance
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dz = p1.z - p2.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          // Connect if within proximity threshold
          if (dist < 60) {
            const scale2 = perspective / (perspective + p2.z);
            const scrX2 = centerX + p2.x * scale2;
            const scrY2 = centerY + p2.y * scale2;

            // Fade opacity based on distance and average depth
            const avgZ = (p1.z + p2.z) / 2;
            const depthFade = Math.max(0, 1 - (avgZ + radius) / (radius * 2));
            const distFade = 1 - dist / 60;
            const opacity = 0.16 * depthFade * distFade;

            ctx.beginPath();
            ctx.moveTo(scrX1, scrY1);
            ctx.lineTo(scrX2, scrY2);
            ctx.strokeStyle = `rgba(0, 229, 255, ${opacity})`;
            ctx.stroke();
          }
        }
      }

      // Draw the digital characters (0, 1, .)
      sortedPoints.forEach(p => {
        const scale = perspective / (perspective + p.z);
        const scrX = centerX + p.x * scale;
        const scrY = centerY + p.y * scale;

        // Opacity mapping (nodes in front are brighter)
        const depthFade = Math.max(0.08, 1 - (p.z + radius) / (radius * 2.2));
        ctx.globalAlpha = depthFade;

        if (p.char === ".") {
          // Draw standard glowing dot
          ctx.beginPath();
          ctx.arc(scrX, scrY, 1.5 * scale, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 4;
          ctx.shadowColor = p.color;
          ctx.fill();
        } else {
          // Draw binary font character
          ctx.font = `${Math.max(6, Math.round(9 * scale))}px monospace`;
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 6;
          ctx.shadowColor = p.color;
          ctx.fillText(p.char, scrX, scrY);
        }
      });

      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div 
      className="relative w-full h-full flex items-center justify-center transition-transform duration-500 ease-out"
      style={{ transform: `scale(${isHovered ? 1.08 : 1.0})` }}
    >
      {/* 3D Canvas Mount */}
      <canvas 
        ref={canvasRef} 
        className="relative z-10 cursor-pointer block select-none drop-shadow-[0_0_35px_rgba(0,229,255,0.18)]"
      />
      {/* Glow aura background */}
      <div className="absolute w-[380px] h-[380px] rounded-full bg-[#00E5FF]/8 blur-[90px] -z-10 pointer-events-none animate-pulse-glow" />
    </div>
  );
}

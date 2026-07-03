import React, { useEffect, useRef } from "react";

export default function NodeNetwork() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: null, y: null, targetX: null, targetY: null });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    const resizeCanvas = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      // Interpolate mouse movement for smooth tracking
      mouseRef.current.targetX = e.clientX - rect.left;
      mouseRef.current.targetY = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouseRef.current.targetX = null;
      mouseRef.current.targetY = null;
    };

    canvas.parentElement.addEventListener("mousemove", handleMouseMove);
    canvas.parentElement.addEventListener("mouseleave", handleMouseLeave);

    // 150 Constellation Nodes
    const nodeCount = 150;
    const nodes = [];
    const maxDistance = 100;

    // 80 Floating ambient background particles
    const particleCount = 80;
    const particles = [];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        // Keep velocities very slow for a smooth fluid drift
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        baseX: 0,
        baseY: 0,
        color: Math.random() > 0.55 ? "#00D9FF" : "#7C3AED",
        glowRadius: Math.random() * 5 + 3,
        coreRadius: Math.random() * 1.2 + 0.8,
      });
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -Math.random() * 0.2 - 0.05, // Float upwards slowly
        radius: Math.random() * 1 + 0.4,
        alpha: Math.random() * 0.4 + 0.1,
        fadeSpeed: 0.002 + Math.random() * 0.002,
        fadeIn: true,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Smoothly interpolate current mouse coordinate toward target
      const mouse = mouseRef.current;
      if (mouse.targetX !== null && mouse.targetY !== null) {
        if (mouse.x === null) {
          mouse.x = mouse.targetX;
          mouse.y = mouse.targetY;
        } else {
          mouse.x += (mouse.targetX - mouse.x) * 0.08;
          mouse.y += (mouse.targetY - mouse.y) * 0.08;
        }
      } else {
        mouse.x = null;
        mouse.y = null;
      }

      // Draw background ambient color spots
      const centerGlow = ctx.createRadialGradient(
        canvas.width * 0.3, canvas.height * 0.4, 0,
        canvas.width * 0.3, canvas.height * 0.4, 300
      );
      centerGlow.addColorStop(0, "rgba(0, 217, 255, 0.015)");
      centerGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 1. Draw floating ambient particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // Fade in/out logic
        if (p.fadeIn) {
          p.alpha += p.fadeSpeed;
          if (p.alpha >= 0.5) p.fadeIn = false;
        } else {
          p.alpha -= p.fadeSpeed;
          if (p.alpha <= 0.1) p.fadeIn = true;
        }

        // Loop boundaries
        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < -10 || p.x > canvas.width + 10) p.x = Math.random() * canvas.width;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 217, 255, ${p.alpha})`;
        ctx.fill();
      });

      // 2. Draw connections (lines) between close nodes
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];

        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * 0.12;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            // Cyan-purple wire connection
            ctx.strokeStyle = n1.color === n2.color ? `${n1.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}` : `rgba(79, 70, 229, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // 3. Update & Draw Constellation Nodes with magnetic reaction
      nodes.forEach((node) => {
        // Base drift velocity
        node.x += node.vx;
        node.y += node.vy;

        // Bounce borders
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        // Mouse magnetic spring attraction
        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - node.x;
          const dy = mouse.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 180) {
            const force = (180 - dist) / 180;
            // Pull nodes gently toward mouse pointer
            node.x += (dx / dist) * force * 0.6;
            node.y += (dy / dist) * force * 0.6;

            // Draw link from mouse to node
            const mouseAlpha = force * 0.18;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(0, 217, 255, ${mouseAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        // Draw node core
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.coreRadius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        // Draw node glow aura
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = node.color === "#00D9FF" ? "rgba(0, 217, 255, 0.08)" : "rgba(124, 58, 237, 0.06)";
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (canvas.parentElement) {
        canvas.parentElement.removeEventListener("mousemove", handleMouseMove);
        canvas.parentElement.removeEventListener("mouseleave", handleMouseLeave);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
}

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

/**
 * OrbitalTypeGlobe
 * 
 * High-performance 3D typographic globe for WhyCode.
 * Uses Three.js with dynamic high-resolution procedural text texture mapping.
 * 
 * STRICT COLOR SYSTEM (3 Colors Total):
 * - White (#FFFFFF) ~60% (Code / Commits / Intent)
 * - Champagne Gold (#E8C77A) ~25% (Decisions / Documentation / Knowledge)
 * - Muted Teal (#5BA6A6) ~15% (Pull Requests / History / Repository)
 * 
 * Interaction: Manual grab & rotate with smooth inertia damping + idle auto-orbit.
 */
export default function OrbitalTypeGlobe({
  width = 490,
  height = 490,
  className = "",
}) {
  const mountRef = useRef(null);
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0.002, y: 0.0008 });
  const [isGrabbing, setIsGrabbing] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const currentWidth = container.clientWidth || width;
    const currentHeight = container.clientHeight || height;

    // 1. Scene & Camera (adjusted for slightly smaller, perfectly balanced globe)
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, currentWidth / currentHeight, 0.1, 1000);
    camera.position.z = 2.62;

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(currentWidth, currentHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 3. Generate High-Res Typographic Texture Canvas
    const texCanvas = document.createElement("canvas");
    texCanvas.width = 4096;
    texCanvas.height = 2048;
    const ctx = texCanvas.getContext("2d");

    // Palette tokens: Crisp White + Electric Blue + Muted Teal
    const COLOR_WHITE = "#FFFFFF";
    const COLOR_BLUE = "#00D9FF";
    const COLOR_TEAL = "#5BA6A6";

    // Text rows mapped from top latitude to bottom latitude
    const rows = [
      { text: "CODE • CONTEXT • COMMITS • INTENT • CODEBASE", color: COLOR_WHITE, fontSize: 60, weight: "700" },
      { text: "DECISIONS • DOCUMENTATION • KNOWLEDGE • INTENT", color: COLOR_BLUE, fontSize: 62, weight: "700" },
      { text: "CODE • COMMITS • CONTEXT • ENGINEERING • CODE", color: COLOR_WHITE, fontSize: 64, weight: "700" },
      { text: "PULL REQUESTS • HISTORY • REPOSITORY • ARCHITECTURE", color: COLOR_TEAL, fontSize: 62, weight: "700" },
      { text: "TEAM MEMORY • DECISIONS • KNOWLEDGE • INTENT", color: COLOR_BLUE, fontSize: 64, weight: "700" },
      { text: "CODE • CONTEXT • COMMITS • INTENT • CODEBASE", color: COLOR_WHITE, fontSize: 66, weight: "800" },
      { text: "REPOSITORY • PULL REQUESTS • HISTORY • ARCHITECTURE", color: COLOR_TEAL, fontSize: 64, weight: "700" },
      { text: "DECISIONS • DOCUMENTATION • KNOWLEDGE • WHYCODE", color: COLOR_BLUE, fontSize: 64, weight: "700" },
      { text: "CODE • CONTEXT • COMMITS • INTENT • ENGINEERING", color: COLOR_WHITE, fontSize: 64, weight: "700" },
      { text: "PULL REQUESTS • REPOSITORY • HISTORY • CODE", color: COLOR_TEAL, fontSize: 60, weight: "700" },
      { text: "DECISIONS • KNOWLEDGE • TEAM MEMORY • INTENT", color: COLOR_BLUE, fontSize: 58, weight: "700" },
      { text: "CODE • CONTEXT • COMMITS • CODEBASE • INTENT", color: COLOR_WHITE, fontSize: 56, weight: "700" },
    ];

    function drawTypographicMap() {
      ctx.clearRect(0, 0, texCanvas.width, texCanvas.height);

      const rowCount = rows.length;
      const rowHeight = texCanvas.height / (rowCount + 1);

      rows.forEach((row, i) => {
        const y = (i + 1) * rowHeight;
        ctx.font = `${row.weight} ${row.fontSize}px 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        ctx.fillStyle = row.color;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        const textUnit = `  ${row.text}  `;
        const metrics = ctx.measureText(textUnit);
        const textWidth = metrics.width;

        // Repeat text horizontally across full equirectangular canvas width
        if (textWidth > 0) {
          const repetitions = Math.ceil(texCanvas.width / textWidth) + 2;
          for (let r = 0; r < repetitions; r++) {
            ctx.fillText(textUnit, r * textWidth, y);
          }
        }
      });
    }

    drawTypographicMap();

    // 4. Create Texture & Materials
    const texture = new THREE.CanvasTexture(texCanvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    // Outer Globe (Front & Back translucent text sphere)
    const globeRadius = 0.94;
    const sphereGeometry = new THREE.SphereGeometry(globeRadius, 64, 48);

    // Group to hold all rotational elements
    const globeGroup = new THREE.Group();
    // Default initial tilt
    globeGroup.rotation.x = 0.28;
    globeGroup.rotation.z = -0.12;
    scene.add(globeGroup);

    // Layer A: Inner Backside (darker/translucent text visible through sphere)
    const backMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const backMesh = new THREE.Mesh(sphereGeometry, backMaterial);
    globeGroup.add(backMesh);

    // Layer B: Frontside (crisp, solid bright text)
    const frontMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.FrontSide,
      transparent: true,
      opacity: 0.98,
      depthWrite: true,
    });
    const frontMesh = new THREE.Mesh(sphereGeometry, frontMaterial);
    globeGroup.add(frontMesh);

    // Layer C: Subtle Center Identity (Extremely subtle "WHYCODE" in #FFFFFF with gold dot)
    const centerGroup = new THREE.Group();
    const centerCanvas = document.createElement("canvas");
    centerCanvas.width = 512;
    centerCanvas.height = 256;
    const cCtx = centerCanvas.getContext("2d");
    cCtx.clearRect(0, 0, 512, 256);
    cCtx.font = "800 48px 'Space Grotesk', -apple-system, sans-serif";
    cCtx.fillStyle = "#FFFFFF";
    cCtx.textAlign = "center";
    cCtx.textBaseline = "middle";
    cCtx.fillText("WHYCODE", 240, 128);
    // Cyan / Blue dot
    cCtx.fillStyle = "#00D9FF";
    cCtx.beginPath();
    cCtx.arc(370, 128, 6, 0, Math.PI * 2);
    cCtx.fill();

    const centerTex = new THREE.CanvasTexture(centerCanvas);
    const centerMat = new THREE.SpriteMaterial({
      map: centerTex,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    const centerSprite = new THREE.Sprite(centerMat);
    centerSprite.scale.set(0.65, 0.325, 1);
    globeGroup.add(centerSprite);

    // 5. Interaction Handling (Grab, Drag with Inertia)
    let isInteracting = false;
    let autoRotate = true;

    const onPointerDown = (e) => {
      isDraggingRef.current = true;
      isInteracting = true;
      autoRotate = false;
      setIsGrabbing(true);
      const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
      const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
      previousMousePositionRef.current = { x: clientX, y: clientY };
    };

    const onPointerMove = (e) => {
      if (!isDraggingRef.current) return;
      const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
      const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;

      const deltaX = clientX - previousMousePositionRef.current.x;
      const deltaY = clientY - previousMousePositionRef.current.y;

      const rotationSpeed = 0.005;
      globeGroup.rotation.y += deltaX * rotationSpeed;
      globeGroup.rotation.x += deltaY * rotationSpeed;

      velocityRef.current = {
        x: deltaX * rotationSpeed,
        y: deltaY * rotationSpeed,
      };

      previousMousePositionRef.current = { x: clientX, y: clientY };
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
      setIsGrabbing(false);
      setTimeout(() => {
        isInteracting = false;
      }, 800);
    };

    const domEl = renderer.domElement;
    domEl.addEventListener("mousedown", onPointerDown);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);
    domEl.addEventListener("touchstart", onPointerDown, { passive: true });
    window.addEventListener("touchmove", onPointerMove, { passive: true });
    window.addEventListener("touchend", onPointerUp);

    // 6. Resize Observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || width;
      const h = container.clientHeight || height;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // 7. Animation Loop
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (!isDraggingRef.current) {
        // Inertia damping
        globeGroup.rotation.y += velocityRef.current.x;
        globeGroup.rotation.x += velocityRef.current.y;

        velocityRef.current.x *= 0.94;
        velocityRef.current.y *= 0.94;

        // Base continuous orbital drift
        if (!isInteracting) {
          globeGroup.rotation.y += 0.0022;
        }
      }

      // Sprite always looks at camera
      centerSprite.quaternion.copy(camera.quaternion);

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      domEl.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("mouseup", onPointerUp);
      domEl.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("touchend", onPointerUp);

      sphereGeometry.dispose();
      backMaterial.dispose();
      frontMaterial.dispose();
      centerMat.dispose();
      texture.dispose();
      centerTex.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [width, height]);

  return (
    <div
      className={`orbital-type-wrapper relative select-none flex items-center justify-center ${className}`}
      style={{
        width: "100%",
        maxWidth: `${width}px`,
        height: `${height}px`,
        cursor: isGrabbing ? "grabbing" : "grab",
      }}
    >
      <div
        ref={mountRef}
        className="w-full h-full flex items-center justify-center relative"
      />
    </div>
  );
}

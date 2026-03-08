"use client";

import { useEffect, useRef } from "react";

/**
 * Animated atom cursor — replaces the default pointer inside the dashboard.
 *
 * IMPORTANT — Visibility pattern:
 * Use `opacity: 0/1` (not `display:none` or a `.hidden` class) to hide/show
 * the cursor. The RAF animate loop must ALWAYS run so `curX/curY` stay synced
 * with the mouse. If the loop is paused while hidden, the cursor "flies" from
 * its last visible position when it reappears. Opacity keeps the element in
 * the layout, the loop running, and the position tracking alive.
 */
export default function AtomCursor() {
  const svgRef = useRef<SVGSVGElement>(null);

  // Sync cursor color with theme (CSS currentColor doesn't reliably update
  // in SVGs when the class on <html> changes at runtime)
  useEffect(() => {
    const cursor = svgRef.current;
    if (!cursor) return;

    // Trust whichever attribute just changed — homepage only sets data-theme,
    // dashboard only sets class, docs/sniffer set both.
    const updateColor = (mutations?: MutationRecord[]) => {
      const el = document.documentElement;
      const lastAttr = mutations?.[mutations.length - 1]?.attributeName;
      let isLight: boolean;
      if (lastAttr === "data-theme") {
        isLight = el.getAttribute("data-theme") === "light";
      } else if (lastAttr === "class") {
        isLight = el.classList.contains("light");
      } else {
        // Initial call — check both
        isLight =
          el.classList.contains("light") ||
          el.getAttribute("data-theme") === "light";
      }
      cursor.style.color = isLight ? "#1A1A1A" : "#D4883A";
    };
    updateColor();

    const observer = new MutationObserver(updateColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const cursor = svgRef.current;
    if (!cursor) return;

    const electrons = cursor.querySelectorAll(".electron");
    const orbits_els = cursor.querySelectorAll(".orbit-path");
    const nucleus = cursor.querySelector(".nucleus") as SVGCircleElement;
    const nucleusGlow = cursor.querySelector(".nucleus-glow") as SVGCircleElement;

    let curX = -100,
      curY = -100,
      targetX = -100,
      targetY = -100;
    let isHovering = false;
    let hoverScale = 0; // 0 = full atom, 1 = collapsed to dot
    let hasFirstMove = false;
    let isVisible = false; // opacity-based visibility — keeps position tracking alive

    const hideSelectors =
      "button, a, input, textarea, select, [role=button], label, .dash-header-hit";
    const collapseSelectors = "[data-slot=card], [data-cursor=collapse]";

    // Single mousemove handler replaces separate mouseover/mouseout
    const onMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;

      // Snap to position on first move (no animation from -100,-100)
      if (!hasFirstMove) {
        hasFirstMove = true;
        curX = targetX;
        curY = targetY;
        isVisible = true;
      }

      // Evaluate element under cursor — no bubbling issues
      // [data-cursor=hide] forces hide even inside a collapse zone
      const el = e.target as HTMLElement;
      const forceHide = !!el.closest("[data-cursor=hide]");
      const overCollapse = !forceHide && !!el.closest(collapseSelectors);
      const overHide = forceHide || (!overCollapse && !!el.closest(hideSelectors));

      isVisible = !overHide;
      isHovering = overCollapse;
    };

    const onTouchMove = (e: TouchEvent) => {
      targetX = e.touches[0].clientX;
      targetY = e.touches[0].clientY;
    };

    // Use documentElement (has bounds) instead of document (no bounds)
    const onMouseLeave = () => { isVisible = false; };
    const onMouseEnter = (e: MouseEvent) => {
      // On re-entry, snap position so there's no fly
      targetX = e.clientX;
      targetY = e.clientY;
      curX = targetX;
      curY = targetY;
      if (hasFirstMove) isVisible = true;
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onMouseLeave);
    document.documentElement.addEventListener("mouseenter", onMouseEnter);

    // Start invisible until first mouse movement
    cursor.style.opacity = "0";

    const orbits = [
      { rx: 14, ry: 5, tilt: 0, speed: 1.8 },
      { rx: 14, ry: 5, tilt: 60, speed: 2.3 },
      { rx: 14, ry: 5, tilt: 120, speed: 1.5 },
    ];

    let raf: number;
    function animate(now: number) {
      raf = requestAnimationFrame(animate);

      // Always update position so it stays synced with the mouse
      curX += (targetX - curX) * 0.25;
      curY += (targetY - curY) * 0.25;
      cursor!.style.transform = `translate(${curX - 18}px,${curY - 18}px)`;

      // Opacity-based visibility — position keeps tracking while invisible
      cursor!.style.opacity = isVisible ? "1" : "0";

      const t = now * 0.001;

      // Smoothly animate hover collapse (0 → 1)
      const target = isHovering ? 1 : 0;
      hoverScale += (target - hoverScale) * 0.15;

      // Fade orbits and electrons based on hover
      const orbitOpacity = 0.15 * (1 - hoverScale);
      for (let i = 0; i < orbits_els.length; i++) {
        orbits_els[i].setAttribute("opacity", orbitOpacity.toFixed(3));
      }

      for (let i = 0; i < 3; i++) {
        const o = orbits[i];
        const angle = t * o.speed + (i * Math.PI * 2) / 3;
        const ex = Math.cos(angle) * o.rx * (1 - hoverScale);
        const ey = Math.sin(angle) * o.ry * (1 - hoverScale);
        const rad = (o.tilt * Math.PI) / 180;
        const rx = ex * Math.cos(rad) - ey * Math.sin(rad);
        const ry = ex * Math.sin(rad) + ey * Math.cos(rad);
        electrons[i].setAttribute("cx", String(18 + rx));
        electrons[i].setAttribute("cy", String(18 + ry));
        const depth = Math.sin(angle);
        const electronOpacity = (0.35 + depth * 0.55) * (1 - hoverScale);
        electrons[i].setAttribute("opacity", electronOpacity.toFixed(3));
      }

      // Pulse nucleus slightly when hovering
      if (nucleus) {
        const pulseR = 2.2 + hoverScale * 0.6;
        nucleus.setAttribute("r", pulseR.toFixed(2));
      }
      if (nucleusGlow) {
        const glowR = 3.5 + hoverScale * 1.5;
        const glowOpacity = 0.12 + hoverScale * 0.08;
        nucleusGlow.setAttribute("r", glowR.toFixed(2));
        nucleusGlow.setAttribute("opacity", glowOpacity.toFixed(3));
      }
    }
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("touchmove", onTouchMove);
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
      document.documentElement.removeEventListener("mouseenter", onMouseEnter);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      className="atom-cursor"
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse
        className="orbit-path"
        cx="18"
        cy="18"
        rx="14"
        ry="5"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.15"
      />
      <ellipse
        className="orbit-path"
        cx="18"
        cy="18"
        rx="14"
        ry="5"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.15"
        transform="rotate(60 18 18)"
      />
      <ellipse
        className="orbit-path"
        cx="18"
        cy="18"
        rx="14"
        ry="5"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.15"
        transform="rotate(120 18 18)"
      />
      <circle
        className="electron"
        cx="32"
        cy="18"
        r="1.8"
        fill="currentColor"
        opacity="0.85"
      />
      <circle
        className="electron"
        cx="32"
        cy="18"
        r="1.8"
        fill="currentColor"
        opacity="0.85"
      />
      <circle
        className="electron"
        cx="32"
        cy="18"
        r="1.8"
        fill="currentColor"
        opacity="0.85"
      />
      <circle className="nucleus-glow" cx="18" cy="18" r="3.5" fill="currentColor" opacity="0.12" />
      <circle className="nucleus" cx="18" cy="18" r="2.2" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

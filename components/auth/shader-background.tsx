"use client";

import { useEffect, useRef } from "react";

/**
 * Drifting dot field behind the login brand panel, ported from Keyed-frontend
 * src/components/auth/ShaderBackground.tsx: dots drift and wrap at the edges,
 * twinkle, and are pushed away from (and brighten near) the pointer.
 * Reduced motion: one still frame, no animation loop.
 */
export function ShaderBackground({ className = "", variant = "dark" }: { className?: string; variant?: "dark" | "light" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotColor = variant === "dark" ? "255, 255, 255" : "15, 23, 42";

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const HOVER_RADIUS = 130;

    interface Dot {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      baseAlpha: number;
      twinkleFreq: number;
      twinklePhase: number;
      push: number;
    }

    let dots: Dot[] = [];
    let width = 0;
    let height = 0;
    let rafId = 0;
    let resizeRaf = 0;
    let lastTime = performance.now();
    let mouseX = -9999;
    let mouseY = -9999;
    let hovering = false;

    const buildDots = () => {
      const count = Math.min(260, Math.max(90, Math.round((width * height) / 2700)));
      dots = Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 18 + Math.random() * 32;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: Math.random() * 1.3 + 0.6,
          baseAlpha: 0.25 + Math.random() * 0.55,
          twinkleFreq: 0.4 + Math.random() * 1.4,
          twinklePhase: Math.random() * Math.PI * 2,
          push: 0,
        };
      });
    };

    const draw = (now: number, move: boolean) => {
      const dt = Math.min(0.05, (now - lastTime) / 2000);
      lastTime = now;
      const t = now / 1000;
      ctx.clearRect(0, 0, width, height);

      for (const d of dots) {
        if (move) {
          d.x += d.vx * dt;
          d.y += d.vy * dt;
          if (d.x < -10) d.x = width + 10;
          if (d.x > width + 10) d.x = -10;
          if (d.y < -10) d.y = height + 10;
          if (d.y > height + 10) d.y = -10;
        }

        let px = d.x;
        let py = d.y;
        if (hovering) {
          const dx = d.x - mouseX;
          const dy = d.y - mouseY;
          const dist = Math.hypot(dx, dy);
          if (dist < HOVER_RADIUS && dist > 0.01) {
            const strength = 1 - dist / HOVER_RADIUS;
            px += (dx / dist) * strength * 26;
            py += (dy / dist) * strength * 26;
            d.push = Math.min(1, d.push + strength * 0.3);
          }
        }
        d.push *= 0.92;

        const twinkle = 0.5 + 0.5 * Math.sin(t * d.twinkleFreq + d.twinklePhase);
        const alpha = Math.min(1, d.baseAlpha * (0.6 + twinkle * 0.4) + d.push * 0.5);
        ctx.beginPath();
        ctx.arc(px, py, d.r * (1 + d.push * 0.8), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${dotColor}, ${alpha})`;
        ctx.fill();
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildDots();
      if (still) draw(performance.now(), false);
    };
    const scheduleResize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(resize);
    };

    const onEnter = () => (hovering = true);
    const onLeave = () => {
      hovering = false;
      mouseX = -9999;
      mouseY = -9999;
    };
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };

    const observer = new ResizeObserver(scheduleResize);
    observer.observe(canvas);
    window.addEventListener("resize", scheduleResize);
    resize();

    if (!still) {
      canvas.addEventListener("mouseenter", onEnter);
      canvas.addEventListener("mouseleave", onLeave);
      canvas.addEventListener("mousemove", onMove);
      const loop = (now: number) => {
        draw(now, true);
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(resizeRaf);
      observer.disconnect();
      window.removeEventListener("resize", scheduleResize);
      canvas.removeEventListener("mouseenter", onEnter);
      canvas.removeEventListener("mouseleave", onLeave);
      canvas.removeEventListener("mousemove", onMove);
    };
  }, [dotColor]);

  return <canvas ref={canvasRef} aria-hidden className={className} style={{ display: "block", width: "100%", height: "100%" }} />;
}

"use client";

import { useState, useEffect, useRef } from "react";

// ─── Shared CSS ─────────────────────────────────────────────────────────────
// Injected into <head> once (idempotent) — both FluidGlassSection and
// CTASection share these classes without duplicate style tags.
const FG_CSS = `
  @keyframes _fg_rise {
    from { transform: translateY(100%); opacity: 0; }
    to   { transform: translateY(0%);   opacity: 1; }
  }
  .fg-section {
    height: 100vh;
    height: 100svh;
  }
  .fg-inner {
    display: block;
    will-change: transform, opacity;
    animation: _fg_rise 1.3s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-play-state: paused;
  }
  .fg-section.fg-live .fg-inner {
    animation-play-state: running;
  }
  /* Fade-only variant — for buttons / supporting elements */
  .fg-fade {
    opacity: 0;
    transition: opacity 0.9s ease-out 0.8s;
  }
  .fg-section.fg-live .fg-fade {
    opacity: 1;
  }
  @media (prefers-reduced-motion: reduce) {
    .fg-inner { animation: none !important; }
    .fg-fade  { opacity: 1 !important; transition: none !important; }
  }
`;

interface MobileGlassFallbackProps {
  backgroundColor: string;
  backgroundImage: string;
  /** RGB triplet for the top/bottom vignette gradient, e.g. "41,56,57".
   *  Defaults to the backgroundColor converted to RGB. */
  gradientRgb?: string;
  showGradient?: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function MobileGlassFallback({
  backgroundColor,
  backgroundImage,
  gradientRgb,
  showGradient = true,
  children,
  className,
  style,
}: MobileGlassFallbackProps) {
  const ref = useRef<HTMLElement>(null);
  const [live, setLive] = useState(false);

  // Inject CSS into <head> once — safe to call from multiple instances
  useEffect(() => {
    if (document.getElementById("_fg_styles")) return;
    const tag = document.createElement("style");
    tag.id = "_fg_styles";
    tag.textContent = FG_CSS;
    document.head.appendChild(tag);
  }, []);

  // Double-rAF IntersectionObserver: ensures browser paints the hidden state
  // across two frames before the animation is allowed to run.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          requestAnimationFrame(() =>
            requestAnimationFrame(() => setLive(true))
          );
          io.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const grad = gradientRgb ?? hexToRgbTriplet(backgroundColor);

  return (
    <section
      ref={ref}
      className={`fg-section${live ? " fg-live" : ""}${className ? ` ${className}` : ""}`}
      style={{ position: "relative", backgroundColor, overflow: "clip", ...style }}
    >
      {/* Texture / hero background image */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {showGradient ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to bottom, rgba(${grad},1) 0%, transparent 20%, transparent 66%, rgba(${grad},1) 100%)`,
            pointerEvents: "none",
          }}
        />
      ) : null}
      {children}
    </section>
  );
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/** Convert #rrggbb → "r,g,b" string for use inside rgba() */
function hexToRgbTriplet(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r},${g},${b}`;
}

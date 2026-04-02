"use client";
import { useEffect, useRef, useMemo, useId } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";

interface DomainScore {
  label: string;
  score: number;
  weight: number;
  status: "optimal" | "good" | "flagged" | "critical";
  delta: number;
}

interface BioAgeRingProps {
  chronologicalAge: number;
  biologicalAge: number;
  domains: DomainScore[];
  isDemo?: boolean;
  onRevealClick?: () => void;
  className?: string;
}

export const DEMO_DATA: BioAgeRingProps = {
  chronologicalAge: 38,
  biologicalAge: 31,
  isDemo: true,
  domains: [
    { label: "CARDIAC", score: 88, weight: 0.2, status: "optimal", delta: +2 },
    { label: "VO\u2082MAX", score: 91, weight: 0.18, status: "optimal", delta: +1 },
    { label: "NEUROLOGICAL", score: 64, weight: 0.16, status: "flagged", delta: -3 },
    { label: "METABOLIC", score: 82, weight: 0.16, status: "good", delta: +1 },
    { label: "MUSCULOSKELETAL", score: 61, weight: 0.12, status: "flagged", delta: -2 },
    { label: "INFLAMMATORY", score: 85, weight: 0.08, status: "good", delta: 0 },
    { label: "HORMONAL", score: 79, weight: 0.06, status: "good", delta: +1 },
    { label: "CIRCADIAN", score: 84, weight: 0.04, status: "good", delta: +2 },
  ],
};

const STATUS_COLORS: Record<DomainScore["status"], string> = {
  optimal: "#00D4FF",
  good: "#00FFB3",
  flagged: "#FFB800",
  critical: "#FF4444",
};

export default function BioAgeRing({
  chronologicalAge,
  biologicalAge,
  domains,
  isDemo,
  onRevealClick,
  className,
}: BioAgeRingProps) {
  const { track } = useAnalytics();
  const arcRef = useRef<SVGCircleElement>(null);
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Unique IDs for SVG defs — prevents collision if component renders multiple times
  const rawId = useId();
  const uid = rawId.replace(/:/g, "");
  const gradientId = `ringGradient-${uid}`;
  const glowId = `ringGlow-${uid}`;

  // Detect reduced motion preference
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false,
    [],
  );

  const RADIUS = 90;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const arcProgress = biologicalAge / chronologicalAge;
  const targetOffset = CIRCUMFERENCE * (1 - arcProgress * 0.85);

  // Animate ring arc on mount
  useEffect(() => {
    if (!arcRef.current) return;
    if (prefersReducedMotion) {
      arcRef.current.style.strokeDashoffset = String(targetOffset);
      return;
    }
    arcRef.current.style.strokeDashoffset = String(CIRCUMFERENCE);
    arcRef.current.style.transition = "stroke-dashoffset 1.4s ease-out";
    const raf = requestAnimationFrame(() => {
      if (arcRef.current)
        arcRef.current.style.strokeDashoffset = String(targetOffset);
    });
    return () => cancelAnimationFrame(raf);
  }, [
    biologicalAge,
    chronologicalAge,
    targetOffset,
    CIRCUMFERENCE,
    prefersReducedMotion,
  ]);

  // Animate bars on mount with stagger
  useEffect(() => {
    if (prefersReducedMotion) {
      barsRef.current.forEach((el) => {
        if (el) el.style.width = el.dataset.target ?? "0%";
      });
      return;
    }
    barsRef.current.forEach((el, i) => {
      if (!el) return;
      el.style.width = "0%";
      setTimeout(() => {
        el.style.transition = "width 0.6s ease-out";
        el.style.width = el.dataset.target ?? "0%";
      }, i * 80);
    });
  }, [prefersReducedMotion]);

  // Analytics — fire once on mount
  useEffect(() => {
    track("bio_age_ring_viewed", {
      biological_age: biologicalAge,
      years_younger: chronologicalAge - biologicalAge,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flaggedDomains = domains.filter(
    (d) => d.status === "flagged" || d.status === "critical",
  );
  const yearsYounger = chronologicalAge - biologicalAge;

  return (
    <div
      className={className}
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
      }}
    >
      {/* Demo banner */}
      {isDemo && (
        <div
          style={{
            fontSize: 9,
            color: "var(--bz-muted)",
            fontFamily: "var(--font-label)",
            background: "rgba(0,212,255,0.03)",
            border: "1px solid rgba(0,212,255,0.1)",
            borderRadius: 4,
            padding: "5px 10px",
            marginBottom: 12,
            letterSpacing: "0.08em",
          }}
        >
          DEMO DATA — connect your wearables to see your actual score
        </div>
      )}

      {/* SVG Ring */}
      <div style={{ position: "relative", width: 220, height: 220 }}>
        <svg
          width="220"
          height="220"
          viewBox="0 0 220 220"
          style={{ transform: "rotate(-90deg)" }}
        >
          <defs>
            <linearGradient
              id={gradientId}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#00D4FF" />
              <stop offset="100%" stopColor="#00FFB3" />
            </linearGradient>
            <filter id={glowId}>
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Track */}
          <circle
            cx="110"
            cy="110"
            r={RADIUS}
            fill="none"
            stroke="rgba(0,212,255,0.1)"
            strokeWidth="12"
          />
          {/* Rotating dashed outer ring */}
          <circle
            cx="110"
            cy="110"
            r="96"
            fill="none"
            stroke="rgba(0,212,255,0.12)"
            strokeWidth="1"
            strokeDasharray="4 8"
            style={{
              transformOrigin: "110px 110px",
              animation: prefersReducedMotion
                ? "none"
                : "ringRotate 20s linear infinite",
            }}
          />
          {/* Arc */}
          <circle
            ref={arcRef}
            cx="110"
            cy="110"
            r={RADIUS}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="12"
            strokeLinecap="round"
            filter={`url(#${glowId})`}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE}
          />
        </svg>
        {/* Center content — not rotated */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <span
            style={{
              fontSize: 9,
              color: "var(--bz-muted)",
              fontFamily: "var(--font-label)",
            }}
          >
            BIO AGE
          </span>
          <span
            style={{
              fontSize: 46,
              color: "white",
              fontFamily: "var(--font-data)",
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {biologicalAge}
          </span>
          <span
            style={{
              fontSize: 13,
              color: "var(--bz-muted)",
              fontFamily: "var(--font-label)",
            }}
          >
            yrs
          </span>
          {yearsYounger > 0 && (
            <span
              style={{
                fontSize: 9,
                color: "var(--bz-teal)",
                fontFamily: "var(--font-label)",
                marginTop: 4,
              }}
            >
              {yearsYounger} yrs younger
            </span>
          )}
        </div>
      </div>

      {/* Domain bars */}
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 5,
          marginTop: 16,
        }}
      >
        {domains.map((d, i) => (
          <div
            key={d.label}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <span
              style={{
                fontSize: 8,
                color: "var(--bz-muted)",
                fontFamily: "var(--font-label)",
                width: 110,
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              {d.label}
            </span>
            <div
              style={{
                flex: 1,
                height: 4,
                background: "rgba(255,255,255,0.06)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                ref={(el) => {
                  barsRef.current[i] = el;
                }}
                data-target={`${d.score}%`}
                style={{
                  height: "100%",
                  width: "0%",
                  borderRadius: 2,
                  background: STATUS_COLORS[d.status],
                }}
              />
            </div>
            <span
              style={{
                fontSize: 8,
                color: STATUS_COLORS[d.status],
                fontFamily: "var(--font-data)",
                width: 28,
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              {d.score}
            </span>
            <span
              style={{
                fontSize: 7,
                fontFamily: "var(--font-label)",
                width: 20,
                color:
                  d.delta > 0
                    ? "var(--bz-teal)"
                    : d.delta < 0
                      ? "var(--bz-amber)"
                      : "var(--bz-muted)",
              }}
            >
              {d.delta > 0 ? `+${d.delta}` : d.delta < 0 ? `${d.delta}` : "\u2014"}
            </span>
          </div>
        ))}
      </div>

      {/* The Reckoning — only if flagged domains exist */}
      {flaggedDomains.length > 0 && (
        <div
          style={{
            width: "100%",
            marginTop: 14,
            padding: "12px 14px",
            background: "rgba(255,183,0,0.05)",
            border: "1px solid rgba(255,183,0,0.3)",
            borderRadius: 6,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 8,
                color: "var(--bz-amber)",
                fontFamily: "var(--font-label)",
                letterSpacing: "0.12em",
              }}
            >
              THE RECKONING
            </span>
            <span
              style={{
                fontSize: 8,
                color: "var(--bz-amber)",
                fontFamily: "var(--font-label)",
              }}
            >
              {flaggedDomains.length} domain
              {flaggedDomains.length > 1 ? "s" : ""} flagged
            </span>
          </div>
          {flaggedDomains.map((d) => (
            <div
              key={d.label}
              style={{
                fontSize: 9,
                color: "white",
                fontFamily: "var(--font-label)",
                marginBottom: 5,
                lineHeight: 1.5,
              }}
            >
              &darr; {d.label} &mdash;{" "}
              {d.label === "NEUROLOGICAL"
                ? "Sleep quality suppressing HRV recovery"
                : d.label === "MUSCULOSKELETAL"
                  ? "Left knee load asymmetry: injury risk HIGH"
                  : "Performance below optimal threshold"}
            </div>
          ))}
          <button
            onClick={() => {
              track("reckoning_card_clicked", {
                flagged_domains: flaggedDomains.map((d) => d.label),
              });
              onRevealClick?.();
            }}
            style={{
              marginTop: 8,
              background: "none",
              border: "none",
              padding: 0,
              color: "var(--bz-amber)",
              fontSize: 9,
              fontFamily: "var(--font-label)",
              cursor: "pointer",
              letterSpacing: "0.06em",
            }}
          >
            Fix these first &rarr;
          </button>
        </div>
      )}

      <style>{`
        @keyframes ringRotate { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

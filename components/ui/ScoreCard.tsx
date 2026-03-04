/// components/ui/ScoreCard.tsx
// Glass score card: large italic editorial number, SVG sparkline, count-up.
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { EASE_BZ, STATUS_COLOR, STATUS_GLOW, GLASS, C } from "./tokens";
import type { Status } from "./tokens";

// ── Inline SVG sparkline ───────────────────────────────────────────────────

interface SparklineProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}

function Sparkline({ data, color, width = 64, height = 24 }: SparklineProps) {
  const polyRef = useRef<SVGPolylineElement>(null);
  const [pathLen, setPathLen] = useState(300);
  const isInView = useInView(polyRef, { once: true });

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * width;
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  useEffect(() => {
    if (polyRef.current) {
      setPathLen(polyRef.current.getTotalLength() || 300);
    }
  }, [data]);

  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden="true">
      <polyline
        ref={polyRef}
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={pathLen}
        strokeDashoffset={isInView ? 0 : pathLen}
        style={{ transition: `stroke-dashoffset 1.2s cubic-bezier(${EASE_BZ.join(",")})` }}
      />
    </svg>
  );
}

// ── Count-up hook ──────────────────────────────────────────────────────────

function useCountUp(target: number, trigger: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!trigger) return;
    const duration = Math.max(600, target * 12);
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [target, trigger]);

  return count;
}

// ── Trend delta badge ─────────────────────────────────────────────────────

function TrendBadge({ delta }: { delta: number }) {
  const positive = delta >= 0;
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{
        background: positive ? "rgba(0,255,179,0.12)" : "rgba(255,107,53,0.12)",
        color:      positive ? C.biolum : C.plasma,
        fontFamily: "var(--font-mono)",
      }}
    >
      {positive ? "↑" : "↓"} {Math.abs(delta)}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface ScoreCardProps {
  label: string;
  value: number;
  unit?: string;
  status?: Status;
  sparkline?: number[];
  trend?: number;
  /** Index for stagger delay */
  index?: number;
}

export function ScoreCard({
  label,
  value,
  unit,
  status = "good",
  sparkline,
  trend,
  index = 0,
}: ScoreCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const count = useCountUp(value, isInView);
  const color = STATUS_COLOR[status];
  const glow  = STATUS_GLOW[status];

  const isAurora = status === "optimal";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.5, ease: EASE_BZ, delay: index * 0.06 }}
      whileHover={{ y: -4, transition: { duration: 0.2, ease: EASE_BZ } }}
      className="relative rounded-2xl overflow-hidden cursor-default"
      style={{
        ...GLASS.base,
        borderLeft: `3px solid ${color}`,
        boxShadow: isInView
          ? `${GLASS.base.boxShadow}, -4px 0 20px ${glow}`
          : GLASS.base.boxShadow,
      }}
    >
      <div className="p-7">
        {/* Label */}
        <p
          className="text-[11px] font-medium tracking-[0.14em] uppercase mb-3"
          style={{ color: C.dust, fontFamily: "var(--font-ui, var(--font-sans))" }}
        >
          {label}
        </p>

        {/* Value */}
        <div className="flex items-baseline gap-1.5 mb-3">
          <span
            className="leading-none font-light"
            style={{
              fontSize: "clamp(40px, 5vw, 64px)",
              fontFamily: "var(--font-editorial, var(--font-serif), Georgia, serif)",
              fontStyle: "italic",
              ...(isAurora
                ? {
                    background: "var(--gradient-aurora)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }
                : { color }),
            }}
          >
            {count}
          </span>
          {unit && (
            <span
              className="text-sm font-normal mb-1"
              style={{ color: C.dust, fontFamily: "var(--font-mono)" }}
            >
              {unit}
            </span>
          )}
        </div>

        {/* Sparkline + trend */}
        <div className="flex items-center justify-between">
          {sparkline && sparkline.length > 1 ? (
            <Sparkline data={sparkline} color={color} />
          ) : (
            <span />
          )}
          {trend !== undefined && <TrendBadge delta={trend} />}
        </div>
      </div>

      {/* Subtle corner glow on optimal */}
      {isAurora && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 80% 20%, rgba(91,33,255,0.08) 0%, transparent 60%)",
          }}
        />
      )}
    </motion.div>
  );
}

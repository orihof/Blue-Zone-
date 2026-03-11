/// components/dashboard/MetricCard.tsx
"use client";

import { useEffect, useState } from "react";
import { Sparkline } from "@/components/ui/Sparkline";

export type MetricStatus = "optimal" | "good" | "attention" | "critical" | "no-data";

interface MetricCardProps {
  icon:            string;
  label:           string;
  value?:          number;
  unit:            string;
  status:          MetricStatus;
  trend?:          string;       // e.g. "+2.4 this week"
  sparkline?:      number[];
  categoryColor:   string;       // CSS var or hex
  animationDelay?: number;       // ms for stagger
}

const STATUS_CONFIG: Record<MetricStatus, { label: string; color: string; bg: string; border: string }> = {
  optimal:   { label: "Optimal",   color: "var(--color-optimal)",   bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.25)"  },
  good:      { label: "Good",      color: "var(--color-good)",      bg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.25)" },
  attention: { label: "Attention", color: "var(--color-attention)", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)" },
  critical:  { label: "Critical",  color: "var(--color-critical)",  bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.25)"  },
  "no-data": { label: "No Data",   color: "var(--color-neutral)",   bg: "rgba(107,114,128,0.12)",border: "rgba(107,114,128,0.25)"},
};

export function MetricCard({
  icon, label, value, unit, status, trend,
  sparkline, categoryColor, animationDelay = 0,
}: MetricCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const config = STATUS_CONFIG[status];

  // Count-up animation on mount
  useEffect(() => {
    if (value == null) return;
    const duration = 800;
    const start = performance.now();
    const raf = (time: number) => {
      const progress = Math.min((time - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(ease * value));
      if (progress < 1) requestAnimationFrame(raf);
    };
    const timer = setTimeout(() => requestAnimationFrame(raf), animationDelay);
    return () => clearTimeout(timer);
  }, [value, animationDelay]);

  return (
    <div
      className="metric-card"
      style={
        {
          "--category-color": categoryColor,
          animationDelay:     `${animationDelay}ms`,
        } as React.CSSProperties
      }
    >
      <div className="metric-card__accent-bar" />

      <div className="metric-card__header">
        <span className="metric-card__icon">{icon}</span>
        <span className="metric-card__label">{label}</span>
      </div>

      <div className="metric-card__value-row">
        {value !== undefined ? (
          <>
            <span className="metric-card__value">{displayValue}</span>
            <span className="metric-card__unit">{unit}</span>
          </>
        ) : (
          <span className="metric-card__empty">–</span>
        )}
      </div>

      <div className="metric-card__footer">
        <span
          className="metric-card__badge"
          style={{
            color:      config.color,
            background: config.bg,
            border:     `1px solid ${config.border}`,
            animation:  status === "attention" ? "badgePulse 3s ease-in-out infinite" : undefined,
          }}
        >
          {config.label}
        </span>
        {trend && <span className="metric-card__trend">{trend}</span>}
      </div>

      {sparkline && sparkline.length > 1 && (
        <div className="metric-card__sparkline">
          <Sparkline data={sparkline} color={categoryColor} w={120} h={28} />
        </div>
      )}
    </div>
  );
}

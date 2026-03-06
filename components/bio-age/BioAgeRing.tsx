"use client";
/// components/bio-age/BioAgeRing.tsx
import { useEffect, useRef } from "react";

interface BioAgeRingProps {
  biologicalAge: number;
  chronologicalAge: number;
  size?: number;
  animate?: boolean;
}

// Maps delta (bio - chrono) to a ring fill percentage and color
function deltaToRingFill(delta: number): { pct: number; color: string } {
  // delta negative = younger (good). Range clamp: -20 to +20
  const clamped = Math.max(-20, Math.min(20, delta));
  // pct 0 = worst (+20), 100 = best (-20)
  const pct   = ((20 - clamped) / 40) * 100;
  const color =
    delta <= -5  ? "#10B981" :  // emerald — significantly younger
    delta <= 0   ? "#3B82F6" :  // blue — slightly younger
    delta <= 5   ? "#F59E0B" :  // amber — slightly older
                   "#EF4444";  // red — significantly older
  return { pct, color };
}

export function BioAgeRing({ biologicalAge, chronologicalAge, size = 160, animate = true }: BioAgeRingProps) {
  const delta = biologicalAge - chronologicalAge;
  const { pct, color } = deltaToRingFill(delta);

  const radius      = (size / 2) - 12;
  const circumference = 2 * Math.PI * radius;
  const targetOffset  = circumference * (1 - pct / 100);

  const dashRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!animate || !dashRef.current) return;
    // Start fully hidden, animate to target
    dashRef.current.style.strokeDashoffset = String(circumference);
    const timer = setTimeout(() => {
      if (dashRef.current) {
        dashRef.current.style.transition = "stroke-dashoffset 1.4s cubic-bezier(.16,1,.3,1)";
        dashRef.current.style.strokeDashoffset = String(targetOffset);
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [animate, circumference, targetOffset]);

  const cx = size / 2;
  const cy = size / 2;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={10}
        />
        {/* Progress */}
        <circle
          ref={dashRef}
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animate ? circumference : targetOffset}
          style={{ filter: `drop-shadow(0 0 8px ${color}60)` }}
        />
      </svg>

      {/* Center text */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 2,
      }}>
        <span style={{
          fontFamily: "var(--font-serif,'Syne',sans-serif)",
          fontSize: size * 0.22,
          fontWeight: 300,
          lineHeight: 1,
          background: `linear-gradient(135deg, ${color}, #fff)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          {biologicalAge.toFixed(1)}
        </span>
        <span style={{
          fontFamily: "var(--font-ui,'Inter',sans-serif)",
          fontSize: size * 0.075,
          fontWeight: 400,
          color: "#64748B",
          letterSpacing: ".06em",
          textTransform: "uppercase",
        }}>
          bio age
        </span>
        <span style={{
          fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
          fontSize: size * 0.08,
          fontWeight: 300,
          color: delta <= 0 ? "#34D399" : "#F87171",
          marginTop: 2,
        }}>
          {delta <= 0 ? "−" : "+"}{Math.abs(delta).toFixed(1)}y
        </span>
      </div>
    </div>
  );
}

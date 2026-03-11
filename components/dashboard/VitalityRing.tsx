/// components/dashboard/VitalityRing.tsx
"use client";

interface VitalityRingProps {
  score: number; // 0–100
}

export function VitalityRing({ score }: VitalityRingProps) {
  const r = 48;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  const scoreLabel =
    score >= 80 ? "Optimal" :
    score >= 60 ? "Good" :
    score >= 40 ? "Fair" : "Needs Work";

  const scoreColor =
    score >= 80 ? "var(--color-optimal)" :
    score >= 60 ? "var(--color-good)" :
    score >= 40 ? "var(--color-attention)" : "var(--color-critical)";

  return (
    <div className="vitality-ring" aria-label={`Vitality score: ${score} out of 100`}>
      <svg viewBox="0 0 120 120" width="130" height="130">
        {/* Track */}
        <circle
          cx="60" cy="60" r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="6"
        />
        {/* Progress */}
        <circle
          cx="60" cy="60" r={r}
          fill="none"
          stroke={scoreColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{
            transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)",
            filter: `drop-shadow(0 0 10px ${scoreColor})`,
          }}
        />
        {/* Score — display size */}
        <text x="60" y="55" textAnchor="middle" fill="white"
          fontSize="28" fontWeight="800" fontFamily="Syne,sans-serif"
          letterSpacing="-0.03em">
          {score}
        </text>
        {/* Label */}
        <text x="60" y="70" textAnchor="middle"
          fill="rgba(255,255,255,0.32)" fontSize="8"
          fontWeight="700" letterSpacing="0.16em">
          VITALITY
        </text>
      </svg>
      <span className="vitality-ring__label" style={{ color: scoreColor }}>
        {scoreLabel}
      </span>
    </div>
  );
}

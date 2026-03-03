/// components/dashboard/AdherenceSparkline.tsx

interface ScorePoint {
  label: string;
  recovery: number;
  sleep: number;
  metabolic: number;
  readiness: number;
}

interface AdherenceSparklineProps {
  data: ScorePoint[];
  metric: "recovery" | "sleep" | "metabolic" | "readiness";
  color?: string;
}

const COLORS: Record<string, string> = {
  recovery: "#10b981",
  sleep: "#6366f1",
  metabolic: "#f59e0b",
  readiness: "#0ea5e9",
};

export function AdherenceSparkline({ data, metric, color }: AdherenceSparklineProps) {
  if (data.length < 2) {
    return (
      <div className="h-12 flex items-center justify-center text-xs text-muted-foreground">
        Not enough data yet
      </div>
    );
  }

  const values = data.map((d) => d[metric]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const W = 120;
  const H = 40;
  const step = W / (values.length - 1);

  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = H - ((v - min) / range) * (H - 6) - 3;
      return `${x},${y}`;
    })
    .join(" ");

  const strokeColor = color ?? COLORS[metric] ?? "#0ea5e9";
  const latest = values[values.length - 1];

  return (
    <div className="flex items-end gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="flex-shrink-0">
        <polyline
          points={points}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {values.map((v, i) => (
          <circle
            key={i}
            cx={i * step}
            cy={H - ((v - min) / range) * (H - 6) - 3}
            r="2.5"
            fill={strokeColor}
          />
        ))}
      </svg>
      <span className="text-lg font-bold" style={{ color: strokeColor }}>
        {latest}
      </span>
    </div>
  );
}

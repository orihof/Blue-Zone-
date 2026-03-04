/// components/ui/Sparkline.tsx
// Pure SVG sparkline — no axes, no fills, terminal dot at last point.
// Exact port of the `Spark` component from bluezone-complete.jsx.

interface SparklineProps {
  data:   number[];
  color:  string;
  w?:     number;
  h?:     number;
}

export function Sparkline({ data, color, w = 80, h = 28 }: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = i * (w / (data.length - 1));
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  const lastPt  = points.split(" ").at(-1)!;
  const [lx, ly] = lastPt.split(",").map(Number);

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lx} cy={ly} r="2.5" fill={color} />
    </svg>
  );
}

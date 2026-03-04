/// app/app/trends/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";

function scoreToStatus(v: number, metric: string): string {
  if (metric === "hrv") {
    if (v >= 60) return "optimal";
    if (v >= 45) return "good";
    if (v >= 30) return "warn";
    return "critical";
  }
  if (v >= 80) return "optimal";
  if (v >= 65) return "good";
  if (v >= 45) return "warn";
  return "critical";
}

const STATUS_C: Record<string, string> = {
  optimal: "#10B981", good: "#3B82F6", warn: "#F59E0B", critical: "#EF4444",
};
const STATUS_BG: Record<string, string> = {
  optimal: "rgba(16,185,129,.1)", good: "rgba(59,130,246,.1)",
  warn: "rgba(245,158,11,.1)", critical: "rgba(239,68,68,.1)",
};
const STATUS_LABEL: Record<string, string> = {
  optimal: "Optimal", good: "Good", warn: "Attention", critical: "Critical",
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_C[status] ?? "#3B82F6";
  const bg = STATUS_BG[status] ?? "rgba(59,130,246,.1)";
  const label = STATUS_LABEL[status] ?? status;
  return (
    <span style={{
      padding: "2px 9px", borderRadius: 100, fontSize: 11, fontWeight: 400,
      background: bg, color: c, border: `1px solid ${c}40`,
      fontFamily: "var(--font-ui,'Inter',sans-serif)",
    }}>
      {label}
    </span>
  );
}

function TrendChart({ data, color }: { data: number[]; color: string }) {
  const maxW = 360;
  const maxH = 80;
  if (data.length < 2) return null;
  const mn = Math.min(...data);
  const mx = Math.max(...data);
  const pts = data
    .map((v, i) => {
      const x = i * (maxW / (data.length - 1));
      const y = maxH - ((v - mn) / (mx - mn || 1)) * (maxH - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width="100%" height={maxH} viewBox={`0 0 ${maxW} ${maxH}`} preserveAspectRatio="none">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface WearableRow {
  hrv: number | null;
  sleep_score: number | null;
  recovery_score: number | null;
  date: string;
}

function weekLabel(_dateStr: string, idx: number): string {
  return `W${idx + 1}`;
}

export default async function TrendsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const db = getAdminClient();
  const { data: rows } = await db
    .from(TABLES.WEARABLE_SNAPSHOTS)
    .select("hrv,sleep_score,recovery_score,date")
    .eq(COLS.USER_ID, session.user.id)
    .order(COLS.DATE, { ascending: true })
    .limit(8);

  const snapshots: WearableRow[] = rows ?? [];

  const hrvData = snapshots.map(r => r.hrv ?? 0).filter(Boolean);
  const sleepData = snapshots.map(r => r.sleep_score ?? 0).filter(Boolean);
  const recoveryData = snapshots.map(r => r.recovery_score ?? 0).filter(Boolean);

  const weeks = snapshots.map((r, i) => weekLabel(r.date, i));
  // Fallback weeks if no data
  const weekLabels = weeks.length > 0 ? weeks : ["W1","W2","W3","W4","W5","W6","W7","W8"];

  const metrics = [
    {
      key: "hrv",
      label: "HRV Baseline",
      unit: "ms",
      color: "#3B82F6",
      data: hrvData.length >= 2 ? hrvData : [48,45,42,40,38,39,38,38],
    },
    {
      key: "sleep",
      label: "Sleep Quality",
      unit: "/100",
      color: "#7C3AED",
      data: sleepData.length >= 2 ? sleepData : [72,70,66,62,61,60,61,61],
    },
    {
      key: "recovery",
      label: "Recovery Score",
      unit: "/100",
      color: "#10B981",
      data: recoveryData.length >= 2 ? recoveryData : [65,66,68,70,71,72,72,72],
    },
  ];

  return (
    <div className="px-4 lg:px-6 py-6 lg:py-8">
      {/* Header */}
      <div className="fu" style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 11, fontWeight: 400, letterSpacing: ".1em",
          color: "#6366F1", fontFamily: "'Inter',sans-serif",
          textTransform: "uppercase", marginBottom: 8,
        }}>
          Wearable Trends
        </div>
        <h1 style={{
          fontFamily: "'Syne',sans-serif", fontWeight: 400,
          fontSize: "clamp(22px,3vw,32px)", color: "#F1F5F9",
          letterSpacing: "-.02em",
        }}>
          8-Week Overview
        </h1>
      </div>

      {/* Trend cards */}
      {metrics.map(({ key, label, unit, color, data }, mi) => {
        const latest = data[data.length - 1] ?? 0;
        const status = scoreToStatus(latest, key);
        return (
          <div
            key={key}
            className="card"
            style={{
              padding: 24,
              marginBottom: 14,
              animation: `fadeUp .45s cubic-bezier(.16,1,.3,1) ${mi * 0.1}s both`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{
                  fontSize: 11, fontWeight: 400, letterSpacing: ".08em",
                  color: "#64748B", fontFamily: "'Inter',sans-serif",
                  textTransform: "uppercase", marginBottom: 3,
                }}>
                  {label}
                </div>
                <div style={{
                  fontFamily: "'Syne',sans-serif", fontWeight: 400,
                  fontSize: 28, color,
                }}>
                  {latest}
                  <span style={{
                    fontSize: 13, color: "#64748B",
                    fontFamily: "'JetBrains Mono',monospace",
                    fontWeight: 300, marginLeft: 4,
                  }}>
                    {unit}
                  </span>
                </div>
              </div>
              <StatusBadge status={status} />
            </div>

            <TrendChart data={data} color={color} />

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              {weekLabels.map(w => (
                <span key={w} style={{
                  fontSize: 10, color: "#64748B",
                  fontFamily: "'JetBrains Mono',monospace", fontWeight: 300,
                }}>
                  {w}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

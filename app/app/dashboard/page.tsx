/// app/app/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { Sparkline } from "@/components/ui/Sparkline";
import Link from "next/link";
import type { ProtocolPayload } from "@/lib/db/payload";

const T = { text: "#F1F5F9", muted: "#64748B" };

const STATUS_C: Record<string, string> = {
  optimal: "#10B981", good: "#3B82F6", warn: "#F59E0B", critical: "#EF4444",
};

function scoreToStatus(v: number) {
  if (v >= 80) return "optimal";
  if (v >= 60) return "good";
  if (v >= 40) return "warn";
  return "critical";
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; c: string; b: string; l: string }> = {
    optimal:  { bg: "rgba(16,185,129,.1)",  c: "#34D399", b: "rgba(16,185,129,.25)",  l: "Optimal" },
    good:     { bg: "rgba(59,130,246,.1)",  c: "#60A5FA", b: "rgba(59,130,246,.25)",  l: "Good" },
    warn:     { bg: "rgba(245,158,11,.1)",  c: "#FCD34D", b: "rgba(245,158,11,.25)",  l: "Attention" },
    critical: { bg: "rgba(239,68,68,.1)",   c: "#FCA5A5", b: "rgba(239,68,68,.25)",   l: "Critical" },
  };
  const s = colors[status] ?? colors.good;
  return (
    <span style={{ padding: "2px 9px", borderRadius: 100, fontSize: 11, fontWeight: 400, background: s.bg, color: s.c, border: `1px solid ${s.b}`, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
      {s.l}
    </span>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const supabase   = getAdminClient();
  const userId     = session.user.id;
  const firstName  = (session.user.name ?? "").split(" ")[0] || "there";

  // Fetch latest protocol
  const { data: protocols } = await supabase
    .from(TABLES.PROTOCOLS)
    .select(`${COLS.ID}, ${COLS.PAYLOAD}, ${COLS.CREATED_AT}`)
    .eq(COLS.USER_ID, userId)
    .eq(COLS.STATUS, "ready")
    .order(COLS.CREATED_AT, { ascending: false })
    .limit(1);

  const latestProtocol = protocols?.[0];
  const payload = latestProtocol?.payload as ProtocolPayload | null;
  const latestId = latestProtocol?.id as string | undefined;

  // Fetch wearable snapshots (last 8)
  const { data: snapshots } = await supabase
    .from(TABLES.WEARABLE_SNAPSHOTS)
    .select(`${COLS.HRV}, ${COLS.SLEEP_SCORE}, ${COLS.RECOVERY_SCORE}, ${COLS.CREATED_AT}`)
    .eq(COLS.USER_ID, userId)
    .order(COLS.CREATED_AT, { ascending: false })
    .limit(8);

  const snaps = (snapshots ?? []).reverse();

  // Fetch biomarkers (critical/warn)
  const { data: biomarkers } = await supabase
    .from(TABLES.BIOMARKERS)
    .select(`${COLS.ID}, name, value, unit, status, category`)
    .eq(COLS.USER_ID, userId)
    .in("status", ["critical", "warn"])
    .limit(5);

  // Build metric data
  const lastSnap  = snaps.at(-1);
  const hrv       = lastSnap?.[COLS.HRV as keyof typeof lastSnap] as number | undefined;
  const sleepScore= lastSnap?.[COLS.SLEEP_SCORE as keyof typeof lastSnap] as number | undefined;
  const recovery  = lastSnap?.[COLS.RECOVERY_SCORE as keyof typeof lastSnap] as number | undefined;
  const bioAge    = payload?.scores?.biologicalAgeEstimate ?? null;

  const metrics = [
    {
      label: "BIOLOGICAL AGE", value: bioAge != null ? String(bioAge) : "—", unit: "yrs",
      delta: bioAge != null && session.user ? `−${Math.max(0, 40 - Math.round(bioAge))}y` : "—",
      status: bioAge != null && bioAge < 35 ? "optimal" : "good",
      spark: snaps.map((_, i) => bioAge != null ? bioAge + (snaps.length - i) * 0.2 : 38),
      icon: "🧬",
    },
    {
      label: "RECOVERY SCORE", value: recovery != null ? String(Math.round(recovery)) : "—", unit: "/100",
      delta: recovery != null ? `${recovery >= 70 ? "+" : ""}${Math.round(recovery - 65)} pts` : "—",
      status: recovery != null ? scoreToStatus(recovery) : "good",
      spark: snaps.map((s) => (s[COLS.RECOVERY_SCORE as keyof typeof s] as number | undefined) ?? 0),
      icon: "⚡",
    },
    {
      label: "HRV BASELINE", value: hrv != null ? String(Math.round(hrv)) : "—", unit: "ms",
      delta: hrv != null ? `${hrv < 50 ? "−" : "+"}${Math.abs(Math.round(hrv - 55))}%` : "—",
      status: hrv != null ? scoreToStatus(hrv >= 70 ? 80 : hrv >= 50 ? 65 : hrv >= 35 ? 45 : 20) : "warn",
      spark: snaps.map((s) => (s[COLS.HRV as keyof typeof s] as number | undefined) ?? 0),
      icon: "💓",
    },
    {
      label: "SLEEP QUALITY", value: sleepScore != null ? String(Math.round(sleepScore)) : "—", unit: "/100",
      delta: sleepScore != null ? `${sleepScore >= 70 ? "+" : "−"}${Math.abs(Math.round(sleepScore - 75))} pts` : "—",
      status: sleepScore != null ? scoreToStatus(sleepScore) : "warn",
      spark: snaps.map((s) => (s[COLS.SLEEP_SCORE as keyof typeof s] as number | undefined) ?? 0),
      icon: "🌙",
    },
  ];

  // Weekly targets from payload daily checklist — normalised to {task, detail}
  const targets: { task: string; detail: string }[] =
    payload?.habits?.dailyChecklist?.slice(0, 4).map((c) => ({
      task: c.title,
      detail: c.timeOfDay ?? "",
    })) ?? [
      { task: "Take supplements", detail: "Morning protocol" },
      { task: "Zone 2 cardio", detail: "45 min at 130-145 BPM" },
      { task: "Sleep by 22:30", detail: "HRV recovery window" },
      { task: "Track readiness", detail: "Log how you feel" },
    ];

  return (
    <div className="px-4 lg:px-6 py-6 lg:py-8">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", marginBottom: 8, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>Living Dashboard</div>
        <h1 className="fu" style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: "clamp(24px,3.5vw,36px)", color: T.text, marginBottom: 5, letterSpacing: "-.02em" }}>
          Good morning, {firstName}.
        </h1>
        <p className="fu1" style={{ color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, fontWeight: 300 }}>
          {latestId ? `Your protocol is active. Upload new data to refine it.` : "Upload health data to generate your personal protocol."}
        </p>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginBottom: 24 }}>
        {metrics.map((m, i) => {
          const c = STATUS_C[m.status] ?? "#3B82F6";
          return (
            <div key={m.label} className="card" style={{ padding: 22, position: "relative", overflow: "hidden", animation: `fadeUp .5s cubic-bezier(.16,1,.3,1) ${i * .07}s both` }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${c},transparent)` }} />
              <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".11em", color: T.muted, marginBottom: 11, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{m.icon} {m.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 10 }}>
                <span style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontSize: "clamp(32px,4vw,44px)", fontWeight: 300, lineHeight: 1, background: `linear-gradient(135deg,${c},#fff)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  {m.value}
                </span>
                <span style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontWeight: 300 }}>{m.unit}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <StatusBadge status={m.status} />
                {m.spark.some((v) => v > 0) && <Sparkline data={m.spark} color={c} />}
              </div>
              <div style={{ marginTop: 8, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, fontWeight: 300, color: m.delta.startsWith("−") && m.label !== "BIOLOGICAL AGE" ? "#F87171" : "#34D399" }}>
                {m.delta}
              </div>
            </div>
          );
        })}
      </div>

      {/* Two-column */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16, marginBottom: 20 }}>

        {/* Detected signals */}
        <div className="card" style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>DETECTED SIGNALS</div>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444", display: "inline-block", animation: "glowPulse 2s ease-in-out infinite", boxShadow: "0 0 8px rgba(239,68,68,.6)" }} />
          </div>
          {(biomarkers ?? []).length > 0 ? (
            (biomarkers ?? []).map((b: Record<string, unknown>) => {
              const isHigh = b.status === "critical";
              return (
                <div key={String(b.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: isHigh ? "#EF4444" : "#F59E0B", boxShadow: `0 0 6px ${isHigh ? "rgba(239,68,68,.6)" : "rgba(245,158,11,.5)"}` }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 12, fontWeight: 400, color: T.text }}>{String(b.name)}: {String(b.value)} {String(b.unit)}</div>
                    <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>{String(b.category)} · {b.status === "critical" ? "Critical" : "Attention needed"}</div>
                  </div>
                  {latestId && (
                    <Link href={`/app/results/${latestId}`} style={{ fontSize: 11, color: "#A5B4FC", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, textDecoration: "none" }}>→ Protocol</Link>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, padding: "12px 0" }}>
              Upload lab results to detect signals.
            </div>
          )}
        </div>

        {/* Weekly targets */}
        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", marginBottom: 14, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>THIS WEEK&apos;S TARGETS</div>
          {targets.map((t: { task: string; detail: string }, idx: number) => {
            const task   = t.task;
            const detail = t.detail;
            const done   = idx < 2; // first 2 marked done as demo
            return (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, background: done ? "rgba(16,185,129,.15)" : "rgba(255,255,255,.04)", border: `1px solid ${done ? "rgba(16,185,129,.35)" : "rgba(255,255,255,.1)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#34D399" }}>
                  {done ? "✓" : ""}
                </div>
                <div>
                  <div style={{ fontSize: 13, color: done ? T.muted : T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, textDecoration: done ? "line-through" : "none" }}>{task}</div>
                  {detail && <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>{detail}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row sm:justify-center mt-2">
        {latestId ? (
          <Link href={`/app/results/${latestId}`} className="w-full sm:w-auto">
            <button className="cta" style={{ width: "100%" }}>View Full Protocol →</button>
          </Link>
        ) : (
          <Link href="/app/onboarding/upload" className="w-full sm:w-auto">
            <button className="cta" style={{ width: "100%" }}>Upload Data to Start →</button>
          </Link>
        )}
      </div>
    </div>
  );
}
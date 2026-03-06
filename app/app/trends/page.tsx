/// app/app/trends/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { TrendsClient, type MetricInput, type AdoptionEvent } from "./_client";

interface WearableRow {
  hrv:            number | null;
  sleep_score:    number | null;
  recovery_score: number | null;
  date:           string;
}

function weekLabel(_dateStr: string, idx: number): string {
  return `W${idx + 1}`;
}

export default async function TrendsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const db = getAdminClient();

  const [{ data: rows }, { data: adoptionRows }] = await Promise.all([
    db
      .from(TABLES.WEARABLE_SNAPSHOTS)
      .select("hrv,sleep_score,recovery_score,date")
      .eq(COLS.USER_ID, session.user.id)
      .order(COLS.DATE, { ascending: true })
      .limit(16), // up to 16 weeks so "All" range has data
    db
      .from(TABLES.USER_SUPPLEMENT_ADOPTIONS)
      .select(`${COLS.SUPPLEMENT_NAME}, ${COLS.ADOPTED_AT}`)
      .eq(COLS.USER_ID, session.user.id)
      .order(COLS.ADOPTED_AT, { ascending: true }),
  ]);

  const snapshots: WearableRow[] = rows ?? [];
  const adoptionEvents: AdoptionEvent[] = (adoptionRows ?? []).map(r => ({
    supplement_name: r.supplement_name as string,
    adopted_at:      r.adopted_at as string,
  }));

  const hrvData      = snapshots.map(r => r.hrv            ?? 0).filter(Boolean);
  const sleepData    = snapshots.map(r => r.sleep_score    ?? 0).filter(Boolean);
  const recoveryData = snapshots.map(r => r.recovery_score ?? 0).filter(Boolean);

  // Actual ISO date strings aligned with snapshot order
  const dates     = snapshots.map(r => r.date);
  const weeks     = snapshots.map((r, i) => weekLabel(r.date, i));
  const weekLabels = weeks.length > 0
    ? weeks
    : ["W1","W2","W3","W4","W5","W6","W7","W8"];
  const dateFallback = dates.length > 0 ? dates : [];

  const metrics: MetricInput[] = [
    {
      key:   "hrv",
      label: "HRV Baseline",
      unit:  "ms",
      color: "#3B82F6",
      data:  hrvData.length >= 2  ? hrvData  : [48,45,42,40,38,39,38,38],
      weeks: weekLabels,
    },
    {
      key:   "sleep",
      label: "Sleep Quality",
      unit:  "/100",
      color: "#7C3AED",
      data:  sleepData.length >= 2  ? sleepData  : [72,70,66,62,61,60,61,61],
      weeks: weekLabels,
    },
    {
      key:   "recovery",
      label: "Recovery Score",
      unit:  "/100",
      color: "#10B981",
      data:  recoveryData.length >= 2 ? recoveryData : [65,66,68,70,71,72,72,72],
      weeks: weekLabels,
    },
  ];

  return (
    <div className="px-4 lg:px-6 py-6 lg:py-8">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 11, fontWeight: 400, letterSpacing: ".1em",
          color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)",
          textTransform: "uppercase", marginBottom: 8,
        }}>
          Wearable Trends
        </div>
        <h1 style={{
          fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400,
          fontSize: "clamp(22px,3vw,32px)", color: "#F1F5F9",
          letterSpacing: "-.02em", margin: 0,
        }}>
          8-Week Overview
        </h1>
      </div>

      <TrendsClient metrics={metrics} dates={dateFallback} adoptionEvents={adoptionEvents} />
    </div>
  );
}

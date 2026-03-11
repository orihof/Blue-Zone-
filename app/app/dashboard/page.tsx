/// app/app/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { GroceryListBanner } from "@/components/dashboard/GroceryListBanner";
import { BioAgeWidget } from "@/components/bio-age/BioAgeWidget";
import { GenerateAnalysisButton } from "@/components/analysis/GenerateAnalysisButton";
import { SecondaryGoalNudge } from "@/components/dashboard/SecondaryGoalNudge";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { MetricCard, type MetricStatus } from "@/components/dashboard/MetricCard";
import { DetectedSignals } from "@/components/dashboard/DetectedSignals";
import { WeeklyTargets } from "@/components/dashboard/WeeklyTargets";
import { ViewProtocolCTA } from "@/components/dashboard/ViewProtocolCTA";
import type { ProtocolPayload } from "@/lib/db/payload";

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreToStatus(v: number): MetricStatus {
  if (v >= 80) return "optimal";
  if (v >= 60) return "good";
  if (v >= 40) return "attention";
  return "critical";
}

function normaliseHrv(hrv: number): number {
  if (hrv >= 70) return 85;
  if (hrv >= 50) return 65;
  if (hrv >= 35) return 45;
  return 20;
}

function computeVitalityScore(
  recovery?: number,
  hrv?: number,
  sleep?: number,
): number | undefined {
  const vals = [
    recovery,
    hrv != null ? normaliseHrv(hrv) : undefined,
    sleep,
  ].filter((v): v is number => v != null);
  if (vals.length === 0) return undefined;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const supabase  = getAdminClient();
  const userId    = session.user.id;
  const firstName = (session.user.name ?? "").split(" ")[0] || "there";

  // ── Fetch all data ──────────────────────────────────────────────────────────

  // Split into two batches so TypeScript correctly infers the .single() return type
  const [protocolsRes, snapshotsRes, biomarkersRes] = await Promise.all([
    supabase
      .from(TABLES.PROTOCOLS)
      .select(`${COLS.ID}, ${COLS.PAYLOAD}, ${COLS.CREATED_AT}`)
      .eq(COLS.USER_ID, userId)
      .eq(COLS.STATUS, "ready")
      .order(COLS.CREATED_AT, { ascending: false })
      .limit(1),

    supabase
      .from(TABLES.WEARABLE_SNAPSHOTS)
      .select(`${COLS.HRV}, ${COLS.SLEEP_SCORE}, ${COLS.RECOVERY_SCORE}, ${COLS.CREATED_AT}`)
      .eq(COLS.USER_ID, userId)
      .order(COLS.CREATED_AT, { ascending: false })
      .limit(8),

    supabase
      .from(TABLES.BIOMARKERS)
      .select(`${COLS.ID}, name, value, unit, status, category`)
      .eq(COLS.USER_ID, userId)
      .in("status", ["critical", "warn"])
      .limit(5),
  ]);

  const [bioAgeRes, biomarkerCountRes, wearableCountRes, chronoAgeRes] = await Promise.all([
    supabase
      .from(TABLES.PROFILES)
      .select(
        "biological_age, biological_age_delta, bio_age_percentile, bio_age_calculated_at, " +
        "bio_age_confidence, bio_age_revealed, bio_age_drivers, primary_goal, secondary_goal, " +
        "onboarding_completed_at",
      )
      .eq(COLS.ID, userId)
      .single(),

    supabase
      .from(TABLES.BIOMARKERS)
      .select("id", { count: "exact", head: true })
      .eq(COLS.USER_ID, userId),

    supabase
      .from(TABLES.WEARABLE_SNAPSHOTS)
      .select("id", { count: "exact", head: true })
      .eq(COLS.USER_ID, userId),

    supabase
      .from(TABLES.SPORTS_PROTOCOLS)
      .select("age")
      .eq(COLS.USER_ID, userId)
      .eq(COLS.STATUS, "ready")
      .order(COLS.CREATED_AT, { ascending: false })
      .limit(1),
  ]);

  // ── Derived data ────────────────────────────────────────────────────────────

  const latestProtocol    = protocolsRes.data?.[0];
  const payload           = latestProtocol?.payload as ProtocolPayload | null;
  const latestId          = latestProtocol?.id as string | undefined;
  const snaps             = (snapshotsRes.data ?? []).reverse();
  const bioAgeProfile     = bioAgeRes.data as Record<string, unknown> | null;
  const hasBiomarkers     = (biomarkerCountRes.count ?? 0) > 0;
  const hasWearable       = (wearableCountRes.count ?? 0) > 0;
  const chronoAge         = (chronoAgeRes.data?.[0]?.age ?? null) as number | null;

  const primaryGoal           = (bioAgeProfile?.primary_goal           as string | null) ?? null;
  const secondaryGoal         = (bioAgeProfile?.secondary_goal         as string | null) ?? null;
  const onboardingCompletedAt = (bioAgeProfile?.onboarding_completed_at as string | null) ?? null;

  // First dashboard visit — stamp onboarding_completed_at
  if (!onboardingCompletedAt) {
    void supabase
      .from(TABLES.PROFILES)
      .upsert(
        { [COLS.ID]: userId, [COLS.ONBOARDING_COMPLETED_AT]: new Date().toISOString() },
        { onConflict: COLS.ID },
      );
  }

  const daysSinceOnboarding = onboardingCompletedAt
    ? Math.floor((Date.now() - new Date(onboardingCompletedAt).getTime()) / 86_400_000)
    : null;
  const showSecondaryNudge =
    !!primaryGoal && !secondaryGoal && daysSinceOnboarding !== null && daysSinceOnboarding >= 30;

  const bioAgeInitialData = {
    biologicalAge:    (bioAgeProfile?.biological_age        ?? null) as number | null,
    delta:            (bioAgeProfile?.biological_age_delta  ?? null) as number | null,
    percentile:       (bioAgeProfile?.bio_age_percentile    ?? null) as number | null,
    calculatedAt:     (bioAgeProfile?.bio_age_calculated_at ?? null) as string | null,
    confidenceLevel:  (bioAgeProfile?.bio_age_confidence    ?? null) as string | null,
    revealed:         (bioAgeProfile?.bio_age_revealed      ?? false) as boolean,
    primaryDrivers:   (bioAgeProfile?.bio_age_drivers       ?? []) as {
      factor: string; direction: "positive" | "negative" | "neutral"; magnitude: number; detail: string;
    }[],
    chronologicalAge: chronoAge,
  };

  // ── Metric values ───────────────────────────────────────────────────────────

  const lastSnap   = snaps.at(-1);
  const hrv        = lastSnap?.[COLS.HRV          as keyof typeof lastSnap] as number | undefined;
  const sleepScore = lastSnap?.[COLS.SLEEP_SCORE  as keyof typeof lastSnap] as number | undefined;
  const recovery   = lastSnap?.[COLS.RECOVERY_SCORE as keyof typeof lastSnap] as number | undefined;
  const bioAge     = bioAgeInitialData.biologicalAge ?? payload?.scores?.biologicalAgeEstimate ?? null;

  const bioAgeStatus: MetricStatus =
    bioAge == null ? "no-data" :
    bioAge < 35    ? "optimal" : "good";
  const recoveryStatus: MetricStatus =
    recovery == null ? "no-data" : scoreToStatus(recovery);
  const hrvStatus: MetricStatus =
    hrv == null ? "no-data" : scoreToStatus(normaliseHrv(hrv));
  const sleepStatus: MetricStatus =
    sleepScore == null ? "no-data" : scoreToStatus(sleepScore);

  const vitalityScore = computeVitalityScore(recovery, hrv, sleepScore);

  // Attention metric labels for hero subtitle
  const attentionMetrics: string[] = [
    hrvStatus === "attention" || hrvStatus === "critical"       ? "HRV"           : null,
    sleepStatus === "attention" || sleepStatus === "critical"   ? "Sleep Quality" : null,
    recoveryStatus === "attention" || recoveryStatus === "critical" ? "Recovery" : null,
  ].filter(Boolean) as string[];

  // ── Sparkline series ────────────────────────────────────────────────────────

  const bioAgeSpark  = snaps.map((_, i) => bioAge != null ? bioAge + (snaps.length - i) * 0.2 : 38);
  const recoverySpark = snaps.map((s) => (s[COLS.RECOVERY_SCORE as keyof typeof s] as number | undefined) ?? 0);
  const hrvSpark      = snaps.map((s) => (s[COLS.HRV           as keyof typeof s] as number | undefined) ?? 0);
  const sleepSpark    = snaps.map((s) => (s[COLS.SLEEP_SCORE   as keyof typeof s] as number | undefined) ?? 0);

  // ── Detected signals ────────────────────────────────────────────────────────

  const signals = (biomarkersRes.data ?? []).map((b: Record<string, unknown>) => ({
    id:       String(b.id),
    name:     String(b.name),
    value:    String(b.value),
    unit:     String(b.unit),
    category: String(b.category),
    severity: (b.status === "critical" ? "critical" : "attention") as "critical" | "attention",
  }));

  // ── Weekly targets ──────────────────────────────────────────────────────────

  function inferTimeOfDay(s: string): "am" | "pm" {
    const lower = s.toLowerCase();
    if (lower.includes("morning") || lower.includes("am") || lower.includes("wake"))  return "am";
    if (lower.includes("evening") || lower.includes("night") || lower.includes("pm")) return "pm";
    return "am";
  }

  const rawTargets =
    payload?.habits?.dailyChecklist?.slice(0, 4).map((c) => ({
      task:   c.title,
      detail: c.timeOfDay ?? "",
    })) ?? [
      { task: "Take supplements",  detail: "Morning protocol"        },
      { task: "Zone 2 cardio",     detail: "45 min at 130–145 BPM"   },
      { task: "Sleep by 22:30",    detail: "HRV recovery window"     },
      { task: "Track readiness",   detail: "Log how you feel"        },
    ];

  const targets = rawTargets.map((t, i) => ({
    id:        String(i),
    label:     t.task,
    detail:    t.detail,
    timeOfDay: inferTimeOfDay(t.detail),
  }));

  // ── CTA metadata ────────────────────────────────────────────────────────────

  const protocolUpdatedAt      = latestProtocol?.created_at as string | undefined;
  const lastUpdatedDaysAgo     = protocolUpdatedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(protocolUpdatedAt).getTime()) / 86_400_000))
    : undefined;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="dashboard-root px-4 lg:px-6">

      <DashboardHero
        userName={firstName}
        targetsCompleted={0}
        targetsTotal={targets.length}
        attentionMetrics={attentionMetrics}
        vitalityScore={vitalityScore}
        hasProtocol={!!latestId}
      />

      {showSecondaryNudge && <SecondaryGoalNudge primaryGoal={primaryGoal!} />}
      <GroceryListBanner />

      <BioAgeWidget
        initialData={bioAgeInitialData}
        hasBiomarkers={hasBiomarkers}
        hasWearable={hasWearable}
      />

      {/* ── Metric Cards ── */}
      <div className="metrics-grid">
        <MetricCard
          icon="🧬"
          label="Biological Age"
          value={bioAge ?? undefined}
          unit="yrs"
          status={bioAgeStatus}
          trend={bioAge != null ? `−${Math.max(0, 40 - Math.round(bioAge))}y vs chrono` : undefined}
          sparkline={bioAgeSpark}
          categoryColor="var(--color-bio-age)"
          animationDelay={0}
        />
        <MetricCard
          icon="⚡"
          label="Recovery Score"
          value={recovery != null ? Math.round(recovery) : undefined}
          unit="/100"
          status={recoveryStatus}
          trend={recovery != null ? `${recovery >= 70 ? "+" : ""}${Math.round(recovery - 65)} pts` : undefined}
          sparkline={recoverySpark}
          categoryColor="var(--color-recovery)"
          animationDelay={60}
        />
        <MetricCard
          icon="💓"
          label="HRV Baseline"
          value={hrv != null ? Math.round(hrv) : undefined}
          unit="ms"
          status={hrvStatus}
          trend={hrv != null ? `${hrv < 50 ? "−" : "+"}${Math.abs(Math.round(hrv - 55))}%` : undefined}
          sparkline={hrvSpark}
          categoryColor="var(--color-hrv)"
          animationDelay={120}
        />
        <MetricCard
          icon="🌙"
          label="Sleep Quality"
          value={sleepScore != null ? Math.round(sleepScore) : undefined}
          unit="/100"
          status={sleepStatus}
          trend={sleepScore != null ? `${sleepScore >= 70 ? "+" : "−"}${Math.abs(Math.round(sleepScore - 75))} pts` : undefined}
          sparkline={sleepSpark}
          categoryColor="var(--color-sleep)"
          animationDelay={180}
        />
      </div>

      {/* ── Signals + Targets ── */}
      <div className="dashboard-lower-grid">
        <DetectedSignals
          signals={signals}
          hasLabData={hasBiomarkers}
          protocolId={latestId}
        />
        <WeeklyTargets initialTargets={targets} />
      </div>

      {/* ── CTA ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8, marginBottom: 32 }}>
        <ViewProtocolCTA
          href={latestId ? `/app/results/${latestId}` : "/app/onboarding/upload"}
          label={latestId ? "View Full Protocol" : "Upload Data to Start"}
          itemsDue={targets.length}
          lastUpdatedDaysAgo={lastUpdatedDaysAgo}
        />
        <GenerateAnalysisButton />
      </div>

    </div>
  );
}

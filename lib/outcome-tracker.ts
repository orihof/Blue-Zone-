/// lib/outcome-tracker.ts
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS }   from "@/lib/db/schema";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export type MilestoneStatus = "achieved" | "in_progress" | "not_started";

export interface MilestoneResult {
  milestone_id:   string;
  milestone_name: string;
  status:         MilestoneStatus;
  progress_pct:   number;
  achieved_at?:   string;
}

export interface OutcomeSummary {
  protocol_snapshot_id: string;
  markers_improved:     string[];
  markers_declined:     string[];
  markers_stable:       string[];
  milestones_achieved:  MilestoneResult[];
  overall_trajectory:   "positive" | "mixed" | "negative" | "insufficient_data";
  narrative:            string;
}

export interface MilestoneInput {
  marker_name:     string;
  milestone_name:  string;
  target_value:    number;
  target_unit:     string;
  target_date?:    string;
}

export interface OutcomeMilestone {
  id:              string;
  user_id:         string;
  marker_name:     string;
  milestone_name:  string;
  baseline_value:  number;
  target_value:    number;
  target_unit:     string;
  target_date?:    string;
  progress_pct:    number;
  status:          MilestoneStatus;
  achieved_at?:    string;
  created_at:      string;
}

// ----------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function computeProgress(
  currentValue:  number,
  baselineValue: number,
  targetValue:   number,
): number {
  const range = targetValue - baselineValue;
  if (range === 0) return currentValue >= targetValue ? 100 : 0;
  return clamp(((currentValue - baselineValue) / range) * 100, 0, 100);
}

// ----------------------------------------------------------------
// 1. evaluateMilestones
// ----------------------------------------------------------------

export async function evaluateMilestones(
  userId:       string,
  markerName:   string,
  currentValue: number,
): Promise<MilestoneResult[]> {
  const supabase = getAdminClient();

  const { data: rows, error } = await supabase
    .from(TABLES.OUTCOME_MILESTONES)
    .select("id, narrative_text, milestone_value, previous_value, achieved_at")
    .eq(COLS.USER_ID, userId)
    .eq("marker_name", markerName);

  if (error) {
    throw new Error(`[outcome-tracker] evaluateMilestones: ${error.message}`);
  }
  if (!rows?.length) return [];

  const results:       MilestoneResult[] = [];
  const nowISOString   = new Date().toISOString();
  const newlyAchieved: string[]          = [];

  for (const row of rows) {
    const baselineValue = parseFloat(String(row.previous_value  ?? "0"));
    const targetValue   = parseFloat(String(row.milestone_value ?? "0"));
    const progressPct   = Math.round(computeProgress(currentValue, baselineValue, targetValue));

    let status:      MilestoneStatus = "not_started";
    let achievedAt:  string | undefined;

    if (progressPct >= 100) {
      status      = "achieved";
      achievedAt  = (row.achieved_at as string | null) ?? nowISOString;
      newlyAchieved.push(row.id as string);
    } else if (progressPct > 0) {
      status = "in_progress";
    }

    results.push({
      milestone_id:   row.id          as string,
      milestone_name: (row.narrative_text as string | null) ?? markerName,
      status,
      progress_pct:   progressPct,
      ...(achievedAt ? { achieved_at: achievedAt } : {}),
    });
  }

  // Persist achieved_at for newly achieved milestones
  if (newlyAchieved.length > 0) {
    await supabase
      .from(TABLES.OUTCOME_MILESTONES)
      .update({ achieved_at: nowISOString })
      .in(COLS.ID, newlyAchieved);
  }

  return results;
}

// ----------------------------------------------------------------
// 2. generateOutcomeSummary
// ----------------------------------------------------------------

export async function generateOutcomeSummary(
  userId:               string,
  protocolSnapshotId:   string,
): Promise<OutcomeSummary> {
  const supabase = getAdminClient();
  const now      = new Date();

  // ── Load all baseline history for trend detection ─────────────────────
  const { data: historyRows } = await supabase
    .from(TABLES.PERSONAL_BASELINE_HISTORY)
    .select("marker_name, value_at, measured_date")
    .eq(COLS.USER_ID, userId)
    .order("measured_date", { ascending: true });

  // Group readings by marker
  const byMarker: Record<string, number[]> = {};
  for (const row of historyRows ?? []) {
    const name = row.marker_name as string;
    if (!byMarker[name]) byMarker[name] = [];
    byMarker[name].push(Number(row.value_at));
  }

  const markersImproved: string[] = [];
  const markersDeclined: string[] = [];
  const markersStable:   string[] = [];

  for (const [name, values] of Object.entries(byMarker)) {
    if (values.length < 2) continue;
    const first     = values[0];
    const last      = values[values.length - 1];
    if (first === 0) continue;
    const changePct = ((last - first) / Math.abs(first)) * 100;
    if (changePct > 5)        markersImproved.push(name);
    else if (changePct < -5)  markersDeclined.push(name);
    else                      markersStable.push(name);
  }

  // ── Load all milestone rows ───────────────────────────────────────────
  const { data: milestoneRows } = await supabase
    .from(TABLES.OUTCOME_MILESTONES)
    .select("id, narrative_text, marker_name, milestone_value, previous_value, achieved_at")
    .eq(COLS.USER_ID, userId);

  const milestonesAchieved: MilestoneResult[] = (milestoneRows ?? []).map((row) => ({
    milestone_id:   row.id as string,
    milestone_name: (row.narrative_text as string | null) ?? (row.marker_name as string | null) ?? "",
    status:         "achieved" as const,
    progress_pct:   100,
    achieved_at:    row.achieved_at as string,
  }));

  // ── overall_trajectory ────────────────────────────────────────────────
  const totalMarkers = markersImproved.length + markersDeclined.length + markersStable.length;
  let overallTrajectory: OutcomeSummary["overall_trajectory"];

  if (totalMarkers < 3) {
    overallTrajectory = "insufficient_data";
  } else if (markersImproved.length - markersDeclined.length >= 2) {
    overallTrajectory = "positive";
  } else if (markersDeclined.length - markersImproved.length >= 2) {
    overallTrajectory = "negative";
  } else {
    overallTrajectory = "mixed";
  }

  // ── narrative ─────────────────────────────────────────────────────────
  const narrative = buildNarrative(
    markersImproved,
    markersDeclined,
    milestonesAchieved,
    overallTrajectory,
  );

  const summary: OutcomeSummary = {
    protocol_snapshot_id: protocolSnapshotId,
    markers_improved:     markersImproved,
    markers_declined:     markersDeclined,
    markers_stable:       markersStable,
    milestones_achieved:  milestonesAchieved,
    overall_trajectory:   overallTrajectory,
    narrative,
  };

  // ── Upsert to outcome_summaries ──────────────────────────��────────────
  const today       = now.toISOString().slice(0, 10);
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  await supabase
    .from(TABLES.OUTCOME_SUMMARIES)
    .upsert(
      {
        user_id:              userId,
        period_start:         periodStart,
        period_end:           today,
        biomarkers_normalized: markersImproved.length,
        top_milestones:       milestonesAchieved.slice(0, 5),
        summary_narrative:    narrative,
        computed_at:          now.toISOString(),
      },
      { onConflict: "user_id,period_start,period_end" },
    );

  return summary;
}

// ----------------------------------------------------------------
// 3. createMilestone
// ----------------------------------------------------------------

export async function createMilestone(
  userId: string,
  input:  MilestoneInput,
): Promise<OutcomeMilestone> {
  const supabase = getAdminClient();

  // ── Load baseline_value from personal_biomarker_baselines ────────────
  const { data: baselineRow } = await supabase
    .from(TABLES.PERSONAL_BIOMARKER_BASELINES)
    .select("personal_mean")
    .eq(COLS.USER_ID, userId)
    .eq("marker_name", input.marker_name)
    .maybeSingle();

  const baselineValue = baselineRow ? Number(baselineRow.personal_mean) : 0;

  // ── INSERT to outcome_milestones ──────────────────────────────────────
  const { data: inserted, error } = await supabase
    .from(TABLES.OUTCOME_MILESTONES)
    .insert({
      user_id:                      userId,
      milestone_type:               "biomarker_improved",
      milestone_value:              String(input.target_value),
      previous_value:               String(baselineValue),
      marker_name:                  input.marker_name,
      narrative_text:               input.milestone_name,
      achieved_at:                  input.target_date ?? new Date().toISOString(),
      products_active_at_milestone: [],
    })
    .select("id, created_at")
    .maybeSingle();

  if (error || !inserted) {
    throw new Error(
      `[outcome-tracker] createMilestone: ${error?.message ?? "insert returned no data"}`,
    );
  }

  return {
    id:             inserted.id       as string,
    user_id:        userId,
    marker_name:    input.marker_name,
    milestone_name: input.milestone_name,
    baseline_value: baselineValue,
    target_value:   input.target_value,
    target_unit:    input.target_unit,
    ...(input.target_date ? { target_date: input.target_date } : {}),
    progress_pct:   0,
    status:         "not_started",
    created_at:     inserted.created_at as string,
  };
}

// ----------------------------------------------------------------
// 4. getOutcomeNarrativeContext
// ----------------------------------------------------------------

export function getOutcomeNarrativeContext(summary: OutcomeSummary): string {
  const { markers_improved, markers_declined, milestones_achieved, overall_trajectory } = summary;

  const sentences: string[] = [];

  // Sentence 1: overall progress
  if (overall_trajectory === "insufficient_data") {
    sentences.push("Insufficient biomarker history to assess overall trajectory.");
  } else {
    const totalImproved = markers_improved.length;
    const word          = overall_trajectory === "positive" ? "strong progress"
      : overall_trajectory === "negative"   ? "declining trends"
      : "mixed progress";
    sentences.push(
      `User shows ${word} — ${totalImproved} marker${totalImproved !== 1 ? "s" : ""} improved since starting the protocol.`,
    );
  }

  // Sentence 2: specific trending markers
  if (markers_improved.length > 0) {
    const listed = markers_improved.slice(0, 3).join(", ");
    const extra  = markers_improved.length > 3 ? ` and ${markers_improved.length - 3} more` : "";
    sentences.push(`${listed}${extra} ${markers_improved.length === 1 ? "is" : "are"} trending up.`);
  } else if (markers_declined.length > 0) {
    const listed = markers_declined.slice(0, 2).join(", ");
    sentences.push(`${listed} ${markers_declined.length === 1 ? "is" : "are"} trending down and may need attention.`);
  }

  // Sentence 3: milestones
  if (milestones_achieved.length > 0) {
    const names = milestones_achieved
      .slice(0, 2)
      .map((m) => m.milestone_name)
      .join("; ");
    sentences.push(`${milestones_achieved.length} milestone${milestones_achieved.length !== 1 ? "s" : ""} achieved: ${names}.`);
  }

  return sentences.join(" ");
}

// ----------------------------------------------------------------
// Internal: narrative builder for generateOutcomeSummary
// ----------------------------------------------------------------

function buildNarrative(
  improved:    string[],
  declined:    string[],
  milestones:  MilestoneResult[],
  trajectory:  OutcomeSummary["overall_trajectory"],
): string {
  const parts: string[] = [];

  if (trajectory === "insufficient_data") {
    parts.push("Insufficient data to generate a full outcome summary.");
  } else {
    parts.push(
      `Overall trajectory: ${trajectory}. ${improved.length} marker${improved.length !== 1 ? "s" : ""} improved, ${declined.length} declined.`,
    );
  }

  if (improved.length > 0) {
    parts.push(`Improving: ${improved.slice(0, 5).join(", ")}.`);
  }
  if (declined.length > 0) {
    parts.push(`Declining: ${declined.slice(0, 3).join(", ")}.`);
  }
  if (milestones.length > 0) {
    parts.push(`${milestones.length} milestone${milestones.length !== 1 ? "s" : ""} on record.`);
  }

  return parts.join(" ");
}

/// lib/personal-baselines.ts
// Server-only — import only from API routes or server components.

import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES }         from "@/lib/db/schema";

// ─── Public types ──────────────────────────────────────────────────────────────

/**
 * Row shape of personal_biomarker_baselines (composite PK: user_id + marker_name).
 * Tracks running statistical summary for each user × marker combination.
 */
export type PersonalBaseline = {
  user_id:               string;
  marker_name:           string;
  personal_mean:         number;
  personal_std_dev:      number | null;
  personal_optimal_low:  number | null;
  personal_optimal_high: number | null;
  data_points:           number;
  confidence:            number;
  first_sample_date:     string | null;
  last_sample_date:      string | null;
  last_computed_at:      string;
};

export type TrendDirection = "improving" | "declining" | "stable" | "insufficient_data";

export type BaselineContext = {
  marker_name:            string;
  current_value:          number;
  trend:                  TrendDirection;
  data_points_count:      number;
  personal_optimal_low?:  number;
  personal_optimal_high?: number;
};

// ─── Higher-is-better marker set ──────────────────────────────────────────────

const HIGHER_IS_BETTER = new Set([
  "vitamin_d",
  "ferritin",
  "b12",
  "hdl",
  "testosterone_total",
  "igf1",
  "magnesium_rbc",
  "vo2_max",
]);

// ─── 1. upsertBaseline ────────────────────────────────────────────────────────

/**
 * Records a new biomarker reading for a user.
 *
 * Steps:
 *  1. Fetch any existing baseline row for this user × marker.
 *  2. Insert the new reading into personal_baseline_history.
 *  3a. If a baseline exists: update personal_mean (incremental average),
 *      increment data_points, and refresh last_sample_date + last_computed_at.
 *  3b. If no baseline exists: insert a new row with data_points=1.
 *  4. Return the final baseline row.
 *
 * Schema notes:
 *  - personal_mean   ↔ spec's "current_value" concept (running average)
 *  - data_points     ↔ spec's "data_points_count"
 *  - last_computed_at ↔ spec's "last_updated" / "established_at"
 *  - value_at        ↔ individual reading stored in personal_baseline_history
 *  - measured_date   ↔ DATE column (YYYY-MM-DD)
 */
export async function upsertBaseline(
  userId:     string,
  markerName: string,
  value:      number,
  _unit:      string,   // reserved for future unit normalisation
  _source:    string,   // reserved for future source tagging
): Promise<PersonalBaseline> {
  const db    = getAdminClient();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // ── 1. Fetch existing baseline ────────────────────────────────────────────
  const { data: existing, error: fetchErr } = await db
    .from(TABLES.PERSONAL_BIOMARKER_BASELINES)
    .select("personal_mean, data_points, first_sample_date")
    .eq("user_id",     userId)
    .eq("marker_name", markerName)
    .maybeSingle();

  if (fetchErr) {
    throw new Error(`[personal-baselines] fetch failed: ${fetchErr.message}`);
  }

  const row = existing as { personal_mean: number; data_points: number; first_sample_date: string | null } | null;

  // ── 2. Insert reading into personal_baseline_history ─────────────────────
  const { error: histErr } = await db
    .from(TABLES.PERSONAL_BASELINE_HISTORY)
    .insert({
      user_id:      userId,
      marker_name:  markerName,
      value_at:     value,
      measured_date: today,
    });

  if (histErr) {
    // Non-fatal: history record may fail without blocking the baseline update.
    console.error("[personal-baselines] history insert failed:", histErr.message);
  }

  let finalRow: PersonalBaseline;

  if (row) {
    // ── 3a. Update existing baseline ────────────────────────────────────────
    const newCount = row.data_points + 1;
    const newMean  = (row.personal_mean * row.data_points + value) / newCount;

    const { data: updated, error: updateErr } = await db
      .from(TABLES.PERSONAL_BIOMARKER_BASELINES)
      .update({
        personal_mean:   newMean,
        data_points:     newCount,
        last_sample_date: today,
        last_computed_at: new Date().toISOString(),
      })
      .eq("user_id",     userId)
      .eq("marker_name", markerName)
      .select("*")
      .maybeSingle();

    if (updateErr || !updated) {
      throw new Error(`[personal-baselines] update failed: ${updateErr?.message ?? "no data"}`);
    }
    finalRow = updated as unknown as PersonalBaseline;
  } else {
    // ── 3b. Insert new baseline ──────────────────────────────────────────────
    const { data: inserted, error: insertErr } = await db
      .from(TABLES.PERSONAL_BIOMARKER_BASELINES)
      .insert({
        user_id:           userId,
        marker_name:       markerName,
        personal_mean:     value,
        data_points:       1,
        confidence:        0.0,
        first_sample_date: today,
        last_sample_date:  today,
        last_computed_at:  new Date().toISOString(),
      })
      .select("*")
      .maybeSingle();

    if (insertErr || !inserted) {
      throw new Error(`[personal-baselines] insert failed: ${insertErr?.message ?? "no data"}`);
    }
    finalRow = inserted as unknown as PersonalBaseline;
  }

  return finalRow;
}

// ─── 2. getTrendDirection ─────────────────────────────────────────────────────

/**
 * Looks at the last 3 historical readings for a user × marker and returns
 * a trend direction.
 *
 * Logic:
 *  - Fewer than 2 readings → 'insufficient_data'
 *  - |latest − previous| / previous ≤ 5 % → 'stable'
 *  - Higher-is-better markers: latest > previous by >5 % → 'improving', else 'declining'
 *  - All other markers: latest < previous by >5 % → 'improving', else 'declining'
 *
 * Schema note: history is ordered by created_at DESC (spec said "recorded_at"
 * but the actual column is created_at).
 */
export async function getTrendDirection(
  userId:     string,
  markerName: string,
): Promise<TrendDirection> {
  const db = getAdminClient();

  const { data, error } = await db
    .from(TABLES.PERSONAL_BASELINE_HISTORY)
    .select("value_at, created_at")
    .eq("user_id",     userId)
    .eq("marker_name", markerName)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) {
    throw new Error(`[personal-baselines] history fetch failed: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{ value_at: number; created_at: string }>;

  if (rows.length < 2) return "insufficient_data";

  const latest   = Number(rows[0].value_at);
  const previous = Number(rows[1].value_at);

  if (previous === 0) return "insufficient_data";

  const pctChange = (latest - previous) / Math.abs(previous);

  if (Math.abs(pctChange) <= 0.05) return "stable";

  const higherIsBetter = HIGHER_IS_BETTER.has(markerName.toLowerCase());

  if (higherIsBetter) {
    return pctChange > 0 ? "improving" : "declining";
  } else {
    return pctChange < 0 ? "improving" : "declining";
  }
}

// ─── 3. getBaselineContext ────────────────────────────────────────────────────

/**
 * Batch-fetches baselines for a list of markers, then resolves trend direction
 * for each in parallel.
 *
 * `current_value` is sourced from `personal_mean` (the running average stored
 * in personal_biomarker_baselines — the closest equivalent to a current value).
 */
export async function getBaselineContext(
  userId:      string,
  markerNames: string[],
): Promise<BaselineContext[]> {
  if (markerNames.length === 0) return [];

  const db = getAdminClient();

  const { data, error } = await db
    .from(TABLES.PERSONAL_BIOMARKER_BASELINES)
    .select("marker_name, personal_mean, data_points, personal_optimal_low, personal_optimal_high")
    .eq("user_id",     userId)
    .in("marker_name", markerNames);

  if (error) {
    throw new Error(`[personal-baselines] baseline batch fetch failed: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{
    marker_name:           string;
    personal_mean:         number;
    data_points:           number;
    personal_optimal_low:  number | null;
    personal_optimal_high: number | null;
  }>;

  // Resolve trend directions in parallel.
  const contexts = await Promise.all(
    rows.map(async (row): Promise<BaselineContext> => {
      const trend = await getTrendDirection(userId, row.marker_name);
      return {
        marker_name:       row.marker_name,
        current_value:     Number(row.personal_mean),
        trend,
        data_points_count: row.data_points,
        ...(row.personal_optimal_low  != null ? { personal_optimal_low:  Number(row.personal_optimal_low)  } : {}),
        ...(row.personal_optimal_high != null ? { personal_optimal_high: Number(row.personal_optimal_high) } : {}),
      };
    }),
  );

  return contexts;
}

// ─── 4. getBaselineNarrativeContext ───────────────────────────────────────────

/**
 * Returns a concise 1-sentence AI prompt summary of personal trend data.
 * Only markers with sufficient data (trend ≠ 'insufficient_data') are included.
 * Returns '' if there are no baselines or none have sufficient data.
 */
export function getBaselineNarrativeContext(baselines: BaselineContext[]): string {
  const sufficient = baselines.filter((b) => b.trend !== "insufficient_data");
  if (sufficient.length === 0) return "";

  const improving = sufficient.filter((b) => b.trend === "improving").map((b) => b.marker_name);
  const declining = sufficient.filter((b) => b.trend === "declining").map((b) => b.marker_name);
  const stable    = sufficient.filter((b) => b.trend === "stable").map((b) => b.marker_name);

  const parts: string[] = [];
  if (improving.length > 0) parts.push(`Improving: ${improving.join(", ")}`);
  if (declining.length > 0) parts.push(`Declining: ${declining.join(", ")}`);
  if (stable.length    > 0) parts.push(`Stable: ${stable.join(", ")}`);

  return (
    `Personal trend data available for ${sufficient.length} marker${sufficient.length > 1 ? "s" : ""}. ` +
    parts.join(". ") +
    "."
  );
}

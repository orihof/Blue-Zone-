/// lib/supabase-health.ts
// Server-only — v8 health data access layer.
// Never import from client components.
import { getAdminClient } from "@/lib/supabase/admin";
import type {
  CriticalValueThreshold,
  CriticalValueEvent,
  PregnancySafetyRule,
  PregnancyStatus,
  NutrientCompetitionRule,
  AdverseEventReport,
  AdverseEventSeverity,
  AdverseEventAction,
  AdverseEventAggregate,
  PersonalBiomarkerBaseline,
  TrainingPhaseDetection,
  ProtocolPdfExport,
  PdfExportType,
  OutcomeMilestone,
  MilestoneType,
  OutcomeSummary,
} from "@/lib/types/health";

// Re-export types so callers can import from one place
export type {
  CriticalValueThreshold, CriticalValueEvent,
  PregnancySafetyRule, PregnancyStatus,
  NutrientCompetitionRule,
  AdverseEventReport, AdverseEventSeverity, AdverseEventAction, AdverseEventAggregate,
  PersonalBiomarkerBaseline,
  TrainingPhaseDetection,
  ProtocolPdfExport, PdfExportType,
  OutcomeMilestone, MilestoneType,
  OutcomeSummary,
};

// ── Section A — Critical Value Detection ─────────────────────────────────────

export async function getCriticalValueThresholds(): Promise<CriticalValueThreshold[]> {
  const { data } = await getAdminClient()
    .from("critical_value_thresholds")
    .select("*");
  return (data ?? []) as CriticalValueThreshold[];
}

export async function logCriticalValueEvent(
  event: Omit<CriticalValueEvent, "id" | "alerted_at">,
): Promise<{ id: string } | null> {
  const { data, error } = await getAdminClient()
    .from("critical_value_events")
    .insert(event)
    .select("id")
    .single();
  if (error) {
    console.error("[supabase-health] logCriticalValueEvent", error.message);
    return null;
  }
  return data as { id: string };
}

/** Updates the profiles row to block protocol recommendations until acknowledged.
 *  profiles.id is the user PK (same value as userId). */
export async function gateProtocol(userId: string, reason: string): Promise<void> {
  await getAdminClient()
    .from("profiles")
    .update({
      protocol_gated_reason:      reason,
      protocol_gated_at:          new Date().toISOString(),
      protocol_gate_acknowledged: false,
    })
    .eq("id", userId);
}

/** Marks all pending critical-value events as acknowledged and clears the protocol gate. */
export async function acknowledgeGate(userId: string): Promise<void> {
  const db = getAdminClient();
  await db
    .from("critical_value_events")
    .update({ user_acknowledged_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("protocol_gated", true)
    .is("user_acknowledged_at", null);
  await db
    .from("profiles")
    .update({ protocol_gate_acknowledged: true })
    .eq("id", userId);
}

// ── Section B — Pregnancy Safety Mode ────────────────────────────────────────

/** Returns active pregnancy safety rules, optionally filtered to a specific status. */
export async function getPregnancySafetyRules(
  status?: PregnancyStatus,
): Promise<PregnancySafetyRule[]> {
  let query = getAdminClient()
    .from("pregnancy_safety_rules")
    .select("*")
    .eq("is_active", true);
  if (status && status !== "not_pregnant") {
    query = query.contains("applicable_statuses", [status]);
  }
  const { data } = await query;
  return (data ?? []) as PregnancySafetyRule[];
}

export async function getActivePregnancyStatus(userId: string): Promise<PregnancyStatus> {
  const { data } = await getAdminClient()
    .from("profiles")
    .select("pregnancy_status")
    .eq("id", userId)
    .maybeSingle();
  const row = data as { pregnancy_status?: string } | null;
  return (row?.pregnancy_status as PregnancyStatus | undefined) ?? "not_pregnant";
}

// ── Section C — Inter-Nutrient Competition ────────────────────────────────────

export async function getNutrientCompetitionRules(): Promise<NutrientCompetitionRule[]> {
  const { data } = await getAdminClient()
    .from("nutrient_competition_rules")
    .select("*")
    .eq("is_active", true);
  return (data ?? []) as NutrientCompetitionRule[];
}

/**
 * Returns competition rules where BOTH nutrient_a AND nutrient_b are in the
 * provided category list — i.e. rules relevant when these products are taken together.
 */
export async function checkNutrientPairs(
  categories: string[],
): Promise<NutrientCompetitionRule[]> {
  if (categories.length < 2) return [];
  const { data } = await getAdminClient()
    .from("nutrient_competition_rules")
    .select("*")
    .eq("is_active", true)
    .in("nutrient_a", categories)
    .in("nutrient_b", categories);
  return (data ?? []) as NutrientCompetitionRule[];
}

// ── Section D — Adverse Event Reporting ──────────────────────────────────────

export async function logAdverseEvent(
  event: Omit<AdverseEventReport, "id" | "reported_at" | "reviewed_by_rd" | "rd_notes">,
): Promise<{ id: string } | null> {
  const { data, error } = await getAdminClient()
    .from("adverse_event_reports")
    .insert(event)
    .select("id")
    .single();
  if (error) {
    console.error("[supabase-health] logAdverseEvent", error.message);
    return null;
  }
  return data as { id: string };
}

export async function getAdverseEventHistory(
  userId: string,
  limit = 20,
): Promise<AdverseEventReport[]> {
  const { data } = await getAdminClient()
    .from("adverse_event_reports")
    .select("*")
    .eq("user_id", userId)
    .order("reported_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AdverseEventReport[];
}

export async function getProductAdverseRate(
  productId: string,
): Promise<AdverseEventAggregate | null> {
  const { data } = await getAdminClient()
    .from("adverse_event_aggregates")
    .select("*")
    .eq("product_id", productId)
    .maybeSingle();
  return data as AdverseEventAggregate | null;
}

// ── Section E — Personal Biomarker Baselines ─────────────────────────────────

export async function getPersonalBaseline(
  userId: string,
  markerName: string,
): Promise<PersonalBiomarkerBaseline | null> {
  const { data } = await getAdminClient()
    .from("personal_biomarker_baselines")
    .select("*")
    .eq("user_id", userId)
    .eq("marker_name", markerName)
    .maybeSingle();
  return data as PersonalBiomarkerBaseline | null;
}

/**
 * Derives baseline stats from existing biomarker rows for the given user + marker.
 * Returns null if no data found.
 */
export async function computePersonalBaseline(
  userId: string,
  markerName: string,
): Promise<PersonalBiomarkerBaseline | null> {
  const { data: rows } = await getAdminClient()
    .from("biomarkers")
    .select("value, date")
    .eq("user_id", userId)
    .ilike("name", markerName)
    .order("date", { ascending: true });

  const values = (rows ?? []).map((r) => (r as { value: number }).value);
  const n = values.length;
  if (n === 0) return null;

  const mean     = values.reduce((a, b) => a + b, 0) / n;
  const variance = n > 1 ? values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
  const std      = Math.sqrt(variance);

  // Confidence tiers: 1pt=0.0, 2=0.3, 3=0.6, 4=0.75, 5+=0.9
  const confidenceTiers = [0, 0.0, 0.3, 0.6, 0.75];
  const confidence = n >= 5 ? 0.9 : (confidenceTiers[n] ?? 0.0);

  const dates = (rows ?? []).map((r) => (r as { date: string }).date);
  return {
    user_id:               userId,
    marker_name:           markerName,
    personal_mean:         parseFloat(mean.toFixed(4)),
    personal_std_dev:      parseFloat(std.toFixed(4)),
    personal_optimal_low:  parseFloat((mean - 0.5 * std).toFixed(4)),
    personal_optimal_high: parseFloat((mean + 0.5 * std).toFixed(4)),
    data_points:           n,
    confidence,
    first_sample_date:     dates[0] ?? null,
    last_sample_date:      dates[dates.length - 1] ?? null,
    last_computed_at:      new Date().toISOString(),
  };
}

/** Upserts a baseline record and appends a history audit row. */
export async function upsertPersonalBaseline(
  baseline: PersonalBiomarkerBaseline,
): Promise<void> {
  const db = getAdminClient();
  await db
    .from("personal_biomarker_baselines")
    .upsert(baseline, { onConflict: "user_id,marker_name" });
  await db.from("personal_baseline_history").insert({
    user_id:       baseline.user_id,
    marker_name:   baseline.marker_name,
    personal_mean: baseline.personal_mean,
    data_points:   baseline.data_points,
  });
}

// ── Section F — Predictive Training Phase ────────────────────────────────────

export async function savePhaseDetection(
  detection: Omit<TrainingPhaseDetection, "id" | "detected_at">,
): Promise<{ id: string } | null> {
  const { data, error } = await getAdminClient()
    .from("training_phase_detections")
    .insert(detection)
    .select("id")
    .single();
  if (error) {
    console.error("[supabase-health] savePhaseDetection", error.message);
    return null;
  }
  return data as { id: string };
}

export async function getUserPhaseDetections(
  userId: string,
  limit = 10,
): Promise<TrainingPhaseDetection[]> {
  const { data } = await getAdminClient()
    .from("training_phase_detections")
    .select("*")
    .eq("user_id", userId)
    .order("detected_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as TrainingPhaseDetection[];
}

// ── Section G — Protocol PDF Export ──────────────────────────────────────────

export async function createPdfExportRecord(
  record: Omit<ProtocolPdfExport, "id" | "generated_at" | "download_count">,
): Promise<{ id: string } | null> {
  const { data, error } = await getAdminClient()
    .from("protocol_pdf_exports")
    .insert(record)
    .select("id")
    .single();
  if (error) {
    console.error("[supabase-health] createPdfExportRecord", error.message);
    return null;
  }
  return data as { id: string };
}

export async function getPdfExport(
  userId: string,
  exportId: string,
): Promise<ProtocolPdfExport | null> {
  const { data } = await getAdminClient()
    .from("protocol_pdf_exports")
    .select("*")
    .eq("id", exportId)
    .eq("user_id", userId)
    .maybeSingle();
  return data as ProtocolPdfExport | null;
}

// ── Section H — Longitudinal Outcome Arc ─────────────────────────────────────

export async function logMilestone(
  milestone: Omit<OutcomeMilestone, "id" | "achieved_at">,
): Promise<{ id: string } | null> {
  const { data, error } = await getAdminClient()
    .from("outcome_milestones")
    .insert(milestone)
    .select("id")
    .single();
  if (error) {
    console.error("[supabase-health] logMilestone", error.message);
    return null;
  }
  return data as { id: string };
}

export async function getOutcomeMilestones(
  userId: string,
  limit = 20,
): Promise<OutcomeMilestone[]> {
  const { data } = await getAdminClient()
    .from("outcome_milestones")
    .select("*")
    .eq("user_id", userId)
    .order("achieved_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as OutcomeMilestone[];
}

export async function getOutcomeSummary(userId: string): Promise<OutcomeSummary | null> {
  const { data } = await getAdminClient()
    .from("outcome_summaries")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data as OutcomeSummary | null;
}

/**
 * Derives an OutcomeSummary from the last 12 months of milestones + wearable data,
 * upserts it to outcome_summaries, and returns the result.
 */
export async function computeOutcomeSummary(userId: string): Promise<OutcomeSummary | null> {
  const db  = getAdminClient();
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 12, 1);

  const [{ data: milestones }, { data: snapshots }] = await Promise.all([
    db
      .from("outcome_milestones")
      .select("*")
      .eq("user_id", userId)
      .order("achieved_at", { ascending: true }),
    db
      .from("wearable_snapshots")
      .select("readiness_score, date")
      .eq("user_id", userId)
      .order("date", { ascending: true }),
  ]);

  const milestoneRows = (milestones ?? []) as OutcomeMilestone[];
  const snapshotRows  = (snapshots  ?? []) as Array<{ readiness_score: number | null; date: string }>;

  if (milestoneRows.length === 0 && snapshotRows.length === 0) return null;

  const periodMilestones = milestoneRows.filter((m) => new Date(m.achieved_at) >= start);
  const periodSnapshots  = snapshotRows.filter((s)  => new Date(s.date) >= start);

  // Compare readiness: first quarter vs last quarter of the period
  const quarter = Math.max(1, Math.ceil(periodSnapshots.length / 4));
  const firstQ  = periodSnapshots.slice(0, quarter).map((s) => s.readiness_score ?? 0);
  const lastQ   = periodSnapshots.slice(-quarter).map((s) => s.readiness_score ?? 0);
  const avg = (arr: number[]) =>
    arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length;

  const summary: OutcomeSummary = {
    user_id:               userId,
    period_start:          start.toISOString().slice(0, 10),
    period_end:            now.toISOString().slice(0, 10),
    total_adherence_days:  periodSnapshots.length,
    longest_streak_days:   0,  // computed from check-in table when needed
    biomarkers_normalized: periodMilestones.filter((m) => m.milestone_type === "biomarker_normalized").length,
    bio_age_change_years:  null,
    readiness_avg_start:   avg(firstQ),
    readiness_avg_end:     avg(lastQ),
    top_milestones:        periodMilestones.slice(-5).map((m) => ({
      type:  m.milestone_type,
      value: m.milestone_value,
      date:  m.achieved_at,
    })),
    summary_narrative: null,
    computed_at:       now.toISOString(),
  };

  await db.from("outcome_summaries").upsert(summary, { onConflict: "user_id" });
  return summary;
}

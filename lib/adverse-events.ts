/// lib/adverse-events.ts
// Server-only — import only from API routes or server components.

import { getAdminClient }     from "@/lib/supabase/admin";
import { TABLES }             from "@/lib/db/schema";
import type {
  AdverseEventReport,
  AdverseEventSeverity,
  AdverseEventPrompt,
} from "@/lib/types/health";

// ─── Input type ───────────────────────────────────────────────────────────────

/**
 * Fields required / accepted when a user submits an adverse event.
 *
 * Notes on schema alignment:
 *  - `symptom_description` maps to the `notes` column in `adverse_event_reports`
 *  - `onset_hours_after_dose` is converted to `onset_days` (hours / 24, rounded)
 *  - `action_taken` defaults to "nothing" when not supplied
 *  - `event_type` defaults to [] when not supplied
 *  - severity uses AdverseEventSeverity ("mild"|"moderate"|"significant")
 */
export type AdverseEventInput = {
  product_id:             string;
  symptom_description:    string;
  severity:               AdverseEventSeverity;
  onset_hours_after_dose?: number;
  protocol_snapshot_id?:  string;
  event_type?:            string[];
  action_taken?:          "nothing" | "reduced_dose" | "stopped_product" | "saw_doctor" | "switched_form";
};

// ─── 1. submitAdverseEvent ────────────────────────────────────────────────────

/**
 * Inserts a new adverse event report for a user.
 * After inserting, updates the per-product aggregate counts.
 * If severity is "significant", writes an urgency-1 notification_log entry.
 * Returns the inserted report row.
 */
export async function submitAdverseEvent(
  userId: string,
  event:  AdverseEventInput,
): Promise<AdverseEventReport> {
  const db = getAdminClient();

  const onsetDays =
    event.onset_hours_after_dose != null
      ? Math.round(event.onset_hours_after_dose / 24)
      : null;

  const { data, error } = await db
    .from(TABLES.ADVERSE_EVENT_REPORTS)
    .insert({
      user_id:              userId,
      product_id:           event.product_id,
      protocol_snapshot_id: event.protocol_snapshot_id ?? null,
      event_type:           event.event_type ?? [],
      severity:             event.severity,
      onset_days:           onsetDays,
      notes:                event.symptom_description,
      action_taken:         event.action_taken ?? "nothing",
      reviewed_by_rd:       false,
    })
    .select("*")
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Failed to submit adverse event: ${error?.message ?? "no data returned"}`);
  }

  const report = data as unknown as AdverseEventReport;

  // Update aggregate counts (non-fatal — do not propagate errors to caller)
  await updateAdverseAggregates(event.product_id).catch((err: unknown) => {
    console.error("[adverse-events] updateAdverseAggregates failed:", err);
  });

  // Significant severity → urgency-1 notification log entry
  if (event.severity === "significant") {
    const notifInsert = db
      .from(TABLES.NOTIFICATION_LOG)
      .insert({
        user_id:    userId,
        type:       "adverse_event_significant",
        urgency:    1,
        payload:    {
          product_id: event.product_id,
          report_id:  report.id,
          severity:   event.severity,
          notes:      event.symptom_description,
        },
      });
    await Promise.resolve(notifInsert).catch((err: unknown) => {
      console.error("[adverse-events] notification_log insert failed:", err);
    });
  }

  return report;
}

// ─── 2. updateAdverseAggregates ───────────────────────────────────────────────

/**
 * Recomputes and upserts aggregate safety-signal counts for a product.
 * Counts: total_reports, reports_last_90d, significant_reports_last_90d.
 */
export async function updateAdverseAggregates(productId: string): Promise<void> {
  const db = getAdminClient();

  // Fetch all reports for this product (only the fields we need for counts).
  const { data, error } = await db
    .from(TABLES.ADVERSE_EVENT_REPORTS)
    .select("severity, reported_at")
    .eq("product_id", productId);

  if (error) {
    throw new Error(`Failed to fetch reports for aggregate update: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{ severity: string; reported_at: string }>;
  const cutoff90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const totalReports         = rows.length;
  const reportsLast90d       = rows.filter((r) => new Date(r.reported_at) >= cutoff90d).length;
  const significantLast90d   = rows.filter(
    (r) => r.severity === "significant" && new Date(r.reported_at) >= cutoff90d,
  ).length;

  const { error: upsertErr } = await db
    .from(TABLES.ADVERSE_EVENT_AGGREGATES)
    .upsert(
      {
        product_id:                   productId,
        total_reports:                totalReports,
        reports_last_90d:             reportsLast90d,
        significant_reports_last_90d: significantLast90d,
        last_computed_at:             new Date().toISOString(),
      },
      { onConflict: "product_id" },
    );

  if (upsertErr) {
    throw new Error(`Failed to upsert adverse event aggregates: ${upsertErr.message}`);
  }
}

// ─── 3. getAdverseEventPrompts ────────────────────────────────────────────────

/**
 * Returns follow-up prompt log entries for a user + product combination,
 * ordered by prompted_at ascending.
 *
 * Note: adverse_event_prompts stores per-user prompt events (triggered nudges),
 * not a global template table — so results are scoped to this user.
 */
export async function getAdverseEventPrompts(
  productId: string,
  userId:    string,
): Promise<AdverseEventPrompt[]> {
  const db = getAdminClient();

  const { data, error } = await db
    .from(TABLES.ADVERSE_EVENT_PROMPTS)
    .select("*")
    .eq("product_id", productId)
    .eq("user_id",    userId)
    .order("prompted_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch adverse event prompts: ${error.message}`);
  }

  return (data ?? []) as unknown as AdverseEventPrompt[];
}

// ─── 4. shouldSuppressProduct ─────────────────────────────────────────────────

/**
 * Returns true if a product should be suppressed from recommendations for this user:
 *  - Any report with severity="significant" (most severe level in schema), OR
 *  - 3 or more reports filed within the last 30 days
 */
export async function shouldSuppressProduct(
  productId: string,
  userId:    string,
): Promise<boolean> {
  const db = getAdminClient();

  const { data, error } = await db
    .from(TABLES.ADVERSE_EVENT_REPORTS)
    .select("severity, reported_at")
    .eq("user_id",    userId)
    .eq("product_id", productId);

  if (error) {
    throw new Error(`Failed to check product suppression: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{ severity: string; reported_at: string }>;

  // Suppress if any report is significant
  if (rows.some((r) => r.severity === "significant")) return true;

  // Suppress if 3+ reports in the last 30 days
  const cutoff30d    = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentCount  = rows.filter((r) => new Date(r.reported_at) >= cutoff30d).length;
  if (recentCount >= 3) return true;

  return false;
}

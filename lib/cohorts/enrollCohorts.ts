/// lib/cohorts/enrollCohorts.ts
// Shared enrollment logic used by both the admin route and the cron job.
import { getAdminClient } from "@/lib/supabase/admin";

const MS_PER_DAY = 86_400_000;

interface CohortCriteria {
  consent_tier_required?: number;
  min_data_days?: number;
  [key: string]: unknown;
}

export interface EnrollmentSummaryItem {
  cohort_name:     string;
  new_enrollments: number;
  total_enrolled:  number;
}

export interface EnrollmentResult {
  cohorts_processed:    number;
  total_new_enrollments: number;
  summary:              EnrollmentSummaryItem[];
}

export async function runCohortEnrollment(): Promise<EnrollmentResult> {
  const db = getAdminClient();

  // ── 1. Active cohorts ─────────────────────────────────────────────────────

  const { data: cohorts, error: cohortsError } = await db
    .from("research_cohorts")
    .select("id, name, criteria")
    .eq("is_active", true);

  if (cohortsError) throw new Error(`Failed to fetch cohorts: ${cohortsError.message}`);
  if (!cohorts || cohorts.length === 0) {
    return { cohorts_processed: 0, total_new_enrollments: 0, summary: [] };
  }

  const typedCohorts = cohorts as Array<{ id: string; name: string; criteria: unknown }>;

  // ── 2. Pre-fetch consent records ──────────────────────────────────────────

  const { data: consentRows } = await db
    .from("consent_records")
    .select("id, user_id, tier2_research")
    .eq("is_current", true);

  // user_id → { consent_record_id, tier2 }
  const consentByUser = new Map<string, { id: string; tier2: boolean }>();
  for (const row of (consentRows ?? []) as Array<{ id: string; user_id: string; tier2_research: boolean }>) {
    if (!row.user_id) continue;
    consentByUser.set(row.user_id, { id: row.id, tier2: row.tier2_research ?? false });
  }

  // ── 3. Pre-fetch wearable snapshot date spans per user ────────────────────

  const { data: wearableRows } = await db
    .from("wearable_snapshots")
    .select("user_id, date");

  const wMinTs = new Map<string, number>();
  const wMaxTs = new Map<string, number>();
  for (const row of (wearableRows ?? []) as Array<{ user_id: string; date: string }>) {
    if (!row.user_id || !row.date) continue;
    const ts      = new Date(row.date).getTime();
    const curMin  = wMinTs.get(row.user_id);
    const curMax  = wMaxTs.get(row.user_id);
    if (curMin === undefined || ts < curMin) wMinTs.set(row.user_id, ts);
    if (curMax === undefined || ts > curMax) wMaxTs.set(row.user_id, ts);
  }

  // user_id → span in days
  const wearableSpan = new Map<string, number>();
  for (const uid of Array.from(wMinTs.keys())) {
    const minT = wMinTs.get(uid)!;
    const maxT = wMaxTs.get(uid) ?? minT;
    wearableSpan.set(uid, (maxT - minT) / MS_PER_DAY);
  }

  // ── 4. Process each cohort ────────────────────────────────────────────────

  let totalNewEnrollments = 0;
  const summary: EnrollmentSummaryItem[] = [];

  for (const cohort of typedCohorts) {
    const criteria = ((cohort.criteria ?? {}) as CohortCriteria);

    // Start with all users who have a current consent record
    let eligibleUserIds = Array.from(consentByUser.keys());

    // Apply recognized criteria filters; skip unrecognized keys
    for (const key of Object.keys(criteria)) {
      if (key === "consent_tier_required") {
        if (criteria.consent_tier_required === 2) {
          eligibleUserIds = eligibleUserIds.filter(
            (uid) => consentByUser.get(uid)?.tier2 === true,
          );
        }
        // Other numeric values: unrecognized — skip (no filtering)
      } else if (key === "min_data_days") {
        const minDays = criteria.min_data_days;
        if (typeof minDays === "number") {
          eligibleUserIds = eligibleUserIds.filter(
            (uid) => (wearableSpan.get(uid) ?? 0) >= minDays,
          );
        }
        // Non-numeric: skip
      }
      // Unrecognized key: skip
    }

    // Fetch all existing enrollments for this cohort (any status) to avoid re-inserting
    const { data: existing } = await db
      .from("cohort_enrollments")
      .select("user_id")
      .eq("cohort_id", cohort.id);

    const alreadyEnrolled = new Set<string>(
      (existing ?? []).map((e) => (e as { user_id: string }).user_id),
    );

    const newUserIds = eligibleUserIds.filter((uid) => !alreadyEnrolled.has(uid));

    let newEnrollments = 0;
    if (newUserIds.length > 0) {
      const insertRows = newUserIds
        .filter((uid) => consentByUser.has(uid))
        .map((uid) => ({
          cohort_id:         cohort.id,
          user_id:           uid,
          consent_record_id: consentByUser.get(uid)!.id,
          status:            "active",
        }));

      if (insertRows.length > 0) {
        const { error: insertError } = await db
          .from("cohort_enrollments")
          .upsert(insertRows, { onConflict: "cohort_id,user_id", ignoreDuplicates: true });

        if (!insertError) newEnrollments = insertRows.length;
      }
    }

    // Update enrolled_users count on the cohort
    const { count: totalEnrolled } = await db
      .from("cohort_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("cohort_id", cohort.id)
      .eq("status", "active");

    await db
      .from("research_cohorts")
      .update({ enrolled_users: totalEnrolled ?? 0 })
      .eq("id", cohort.id);

    totalNewEnrollments += newEnrollments;
    summary.push({
      cohort_name:     cohort.name,
      new_enrollments: newEnrollments,
      total_enrolled:  totalEnrolled ?? 0,
    });
  }

  return {
    cohorts_processed:     typedCohorts.length,
    total_new_enrollments: totalNewEnrollments,
    summary,
  };
}

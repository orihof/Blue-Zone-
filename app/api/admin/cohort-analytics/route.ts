/// app/api/admin/cohort-analytics/route.ts
// Internal admin endpoint — protected by ADMIN_API_KEY, not user session
import { getAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Auth ──────────────────────────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  const header = req.headers.get("authorization") ?? "";
  const token  = header.startsWith("Bearer ") ? header.slice(7).trim() : header.trim();
  const key    = process.env.ADMIN_API_KEY ?? "";
  return key.length > 0 && token === key;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return parseFloat(((numerator / denominator) * 100).toFixed(2));
}

/** Returns an array of the last N month strings in "YYYY-MM" format (oldest first). */
function lastNMonths(n: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return months;
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();

  // ── 1. consent_overview ────────────────────────────────────────────────────

  const [
    { count: totalUsers },
    { count: tier2Count },
    { count: tier3Count },
  ] = await Promise.all([
    supabase.from("nextauth_users").select("id", { count: "exact", head: true }),
    supabase
      .from("consent_records")
      .select("id", { count: "exact", head: true })
      .eq("tier2_research", true)
      .eq("is_current", true),
    supabase
      .from("consent_records")
      .select("id", { count: "exact", head: true })
      .eq("tier3_commercial", true)
      .eq("is_current", true),
  ]);

  const totalRegistered = totalUsers ?? 0;
  const tier2OptIn      = tier2Count  ?? 0;
  const tier3OptIn      = tier3Count  ?? 0;

  // Monthly trend: count new tier-2 consents per month for the last 6 months
  const months = lastNMonths(6);
  const monthlyTrendPromises = months.map(async (month) => {
    const start = `${month}-01T00:00:00.000Z`;
    const endDate = new Date(
      parseInt(month.slice(0, 4)),
      parseInt(month.slice(5, 7)),  // month+1 (JS months 0-based means this is already next month)
      1,
    );
    const end = endDate.toISOString();

    const { count } = await supabase
      .from("consent_records")
      .select("id", { count: "exact", head: true })
      .eq("tier2_research", true)
      .gte("created_at", start)
      .lt("created_at", end);

    return { month, new_tier2_consents: count ?? 0 };
  });

  const monthly_optin_trend = await Promise.all(monthlyTrendPromises);

  const consent_overview = {
    total_registered_users: totalRegistered,
    tier2_optin_count:      tier2OptIn,
    tier2_optin_rate:       pct(tier2OptIn, totalRegistered),
    tier3_optin_count:      tier3OptIn,
    tier3_optin_rate:       pct(tier3OptIn, totalRegistered),
    monthly_optin_trend,
  };

  // ── 2. data_depth ─────────────────────────────────────────────────────────
  // For each threshold, find users whose earliest and latest biomarker differ by >= N days.
  // We do this with a single query fetching per-user min/max biomarker dates.

  const { data: biomarkerDates } = await supabase
    .from("biomarkers")
    .select("user_id, recorded_at");

  // Group by user_id, compute span in days
  const spanByUser = new Map<string, number>();
  for (const row of (biomarkerDates ?? []) as Array<{ user_id: string; recorded_at: string }>) {
    if (!row.user_id || !row.recorded_at) continue;
    const ts = new Date(row.recorded_at).getTime();
    const existing = spanByUser.get(row.user_id);
    if (existing === undefined) {
      spanByUser.set(row.user_id, ts);
    } else {
      // Store as [min, max] encoded: use negative for min, positive for max
      // Simpler: track min and max separately using two maps
    }
  }

  // Rebuild with proper min/max tracking
  const minTs = new Map<string, number>();
  const maxTs = new Map<string, number>();
  for (const row of (biomarkerDates ?? []) as Array<{ user_id: string; recorded_at: string }>) {
    if (!row.user_id || !row.recorded_at) continue;
    const ts = new Date(row.recorded_at).getTime();
    const curMin = minTs.get(row.user_id);
    const curMax = maxTs.get(row.user_id);
    if (curMin === undefined || ts < curMin) minTs.set(row.user_id, ts);
    if (curMax === undefined || ts > curMax) maxTs.set(row.user_id, ts);
  }

  const MS_PER_DAY = 86_400_000;
  let d30 = 0, d90 = 0, d180 = 0, d365 = 0;
  for (const uid of Array.from(minTs.keys())) {
    const minTime = minTs.get(uid)!;
    const maxTime = maxTs.get(uid) ?? minTime;
    const span = (maxTime - minTime) / MS_PER_DAY;
    if (span >= 30)  d30++;
    if (span >= 90)  d90++;
    if (span >= 180) d180++;
    if (span >= 365) d365++;
  }

  const data_depth = {
    users_with_30_plus_days:  d30,
    users_with_90_plus_days:  d90,
    users_with_180_plus_days: d180,
    users_with_365_plus_days: d365,
  };

  // ── 3. cohort_summary ─────────────────────────────────────────────────────

  const { data: cohorts } = await supabase
    .from("research_cohorts")
    .select("id, name, irb_status, eligible_users")
    .eq("is_active", true);

  const cohortIds = (cohorts ?? []).map((c) => (c as { id: string }).id);

  // Enrolled count per cohort
  const enrolledCounts = new Map<string, number>();
  if (cohortIds.length > 0) {
    const { data: enrollments } = await supabase
      .from("cohort_enrollments")
      .select("cohort_id")
      .in("cohort_id", cohortIds)
      .eq("status", "active");

    for (const row of (enrollments ?? []) as Array<{ cohort_id: string }>) {
      enrolledCounts.set(row.cohort_id, (enrolledCounts.get(row.cohort_id) ?? 0) + 1);
    }
  }

  const cohort_summary = (cohorts ?? []).map((c) => {
    const cohort = c as { id: string; name: string; irb_status: string | null; eligible_users: number | null };
    return {
      name:          cohort.name,
      eligible_users: cohort.eligible_users ?? 0,
      enrolled_users: enrolledCounts.get(cohort.id) ?? 0,
      irb_status:    cohort.irb_status ?? null,
    };
  });

  // ── 4. biomarker_coverage ─────────────────────────────────────────────────

  const { data: allBiomarkers } = await supabase
    .from("biomarkers")
    .select("name, user_id");

  // Group: biomarker name → Set of user_ids
  const biomarkerUsers = new Map<string, Set<string>>();
  for (const row of (allBiomarkers ?? []) as Array<{ name: string; user_id: string }>) {
    if (!row.name || !row.user_id) continue;
    const existing = biomarkerUsers.get(row.name);
    if (existing) {
      existing.add(row.user_id);
    } else {
      biomarkerUsers.set(row.name, new Set([row.user_id]));
    }
  }

  const biomarker_coverage = Array.from(biomarkerUsers.keys())
    .map((biomarker_name) => {
      const users = biomarkerUsers.get(biomarker_name)!;
      return {
        biomarker_name,
        user_count:              users.size,
        pct_of_consented_cohort: pct(users.size, tier2OptIn),
      };
    })
    .sort((a, b) => b.user_count - a.user_count);

  // ── Response ──────────────────────────────────────────────────────────────

  return NextResponse.json({
    generated_at:       new Date().toISOString(),
    consent_overview,
    data_depth,
    cohort_summary,
    biomarker_coverage,
  });
}

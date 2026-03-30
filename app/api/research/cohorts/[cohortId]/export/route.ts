/// app/api/research/cohorts/[cohortId]/export/route.ts
// Partner-only endpoint — validated by PARTNER_API_TOKENS, not user session
import { createHash } from "crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MIN_COHORT_SIZE = 50;

/** Partial SHA-256 of a token — safe to store in audit logs */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 16);
}

/** Validate Bearer token against PARTNER_API_TOKENS env var (comma-separated) */
function resolveToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization") ?? "";
  const raw = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();
  if (!raw) return null;

  const valid = (process.env.PARTNER_API_TOKENS ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return valid.includes(raw) ? raw : null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cohortId: string }> },
) {
  // 1. Validate partner API token
  const token = resolveToken(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();
  const { cohortId } = await params;

  // 2. Fetch cohort (must be active)
  const { data: cohort, error: cohortErr } = await supabase
    .from("research_cohorts")
    .select("*")
    .eq("id", cohortId)
    .eq("is_active", true)
    .maybeSingle();

  if (cohortErr || !cohort) {
    return NextResponse.json({ error: "Cohort not found" }, { status: 404 });
  }

  // 3. Count active enrollments — enforce k-anonymity floor of 50
  const { count, error: countErr } = await supabase
    .from("cohort_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("cohort_id", cohortId)
    .eq("status", "active");

  if (countErr) {
    return NextResponse.json({ error: "Failed to count enrollments" }, { status: 500 });
  }

  const currentSize = count ?? 0;
  if (currentSize < MIN_COHORT_SIZE) {
    return NextResponse.json(
      { error: "Cohort too small for safe export", minimum: MIN_COHORT_SIZE, current_size: currentSize },
      { status: 422 },
    );
  }

  // 4. Fetch enrolled user IDs for this cohort
  const { data: enrollments, error: enrollErr } = await supabase
    .from("cohort_enrollments")
    .select("user_id")
    .eq("cohort_id", cohortId)
    .eq("status", "active");

  if (enrollErr) {
    return NextResponse.json({ error: "Failed to fetch enrollments" }, { status: 500 });
  }

  const userIds = (enrollments ?? []).map((e) => (e as { user_id: string }).user_id);

  // 5. Query de-identified view filtered to enrolled users
  const { data: records, error: dataErr } = await supabase
    .from("deidentified_biomarker_research")
    .select("*")
    .in("user_id", userIds);

  if (dataErr) {
    return NextResponse.json({ error: "Failed to fetch research data" }, { status: 500 });
  }

  const exportedAt = new Date().toISOString();
  const recordCount = (records ?? []).length;

  // 6. Audit log (non-fatal)
  const { error: auditErr } = await supabase
    .from("consent_audit_log")
    .insert({
      event_type:   "research_export",
      triggered_by: "api",
      new_state: {
        cohort_id:     cohortId,
        record_count:  recordCount,
        partner_token: hashToken(token),
        exported_at:   exportedAt,
      },
    });

  if (auditErr) {
    console.error("[cohort/export] audit log failed", auditErr.message);
  }

  // 7. Return de-identified payload
  const cohortRow = cohort as Record<string, unknown>;
  return NextResponse.json({
    cohort_name:              (cohortRow.name ?? cohortRow.cohort_name ?? cohortId) as string,
    record_count:             recordCount,
    export_date:              exportedAt,
    de_identification_method: "HIPAA Safe Harbor (45 CFR §164.514(b))",
    irb_status:               (cohortRow.irb_status ?? null) as string | null,
    data:                     records ?? [],
  });
}

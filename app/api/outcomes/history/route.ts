/// app/api/outcomes/history/route.ts
import { getServerSession }  from "next-auth";
import { authOptions }       from "@/lib/auth";
import { getAdminClient }    from "@/lib/supabase/admin";
import { TABLES, COLS }      from "@/lib/db/schema";
import type { OutcomeSummary, MilestoneResult } from "@/lib/outcome-tracker";
import { NextRequest, NextResponse } from "next/server";
import { requireConsent }    from "@/middleware/requireConsent";

export const runtime = "nodejs";

// ----------------------------------------------------------------
// GET /api/outcomes/history
// Returns all persisted outcome summaries for the authenticated user,
// ordered by computed_at DESC.
// ----------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = requireConsent(1)(async (_req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId   = session.user.id as string;
  const supabase = getAdminClient();

  const { data: rows, error } = await supabase
    .from(TABLES.OUTCOME_SUMMARIES)
    .select(
      "period_start, period_end, biomarkers_normalized, top_milestones, summary_narrative, computed_at",
    )
    .eq(COLS.USER_ID, userId)
    .order("computed_at", { ascending: false });

  if (error) {
    console.error("[outcomes/history] DB error:", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  type SummaryRow = {
    period_start:          string | null;
    period_end:            string | null;
    biomarkers_normalized: number | null;
    top_milestones:        unknown;
    summary_narrative:     string | null;
    computed_at:           string | null;
  };

  const summaries: OutcomeSummary[] = (rows ?? []).map((r) => {
    const row             = r as SummaryRow;
    const topMilestones   = Array.isArray(row.top_milestones)
      ? (row.top_milestones as MilestoneResult[])
      : [];

    return {
      // outcome_summaries has no protocol_snapshot_id — use period as identifier
      protocol_snapshot_id: `${row.period_start ?? ""}:${row.period_end ?? ""}`,
      markers_improved:     [],
      markers_declined:     [],
      markers_stable:       [],
      milestones_achieved:  topMilestones,
      overall_trajectory:   "insufficient_data" as const,
      narrative:            row.summary_narrative ?? "",
    };
  });

  return NextResponse.json({ summaries });
});

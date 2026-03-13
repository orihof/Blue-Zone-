/// app/api/outcomes/milestones/route.ts
import { getServerSession }  from "next-auth";
import { authOptions }       from "@/lib/auth";
import { getAdminClient }    from "@/lib/supabase/admin";
import { TABLES, COLS }      from "@/lib/db/schema";
import {
  createMilestone,
  type MilestoneInput,
  type OutcomeMilestone,
} from "@/lib/outcome-tracker";
import { NextRequest, NextResponse } from "next/server";
import { requireConsent }    from "@/middleware/requireConsent";

export const runtime = "nodejs";

// ----------------------------------------------------------------
// GET /api/outcomes/milestones
// Returns all milestones for the authenticated user.
// ----------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = requireConsent(1)(async (_req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId   = session.user.id as string;
  const supabase = getAdminClient();

  const { data: rows, error } = await supabase
    .from(TABLES.OUTCOME_MILESTONES)
    .select(
      "id, marker_name, narrative_text, milestone_value, previous_value, achieved_at, created_at",
    )
    .eq(COLS.USER_ID, userId)
    .order(COLS.CREATED_AT, { ascending: false });

  if (error) {
    console.error("[outcomes/milestones GET] DB error:", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  type MilestoneRow = {
    id:              unknown;
    marker_name:     unknown;
    narrative_text:  unknown;
    milestone_value: unknown;
    previous_value:  unknown;
    achieved_at:     unknown;
    created_at:      unknown;
  };

  const milestones: OutcomeMilestone[] = (rows ?? []).map((r) => {
    const row         = r as MilestoneRow;
    const targetValue = parseFloat(String(row.milestone_value ?? "0"));
    const baselineVal = parseFloat(String(row.previous_value  ?? "0"));
    return {
      id:             row.id            as string,
      user_id:        userId,
      marker_name:    (row.marker_name    as string | null) ?? "",
      milestone_name: (row.narrative_text as string | null) ?? "",
      baseline_value: baselineVal,
      target_value:   targetValue,
      target_unit:    "",
      progress_pct:   0,
      status:         "not_started" as const,
      achieved_at:    row.achieved_at ? (row.achieved_at as string) : undefined,
      created_at:     row.created_at  as string,
    };
  });

  return NextResponse.json({ milestones });
});

// ----------------------------------------------------------------
// POST /api/outcomes/milestones
// Body: MilestoneInput — creates a new milestone goal.
// ----------------------------------------------------------------

export const POST = requireConsent(1)(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id as string;
  const body   = await req.json().catch(() => null);

  const { marker_name, milestone_name, target_value, target_unit, target_date } = body ?? {};

  if (
    !marker_name         || typeof marker_name   !== "string" || marker_name.trim() === "" ||
    !milestone_name      || typeof milestone_name !== "string" ||
    typeof target_value  !== "number"                          || target_value <= 0 ||
    !target_unit         || typeof target_unit    !== "string"
  ) {
    return NextResponse.json(
      { error: "marker_name, milestone_name, target_unit are required; target_value must be a positive number" },
      { status: 400 },
    );
  }

  const input: MilestoneInput = {
    marker_name:    marker_name.trim(),
    milestone_name: milestone_name.trim(),
    target_value,
    target_unit:    target_unit.trim(),
    ...(target_date && typeof target_date === "string" ? { target_date } : {}),
  };

  let milestone: OutcomeMilestone;
  try {
    milestone = await createMilestone(userId, input);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[outcomes/milestones POST] error:", msg);
    return NextResponse.json({ error: "Failed to create milestone" }, { status: 500 });
  }

  return NextResponse.json({ milestone }, { status: 201 });
});

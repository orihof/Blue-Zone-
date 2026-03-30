/// app/api/outcomes/summary/route.ts
import { getServerSession }  from "next-auth";
import { authOptions }       from "@/lib/auth";
import { getAdminClient }    from "@/lib/supabase/admin";
import { TABLES, COLS }      from "@/lib/db/schema";
import { generateOutcomeSummary } from "@/lib/outcome-tracker";
import { NextRequest, NextResponse } from "next/server";
import { requireConsent }    from "@/lib/middleware/requireConsent";

export const runtime     = "nodejs";
export const maxDuration = 30;

// ----------------------------------------------------------------
// GET /api/outcomes/summary
// Generates (and persists) a fresh outcome summary for the user.
// ----------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = requireConsent(1)(async (_req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId   = session.user.id as string;
  const supabase = getAdminClient();

  // Fetch the user's most recent protocol snapshot id
  const { data: latest, error: snapErr } = await supabase
    .from(TABLES.PROTOCOL_OUTPUTS)
    .select(COLS.ID)
    .eq(COLS.USER_ID, userId)
    .order(COLS.CREATED_AT, { ascending: false })
    .limit(1)
    .maybeSingle();

  if (snapErr) {
    console.error("[outcomes/summary] DB error fetching snapshot:", snapErr.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const snapshotId = (latest?.id as string | null) ?? "none";

  let summary: Awaited<ReturnType<typeof generateOutcomeSummary>>;
  try {
    summary = await generateOutcomeSummary(userId, snapshotId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[outcomes/summary] generation error:", msg);
    return NextResponse.json({ error: "Failed to generate outcome summary" }, { status: 500 });
  }

  return NextResponse.json(summary);
});

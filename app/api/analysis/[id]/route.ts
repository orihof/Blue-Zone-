/// app/api/analysis/[id]/route.ts
// GET: fetch a single analysis report by ID (scoped to the authed user).

import { getServerSession } from "next-auth";
import { authOptions }      from "@/lib/auth";
import { getAdminClient }   from "@/lib/supabase/admin";
import { TABLES, COLS }     from "@/lib/db/schema";
import { NextResponse }     from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing report id" }, { status: 400 });

  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from(TABLES.ANALYSIS_REPORTS)
    .select([
      COLS.ID,
      COLS.STATUS,
      COLS.REPORT_TYPE,
      COLS.PAYLOAD,
      COLS.MODEL,
      COLS.INPUT_TOKENS,
      COLS.OUTPUT_TOKENS,
      COLS.ERROR_MESSAGE,
      COLS.GENERATED_AT,
    ].join(", "))
    .eq(COLS.ID, id)
    .eq(COLS.USER_ID, session.user.id)
    .maybeSingle();

  if (error) {
    console.error("[analysis/[id]] DB error:", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  if (!data) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  return NextResponse.json(data);
}

/// app/api/sports-prep/status/[id]/route.ts
// Polling endpoint — client calls this every 3 s until status === "ready" | "failed".

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getAdminClient();

  const { data: row, error } = await supabase
    .from(TABLES.SPORTS_PROTOCOLS)
    .select(`${COLS.STATUS}, ${COLS.ERROR_MESSAGE}`)
    .eq(COLS.ID, params.id)
    .eq(COLS.USER_ID, session.user.id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: row[COLS.STATUS] as string,
    error:  row[COLS.ERROR_MESSAGE] as string | null,
  });
}

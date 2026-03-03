/// app/api/checkins/submit/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { track } from "@/lib/analytics";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { protocolId, weekNumber, responses } = body ?? {};

  if (!weekNumber || typeof weekNumber !== "number" || !responses || typeof responses !== "object") {
    return NextResponse.json({ error: "weekNumber and responses required" }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from(TABLES.CHECKIN_RESPONSES)
    .insert({
      [COLS.USER_ID]: session.user.id,
      [COLS.PROTOCOL_ID]: protocolId ?? null,
      [COLS.WEEK_NUMBER]: weekNumber,
      [COLS.RESPONSES]: responses,
    })
    .select(COLS.ID)
    .maybeSingle();

  if (error) {
    console.error("[checkins/submit]", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  track("checkin_submitted");
  return NextResponse.json({ id: data!.id });
}

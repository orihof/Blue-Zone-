/// app/api/protocols/status/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const protocolId = searchParams.get("protocolId");

  if (!protocolId) {
    return NextResponse.json({ error: "protocolId required" }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from(TABLES.PROTOCOLS)
    .select(`${COLS.STATUS}, ${COLS.ERROR_MESSAGE}, ${COLS.PAYLOAD}`)
    .eq(COLS.ID, protocolId)
    .eq(COLS.USER_ID, session.user.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Protocol not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: data.status,
    errorMessage: data.error_message ?? null,
    payload: data.status === "ready" ? data.payload : null,
  });
}

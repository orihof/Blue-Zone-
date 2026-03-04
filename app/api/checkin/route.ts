/// app/api/checkin/route.ts
// POST /api/checkin
// Body: { energy: string, sleepScore: number }
// Inserts a weekly check-in response into checkin_responses.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { energy?: string; sleepScore?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { energy, sleepScore } = body;
  const db = getAdminClient();
  const userId = session.user.id;

  // Find latest protocol for protocol_id FK (optional)
  const { data: protocol } = await db
    .from(TABLES.PROTOCOLS)
    .select("id,created_at")
    .eq(COLS.USER_ID, userId)
    .eq(COLS.STATUS, "ready")
    .order(COLS.CREATED_AT, { ascending: false })
    .limit(1)
    .single();

  // Compute week number relative to protocol start (or 1)
  let weekNumber = 1;
  if (protocol?.created_at) {
    const msPerWeek = 7 * 24 * 3600 * 1000;
    weekNumber = Math.max(1, Math.floor((Date.now() - new Date(protocol.created_at).getTime()) / msPerWeek) + 1);
  }

  const { error } = await db.from(TABLES.CHECKIN_RESPONSES).insert({
    [COLS.USER_ID]: userId,
    [COLS.PROTOCOL_ID]: protocol?.id ?? null,
    [COLS.WEEK_NUMBER]: weekNumber,
    [COLS.RESPONSES]: { energy: energy ?? null, sleepScore: sleepScore ?? null },
  });

  if (error) {
    console.error("Checkin insert error:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  return NextResponse.json({ success: true, nextProtocolUpdate: "+24h" });
}

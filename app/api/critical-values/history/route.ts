/// app/api/critical-values/history/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import type { CriticalValueEvent } from "@/lib/types/health";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminClient();
  const { data, error } = await db
    .from(TABLES.CRITICAL_VALUE_EVENTS)
    .select("*")
    .eq(COLS.USER_ID, session.user.id)
    .order("alerted_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ events: (data ?? []) as CriticalValueEvent[] });
}

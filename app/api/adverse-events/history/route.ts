/// app/api/adverse-events/history/route.ts
// GET /api/adverse-events/history — return the authenticated user's event history.

import { getServerSession }        from "next-auth";
import { authOptions }             from "@/lib/auth";
import { getAdminClient }          from "@/lib/supabase/admin";
import { TABLES }                  from "@/lib/db/schema";
import { NextResponse }            from "next/server";
import type { AdverseEventReport } from "@/lib/types/health";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from(TABLES.ADVERSE_EVENT_REPORTS)
    .select("*")
    .eq("user_id", session.user.id)
    .order("reported_at", { ascending: false });

  if (error) {
    console.error("[adverse-events/history]", error.message);
    return NextResponse.json({ error: "Failed to fetch event history" }, { status: 500 });
  }

  return NextResponse.json({ events: (data ?? []) as unknown as AdverseEventReport[] });
}

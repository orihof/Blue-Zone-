/// app/api/user/goals/route.ts
// PATCH → set secondary goal on profiles table

import { getServerSession } from "next-auth";
import { authOptions }      from "@/lib/auth";
import { getAdminClient }   from "@/lib/supabase/admin";
import { TABLES, COLS }     from "@/lib/db/schema";
import { NextResponse }     from "next/server";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (typeof body.secondaryGoal !== "string" || !body.secondaryGoal) {
    return NextResponse.json({ error: "secondaryGoal is required" }, { status: 400 });
  }

  const { error } = await getAdminClient()
    .from(TABLES.PROFILES)
    .update({
      [COLS.SECONDARY_GOAL]:        body.secondaryGoal,
      [COLS.SECONDARY_GOAL_SET_AT]: new Date().toISOString(),
    })
    .eq(COLS.ID, session.user.id);

  if (error) {
    console.error("[user/goals PATCH]", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/// app/api/user/onboarding/route.ts
// GET  → returns current onboarding state (goals, wearable_done)
// PATCH → updates goals and/or wearable_done; also syncs primaryGoal → profiles.primary_goal
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await getAdminClient()
    .from(TABLES.USERS)
    .select(`${COLS.ONBOARDING_GOALS}, ${COLS.ONBOARDING_WEARABLE_DONE}`)
    .eq(COLS.ID, session.user.id)
    .maybeSingle();

  return NextResponse.json({
    goals:        data?.onboarding_goals        ?? [],
    wearableDone: data?.onboarding_wearable_done ?? false,
  });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body   = await req.json().catch(() => ({}));
  const userId = session.user.id;
  const supabase = getAdminClient();

  const userUpdate: Record<string, unknown> = {};
  if (Array.isArray(body.goals))              userUpdate[COLS.ONBOARDING_GOALS]         = body.goals;
  if (typeof body.wearableDone === "boolean") userUpdate[COLS.ONBOARDING_WEARABLE_DONE] = body.wearableDone;

  const hasUserUpdate  = Object.keys(userUpdate).length > 0;
  const hasPrimaryGoal = typeof body.primaryGoal === "string" && !!body.primaryGoal;

  if (!hasUserUpdate && !hasPrimaryGoal) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const [userRes, profileRes] = await Promise.all([
    hasUserUpdate
      ? supabase.from(TABLES.USERS).update(userUpdate).eq(COLS.ID, userId)
      : Promise.resolve({ error: null }),
    hasPrimaryGoal
      ? supabase
          .from(TABLES.PROFILES)
          .upsert({ [COLS.ID]: userId, [COLS.PRIMARY_GOAL]: body.primaryGoal as string }, { onConflict: COLS.ID })
      : Promise.resolve({ error: null }),
  ]);

  const failed = userRes.error ?? profileRes.error;
  if (failed) {
    console.error("[user/onboarding PATCH]", failed.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

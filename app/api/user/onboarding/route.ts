/// app/api/user/onboarding/route.ts
// GET  → returns current onboarding state (goals, wearable_done)
// PATCH → updates goals and/or wearable_done
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

  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if (Array.isArray(body.goals))            update[COLS.ONBOARDING_GOALS]         = body.goals;
  if (typeof body.wearableDone === "boolean") update[COLS.ONBOARDING_WEARABLE_DONE] = body.wearableDone;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await getAdminClient()
    .from(TABLES.USERS)
    .update(update)
    .eq(COLS.ID, session.user.id);

  if (error) {
    console.error("[user/onboarding PATCH]", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/// app/api/onboarding/profile/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";

// GET /api/onboarding/profile
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { data } = await getAdminClient()
    .from(TABLES.PROFILES)
    .select(`${COLS.NAME}, ${COLS.PRIMARY_GOAL}, ${COLS.ONBOARDING_STEP}`)
    .eq(COLS.ID, session.user.id)
    .maybeSingle();

  return Response.json(
    data ?? { name: null, primary_goal: null, onboarding_step: "name" }
  );
}

// PATCH /api/onboarding/profile
// Body: { name?: string; primary_goal?: string; onboarding_step?: string }
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;

  // Ensure profile row exists before patching
  await getAdminClient()
    .from(TABLES.PROFILES)
    .upsert({ [COLS.ID]: session.user.id }, { onConflict: COLS.ID, ignoreDuplicates: true });

  const patch: Record<string, unknown> = {
    id:         session.user.id,
    updated_at: new Date().toISOString(),
  };

  if (typeof body.name === "string")            patch[COLS.NAME]             = body.name.trim();
  if (typeof body.primary_goal === "string")    patch[COLS.PRIMARY_GOAL]     = body.primary_goal;
  if (typeof body.onboarding_step === "string") patch[COLS.ONBOARDING_STEP]  = body.onboarding_step;
  if (typeof body.age === "number")             patch[COLS.AGE]              = body.age;
  if (typeof body.gender === "string")          patch[COLS.GENDER]           = body.gender;
  if (Array.isArray(body.current_injuries))     patch[COLS.CURRENT_INJURIES] = body.current_injuries;
  if (Array.isArray(body.medications))          patch[COLS.MEDICATIONS]      = body.medications;
  if (Array.isArray(body.health_conditions))    patch[COLS.CONDITIONS]       = body.health_conditions;

  await getAdminClient()
    .from(TABLES.PROFILES)
    .upsert(patch, { onConflict: COLS.ID });

  return Response.json({ ok: true });
}

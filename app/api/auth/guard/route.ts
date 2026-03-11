/// app/api/auth/guard/route.ts
// Internal-only route called by middleware to check onboarding + consent state.
// Protected by X-Guard-Secret header — never exposed to clients.
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES } from "@/lib/db/schema";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // ── Internal auth — verify this is called by our own middleware ──────────────
  const guardSecret = process.env.INTERNAL_GUARD_SECRET;
  if (!guardSecret || req.headers.get("x-guard-secret") !== guardSecret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  const db = getAdminClient();

  const [profileRes, userRes, consentRes] = await Promise.all([
    db
      .from(TABLES.PROFILES)
      .select("onboarding_step")
      .eq("id", userId)
      .maybeSingle(),
    db
      .from(TABLES.USERS)
      .select("onboarding_goals")
      .eq("id", userId)
      .maybeSingle(),
    db
      .from(TABLES.CONSENT_RECORDS)
      .select("id")
      .eq("user_id", userId)
      .eq("is_current", true)
      .limit(1),
  ]);

  const profile    = profileRes.data;
  const userRow    = userRes.data;
  const hasConsent = (consentRes.data?.length ?? 0) > 0;

  const step     = (profile?.onboarding_step as string | null) ?? null;
  const hasGoals = Array.isArray(userRow?.onboarding_goals) &&
                   (userRow!.onboarding_goals as unknown[]).length > 0;

  // ── Onboarding guards ────────────────────────────────────────────────────────
  if (step === "name" || (!profile && !hasGoals)) {
    return NextResponse.json({ redirect: "/onboarding/name" });
  }
  if (step === "goal") {
    return NextResponse.json({ redirect: "/onboarding/goal" });
  }
  if (!hasGoals && step !== "data") {
    return NextResponse.json({ redirect: "/app/biomarkers" });
  }

  // ── Consent guard ────────────────────────────────────────────────────────────
  const onboardingComplete = hasGoals && step !== "name" && step !== "goal";
  if (onboardingComplete && !hasConsent) {
    return NextResponse.json({ redirect: "/onboarding/consent" });
  }

  return NextResponse.json({ redirect: null });
}

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

  const [profileRes, consentRes] = await Promise.all([
    db
      .from(TABLES.PROFILES)
      .select("onboarding_step")
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
  const hasConsent = (consentRes.data?.length ?? 0) > 0;
  const step       = (profile?.onboarding_step as string | null) ?? null;

  // Fully onboarded: profile has step="data" AND user has given consent.
  // All other states (no profile, step="name"/"goal", no consent) are routed
  // to the onboarding orchestrator which handles all steps including consent.
  const isFullyOnboarded = step === "data" && hasConsent;

  if (!isFullyOnboarded) {
    return NextResponse.json({ redirect: "/app/onboarding" });
  }

  return NextResponse.json({ redirect: null });
}

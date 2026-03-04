/// app/api/oauth/oura/callback/route.ts
// Handles Oura Ring OAuth callback: exchanges code → stores tokens → fetches + persists data.
// Env vars required: OURA_CLIENT_ID, OURA_CLIENT_SECRET, NEXTAUTH_URL
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const TOKEN_URL = "https://api.ouraring.com/oauth/token";
const API_BASE  = "https://api.ouraring.com/v2/usercollection";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.redirect(new URL("/auth/signin", req.url));

  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/app/onboarding?step=2&oura=error", req.url));
  }

  try {
    const decoded = JSON.parse(Buffer.from(state ?? "", "base64url").toString());
    if (decoded.userId !== session.user.id) throw new Error("State mismatch");
  } catch {
    return NextResponse.redirect(new URL("/app/onboarding?step=2&oura=error", req.url));
  }

  const clientId     = process.env.OURA_CLIENT_ID!;
  const clientSecret = process.env.OURA_CLIENT_SECRET!;
  const redirectUri  = `${process.env.NEXTAUTH_URL}/api/oauth/oura/callback`;

  try {
    // 1. Exchange code for tokens
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`);
    const tokens = await tokenRes.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type: string;
    };

    const expiresAt = Math.floor(Date.now() / 1000) + (tokens.expires_in ?? 86400);
    const supabase  = getAdminClient();

    // 2. Store tokens
    await supabase.from(TABLES.WEARABLE_CONNECTIONS).upsert({
      user_id:       session.user.id,
      provider:      "oura",
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at:    expiresAt,
      raw_data:      tokens,
    }, { onConflict: "user_id,provider" });

    // 3. Fetch recent Oura data (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString().slice(0, 10);
    const today        = new Date().toISOString().slice(0, 10);

    const [readinessRes, sleepRes] = await Promise.all([
      fetch(`${API_BASE}/daily_readiness?start_date=${sevenDaysAgo}&end_date=${today}`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }),
      fetch(`${API_BASE}/daily_sleep?start_date=${sevenDaysAgo}&end_date=${today}`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }),
    ]);

    const readinessData = readinessRes.ok ? await readinessRes.json() : null;
    const sleepData     = sleepRes.ok     ? await sleepRes.json()     : null;

    // 4. Normalize and upsert wearable snapshots
    interface OuraReadiness { day: string; score: number; contributors?: Record<string, number> }
    interface OuraSleep { day: string; score: number; total_sleep_duration?: number; deep_sleep_duration?: number; rem_sleep_duration?: number; average_hrv?: number; lowest_heart_rate?: number }

    const readinessItems: OuraReadiness[] = readinessData?.data ?? [];
    const sleepMap = new Map<string, OuraSleep>(
      (sleepData?.data ?? []).map((s: OuraSleep) => [s.day, s])
    );

    const snapshots = readinessItems.map((r) => {
      const sleep = sleepMap.get(r.day);
      return {
        user_id:         session.user.id,
        source:          "oura",
        date:            r.day,
        readiness_score: r.score ?? null,
        sleep_score:     sleep?.score ?? null,
        hrv:             sleep?.average_hrv ?? null,
        resting_hr:      sleep?.lowest_heart_rate ?? null,
        deep_sleep_min:  sleep?.deep_sleep_duration ? Math.round(sleep.deep_sleep_duration / 60) : null,
        rem_sleep_min:   sleep?.rem_sleep_duration  ? Math.round(sleep.rem_sleep_duration  / 60) : null,
        recovery_score:  r.score ?? null,  // Oura readiness ≈ recovery
        strain_score:    null,
        steps:           null,
        active_calories: null,
        raw_data:        { readiness: r, sleep },
      };
    });

    if (snapshots.length > 0) {
      await supabase.from(TABLES.WEARABLE_SNAPSHOTS).upsert(snapshots, {
        onConflict: "user_id,source,date",
        ignoreDuplicates: false,
      });
    }

    return NextResponse.redirect(new URL("/app/onboarding?step=2&oura=connected", req.url));
  } catch (err) {
    console.error("[Oura callback error]", err);
    return NextResponse.redirect(new URL("/app/onboarding?step=2&oura=error", req.url));
  }
}

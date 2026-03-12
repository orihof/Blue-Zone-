/// app/api/oauth/whoop/callback/route.ts
// Handles WHOOP OAuth callback: exchanges code → stores tokens → fetches + persists wearable data.
// Env vars required: WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET, NEXTAUTH_URL
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const API_BASE  = "https://api.prod.whoop.com/developer/v1";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.redirect(new URL("/auth/signin", req.url));

  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/app/onboarding?step=5&whoop=error", req.url));
  }

  // Verify state (basic CSRF check)
  try {
    const decoded = JSON.parse(Buffer.from(state ?? "", "base64url").toString());
    if (decoded.userId !== session.user.id) throw new Error("State mismatch");
  } catch {
    return NextResponse.redirect(new URL("/app/onboarding?step=5&whoop=error", req.url));
  }

  const clientId     = process.env.WHOOP_CLIENT_ID!;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET!;
  const redirectUri  = `${process.env.NEXTAUTH_URL}/api/oauth/whoop/callback`;

  try {
    // 1. Exchange code for tokens
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`);
    const tokens = await tokenRes.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      scope: string;
    };

    const expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in;
    const supabase  = getAdminClient();

    // 2. Store tokens in wearable_connections (upsert)
    await supabase.from(TABLES.WEARABLE_CONNECTIONS).upsert({
      user_id:       session.user.id,
      provider:      "whoop",
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at:    expiresAt,
      scope:         tokens.scope,
      raw_data:      tokens,
    }, { onConflict: "user_id,provider" });

    // 3. Fetch recent WHOOP recovery data (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
    const [recoveryRes, sleepRes] = await Promise.all([
      fetch(`${API_BASE}/recovery?start=${sevenDaysAgo}&limit=7`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }),
      fetch(`${API_BASE}/sleep?start=${sevenDaysAgo}&limit=7`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }),
    ]);

    const recoveryData = recoveryRes.ok ? await recoveryRes.json() : null;
    const sleepData    = sleepRes.ok    ? await sleepRes.json()    : null;

    // 4. Normalize and upsert wearable snapshots
    const records = recoveryData?.records ?? [];
    const sleepMap = new Map<string, Record<string, unknown>>(
      (sleepData?.records ?? []).map((s: Record<string, unknown>) => [
        (s.start as string)?.slice(0, 10),
        s,
      ])
    );

    const snapshots = records.map((r: Record<string, unknown>) => {
      const date = (r.created_at as string)?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
      const sleep = sleepMap.get(date) as Record<string, unknown> | undefined;
      const scoreData = r.score as Record<string, unknown> | null;
      const sleepScore = sleep?.score as Record<string, unknown> | null;

      return {
        user_id:         session.user.id,
        source:          "whoop",
        date,
        hrv:             scoreData?.hrv_rmssd_milli ? Number(scoreData.hrv_rmssd_milli) : null,
        resting_hr:      scoreData?.resting_heart_rate ? Number(scoreData.resting_heart_rate) : null,
        recovery_score:  scoreData?.recovery_score ? Number(scoreData.recovery_score) : null,
        sleep_score:     sleepScore?.stage_summary
          ? Math.round(((sleepScore.stage_summary as Record<string, unknown>).total_in_bed_time_milli as number ?? 0) / 86400 / 10)
          : null,
        deep_sleep_min:  sleepScore?.stage_summary
          ? Math.round(((sleepScore.stage_summary as Record<string, unknown>).total_slow_wave_sleep_time_milli as number ?? 0) / 60000)
          : null,
        rem_sleep_min:   sleepScore?.stage_summary
          ? Math.round(((sleepScore.stage_summary as Record<string, unknown>).total_rem_sleep_time_milli as number ?? 0) / 60000)
          : null,
        strain_score:    null,
        readiness_score: null,
        steps:           null,
        active_calories: null,
        raw_data:        { recovery: r, sleep },
      };
    });

    if (snapshots.length > 0) {
      await supabase.from(TABLES.WEARABLE_SNAPSHOTS).upsert(snapshots, {
        onConflict: "user_id,source,date",
        ignoreDuplicates: false,
      });
    }

    return NextResponse.redirect(new URL("/app/onboarding?step=5&whoop=connected", req.url));
  } catch (err) {
    console.error("[WHOOP callback error]", err);
    return NextResponse.redirect(new URL("/app/onboarding?step=5&whoop=error", req.url));
  }
}

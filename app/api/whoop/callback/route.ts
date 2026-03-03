import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase-server";
import type { WhoopTokens, WhoopRecoveryEntry, WhoopSleepEntry } from "@/types";

export const runtime = "nodejs";

const WHOOP_CLIENT_ID = process.env.WHOOP_CLIENT_ID!;
const WHOOP_CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.NEXTAUTH_URL}/api/whoop/callback`;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/dashboard?whoop_error=${error ?? "no_code"}`, req.url)
    );
  }

  // Exchange code for tokens
  let tokens: WhoopTokens;
  try {
    const tokenRes = await fetch(
      "https://api.prod.whoop.com/oauth/oauth2/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: WHOOP_CLIENT_ID,
          client_secret: WHOOP_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
        }),
      }
    );
    if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`);
    tokens = await tokenRes.json();
  } catch (err) {
    console.error("WHOOP token exchange error:", err);
    return NextResponse.redirect(
      new URL("/dashboard?whoop_error=token_exchange_failed", req.url)
    );
  }

  // Fetch last 30 days of recovery data
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startDate = thirtyDaysAgo.toISOString().split("T")[0];

  let recoveryData: WhoopRecoveryEntry[] = [];
  let sleepData: WhoopSleepEntry[] = [];

  try {
    const [recoveryRes, sleepRes] = await Promise.all([
      fetch(
        `https://api.prod.whoop.com/developer/v1/recovery?start=${startDate}`,
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
      ),
      fetch(
        `https://api.prod.whoop.com/developer/v1/activity/sleep?start=${startDate}`,
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
      ),
    ]);

    if (recoveryRes.ok) {
      const recoveryJson = await recoveryRes.json();
      recoveryData = recoveryJson.records ?? [];
    }
    if (sleepRes.ok) {
      const sleepJson = await sleepRes.json();
      sleepData = sleepJson.records ?? [];
    }
  } catch (err) {
    console.error("WHOOP data fetch error:", err);
  }

  // Save as a health_snapshot
  const supabase = createServiceRoleClient();
  await supabase.from("health_snapshots").insert({
    user_id: session.user.id,
    source: "whoop",
    raw_file_url: null,
    parsed_data: {
      whoop: {
        recovery: recoveryData,
        sleep: sleepData,
      },
    },
  });

  return NextResponse.redirect(new URL("/dashboard?whoop_connected=true", req.url));
}

// Redirect user to WHOOP authorization page
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const whoopAuthUrl = new URL(
    "https://api.prod.whoop.com/oauth/oauth2/auth"
  );
  whoopAuthUrl.searchParams.set("client_id", WHOOP_CLIENT_ID);
  whoopAuthUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  whoopAuthUrl.searchParams.set("response_type", "code");
  whoopAuthUrl.searchParams.set(
    "scope",
    "read:recovery read:sleep read:workout read:body_measurement"
  );

  return NextResponse.json({ redirect_url: whoopAuthUrl.toString() });
}

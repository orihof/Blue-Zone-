/// app/api/wearables/samsung/ingest/route.ts
// POST — receive parsed Samsung Health metrics and upsert into wearable_snapshots.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import type { SamsungHealthSummary } from "@/lib/wearables/samsung-health-parser";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const body: SamsungHealthSummary | null = await req.json().catch(() => null);
  if (!body?.date) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const supabase = getAdminClient();

  const { error } = await supabase
    .from(TABLES.WEARABLE_SNAPSHOTS)
    .upsert(
      {
        [COLS.USER_ID]:             session.user.id,
        [COLS.SOURCE]:              "samsung_health",
        [COLS.DATE]:                body.date,
        [COLS.RECORDED_AT]:         new Date().toISOString(),
        [COLS.HEART_RATE_RESTING]:  body.heartRateResting  ?? null,
        [COLS.HEART_RATE_AVG]:      body.heartRateAvg      ?? null,
        [COLS.HEART_RATE_MAX]:      body.heartRateMax      ?? null,
        [COLS.HRV_RMSSD]:           body.hrvRmssd          ?? null,
        [COLS.SLEEP_TOTAL_MINUTES]: body.sleepTotalMinutes ?? null,
        [COLS.SLEEP_REM_MINUTES]:   body.sleepRemMinutes   ?? null,
        [COLS.SLEEP_DEEP_MINUTES]:  body.sleepDeepMinutes  ?? null,
        [COLS.SLEEP_LIGHT_MINUTES]: body.sleepLightMinutes ?? null,
        [COLS.SPO2]:                body.spo2              ?? null,
        [COLS.STEPS]:               body.steps             ?? null,
        [COLS.ACTIVE_CALORIES]:     body.activeCalories    ?? null,
      },
      { onConflict: "user_id,source,date" }
    );

  if (error) {
    console.error("[samsung/ingest] DB error:", error.message);
    return NextResponse.json({ error: "Failed to save data" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

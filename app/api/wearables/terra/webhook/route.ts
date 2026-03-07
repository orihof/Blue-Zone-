/// app/api/wearables/terra/webhook/route.ts
// Receives Terra webhook events for Samsung Galaxy Watch data.
// Verifies HMAC-SHA256 signature, then upserts into wearable_snapshots.

import crypto from "crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";

export const runtime = "nodejs";

// ── Terra payload types (all fields optional — availability varies by device) ──

interface TerraUser {
  user_id:      string;   // Terra's internal user ID
  reference_id?: string;  // Our supabase user_id (set during widget session)
}

interface TerraHRSummary {
  avg_hr_bpm?:    number;
  resting_hr_bpm?: number;
  max_hr_bpm?:    number;
  hrv_rmssd_data?: { avg?: number };
}

interface TerraDaily {
  metadata?:        { start_time?: string };
  heart_rate_data?: { summary?: TerraHRSummary };
  oxygen_data?:     { avg_saturation_percentage?: number };
  stress_data?:     { stress_duration_data?: { stress_score?: number } };
  distance_data?:   { steps?: number };
  calories_data?:   { net_activity_calories?: number };
}

interface TerraSleep {
  metadata?: { start_time?: string };
  sleep_durations_data?: {
    sleep_quality_score?: number;
    asleep?: {
      duration_asleep_state_seconds?:      number;
      duration_REM_sleep_state_seconds?:   number;
      duration_deep_sleep_state_seconds?:  number;
      duration_light_sleep_state_seconds?: number;
    };
  };
}

interface TerraActivity {
  metadata?:      { start_time?: string };
  distance_data?: { steps?: number };
  calories_data?: { net_activity_calories?: number };
  vo2max_data?:   { vo2max_ml_per_min_per_kg?: number };
}

interface TerraPayload {
  type:  string;
  user?: TerraUser;
  data?: (TerraDaily & TerraSleep & TerraActivity)[];
}

// ── Signature verification ─────────────────────────────────────────────────────

function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;

  // Format: "t=<timestamp>,v1=<hex_hmac>"
  const parts: Record<string, string> = {};
  for (const segment of header.split(",")) {
    const eqIdx = segment.indexOf("=");
    if (eqIdx !== -1) parts[segment.slice(0, eqIdx)] = segment.slice(eqIdx + 1);
  }

  const timestamp   = parts["t"];
  const receivedSig = parts["v1"];
  if (!timestamp || !receivedSig) return false;

  const signed   = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(signed).digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected,     "hex"),
      Buffer.from(receivedSig,  "hex"),
    );
  } catch {
    return false; // buffer length mismatch → invalid sig
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function toDate(iso?: string): string {
  return iso ? new Date(iso).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
}

function toMin(seconds?: number): number | null {
  return seconds != null ? Math.round(seconds / 60) : null;
}

// Resolve supabase user_id from Terra payload.
// Prefers reference_id (set during widget session), falls back to terra_user_id lookup.
async function resolveUserId(
  supabase: ReturnType<typeof getAdminClient>,
  terraUser?: TerraUser,
): Promise<string | null> {
  if (!terraUser) return null;

  if (terraUser.reference_id) return terraUser.reference_id;

  if (terraUser.user_id) {
    const { data } = await supabase
      .from(TABLES.PROFILES)
      .select(COLS.ID)
      .eq(COLS.TERRA_USER_ID, terraUser.user_id)
      .maybeSingle();
    return (data as { id?: string } | null)?.id ?? null;
  }

  return null;
}

// ── Main handler ───────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const secret = process.env.TERRA_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[terra/webhook] TERRA_WEBHOOK_SECRET not set");
    return new Response("Server misconfiguration", { status: 500 });
  }

  const rawBody = await req.text();
  const sigHeader = req.headers.get("terra-signature");

  if (!verifySignature(rawBody, sigHeader, secret)) {
    console.warn("[terra/webhook] Signature verification failed");
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: TerraPayload;
  try {
    payload = JSON.parse(rawBody) as TerraPayload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const supabase  = getAdminClient();
  const eventType = payload.type;

  // ── auth: save terra_user_id to profiles ───────────────────────────────────
  if (eventType === "auth") {
    const terraUserId     = payload.user?.user_id;
    const supabaseUserId  = payload.user?.reference_id;

    if (terraUserId && supabaseUserId) {
      await supabase
        .from(TABLES.PROFILES)
        .update({ [COLS.TERRA_USER_ID]: terraUserId })
        .eq(COLS.ID, supabaseUserId);

      console.log("[terra/webhook] auth: saved terra_user_id for user", supabaseUserId);
    }

    return new Response("OK", { status: 200 });
  }

  // ── data events: resolve user, then upsert ─────────────────────────────────
  const supabaseUserId = await resolveUserId(supabase, payload.user);
  if (!supabaseUserId) {
    console.warn("[terra/webhook] Could not resolve user for event:", eventType, payload.user);
    return new Response("OK", { status: 200 }); // ack but skip — don't 4xx Terra
  }

  const items = payload.data ?? [];

  for (const item of items) {
    const startTime = item.metadata?.start_time;
    const date      = toDate(startTime);

    const baseRow = {
      [COLS.USER_ID]:    supabaseUserId,
      [COLS.SOURCE]:     "samsung_galaxy_watch",
      [COLS.DATE]:       date,
      [COLS.RECORDED_AT]: startTime ?? new Date().toISOString(),
      [COLS.RAW_PAYLOAD]: item,
    };

    if (eventType === "daily") {
      const hr = item.heart_rate_data?.summary;
      await supabase
        .from(TABLES.WEARABLE_SNAPSHOTS)
        .upsert({
          ...baseRow,
          [COLS.HEART_RATE_AVG]:    hr?.avg_hr_bpm    ?? null,
          [COLS.HEART_RATE_RESTING]: hr?.resting_hr_bpm ?? null,
          [COLS.HEART_RATE_MAX]:    hr?.max_hr_bpm    ?? null,
          [COLS.HRV_RMSSD]:        hr?.hrv_rmssd_data?.avg ?? null,
          [COLS.SPO2]:             item.oxygen_data?.avg_saturation_percentage ?? null,
          [COLS.STRESS_SCORE]:     item.stress_data?.stress_duration_data?.stress_score ?? null,
          [COLS.STEPS]:            item.distance_data?.steps ?? null,
          [COLS.ACTIVE_CALORIES]:  item.calories_data?.net_activity_calories ?? null,
        }, { onConflict: "user_id,source,date" });

    } else if (eventType === "sleep") {
      const durations = item.sleep_durations_data;
      const asleep    = durations?.asleep;
      await supabase
        .from(TABLES.WEARABLE_SNAPSHOTS)
        .upsert({
          ...baseRow,
          [COLS.SLEEP_SCORE]:         durations?.sleep_quality_score ?? null,
          [COLS.SLEEP_TOTAL_MINUTES]: toMin(asleep?.duration_asleep_state_seconds),
          [COLS.SLEEP_REM_MINUTES]:   toMin(asleep?.duration_REM_sleep_state_seconds),
          [COLS.SLEEP_DEEP_MINUTES]:  toMin(asleep?.duration_deep_sleep_state_seconds),
          [COLS.SLEEP_LIGHT_MINUTES]: toMin(asleep?.duration_light_sleep_state_seconds),
        }, { onConflict: "user_id,source,date" });

    } else if (eventType === "activity") {
      await supabase
        .from(TABLES.WEARABLE_SNAPSHOTS)
        .upsert({
          ...baseRow,
          [COLS.STEPS]:           item.distance_data?.steps ?? null,
          [COLS.ACTIVE_CALORIES]: item.calories_data?.net_activity_calories ?? null,
          [COLS.VO2_MAX]:         item.vo2max_data?.vo2max_ml_per_min_per_kg ?? null,
        }, { onConflict: "user_id,source,date" });

    } else {
      console.log("[terra/webhook] Unhandled event type:", eventType);
    }
  }

  return new Response("OK", { status: 200 });
}

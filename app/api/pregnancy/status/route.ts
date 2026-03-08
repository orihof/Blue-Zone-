/// app/api/pregnancy/status/route.ts
// GET  /api/pregnancy/status — read current pregnancy_status
// POST /api/pregnancy/status — update pregnancy_status + log event

import { getServerSession }  from "next-auth";
import { authOptions }       from "@/lib/auth";
import { getAdminClient }    from "@/lib/supabase/admin";
import { TABLES, COLS }      from "@/lib/db/schema";
import { requireConsent }    from "@/middleware/requireConsent";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const VALID_STATUSES = [
  "not_pregnant",
  "trying_to_conceive",
  "first_trimester",
  "second_trimester",
  "third_trimester",
  "postpartum_0_3mo",
  "postpartum_3_6mo",
  "breastfeeding",
] as const;

// ── GET /api/pregnancy/status ─────────────────────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminClient();
  const { data, error } = await db
    .from(TABLES.USER_HEALTH_CONTEXT)
    .select("pregnancy_status, pregnancy_status_updated_at")
    .eq(COLS.USER_ID, session.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    pregnancy_status:            data?.pregnancy_status            ?? null,
    pregnancy_status_updated_at: data?.pregnancy_status_updated_at ?? null,
  });
}

// ── POST /api/pregnancy/status ────────────────────────────────────────────────

export const POST = requireConsent(1)(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const status: unknown = body?.status;

  if (
    typeof status !== "string" ||
    !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])
  ) {
    return NextResponse.json(
      { error: "Invalid status. Must be one of: " + VALID_STATUSES.join(", ") },
      { status: 400 },
    );
  }

  const userId = session.user.id as string;
  const db     = getAdminClient();
  const now    = new Date().toISOString();

  // 1. Update pregnancy_status on user_health_context
  const { error: updateErr } = await db
    .from(TABLES.USER_HEALTH_CONTEXT)
    .update({
      pregnancy_status:            status,
      pregnancy_status_updated_at: now,
    })
    .eq(COLS.USER_ID, userId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // 2. Log status change to notification_log
  const { error: logErr } = await db
    .from(TABLES.NOTIFICATION_LOG)
    .insert({
      [COLS.USER_ID]:  userId,
      trigger_type:    "PREGNANCY_STATUS_CHANGED",
      urgency:         2,
      [COLS.PAYLOAD]:  { pregnancy_status: status },
      sent_at:         now,
    });

  if (logErr) {
    // Non-fatal — log but don't fail the request
    console.error("[pregnancy/status] notification log error:", logErr.message);
  }

  return NextResponse.json({ status_set: status });
});

/// app/api/critical-values/acknowledge/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { acknowledgeGate } from "@/lib/critical-values";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await req.json();
  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).eventId !== "string" ||
    !["provider_seen", "provider_contacted", "dismiss"].includes(
      (body as Record<string, unknown>).acknowledgement as string
    )
  ) {
    return NextResponse.json(
      { error: "Missing or invalid fields: eventId, acknowledgement" },
      { status: 400 }
    );
  }

  const { eventId, acknowledgement } = body as {
    eventId: string;
    acknowledgement: "provider_seen" | "provider_contacted" | "dismiss";
  };

  try {
    await acknowledgeGate(session.user.id, eventId, acknowledgement);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }

  // Check whether the gate is now fully lifted
  const db = getAdminClient();
  const { data: context } = await db
    .from(TABLES.USER_HEALTH_CONTEXT)
    .select("protocol_gated_reason, protocol_gate_acknowledged")
    .eq(COLS.USER_ID, session.user.id)
    .single();

  const allAcknowledged = context?.protocol_gate_acknowledged === true;
  const protocolResuming = allAcknowledged && context?.protocol_gated_reason !== null;

  return NextResponse.json({ all_acknowledged: allAcknowledged, protocol_resuming: protocolResuming });
}

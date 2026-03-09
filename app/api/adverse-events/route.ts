/// app/api/adverse-events/route.ts
// POST /api/adverse-events — submit an adverse event report.

import { getServerSession }        from "next-auth";
import { authOptions }             from "@/lib/auth";
import { getAdminClient }          from "@/lib/supabase/admin";
import { TABLES }                  from "@/lib/db/schema";
import { NextRequest, NextResponse } from "next/server";
import {
  submitAdverseEvent,
  shouldSuppressProduct,
  type AdverseEventInput,
} from "@/lib/adverse-events";

// Valid severity values matching the DB CHECK constraint.
const VALID_SEVERITIES = ["mild", "moderate", "significant"] as const;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const body: Partial<AdverseEventInput> | null = await req.json().catch(() => null);

  if (
    !body ||
    typeof body.product_id !== "string" ||
    typeof body.symptom_description !== "string" || !body.symptom_description.trim() ||
    !VALID_SEVERITIES.includes(body.severity as (typeof VALID_SEVERITIES)[number])
  ) {
    return NextResponse.json(
      { error: "product_id, symptom_description, and severity (mild|moderate|significant) are required" },
      { status: 400 },
    );
  }

  const input = body as AdverseEventInput;

  try {
    await submitAdverseEvent(userId, input);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[adverse-events/POST]", msg);
    return NextResponse.json({ error: "Failed to save adverse event report" }, { status: 500 });
  }

  // Check suppression and optionally remove from active protocol snapshot.
  let productSuppressed = false;
  try {
    productSuppressed = await shouldSuppressProduct(input.product_id, userId);
  } catch (err) {
    console.error("[adverse-events/POST] shouldSuppressProduct failed:", err);
  }

  if (productSuppressed) {
    try {
      const supabase = getAdminClient();

      // Fetch the user's active protocol snapshot.
      const { data: snapshot } = await supabase
        .from(TABLES.PROTOCOL_SNAPSHOTS)
        .select("id, product_ids")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (snapshot) {
        const currentIds = (snapshot.product_ids ?? []) as string[];
        const updatedIds  = currentIds.filter((id) => id !== input.product_id);

        await supabase
          .from(TABLES.PROTOCOL_SNAPSHOTS)
          .update({ product_ids: updatedIds })
          .eq("id", snapshot.id as string);
      }
    } catch (err) {
      // Non-fatal — still return suppressed=true so the client can react.
      console.error("[adverse-events/POST] snapshot update failed:", err);
    }
  }

  return NextResponse.json({
    report_saved:       true,
    product_suppressed: productSuppressed,
  });
}

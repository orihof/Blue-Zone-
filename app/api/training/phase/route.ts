/// app/api/training/phase/route.ts
import { getServerSession }   from "next-auth";
import { authOptions }        from "@/lib/auth";
import { getAdminClient }     from "@/lib/supabase/admin";
import { TABLES, COLS }       from "@/lib/db/schema";
import { getEffectiveTrainingPhase } from "@/lib/training-phase-detector";
import { NextRequest, NextResponse } from "next/server";
import { requireConsent }     from "@/middleware/requireConsent";

export const runtime = "nodejs";

// ----------------------------------------------------------------
// GET /api/training/phase
// Returns the user's effective training phase and its raw sources.
// ----------------------------------------------------------------

export const GET = requireConsent(1)(async (_req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId   = session.user.id as string;
  const supabase = getAdminClient();

  // Load phase columns from user_health_context
  const { data: rawCtx, error } = await supabase
    .from(TABLES.USER_HEALTH_CONTEXT)
    .select(
      "training_phase, training_phase_updated_at, " +
      "auto_detected_training_phase, auto_phase_confidence, auto_phase_computed_at",
    )
    .eq(COLS.USER_ID, userId)
    .maybeSingle();

  if (error) {
    console.error("[training/phase] DB error:", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  type CtxRow = {
    training_phase:               string | null;
    auto_detected_training_phase: string | null;
    auto_phase_confidence:        number | null;
    auto_phase_computed_at:       string | null;
  };
  const ctx = rawCtx as CtxRow | null;

  // effective_phase: manual takes precedence over auto-detected
  const effectivePhase = await getEffectiveTrainingPhase(userId);

  return NextResponse.json({
    effective_phase:     effectivePhase,
    manual_phase:        ctx?.training_phase               ?? null,
    auto_detected_phase: ctx?.auto_detected_training_phase ?? null,
    confidence:          ctx?.auto_phase_confidence != null
                           ? Number(ctx.auto_phase_confidence)
                           : null,
    detected_at:         ctx?.auto_phase_computed_at       ?? null,
  });
});

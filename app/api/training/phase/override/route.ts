/// app/api/training/phase/override/route.ts
import { getServerSession }   from "next-auth";
import { authOptions }        from "@/lib/auth";
import { getAdminClient }     from "@/lib/supabase/admin";
import { TABLES, COLS }       from "@/lib/db/schema";
import type { TrainingPhase } from "@/lib/training-phase-detector";
import { NextRequest, NextResponse } from "next/server";
import { requireConsent }     from "@/middleware/requireConsent";

export const runtime = "nodejs";

const VALID_PHASES: TrainingPhase[] = [
  "base", "build", "peak", "taper", "recovery", "offseason",
];

// ----------------------------------------------------------------
// POST /api/training/phase/override
// Body: { phase: TrainingPhase }
// Persists a manual training phase to user_health_context.
// ----------------------------------------------------------------

export const POST = requireConsent(1)(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id as string;

  const body = await req.json().catch(() => null);
  const { phase } = body ?? {};

  if (!VALID_PHASES.includes(phase)) {
    return NextResponse.json(
      { error: `Invalid phase. Must be one of: ${VALID_PHASES.join(", ")}` },
      { status: 400 },
    );
  }

  const supabase = getAdminClient();

  const { error } = await supabase
    .from(TABLES.USER_HEALTH_CONTEXT)
    .update({
      training_phase:            phase,
      training_phase_updated_at: new Date().toISOString(),
    })
    .eq(COLS.USER_ID, userId);

  if (error) {
    console.error("[training/phase/override] DB error:", error.message);
    return NextResponse.json({ error: "Failed to set training phase" }, { status: 500 });
  }

  return NextResponse.json({ phase_set: phase });
});

/// app/api/training/phase/detect/route.ts
import { getServerSession }   from "next-auth";
import { authOptions }        from "@/lib/auth";
import {
  detectTrainingPhase,
  savePhaseDetection,
} from "@/lib/training-phase-detector";
import { NextRequest, NextResponse } from "next/server";
import { requireConsent }     from "@/middleware/requireConsent";

export const runtime     = "nodejs";
export const maxDuration = 30;

// ----------------------------------------------------------------
// POST /api/training/phase/detect
// Triggers a fresh detection run and persists the result.
// Returns the full TrainingPhaseDetection object.
// ----------------------------------------------------------------

export const POST = requireConsent(1)(async (_req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id as string;

  let detection: Awaited<ReturnType<typeof detectTrainingPhase>>;
  try {
    detection = await detectTrainingPhase(userId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[training/phase/detect] detection error:", msg);
    return NextResponse.json({ error: "Phase detection failed", detail: msg }, { status: 500 });
  }

  try {
    await savePhaseDetection(userId, detection);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[training/phase/detect] save error:", msg);
    return NextResponse.json({ error: "Failed to save detection", detail: msg }, { status: 500 });
  }

  return NextResponse.json(detection);
});

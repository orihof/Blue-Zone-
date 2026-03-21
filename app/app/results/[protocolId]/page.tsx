/// app/(app)/results/[protocolId]/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { ProcessingSteps } from "@/components/results/ProcessingSteps";
import { ResultsPage } from "@/components/results/ResultsPage";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { ProtocolPayload } from "@/lib/db/payload";
import type { Goal, BudgetTier, Preferences } from "@/lib/recommendations/generate";
import { C } from "@/components/ui/tokens";
import { getNutrientPairsForProtocol, applyCompetitionRules } from "@/lib/nutrient-competition";
import type { CompetitionResult } from "@/lib/nutrient-competition";

interface Protocol {
  id: string;
  selected_age: number;
  goals: Goal[];
  budget: BudgetTier;
  preferences: Preferences;
  payload: ProtocolPayload | null;
  mode: "demo" | "personal";
  status: "pending" | "processing" | "ready" | "failed";
  created_at: string;
}

interface PageProps {
  params: { protocolId: string };
}

export default async function ResultsServerPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from(TABLES.PROTOCOLS)
    .select("*")
    .eq(COLS.ID, params.protocolId)
    .eq(COLS.USER_ID, session.user.id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const protocol = data as Protocol;

  // ── Processing / pending states ──────────────────────────────────────────
  if (protocol.status === "processing" || protocol.status === "pending") {
    return <ProcessingSteps protocolId={protocol.id} />;
  }

  // ── Failed state ─────────────────────────────────────────────────────────
  if (protocol.status === "failed" || !protocol.payload) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--void)" }}>
        <div className="text-center space-y-4 max-w-sm">
          <AlertTriangle className="w-10 h-10 mx-auto" style={{ color: C.plasma }} />
          <p className="font-light text-xl" style={{ fontFamily: "var(--font-serif)", color: C.stellar }}>
            Protocol generation failed
          </p>
          <p className="text-sm" style={{ color: C.dust }}>
            Something went wrong. Please try again.
          </p>
          <Link href="/app/onboarding/dial">
            <button
              className="border rounded-lg px-4 py-2 text-sm font-medium mt-2"
              style={{ borderColor: "rgba(0,138,255,0.30)", color: C.cerulean }}
            >
              Try again
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Ready: fetch supplementary context in parallel ───────────────────────

  const payload = protocol.payload as ProtocolPayload;

  // 1. Pregnancy status — from user_health_context
  const { data: healthCtx } = await supabase
    .from(TABLES.USER_HEALTH_CONTEXT)
    .select("pregnancy_status")
    .eq(COLS.USER_ID, session.user.id)
    .maybeSingle();

  const pregnancyStatus = (healthCtx?.pregnancy_status as string | null) ?? "not_pregnant";

  // 2. Nutrient competition conflicts — derive categories from supplement IDs
  let competitionConflicts: CompetitionResult[] = [];
  try {
    const supplementIds = payload.recommendations.supplements.map((s) => s.id);
    if (supplementIds.length >= 2) {
      const rules   = await getNutrientPairsForProtocol(supplementIds);
      const products = supplementIds.map((id) => ({ supplement: id }));
      competitionConflicts = applyCompetitionRules(rules, products);
    }
  } catch {
    // Non-fatal — panel will not render if empty
  }

  // 3. Sports prep event data + profile name
  const [sportsProtocolRes, profileRes] = await Promise.all([
    supabase
      .from("sports_protocols")
      .select("competition_type, event_date, weeks_to_event")
      .eq("user_id", session.user.id)
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", session.user.id)
      .maybeSingle(),
  ]);

  const sportsPrep = sportsProtocolRes.data?.[0] ?? null;
  const userName = (profileRes.data?.display_name as string | null)
    ?? session.user.name?.split(" ")[0]
    ?? "Athlete";

  const daysToRace = sportsPrep?.event_date
    ? Math.max(0, Math.ceil((new Date(sportsPrep.event_date).getTime() - Date.now()) / 86_400_000))
    : null;

  // ── Render interactive client component ──────────────────────────────────
  return (
    <ResultsPage
      protocol={{
        id:           protocol.id,
        selected_age: protocol.selected_age,
        goals:        protocol.goals,
        budget:       protocol.budget,
        preferences:  protocol.preferences,
        mode:         protocol.mode,
        created_at:   protocol.created_at,
      }}
      payload={payload}
      pregnancyStatus={pregnancyStatus}
      competitionConflicts={competitionConflicts}
      userName={userName}
      daysToRace={daysToRace}
      competitionType={sportsPrep?.competition_type ?? null}
    />
  );
}

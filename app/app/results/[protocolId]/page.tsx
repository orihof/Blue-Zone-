/// app/(app)/results/[protocolId]/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { ResultsTabs } from "@/components/results/ResultsTabs";
import { Disclaimer } from "@/components/common/Disclaimer";
import { StepProgress } from "@/components/common/StepProgress";
import { BiologicalAgeHero } from "@/components/results/BiologicalAgeHero";
import { StackSafetyNotes } from "@/components/results/StackSafetyNotes";
import { StackBuilder } from "@/components/results/StackBuilder";
import { ProcessingSteps } from "@/components/results/ProcessingSteps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { RotateCcw, Target, Wallet, Leaf, Calendar, ChevronRight } from "lucide-react";
import type { ProtocolPayload } from "@/lib/db/payload";
import type { Goal, BudgetTier, Preferences } from "@/lib/recommendations/generate";

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

const GOAL_LABELS: Record<string, string> = {
  energy: "Energy",
  sleep: "Sleep",
  focus: "Focus",
  strength: "Strength",
  fat_loss: "Fat Loss",
  recovery: "Recovery",
  hormones: "Hormones",
  longevity: "Longevity",
};

const BUDGET_LABELS: Record<string, string> = {
  low: "Essentials",
  medium: "Optimized",
  high: "All-in",
};

const SCORE_META = [
  { key: "recovery" as const, label: "Recovery", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { key: "sleep" as const, label: "Sleep", color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  { key: "metabolic" as const, label: "Metabolic", color: "text-amber-600 bg-amber-50 border-amber-200" },
  { key: "readiness" as const, label: "Readiness", color: "text-sky-600 bg-sky-50 border-sky-200" },
];

export default async function ResultsPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from(TABLES.PROTOCOLS)
    .select("*")
    .eq(COLS.ID, params.protocolId)
    .eq(COLS.USER_ID, session.user.id)
    .maybeSingle();

  if (error || !data) notFound();

  const protocol = data as Protocol;

  // Show processing UI while protocol is being generated
  if (protocol.status === "processing" || protocol.status === "pending") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <StepProgress step={3} />
        <ProcessingSteps protocolId={protocol.id} />
      </div>
    );
  }

  // Show error state for failed protocols
  if (protocol.status === "failed" || !protocol.payload) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <StepProgress step={3} />
        <Card className="border border-red-200 bg-red-50">
          <CardContent className="py-8 text-center space-y-4">
            <p className="font-semibold text-red-800">Protocol generation failed</p>
            <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
            <Link href="/app/onboarding/dial">
              <Button size="sm" variant="outline" className="border-red-200 text-red-600">
                Try again
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const payload = protocol.payload as ProtocolPayload;

  const prefLabels = [
    protocol.preferences.vegan && "Vegan",
    protocol.preferences.caffeineFree && "Caffeine-free",
    protocol.preferences.noFishOil && "No fish oil",
  ].filter(Boolean) as string[];

  const dialParams = new URLSearchParams({
    age: String(protocol.selected_age),
    goals: protocol.goals.join(","),
    budget: protocol.budget,
    vegan: String(!!protocol.preferences.vegan),
    caffeineFree: String(!!protocol.preferences.caffeineFree),
    noFishOil: String(!!protocol.preferences.noFishOil),
  });

  const hasBioAge =
    payload.scores.biologicalAgeEstimate !== null &&
    payload.biologicalAgeNarrative !== null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <StepProgress step={3} />

      {/* Summary card */}
      <Card className="border border-slate-200">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-xl font-bold text-slate-900">Your Longevity Protocol</h1>
                {protocol.mode === "demo" && (
                  <Badge variant="secondary" className="text-xs">Demo data</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Generated based on your inputs. Discuss with your clinician before making changes.
              </p>
            </div>
            <Link href={`/app/onboarding/dial?${dialParams}`}>
              <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0">
                <RotateCcw className="w-3.5 h-3.5" /> Regenerate
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <Target className="w-4 h-4 text-primary flex-shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">Target age</div>
                <div className="text-sm font-semibold">{protocol.selected_age} years</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <Wallet className="w-4 h-4 text-primary flex-shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">Budget</div>
                <div className="text-sm font-semibold">{BUDGET_LABELS[protocol.budget]}</div>
              </div>
            </div>
            {prefLabels.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <Leaf className="w-4 h-4 text-primary flex-shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">Preferences</div>
                  <div className="text-sm font-semibold">{prefLabels.join(", ")}</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {protocol.goals.map((g) => (
              <Badge key={g} variant="secondary" className="text-xs">
                {GOAL_LABELS[g] ?? g}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Biological Age Hero */}
      {hasBioAge && (
        <BiologicalAgeHero
          biologicalAgeEstimate={payload.scores.biologicalAgeEstimate!}
          chronologicalAge={protocol.selected_age}
          narrative={payload.biologicalAgeNarrative!}
        />
      )}

      {/* Score cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SCORE_META.map(({ key, label, color }) => (
          <div key={key} className={`rounded-xl border px-4 py-3 text-center ${color}`}>
            <div className="text-2xl font-black">{payload.scores[key]}</div>
            <div className="text-xs font-medium mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      {payload.timeline.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-slate-800">Your Timeline</h2>
          </div>
          <div className="space-y-2">
            {payload.timeline.map((phase) => (
              <div key={phase.week} className="flex gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="flex-shrink-0 w-10 text-center">
                  <div className="text-xs font-bold text-primary">Wk</div>
                  <div className="text-lg font-black text-slate-800">{phase.week}</div>
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{phase.focus}</p>
                  <ul className="space-y-0.5">
                    {phase.expectedWins.map((win, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <ChevronRight className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                        {win}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stack safety notes */}
      {payload.stackSafetyNotes.length > 0 && (
        <StackSafetyNotes notes={payload.stackSafetyNotes} />
      )}

      {/* Stack builder */}
      {payload.recommendations.supplements.length > 0 && (
        <Card className="border border-slate-200">
          <CardContent className="pt-5 pb-5">
            <StackBuilder supplements={payload.recommendations.supplements} />
          </CardContent>
        </Card>
      )}

      {/* Recommendation tabs */}
      <ResultsTabs payload={payload} protocolId={protocol.id} />

      <Disclaimer />
    </div>
  );
}

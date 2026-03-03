/// app/(app)/onboarding/dial/page.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StepProgress } from "@/components/common/StepProgress";
import { AgeDial } from "@/components/dial/AgeDial";
import { GoalsChips } from "@/components/dial/GoalsChips";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/common/Disclaimer";
import { toast } from "sonner";
import type { Goal, BudgetTier, Preferences } from "@/lib/recommendations/generate";
import { ArrowRight, Loader2 } from "lucide-react";

const BUDGET_OPTIONS: { value: BudgetTier; label: string; desc: string }[] = [
  { value: "low", label: "Essentials", desc: "High-impact basics only" },
  { value: "medium", label: "Optimized", desc: "Broader protocol coverage" },
  { value: "high", label: "All-in", desc: "Full longevity stack" },
];

export default function DialPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [age, setAge] = useState(35);
  const [goals, setGoals] = useState<Goal[]>(["energy", "sleep"]);
  const [budget, setBudget] = useState<BudgetTier>("medium");
  const [preferences, setPreferences] = useState<Preferences>({
    vegan: false,
    caffeineFree: false,
    noFishOil: false,
  });

  function togglePref(key: keyof Preferences) {
    setPreferences((p) => ({ ...p, [key]: !p[key] }));
  }

  async function handleGenerate() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/protocols/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedAge: age, goals, budget, preferences }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Failed to create protocol");
        }
        const { protocolId } = await res.json();
        router.push(`/app/results/${protocolId}`);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 space-y-10">
      <StepProgress step={2} />

      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">How young do you want to feel?</h1>
        <p className="text-muted-foreground text-sm">
          Drag the dial, scroll, or use ←→ arrow keys
        </p>
      </div>

      {/* Dial */}
      <div className="flex justify-center py-4">
        <AgeDial value={age} onChange={setAge} />
      </div>

      {/* Goals */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Your goals</h2>
        <GoalsChips selected={goals} onChange={setGoals} />
      </div>

      {/* Budget */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Protocol budget</h2>
        <div className="grid grid-cols-3 gap-2">
          {BUDGET_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setBudget(opt.value)}
              className={`rounded-xl border-2 p-3 text-left transition-all ${
                budget === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="text-sm font-semibold text-slate-800">{opt.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Preferences */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Preferences</h2>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: "vegan", label: "Vegan" },
              { key: "caffeineFree", label: "Caffeine-free" },
              { key: "noFishOil", label: "No fish oil" },
            ] as { key: keyof Preferences; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => togglePref(key)}
              className={`px-4 py-1.5 rounded-full border text-sm font-medium transition-all ${
                preferences[key]
                  ? "bg-primary text-white border-primary"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <Button
          className="w-full h-12 text-base gap-2"
          onClick={handleGenerate}
          disabled={isPending || goals.length === 0}
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Generating your protocol…
            </>
          ) : (
            <>
              Generate my protocol <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Select at least one goal to continue
        </p>
      </div>

      <Disclaimer />
    </div>
  );
}

/// app/(app)/onboarding/dial/page.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StepProgress } from "@/components/common/StepProgress";
import { AgeDial } from "@/components/dial/AgeDial";
import { GoalsChips } from "@/components/dial/GoalsChips";
import { Disclaimer } from "@/components/common/Disclaimer";
import { toast } from "sonner";
import type { Goal, BudgetTier, Preferences } from "@/lib/recommendations/generate";
import { ArrowRight, Loader2 } from "lucide-react";
import { C } from "@/components/ui/tokens";

const BUDGET_OPTIONS: { value: BudgetTier; label: string; desc: string }[] = [
  { value: "low",    label: "Essentials",  desc: "High-impact basics only"     },
  { value: "medium", label: "Optimized",   desc: "Broader protocol coverage"   },
  { value: "high",   label: "All-in",      desc: "Full longevity stack"        },
];

export default function DialPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [age,         setAge]         = useState(35);
  const [goals,       setGoals]       = useState<Goal[]>(["energy", "sleep"]);
  const [budget,      setBudget]      = useState<BudgetTier>("medium");
  const [preferences, setPreferences] = useState<Preferences>({
    vegan: false, caffeineFree: false, noFishOil: false,
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

      {/* Heading */}
      <div className="text-center space-y-1">
        <h1
          className="font-light leading-tight"
          style={{ fontSize: "clamp(22px, 3vw, 32px)", color: C.stellar, fontFamily: "var(--font-serif)" }}
        >
          How young do you want to feel?
        </h1>
        <p className="text-sm" style={{ color: C.dust, fontFamily: "var(--font-ui, sans-serif)" }}>
          Drag the dial, scroll, or use ← → arrow keys
        </p>
      </div>

      {/* Dial */}
      <div className="flex justify-center py-4">
        <AgeDial value={age} onChange={setAge} />
      </div>

      {/* Goals */}
      <div className="space-y-3">
        <h2
          className="text-xs font-medium uppercase tracking-[0.12em]"
          style={{ color: C.dust, fontFamily: "var(--font-ui, sans-serif)" }}
        >
          Your goals
        </h2>
        <GoalsChips selected={goals} onChange={setGoals} />
      </div>

      {/* Budget */}
      <div className="space-y-3">
        <h2
          className="text-xs font-medium uppercase tracking-[0.12em]"
          style={{ color: C.dust, fontFamily: "var(--font-ui, sans-serif)" }}
        >
          Protocol budget
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {BUDGET_OPTIONS.map((opt) => {
            const active = budget === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setBudget(opt.value)}
                className="rounded-xl p-3 text-left transition-all"
                style={{
                  background:   active ? "rgba(0,138,255,0.10)" : "rgba(255,255,255,0.03)",
                  border:       `1px solid ${active ? "rgba(0,138,255,0.45)" : "rgba(255,255,255,0.07)"}`,
                  boxShadow:    active ? "0 0 20px rgba(0,138,255,0.12)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.borderColor = "rgba(0,138,255,0.25)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                }}
              >
                <div
                  className="text-sm font-medium mb-0.5"
                  style={{ color: active ? C.cerulean : C.stellar, fontFamily: "var(--font-ui, sans-serif)" }}
                >
                  {opt.label}
                </div>
                <div className="text-xs" style={{ color: C.dust }}>
                  {opt.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preferences */}
      <div className="space-y-3">
        <h2
          className="text-xs font-medium uppercase tracking-[0.12em]"
          style={{ color: C.dust, fontFamily: "var(--font-ui, sans-serif)" }}
        >
          Preferences
        </h2>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: "vegan",        label: "Vegan"         },
              { key: "caffeineFree", label: "Caffeine-free" },
              { key: "noFishOil",    label: "No fish oil"   },
            ] as { key: keyof Preferences; label: string }[]
          ).map(({ key, label }) => {
            const active = !!preferences[key];
            return (
              <button
                key={key}
                onClick={() => togglePref(key)}
                className="px-4 py-1.5 rounded-full border text-sm transition-all"
                style={{
                  fontFamily:  "var(--font-ui, sans-serif)",
                  borderColor: active ? "rgba(0,138,255,0.50)" : "rgba(255,255,255,0.10)",
                  color:       active ? C.cerulean : C.dust,
                  background:  active ? "rgba(0,138,255,0.10)" : "transparent",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Generate button */}
      <div className="space-y-3">
        <button
          className="btn-aurora w-full gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ minWidth: "unset" }}
          onClick={handleGenerate}
          disabled={isPending || goals.length === 0}
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating your protocol…
            </>
          ) : (
            <>
              Generate my protocol
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
        {goals.length === 0 && (
          <p
            className="text-center text-xs"
            style={{ color: C.dust, fontFamily: "var(--font-ui, sans-serif)" }}
          >
            Select at least one goal to continue
          </p>
        )}
      </div>

      <Disclaimer />
    </div>
  );
}

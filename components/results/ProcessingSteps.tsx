/// components/results/ProcessingSteps.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  "Ingesting data",
  "Parsing uploads",
  "Normalizing wearable metrics",
  "Building health snapshot",
  "Generating protocol and shopping list",
];

const STEP_DURATION_MS = 4000;

interface ProcessingStepsProps {
  protocolId: string;
}

export function ProcessingSteps({ protocolId }: ProcessingStepsProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let stepTimer: NodeJS.Timeout;
    let pollTimer: NodeJS.Timeout;

    async function poll() {
      try {
        const res = await fetch(`/api/protocols/status?protocolId=${protocolId}`);
        if (!res.ok) return;
        const { status } = await res.json();
        if (status === "ready") {
          router.refresh();
          return;
        }
        if (status === "failed") {
          setFailed(true);
          return;
        }
      } catch {
        // keep polling
      }
      pollTimer = setTimeout(poll, 3000);
    }

    function advanceStep() {
      setCurrentStep((s) => {
        if (s < STEPS.length - 1) {
          stepTimer = setTimeout(advanceStep, STEP_DURATION_MS);
          return s + 1;
        }
        return s;
      });
    }

    stepTimer = setTimeout(advanceStep, STEP_DURATION_MS);
    pollTimer = setTimeout(poll, 3000);

    return () => {
      clearTimeout(stepTimer);
      clearTimeout(pollTimer);
    };
  }, [protocolId, router]);

  if (failed) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
        <XCircle className="w-8 h-8 text-red-400 mx-auto" />
        <p className="text-sm font-medium text-red-800">Protocol generation failed</p>
        <p className="text-xs text-red-600">Something went wrong. Please try again.</p>
        <Button size="sm" variant="outline" onClick={() => router.push("/app/onboarding/dial")}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
        <h2 className="text-lg font-semibold text-slate-800">Building your protocol…</h2>
        <p className="text-sm text-muted-foreground">This usually takes 30–60 seconds</p>
      </div>

      <div className="space-y-3 max-w-sm mx-auto">
        {STEPS.map((step, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <div key={i} className="flex items-center gap-3">
              {done ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              ) : active ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-slate-200 flex-shrink-0" />
              )}
              <span
                className={`text-sm ${
                  done ? "text-emerald-700 line-through" : active ? "text-slate-900 font-medium" : "text-slate-400"
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

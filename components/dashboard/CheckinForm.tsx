/// components/dashboard/CheckinForm.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { track } from "@/lib/analytics";

interface CheckinFormProps {
  questions: string[];
  protocolId: string;
  weekNumber: number;
}

export function CheckinForm({ questions, protocolId, weekNumber }: CheckinFormProps) {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    if (Object.keys(responses).length < questions.length) {
      toast.warning("Please answer all questions before submitting.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/checkins/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocolId, weekNumber, responses }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);
      track("checkin_submitted");
      toast.success("Check-in submitted! Keep it up.");
    } catch {
      toast.error("Could not save check-in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-2">
        <ClipboardCheck className="w-8 h-8 text-emerald-500 mx-auto" />
        <p className="text-sm font-medium text-emerald-800">Week {weekNumber} check-in complete</p>
        <p className="text-xs text-emerald-600">See you next week!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <div key={i} className="space-y-1.5">
          <label className="text-xs font-medium text-slate-700">{q}</label>
          <input
            type="text"
            placeholder="Your answer…"
            value={responses[q] ?? ""}
            onChange={(e) => setResponses((r) => ({ ...r, [q]: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      ))}
      <Button className="w-full gap-2" onClick={submit} disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
        Submit week {weekNumber} check-in
      </Button>
    </div>
  );
}

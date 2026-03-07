/// components/analysis/GenerateAnalysisButton.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FlaskConical, Loader2 } from "lucide-react";

const STEPS = [
  { label: "Analyzing metabolic markers...",    ms: 2000 },
  { label: "Evaluating hormonal patterns...",   ms: 2000 },
  { label: "Cross-referencing all domains...",  ms: 3000 },
  { label: "Building your protocol...",         ms: 2000 },
];

export function GenerateAnalysisButton() {
  const router   = useRouter();
  const [loading, setLoading]   = useState(false);
  const [stepIdx, setStepIdx]   = useState(0);

  // Advance through visual labels while the real API call runs in the background
  useEffect(() => {
    if (!loading) { setStepIdx(0); return; }
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    for (let i = 1; i < STEPS.length; i++) {
      elapsed += STEPS[i - 1].ms;
      const idx = i;
      timers.push(setTimeout(() => setStepIdx(idx), elapsed));
    }
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  async function handleGenerate() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/analysis/generate", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as Record<string, string>;
        toast.error(body.error ?? "Analysis incomplete — please try again");
        return;
      }
      const { reportId } = await res.json() as { reportId: string | null };
      if (!reportId) {
        toast.error("Analysis incomplete — please try again");
        return;
      }
      router.push(`/app/dashboard/analysis/${reportId}`);
    } catch {
      toast.error("Analysis incomplete — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        gap:            10,
        padding:        "14px 28px",
        borderRadius:   12,
        border:         "none",
        cursor:         loading ? "not-allowed" : "pointer",
        background:     loading
          ? "rgba(99,102,241,.18)"
          : "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)",
        color:          "#fff",
        fontFamily:     "var(--font-ui,'Inter',sans-serif)",
        fontSize:       14,
        fontWeight:     500,
        opacity:        loading ? 0.85 : 1,
        transition:     "opacity .2s,background .2s",
        width:          "100%",
        minHeight:      48,
        boxShadow:      loading ? "none" : "0 0 24px rgba(124,58,237,.35)",
      }}
    >
      {loading ? (
        <>
          <Loader2 size={15} style={{ animation: "bzSpin 1s linear infinite", flexShrink: 0 }} />
          <span style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13 }}>
            {STEPS[stepIdx].label}
          </span>
          <style>{`@keyframes bzSpin{to{transform:rotate(360deg)}}`}</style>
        </>
      ) : (
        <>
          <FlaskConical size={15} />
          Run Full Biomarker Analysis
        </>
      )}
    </button>
  );
}

/// components/dashboard/SecondaryGoalNudge.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter }           from "next/navigation";
import { X }                   from "lucide-react";

const DISMISS_KEY = "bz_secondary_goal_nudge_dismissed";

const GOAL_ICONS: Record<string, string> = {
  weight_loss:          "🔥",
  physical_performance: "💪",
  sleep:                "🌙",
  sharper_thinking:     "🧠",
  longevity:            "✨",
  hormone_health:       "⚡",
};
const GOAL_LABELS: Record<string, string> = {
  weight_loss:          "Weight Loss",
  physical_performance: "Physical Performance",
  sleep:                "Sleep",
  sharper_thinking:     "Sharper Thinking",
  longevity:            "Longevity",
  hormone_health:       "Hormone Health",
};

const FONT = "var(--font-ui,'Inter',sans-serif)";
const T    = { text: "#F1F5F9", muted: "#64748B" };

interface Props {
  primaryGoal: string;
}

export function SecondaryGoalNudge({ primaryGoal }: Props) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={{
      background:   "linear-gradient(135deg,rgba(124,58,237,0.12) 0%,rgba(17,24,39,0.6) 100%)",
      border:       "1px solid rgba(124,58,237,0.15)",
      borderRadius: 18, padding: "20px 20px", marginBottom: 20,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: T.text, fontFamily: FONT, margin: "0 0 6px" }}>
            Ready to layer in a second goal?
          </p>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: FONT, lineHeight: 1.6, margin: 0 }}>
            You&apos;ve been consistent on{" "}
            <span style={{ color: "#C4B5FD" }}>
              {GOAL_ICONS[primaryGoal] ?? "🎯"} {GOAL_LABELS[primaryGoal] ?? primaryGoal}
            </span>
            . Add a secondary focus to your next protocol renewal.
          </p>
        </div>
        <button
          onClick={dismiss}
          style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", flexShrink: 0, padding: 2 }}
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
      <button
        onClick={() => router.push("/app/profile/goals")}
        style={{
          marginTop:    14, fontSize: 12, fontFamily: FONT,
          background:   "rgba(124,58,237,0.18)", border: "1px solid rgba(124,58,237,0.25)",
          color:        "#C4B5FD", padding: "9px 18px", borderRadius: 12,
          cursor:       "pointer", transition: "all .18s",
        }}
      >
        Add secondary goal →
      </button>
    </div>
  );
}

/// components/dial/GoalsChips.tsx
"use client";

import type { Goal } from "@/lib/recommendations/generate";

const ALL_GOALS: { value: Goal; label: string; emoji: string }[] = [
  { value: "energy", label: "Energy", emoji: "⚡" },
  { value: "sleep", label: "Sleep", emoji: "🌙" },
  { value: "focus", label: "Focus", emoji: "🎯" },
  { value: "strength", label: "Strength", emoji: "💪" },
  { value: "fat_loss", label: "Fat Loss", emoji: "🔥" },
  { value: "recovery", label: "Recovery", emoji: "🔄" },
  { value: "hormones", label: "Hormones", emoji: "🧬" },
  { value: "longevity", label: "Longevity", emoji: "🌿" },
];

interface GoalsChipsProps {
  selected: Goal[];
  onChange: (goals: Goal[]) => void;
}

export function GoalsChips({ selected, onChange }: GoalsChipsProps) {
  function toggle(g: Goal) {
    onChange(
      selected.includes(g) ? selected.filter((x) => x !== g) : [...selected, g]
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ALL_GOALS.map(({ value, label, emoji }) => {
        const on = selected.includes(value);
        return (
          <button
            key={value}
            type="button"
            onClick={() => toggle(value)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium border-2 transition-all ${
              on
                ? "bg-primary border-primary text-white shadow-sm"
                : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <span>{emoji}</span>
            {label}
          </button>
        );
      })}
    </div>
  );
}

/// components/dashboard/WeeklyTargets.tsx
"use client";

import { useState } from "react";

interface Target {
  id:        string;
  label:     string;
  detail:    string;
  timeOfDay: "am" | "pm";
}

interface WeeklyTargetsProps {
  initialTargets: Target[];
}

export function WeeklyTargets({ initialTargets }: WeeklyTargetsProps) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  const total      = initialTargets.length;
  const doneCount  = completed.size;
  const progress   = total > 0 ? (doneCount / total) * 100 : 0;
  const remaining  = initialTargets.filter((t) => !completed.has(t.id));
  const done       = initialTargets.filter((t) =>  completed.has(t.id));

  return (
    <div className="weekly-targets">
      <div className="weekly-targets__header">
        <span className="weekly-targets__overline">This Week&apos;s Targets</span>
        <span className="weekly-targets__count">
          {doneCount}
          <span className="weekly-targets__count-total">/{total}</span>
        </span>
      </div>

      <div className="weekly-targets__progress-bar">
        <div
          className="weekly-targets__progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="weekly-targets__section">
        {remaining.map((t) => (
          <TargetItem key={t.id} target={t} done={false} onToggle={toggle} />
        ))}
      </div>

      {done.length > 0 && (
        <details className="weekly-targets__completed">
          <summary className="weekly-targets__completed-toggle">
            {done.length} completed ↓
          </summary>
          <div className="weekly-targets__section weekly-targets__section--done">
            {done.map((t) => (
              <TargetItem key={t.id} target={t} done onToggle={toggle} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function TargetItem({
  target,
  done,
  onToggle,
}: {
  target:   Target;
  done:     boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <div
      className={`target-item${done ? " target-item--done" : ""}`}
      onClick={() => onToggle(target.id)}
      role="checkbox"
      aria-checked={done}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") onToggle(target.id); }}
    >
      <div className="target-item__checkbox">
        {done && "✓"}
      </div>
      <div style={{ flex: 1 }}>
        <div className="target-item__label">{target.label}</div>
        {target.detail && (
          <div className="target-item__detail">{target.detail}</div>
        )}
      </div>
      <span className={`target-item__time target-item__time--${target.timeOfDay}`}>
        {target.timeOfDay === "am" ? "AM" : "PM"}
      </span>
    </div>
  );
}

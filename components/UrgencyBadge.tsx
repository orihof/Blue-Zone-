"use client";

interface UrgencyBadgeProps {
  spotsLeft: number;
}

export function UrgencyBadge({ spotsLeft }: UrgencyBadgeProps) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      aria-label={`${spotsLeft} founding cohort spots remaining`}
      style={{ display: "flex", alignItems: "center", gap: 6 }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "var(--bz-amber)",
          boxShadow: "0 0 6px var(--bz-amber)",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-label)",
          fontSize: 10,
          color: "var(--bz-amber)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {spotsLeft} founding spots left
      </span>
    </div>
  );
}

// Keep default export for backward compatibility
export default UrgencyBadge;

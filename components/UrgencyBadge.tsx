"use client";
const SPOTS_CLAIMED = 47;
const TOTAL_SPOTS = 50;

export default function UrgencyBadge() {
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}
    >
      <span
        style={{
          display: "inline-block",
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "var(--bz-amber)",
          boxShadow: "0 0 6px var(--bz-amber)",
          flexShrink: 0,
          animation: "urgencyPulse 1.5s ease-in-out infinite",
        }}
      />
      <span
        style={{
          fontSize: 9,
          color: "var(--bz-amber)",
          fontFamily: "var(--font-label)",
          letterSpacing: "0.06em",
        }}
      >
        {SPOTS_CLAIMED} of {TOTAL_SPOTS} founding athlete spots claimed
      </span>
      <style>{`
        @keyframes urgencyPulse {
          0%,100% { opacity:1; }
          50%      { opacity:0.4; }
        }
      `}</style>
    </div>
  );
}

/// components/BZLogo.tsx
// Blue Zone logo mark — Olympic torch with DNA double-helix flame
// "Ancient wisdom, molecular precision"

interface BZLogoProps {
  size?: number;
  className?: string;
  /** "mark" = icon only, "full" = icon + wordmark */
  variant?: "mark" | "full";
}

export function BZLogo({ size = 36, className = "", variant = "mark" }: BZLogoProps) {
  const h = Math.round(size * 1.28);

  const mark = (
    <svg
      width={size}
      height={h}
      viewBox="0 0 36 46"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Blue Zone"
      className={className}
    >
      {/* ── Torch handle ── */}
      <rect x="14" y="33" width="8" height="11" rx="2.5" fill="currentColor" opacity="0.65" />

      {/* ── Torch cup / holder ── */}
      <path
        d="M11 33 L25 33 L23 27 L13 27 Z"
        fill="currentColor"
        opacity="0.82"
      />

      {/* ── Helix strand A (left curve) — carries the flame upward ── */}
      <path
        d="M15 27 C12 22 17 17 14 12 C11 7 15.5 3 18 1"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.95"
      />

      {/* ── Helix strand B (right curve) ── */}
      <path
        d="M21 27 C24 22 19 17 22 12 C25 7 20.5 3 18 1"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.70"
      />

      {/* ── Connecting rungs (DNA rungs) ── */}
      <line x1="16.5" y1="22" x2="19.5" y2="22" stroke="currentColor" strokeWidth="1.1" opacity="0.55" />
      <line x1="15.5" y1="16.5" x2="20.5" y2="16.5" stroke="currentColor" strokeWidth="1.1" opacity="0.55" />
      <line x1="16.5" y1="11" x2="19.5" y2="11" stroke="currentColor" strokeWidth="1.1" opacity="0.55" />

      {/* ── Flame tip glow ── */}
      <circle cx="18" cy="3" r="2.5" fill="currentColor" opacity="0.45" />
      <circle cx="18" cy="3" r="1.2" fill="currentColor" opacity="0.90" />
    </svg>
  );

  if (variant === "mark") return mark;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {mark}
      <div>
        <span
          className="block font-serif text-lg font-light tracking-[0.06em] leading-none"
          style={{ color: "var(--bz-white)" }}
        >
          Blue Zone
        </span>
        <span
          className="block text-[9px] tracking-[0.18em] uppercase font-medium mt-0.5"
          style={{ color: "var(--bz-muted)", fontFamily: "var(--font-sans)" }}
        >
          Longevity OS
        </span>
      </div>
    </div>
  );
}

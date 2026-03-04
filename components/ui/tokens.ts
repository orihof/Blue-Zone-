/// components/ui/tokens.ts
// Typed design tokens for use in framer-motion variants and dynamic styles.
// All values mirror globals.css CSS custom properties.
// Import from here — never hardcode hex values in components.

// ── Colours ─────────────────────────────────────────────────────────────────
export const C = {
  void:        "#030508",
  abyss:       "#070D18",
  deep:        "#0C1525",
  elevated:    "#111E32",
  rim:         "#1A2D48",

  ionBlue:     "#008AFF",
  cerulean:    "#0AAFFF",
  auroraStart: "#0066FF",
  auroraMid:   "#5B21FF",
  auroraEnd:   "#9B16FF",
  biolum:      "#00FFB3",
  plasma:      "#FF6B35",
  goldOld:     "#C9943A",
  stellar:     "#E8EEFF",
  dust:        "#6B7FA3",
  nebula:      "#3D4F6E",
} as const;

// ── Gradients ────────────────────────────────────────────────────────────────
export const G = {
  aurora: `linear-gradient(135deg, ${C.ionBlue} 0%, #3D5BFF 25%, #7B2FFF 55%, ${C.auroraEnd} 80%, #B800FF 100%)`,
  auroraRadial: `radial-gradient(ellipse at 30% 50%, rgba(91,33,255,0.30) 0%, rgba(0,138,255,0.15) 40%, transparent 70%)`,
  gold: `linear-gradient(135deg, ${C.goldOld} 0%, #E8C97A 50%, ${C.goldOld} 100%)`,
} as const;

// ── Glass morphism inline styles ─────────────────────────────────────────────
export const GLASS = {
  base: {
    background:       "rgba(12, 21, 37, 0.75)",
    backdropFilter:   "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    border:           "1px solid rgba(255,255,255,0.05)",
    boxShadow:        "0 0 0 1px rgba(0,138,255,0.08), 0 24px 48px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.06)",
  },
  elevated: {
    background:       "rgba(17, 30, 50, 0.85)",
    backdropFilter:   "blur(32px) saturate(200%)",
    WebkitBackdropFilter: "blur(32px) saturate(200%)",
    border:           "1px solid rgba(0,138,255,0.18)",
    boxShadow:        "0 0 60px rgba(91,33,255,0.12), 0 0 120px rgba(0,138,255,0.06), inset 0 1px 0 rgba(255,255,255,0.08)",
  },
} as const;

// ── Framer Motion ease ───────────────────────────────────────────────────────
export const EASE_BZ = [0.16, 1, 0.3, 1] as const;

// ── Shared framer-motion variants ────────────────────────────────────────────
export const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_BZ } },
};

export const stagger = (delayMs: number = 80) => ({
  visible: { transition: { staggerChildren: delayMs / 1000 } },
});

export const scaleIn = {
  hidden:  { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: EASE_BZ } },
};

// ── Status maps ──────────────────────────────────────────────────────────────
export type Status = "optimal" | "good" | "warn" | "critical";
export type Priority = "high" | "medium" | "low";

export const STATUS_COLOR: Record<Status, string> = {
  optimal:  C.biolum,
  good:     C.cerulean,
  warn:     C.goldOld,
  critical: C.plasma,
};

export const STATUS_GLOW: Record<Status, string> = {
  optimal:  "rgba(0, 255, 179, 0.25)",
  good:     "rgba(10, 175, 255, 0.25)",
  warn:     "rgba(201, 148, 58, 0.25)",
  critical: "rgba(255, 107, 53, 0.35)",
};

export const STATUS_BG: Record<Status, string> = {
  optimal:  "rgba(0, 255, 179, 0.07)",
  good:     "rgba(10, 175, 255, 0.07)",
  warn:     "rgba(201, 148, 58, 0.07)",
  critical: "rgba(255, 107, 53, 0.08)",
};

export const STATUS_BORDER: Record<Status, string> = {
  optimal:  "rgba(0, 255, 179, 0.25)",
  good:     "rgba(10, 175, 255, 0.25)",
  warn:     "rgba(201, 148, 58, 0.25)",
  critical: "rgba(255, 107, 53, 0.35)",
};

export const STATUS_LABEL: Record<Status, string> = {
  optimal:  "Optimal",
  good:     "Good",
  warn:     "Suboptimal",
  critical: "Critical",
};

export const PRIORITY_BG: Record<Priority, string> = {
  high:   "rgba(255, 107, 53, 0.15)",
  medium: "rgba(201, 148, 58, 0.15)",
  low:    "rgba(0, 175, 255, 0.12)",
};

export const PRIORITY_BORDER: Record<Priority, string> = {
  high:   "rgba(255, 107, 53, 0.40)",
  medium: "rgba(201, 148, 58, 0.40)",
  low:    "rgba(0, 175, 255, 0.35)",
};

export const PRIORITY_COLOR: Record<Priority, string> = {
  high:   C.plasma,
  medium: C.goldOld,
  low:    C.cerulean,
};

// ── Reference prototype tokens ────────────────────────────────────────────────
// These match the design tokens from bluezone-complete.jsx exactly.
export const REF = {
  bg:        "#06080F",
  surface:   "#0D1117",
  card:      "#111827",
  cardHover: "#161F30",
  border:    "rgba(99,102,241,0.15)",
  borderHover: "rgba(99,102,241,0.4)",
  text:      "#F1F5F9",
  muted:     "#64748B",
  subtle:    "#1E293B",
  blue:      "#3B82F6",
  violet:    "#7C3AED",
  purple:    "#A855F7",
  green:     "#10B981",
  greenLight:"#34D399",
  amber:     "#F59E0B",
  red:       "#EF4444",
} as const;

export const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";

export const GRAD_TEXT = {
  background:           GRAD,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor:  "transparent",
  backgroundClip:       "text",
} as const;

export const STATUS_REF: Record<string, string> = {
  optimal:  "#10B981",
  good:     "#3B82F6",
  warn:     "#F59E0B",
  critical: "#EF4444",
};

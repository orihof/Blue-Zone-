/**
 * HoloBody.tsx — Blue Zone Body Scan v6
 * Oura 2026 ambient luxury × WHOOP 5.0 performance urgency
 *
 * ── SIZING DIAGNOSIS + FIX (v5 → v6) ─────────────────────────────────────
 *  ROOT CAUSE: maxWidth: 560 on the wrapper div (was line 43).
 *  The SVG has width="100%" with no explicit height. It derives height from
 *  the viewBox aspect ratio (640:530 = 0.828:1). At maxWidth:560, the SVG
 *  rendered at 560×464px — in an 836px hero column that left 405px dead.
 *  FIX: maxWidth changed to '100%'. Parent wrapper now controls max sizing.
 *  At a typical 664px column: SVG → 550px tall, body → 511px tall (+80px).
 *
 * ── CARD LEGIBILITY CHANGES (v5 → v6) ────────────────────────────────────
 *  Category labels: rgba(255,255,255,0.40)→0.65 (3.1:1→6.2:1), 9px→10px
 *  Insight text:    rgba(255,255,255,0.50)→0.72 (3.7:1→7.1:1), 10px→11px
 *  Stat row label:  rgba(255,255,255,0.40)→0.65
 *  Card borders:    rgba(255,255,255,0.09)→0.18 (cards now read as surfaces)
 *  Card bg:         fillOpacity 0.96→0.98 (no wireframe bleed-through)
 *
 * ── NODE ANCHORS (unchanged) ──────────────────────────────────────────────
 *   HRV:      cx=152  cy=158   left chest, over heart
 *   Blood:    cx=200  cy=205   right lat, liver region
 *   Training: cx=208  cy=332   right quadricep
 *
 * ── CARD LAYOUT ───────────────────────────────────────────────────────────
 *   Silhouette bounds: left ≈ 74, right ≈ 266
 *   Right cards left edge: 290   Left card right edge: 50 (left edge: −160)
 *
 *   HRV card:   x=290  y=95   w=210  h=126   mid_y=158
 *   Blood card: x=290  y=237  w=210  h=106   mid_y=290  (16px below HRV)
 *   Train card: x=−160 y=265  w=210  h=134   mid_y=332
 *
 * ── CONNECTORS ────────────────────────────────────────────────────────────
 *   HRV:   M290,158 → L152,158
 *   Blood: M290,290 → L240,290 → L200,205
 *   Train: M50,332  → L208,332
 *
 * ── PULSE TIMING ──────────────────────────────────────────────────────────
 *   HRV: 3.2 s     Blood: 6.0 s     Train: 2.4 s
 * ──────────────────────────────────────────────────────────────────────────
 */

'use client'

export function HoloBody({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{ position: 'relative', width: '100%', maxWidth: '100%', margin: '0 auto' }}
    >
      {/* ── ANIMATIONS ───────────────────────────────────────────────── */}
      <style>{`
        @keyframes bz-out {
          0%,100% { transform:scale(1);   opacity:.15; }
          50%      { transform:scale(3.4); opacity:0;   }
        }
        @keyframes bz-rng {
          0%,100% { transform:scale(1);   opacity:.25; }
          50%      { transform:scale(2.1); opacity:0;   }
        }
        .bzp { transform-box:fill-box; transform-origin:center; }
        .h1o { animation:bz-out 3.2s ease-in-out infinite; }
        .h1r { animation:bz-rng 3.2s ease-in-out infinite; }
        .h2o { animation:bz-out 6s   ease-in-out infinite; }
        .h2r { animation:bz-rng 6s   ease-in-out infinite; }
        .h3o { animation:bz-out 2.4s ease-in-out infinite; }
        .h3r { animation:bz-rng 2.4s ease-in-out infinite; }
        @media (prefers-reduced-motion:reduce) {
          .h1o,.h1r,.h2o,.h2r,.h3o,.h3r { animation:none; opacity:.12; }
        }
      `}</style>

      <svg
        viewBox="-130 0 640 530"
        width="100%"
        overflow="visible"
        style={{ display: 'block', filter: 'drop-shadow(0 0 24px rgba(99,102,241,0.22))' }}
        role="img"
        aria-label={
          'Athletic body scan. Three overlays: ' +
          'HRV declining 18 percent over 14 days. ' +
          'Vitamin D 62 ng/mL suboptimal. ' +
          'Training load Zone 4 high, recovery deficit 23 percent.'
        }
      >
        <defs>
          <radialGradient id="bz6Glow" cx="50%" cy="46%" r="46%">
            <stop offset="0%"   stopColor="#6366f1" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </radialGradient>
          <filter id="cShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="12"
              floodColor="#000000" floodOpacity="0.5" />
          </filter>
          <radialGradient id="bz6Scrim" cx="50%" cy="50%" r="55%">
            <stop offset="0%"   stopColor="#080c18" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#080c18" stopOpacity="0"    />
          </radialGradient>
        </defs>

        {/* Radial vignette scrim — contrast behind body without visible edges */}
        <ellipse
          cx="170" cy="280" rx="220" ry="280"
          fill="url(#bz6Scrim)"
        />

        {/* Ambient body glow — expanded from v5 for more depth */}
        <ellipse cx="170" cy="295" rx="280" ry="340" fill="url(#bz6Glow)" />

        {/* ══════════════════════════════════════════════════════════════
            BODY CONTOUR
        ══════════════════════════════════════════════════════════════ */}
        <g fill="none" stroke="#c7d2fe" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round" opacity="1">
          <ellipse cx="170" cy="50" rx="27" ry="31" />
          <path d="M182,73 C184,81 186,93 188,106" />
          <path d="M158,73 C156,81 154,93 152,106" />
          <path d="M188,106 C202,108 224,112 244,120 C256,126 266,136 262,154 C266,166 268,184 262,202 C258,220 254,242 248,268 L244,296" />
          <path d="M228,298 C226,286 228,268 232,242 C236,216 238,188 234,162 C230,146 224,140 220,142" />
          <path d="M220,142 C216,152 213,168 212,186 C211,204 212,220 214,236 C215,252 219,264 222,278" />
          <path d="M222,278 C228,292 234,310 234,332 C236,354 232,376 228,394 C226,408 226,422 230,448 C232,462 228,476 222,486 C216,496 198,504 184,502" />
          <path d="M184,502 C190,508 208,512 228,504 C236,500 236,490 230,486 C226,484 222,482 222,486" />
          <path d="M176,290 C182,302 188,318 190,338 C192,358 190,378 188,396 C187,410 188,424 190,450 C192,464 192,476 192,482" />
          <path d="M152,106 C138,108 116,112 96,120 C84,126 74,136 78,154 C74,166 72,184 78,202 C82,220 86,242 92,268 L96,296" />
          <path d="M112,298 C114,286 112,268 108,242 C104,216 102,188 106,162 C110,146 116,140 120,142" />
          <path d="M120,142 C124,152 127,168 128,186 C129,204 128,220 126,236 C125,252 121,264 118,278" />
          <path d="M118,278 C112,292 106,310 106,332 C104,354 108,376 112,394 C114,408 114,422 110,448 C108,462 112,476 118,486 C124,496 142,504 156,502" />
          <path d="M156,502 C150,508 132,512 112,504 C104,500 104,490 110,486 C114,484 118,482 118,486" />
          <path d="M164,290 C158,302 152,318 150,338 C148,358 150,378 152,396 C153,410 152,424 150,450 C148,464 148,476 148,482" />
        </g>

        {/* ── MUSCLE DEFINITION ─────────────────────────────────────── */}
        <g fill="none" stroke="#6366f1" strokeLinecap="round" opacity="0.70">
          <path d="M190,112 C210,115 228,118 242,124" strokeWidth="0.65" />
          <path d="M150,112 C130,115 112,118 98,124"  strokeWidth="0.65" />
          <line x1="170" y1="108" x2="170" y2="236"   strokeWidth="0.5"  />
          <path d="M190,128 C204,138 216,148 222,162"  strokeWidth="0.65" />
          <path d="M150,128 C136,138 124,148 118,162"  strokeWidth="0.65" />
          <path d="M264,158 C268,176 264,194 258,210"  strokeWidth="0.6"  />
          <path d="M76,158  C72,176  76,194  82,210"   strokeWidth="0.6"  />
          <path d="M215,184 C217,204 217,222 216,240"  strokeWidth="0.55" />
          <path d="M125,184 C123,204 123,222 124,240"  strokeWidth="0.55" />
          <path d="M228,296 C234,322 234,356 228,390"  strokeWidth="0.6"  />
          <path d="M112,296 C106,322 106,356 112,390"  strokeWidth="0.6"  />
          <path d="M216,422 C217,444 216,462 212,478"  strokeWidth="0.55" />
          <path d="M124,422 C123,444 124,462 128,478"  strokeWidth="0.55" />
          <path d="M228,422 C231,442 230,460 224,476"  strokeWidth="0.6"  />
          <path d="M112,422 C109,442 110,460 116,476"  strokeWidth="0.6"  />
        </g>

        {/* ── TOPOLOGY SCAN BANDS ───────────────────────────────────── */}
        <g fill="none" stroke="#6366f1" strokeWidth="0.9" strokeLinecap="round" opacity="0.38">
          <path d="M122,146 C140,150 156,152 170,152 C184,152 200,150 218,146" />
          <path d="M122,163 C140,167 156,169 170,169 C184,169 200,167 218,163" />
          <path d="M124,180 C140,184 156,186 170,186 C184,186 200,184 216,180" />
          <path d="M125,200 C141,204 156,206 170,206 C184,206 199,204 215,200" />
          <path d="M126,218 C141,222 157,224 170,224 C183,224 199,222 214,218" />
          <path d="M127,234 C142,237 157,239 170,239 C183,239 198,237 213,234" />
          <path d="M118,272 C136,277 154,280 170,280 C186,280 204,277 222,272" />
          <path d="M190,312 C204,308 216,308 230,312" />
          <path d="M110,312 C122,308 136,308 150,312" />
          <path d="M190,350 C204,346 216,346 230,350" />
          <path d="M110,350 C122,346 136,346 150,350" />
          <path d="M190,390 C203,393 216,393 228,390" />
          <path d="M112,390 C121,393 133,393 150,390" />
          <path d="M192,440 C204,443 214,443 228,440" />
          <path d="M112,440 C121,443 132,443 148,440" />
        </g>

        {/* ══════════════════════════════════════════════════════════════
            CONNECTORS — indigo, glowing, L-shaped
        ══════════════════════════════════════════════════════════════ */}
        <g
          style={{ filter: 'drop-shadow(0 0 3px rgba(99,102,241,0.55))' }}
          strokeLinejoin="round"
        >
          <polyline points="290,158 152,158"
            fill="none" stroke="rgba(99,102,241,0.55)"
            strokeWidth="1.5" strokeLinecap="round" />
          <polyline points="290,290 240,290 200,205"
            fill="none" stroke="rgba(99,102,241,0.55)"
            strokeWidth="1.5" strokeLinecap="round" />
          <polyline points="50,332 208,332"
            fill="none" stroke="rgba(99,102,241,0.55)"
            strokeWidth="1.5" strokeLinecap="round" />
        </g>

        {/* ══════════════════════════════════════════════════════════════
            HOTSPOT DOTS
        ══════════════════════════════════════════════════════════════ */}

        {/* HRV — red */}
        <circle cx="152" cy="158" r="9"   fill="#ef4444" className="bzp h1o" />
        <circle cx="152" cy="158" r="5"   fill="#ef4444" className="bzp h1r" />
        <circle cx="152" cy="158" r="5"   fill="#ef4444" fillOpacity="0.25" />
        <circle cx="152" cy="158" r="2.5" fill="#ef4444" />

        {/* Blood — amber */}
        <circle cx="200" cy="205" r="9"   fill="#f59e0b" className="bzp h2o" />
        <circle cx="200" cy="205" r="5"   fill="#f59e0b" className="bzp h2r" />
        <circle cx="200" cy="205" r="5"   fill="#f59e0b" fillOpacity="0.25" />
        <circle cx="200" cy="205" r="2.5" fill="#f59e0b" />

        {/* Training — green */}
        <circle cx="208" cy="332" r="9"   fill="#10b981" className="bzp h3o" />
        <circle cx="208" cy="332" r="5"   fill="#10b981" className="bzp h3r" />
        <circle cx="208" cy="332" r="5"   fill="#10b981" fillOpacity="0.25" />
        <circle cx="208" cy="332" r="2.5" fill="#10b981" />

        {/* ══════════════════════════════════════════════════════════════
            CARD 1 — HRV
            x=290  y=95  w=210  h=126  (mid_y=158 = hotspot cy)
        ══════════════════════════════════════════════════════════════ */}
        <g filter="url(#cShadow)">
          <rect x="290" y="95" width="210" height="126" rx="8"
            fill="#080c1c" fillOpacity="0.98"
            stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
          <rect x="291" y="96" width="208" height="2" fill="#ef4444" />
        </g>

        {/* Category label — 10px, 6.2:1 contrast */}
        <text x="304" y="118"
          fill="rgba(255,255,255,0.65)" fontSize="10"
          fontFamily="'DM Mono','JetBrains Mono',monospace" letterSpacing="0.12em"
        >HEART RATE VARIABILITY</text>

        {/* Primary metric — 20px 700, white — dominant element */}
        <text x="304" y="136"
          fill="#ffffff" fontSize="20" fontWeight="700"
          fontFamily="'Inter','Syne',system-ui,sans-serif"
        >HRV Δ14d −18%</text>

        {/* Status badge */}
        <rect x="304" y="148" width="82" height="20" rx="4"
          fill="#ef4444" fillOpacity="0.20" />
        <text x="312" y="162"
          fill="#ef4444" fontSize="10" fontWeight="500"
          fontFamily="'DM Mono','JetBrains Mono',monospace"
        >↓ Declining</text>

        {/* Insight — 11px, 7.1:1 contrast */}
        <text x="304" y="183"
          fill="rgba(255,255,255,0.72)" fontSize="11"
          fontFamily="'Inter',system-ui,sans-serif"
        >14-day trend vs 90-day baseline</text>

        {/* Sparkline — declining HRV trend */}
        <polyline
          points="304,192 334,195 364,194 394,197 424,201 454,203 484,205"
          fill="none" stroke="#ef4444" strokeOpacity="0.70"
          strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
        />
        <circle cx="484" cy="205" r="2.5" fill="#ef4444" fillOpacity="0.90" />

        {/* ══════════════════════════════════════════════════════════════
            CARD 2 — BLOOD PANEL · VITAMIN D
            x=290  y=237  w=210  h=106  (16px gap below HRV bottom=221)
        ══════════════════════════════════════════════════════════════ */}
        <g filter="url(#cShadow)">
          <rect x="290" y="237" width="210" height="106" rx="8"
            fill="#080c1c" fillOpacity="0.98"
            stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
          <rect x="291" y="238" width="208" height="2" fill="#f59e0b" />
        </g>

        {/* Category label */}
        <text x="304" y="260"
          fill="rgba(255,255,255,0.65)" fontSize="10"
          fontFamily="'DM Mono','JetBrains Mono',monospace" letterSpacing="0.12em"
        >BLOOD PANEL · VITAMIN D</text>

        {/* Primary metric */}
        <text x="304" y="278"
          fill="#ffffff" fontSize="20" fontWeight="700"
          fontFamily="'Inter','Syne',system-ui,sans-serif"
        >62 ng/mL</text>

        {/* Status badge */}
        <rect x="304" y="290" width="88" height="20" rx="4"
          fill="#f59e0b" fillOpacity="0.20" />
        <text x="312" y="304"
          fill="#f59e0b" fontSize="10" fontWeight="500"
          fontFamily="'DM Mono','JetBrains Mono',monospace"
        >↓ Suboptimal</text>

        {/* Insight */}
        <text x="304" y="325"
          fill="rgba(255,255,255,0.72)" fontSize="11"
          fontFamily="'Inter',system-ui,sans-serif"
        >Optimal: 40–80 ng/mL</text>

        {/* ══════════════════════════════════════════════════════════════
            CARD 3 — TRAINING LOAD
            x=−160  y=265  w=210  h=134  right-edge=50
        ══════════════════════════════════════════════════════════════ */}
        <g filter="url(#cShadow)">
          <rect x="-160" y="265" width="210" height="134" rx="8"
            fill="#080c1c" fillOpacity="0.98"
            stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
          <rect x="-159" y="266" width="208" height="2" fill="#10b981" />
        </g>

        {/* Category label */}
        <text x="-146" y="288"
          fill="rgba(255,255,255,0.65)" fontSize="10"
          fontFamily="'DM Mono','JetBrains Mono',monospace" letterSpacing="0.12em"
        >TRAINING LOAD · 7-DAY</text>

        {/* Primary metric */}
        <text x="-146" y="306"
          fill="#ffffff" fontSize="20" fontWeight="700"
          fontFamily="'Inter','Syne',system-ui,sans-serif"
        >Zone 4 · High</text>

        {/* Status badge */}
        <rect x="-146" y="318" width="116" height="20" rx="4"
          fill="#10b981" fillOpacity="0.20" />
        <text x="-138" y="332"
          fill="#10b981" fontSize="10" fontWeight="500"
          fontFamily="'DM Mono','JetBrains Mono',monospace"
        >↑ Above Baseline</text>

        {/* Stat row — label left, value right-aligned */}
        <text x="-146" y="351"
          fill="rgba(255,255,255,0.65)" fontSize="10"
          fontFamily="'DM Mono','JetBrains Mono',monospace"
        >Recovery deficit</text>
        <text x="36" y="351"
          fill="#10b981" fontSize="10" fontWeight="500"
          fontFamily="'DM Mono','JetBrains Mono',monospace"
          textAnchor="end"
        >−23%</text>

        {/* Insight — 2 lines */}
        <text x="-146" y="367"
          fill="rgba(255,255,255,0.72)" fontSize="11"
          fontFamily="'Inter',system-ui,sans-serif"
        >HRV suppression linked</text>
        <text x="-146" y="382"
          fill="rgba(255,255,255,0.72)" fontSize="11"
          fontFamily="'Inter',system-ui,sans-serif"
        >to Day 3–5 load spike</text>

        {/* ── SCAN FOOTER (hidden in production — fill="transparent") ── */}
        <text x="170" y="514"
          textAnchor="middle" fill="transparent" fontSize="7.5"
          fontFamily="monospace" letterSpacing="0.10em"
        >DERIVED FROM 3 SIGNALS · PERSONALISED TO YOUR TRAINING PHASE</text>

      </svg>
    </div>
  )
}

export default HoloBody

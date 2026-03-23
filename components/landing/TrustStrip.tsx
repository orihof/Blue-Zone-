/// components/landing/TrustStrip.tsx
import { Database, Activity, GitBranch } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface TrustCard {
  icon: LucideIcon;
  heading: string;
  body: string;
}

const CARDS: TrustCard[] = [
  {
    icon: Database,
    heading: "We read what your doctor flags — and what they don\u2019t",
    body: "CBC, CMP, iron panel, thyroid, hormones, vitamins, and inflammatory markers synthesized together. Not just the 6 your doctor highlights.",
  },
  {
    icon: Activity,
    heading: "Your HRV only makes sense with your training load",
    body: "HRV, resting HR, strain, sleep quality, and weekly volume read alongside your blood — because they\u2019re not separate problems.",
  },
  {
    icon: GitBranch,
    heading: "Every fix ordered by what moves your markers fastest",
    body: "Interventions ranked by impact given your current training phase — not a generic priority list.",
  },
];

export function TrustStrip() {
  return (
    <div className="py-16 px-4 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.heading}
              className="bg-[#111118] border border-white/10 rounded-xl p-6"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                style={{ background: "rgba(0,138,255,0.15)" }}
              >
                <Icon className="w-5 h-5 text-[--ion-blue]" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold text-white mb-2">{card.heading}</p>
              <p className="text-sm text-gray-400 leading-relaxed">{card.body}</p>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, maxWidth: 560, margin: "32px auto 0", flexWrap: "nowrap" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(96,165,250,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <polyline points="9 12 11 14 15 10"/>
        </svg>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, margin: 0, lineHeight: 1.6, flex: 1 }}>
          Built on peer-reviewed exercise physiology and sports medicine research. Not AI guesswork.
        </p>
      </div>
    </div>
  );
}

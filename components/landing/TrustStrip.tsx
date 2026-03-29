/// components/landing/TrustStrip.tsx
"use client";

import { Database, Activity, GitBranch } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface TrustCard {
  icon: LucideIcon;
  heading: string;
  body: string;
  example: string;
}

const CARDS: TrustCard[] = [
  {
    icon: Database,
    heading: "We read what your doctor flags \u2014 and what they don\u2019t",
    body: "CBC, CMP, iron panel, thyroid, hormones, vitamins, and inflammatory markers synthesized together. Not just the 6 your doctor highlights.",
    example: "e.g. A ferritin of 62 ng/mL inside lab range \u2014 flagged as low-for-load because you\u2019re in week 4 of a build block.",
  },
  {
    icon: Activity,
    heading: "Your HRV only makes sense with your training load",
    body: "HRV, resting HR, strain, sleep quality, and weekly volume read alongside your blood \u2014 because they\u2019re not separate problems.",
    example: "e.g. HRV at 38ms after four consecutive hard days is expected. The same number after a rest week is a signal.",
  },
  {
    icon: GitBranch,
    heading: "Every fix ordered by what moves your markers fastest",
    body: "Interventions ranked by impact given your current training phase \u2014 not a generic priority list.",
    example: "e.g. Iron before magnesium \u2014 because your HRV won\u2019t respond to sleep support while iron-restricted erythropoiesis is active.",
  },
];

export function TrustStrip() {
  return (
    <div className="py-16 px-4 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CARDS.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.heading}
              className="bg-[#111118] border border-white/10 rounded-xl p-6"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{
                duration: 0.5,
                ease: [0.16, 1, 0.3, 1],
                delay: i * 0.1,
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                style={{ background: "rgba(0,138,255,0.15)" }}
              >
                <Icon className="w-5 h-5 text-[--ion-blue]" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold text-white mb-2">{card.heading}</p>
              <p className="text-sm text-gray-300 leading-relaxed">{card.body}</p>
              <p className="border-t border-white/5 mt-4 pt-4 text-xs text-white/40 italic" style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{card.example}</p>
            </motion.div>
          );
        })}
      </div>

    </div>
  );
}

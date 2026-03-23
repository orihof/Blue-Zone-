/// components/landing/ConnectsWithPills.tsx
"use client";

import { Droplets, Upload } from "lucide-react";
import type { ReactNode } from "react";

const PILL =
  "flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[--stellar] hover:border-white/20 hover:bg-white/10 transition-all";

/* ── Integration list ── */

interface Integration {
  label: string;
  icon: ReactNode;
}

function BrandImg({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt=""
      width={16}
      height={16}
      className="w-4 h-4 object-contain flex-shrink-0"
    />
  );
}

const INTEGRATIONS: Integration[] = [
  { label: "WHOOP", icon: <BrandImg src="/icons/integrations/whoop.svg" /> },
  { label: "Oura Ring", icon: <BrandImg src="/icons/integrations/oura-ring-logo.png" /> },
  { label: "Apple Health", icon: <BrandImg src="/icons/integrations/apple-health-.png" /> },
  { label: "Garmin", icon: <BrandImg src="/icons/integrations/garmin.svg" /> },
  { label: "TrainingPeaks", icon: <BrandImg src="/icons/integrations/training-peakes.jpg" /> },
  { label: "Strava", icon: <BrandImg src="/icons/integrations/strava.svg" /> },
  { label: "CGM", icon: <Droplets className="w-4 h-4" strokeWidth={1.5} /> },
  { label: "Lab Upload", icon: <Upload className="w-4 h-4" strokeWidth={1.5} /> },
];

export function ConnectsWithPills() {
  return (
    <div className="flex justify-center gap-3 flex-wrap">
      {INTEGRATIONS.map((item) => (
        <div key={item.label} className={PILL}>
          {item.icon}
          {item.label}
        </div>
      ))}
    </div>
  );
}

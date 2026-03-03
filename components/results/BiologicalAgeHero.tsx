/// components/results/BiologicalAgeHero.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, ArrowRight } from "lucide-react";

interface BiologicalAgeNarrative {
  deltaFromChronological: number;
  headline: string;
  topDraggingUp: string[];
  topPullingDown: string[];
  sixMonthProjection: string;
}

interface BiologicalAgeHeroProps {
  biologicalAgeEstimate: number;
  chronologicalAge: number;
  narrative: BiologicalAgeNarrative;
}

export function BiologicalAgeHero({ biologicalAgeEstimate, chronologicalAge, narrative }: BiologicalAgeHeroProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 100);
    return () => clearTimeout(t);
  }, []);

  const isYounger = narrative.deltaFromChronological < 0;
  const deltaMagnitude = Math.abs(narrative.deltaFromChronological);

  return (
    <Card className="border border-slate-200 overflow-hidden">
      <div className={`h-1 w-full ${isYounger ? "bg-emerald-400" : "bg-amber-400"}`} />
      <CardContent className="pt-6 pb-6 space-y-5">
        {/* Hero number */}
        <div className="text-center space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Estimated Biological Age
          </p>
          <div
            className={`text-7xl font-black transition-all duration-700 ${
              revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            } ${isYounger ? "text-emerald-600" : "text-amber-600"}`}
          >
            {biologicalAgeEstimate}
          </div>
          <div className="flex items-center justify-center gap-2">
            <Badge
              className={`gap-1 text-sm px-3 py-1 ${
                isYounger
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                  : "bg-amber-100 text-amber-800 border-amber-200"
              }`}
              variant="outline"
            >
              {isYounger ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : (
                <TrendingUp className="w-3.5 h-3.5" />
              )}
              {isYounger ? `${deltaMagnitude} years younger` : `${deltaMagnitude} years older`} than your calendar age
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{narrative.headline}</p>
        </div>

        {/* Drivers */}
        <div className="grid sm:grid-cols-2 gap-4">
          {narrative.topPullingDown.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> Pulling it down
              </p>
              <ul className="space-y-1">
                {narrative.topPullingDown.map((item, i) => (
                  <li key={i} className="text-xs text-slate-600 flex gap-1.5">
                    <span className="text-emerald-400 font-bold">+</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {narrative.topDraggingUp.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Dragging it up
              </p>
              <ul className="space-y-1">
                {narrative.topDraggingUp.map((item, i) => (
                  <li key={i} className="text-xs text-slate-600 flex gap-1.5">
                    <span className="text-amber-400 font-bold">−</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Projection */}
        <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5">
          <ArrowRight className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 leading-relaxed">
            <span className="font-semibold">6-month projection: </span>
            {narrative.sixMonthProjection}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/// components/results/ClinicMapList.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClinicCard } from "./RecommendationCard";
import { List, Map as MapIcon } from "lucide-react";
import type { ClinicItem } from "@/lib/db/payload";

interface ClinicMapListProps {
  clinics: ClinicItem[];
  protocolId: string;
}

export function ClinicMapList({ clinics, protocolId }: ClinicMapListProps) {
  const [view, setView] = useState<"list" | "map">("list");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={view === "list" ? "default" : "outline"}
          className="gap-1.5 h-8 text-xs"
          onClick={() => setView("list")}
        >
          <List className="w-3 h-3" /> List
        </Button>
        <Button
          size="sm"
          variant={view === "map" ? "default" : "outline"}
          className="gap-1.5 h-8 text-xs"
          onClick={() => setView("map")}
        >
          <MapIcon className="w-3 h-3" /> Map
        </Button>
      </div>

      {view === "list" ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {clinics.map((c) => (
            <ClinicCard key={c.id} item={c} protocolId={protocolId} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 h-64 flex items-center justify-center">
          <div className="text-center space-y-2">
            <MapIcon className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm text-muted-foreground">
              {clinics.some((c) => c.placeId) ? (
                <a
                  href={`https://www.google.com/maps/search/longevity+clinic/@${clinics[0]?.city}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Open in Google Maps
                </a>
              ) : (
                "Allow location access to see clinics on a map"
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

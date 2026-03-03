/// components/results/ResultsTabs.tsx
"use client";

import { useState, useEffect } from "react";
import { RecommendationCard, ClinicCard } from "./RecommendationCard";
import { ClinicCardSkeleton } from "./Skeletons";
import type { ProtocolPayload, ClinicItem } from "@/lib/db/payload";
import { Pill, Droplets, Home, MapPin, Loader2 } from "lucide-react";

const TABS = [
  { id: "supplements", label: "Supplements", icon: Pill },
  { id: "nutrition", label: "Nutrition", icon: Droplets },
  { id: "home", label: "Home", icon: Home },
  { id: "clinics", label: "Clinics", icon: MapPin },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface ResultsTabsProps {
  payload: ProtocolPayload;
  protocolId: string;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-12 text-center text-muted-foreground text-sm">
      No {label} in this protocol. Try adjusting your goals or budget.
    </div>
  );
}

export function ResultsTabs({ payload, protocolId }: ResultsTabsProps) {
  const [active, setActive] = useState<TabId>("supplements");
  const [clinics, setClinics] = useState<ClinicItem[]>(payload.recommendations.clinics);
  const [clinicsLoading, setClinicsLoading] = useState(false);
  const [locationAsked, setLocationAsked] = useState(false);

  async function fetchNearbyClinics(lat: number, lng: number) {
    setClinicsLoading(true);
    try {
      const res = await fetch(`/api/clinics/nearby?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const { clinics: nearby } = await res.json();
        setClinics(nearby);
      }
    } catch {
      // keep default clinics
    } finally {
      setClinicsLoading(false);
    }
  }

  function requestLocation() {
    setLocationAsked(true);
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchNearbyClinics(pos.coords.latitude, pos.coords.longitude),
      () => setClinicsLoading(false)
    );
  }

  useEffect(() => {
    if (active === "clinics" && !locationAsked) {
      requestLocation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const { supplements, nutrition, home } = payload.recommendations;

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              active === id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon className="w-3.5 h-3.5 hidden sm:block" />
            {label}
          </button>
        ))}
      </div>

      {/* Supplements */}
      {active === "supplements" && (
        supplements.length === 0 ? (
          <EmptyState label="supplements" />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {supplements.map((s) => (
              <RecommendationCard key={s.id} item={s} protocolId={protocolId} />
            ))}
          </div>
        )
      )}

      {/* Nutrition */}
      {active === "nutrition" && (
        nutrition.length === 0 ? (
          <EmptyState label="nutrition items" />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {nutrition.map((n) => (
              <RecommendationCard key={n.id} item={n} protocolId={protocolId} />
            ))}
          </div>
        )
      )}

      {/* Home */}
      {active === "home" && (
        home.length === 0 ? (
          <EmptyState label="home tools" />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {home.map((h) => (
              <RecommendationCard key={h.id} item={h} protocolId={protocolId} />
            ))}
          </div>
        )
      )}

      {/* Clinics */}
      {active === "clinics" && (
        <div className="space-y-4">
          {clinicsLoading ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Finding clinics near you…
              </div>
              {[1, 2, 3].map((i) => <ClinicCardSkeleton key={i} />)}
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {locationAsked
                  ? "Clinics matching your protocol goals near your location"
                  : "Sample clinics — allow location access for personalized results"}
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {clinics.map((c) => (
                  <ClinicCard key={c.id} item={c} protocolId={protocolId} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

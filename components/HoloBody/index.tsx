"use client";
import { useState, useCallback, useMemo, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { HOTSPOTS, DEFAULT_FLAGGED } from "./hotspots";
import DataPanel from "./DataPanel";
import Scene from "./Scene";
import { MobileSilhouette } from "./MobileSilhouette";
import type { Hotspot, HoloBodyProps } from "./types";
import { useAnalytics } from "@/hooks/useAnalytics";

export default function HoloBody({
  flaggedOrgans = DEFAULT_FLAGGED,
  onCtaClick,
  className,
}: HoloBodyProps) {
  const { track } = useAnalytics();
  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null);
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false,
    [],
  );

  const handleHotspotClick = useCallback(
    (h: Hotspot, pos: { x: number; y: number }) => {
      setActiveHotspot(h);
      setPanelPos(pos);
      track("holo_hotspot_clicked", {
        organ_id: h.id,
        organ_label: h.label,
        is_flagged: flaggedOrgans.includes(h.id),
      });
    },
    [flaggedOrgans, track],
  );

  return (
    <div
      className={className}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      {!isMobile && (
        <Canvas
          camera={{ position: [0, 0.2, 2.6], fov: 44 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: "transparent" }}
          dpr={Math.min(
            typeof window !== "undefined" ? window.devicePixelRatio : 1,
            2,
          )}
          frameloop="always"
        >
          <Suspense fallback={null}>
            <Scene
              flaggedOrgans={flaggedOrgans}
              reduceMotion={prefersReducedMotion}
              onHotspotClick={handleHotspotClick}
              onHotspotHover={setHoveredId}
            />
          </Suspense>
        </Canvas>
      )}

      {isMobile && (
        <MobileSilhouette flaggedOrgans={flaggedOrgans} />
      )}

      {hoveredId && !isMobile && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 9,
            color: "var(--bz-cyan)",
            fontFamily: "var(--font-label)",
            letterSpacing: "0.1em",
            background: "rgba(5,10,31,0.85)",
            border: "1px solid rgba(0,212,255,0.4)",
            padding: "3px 8px",
            borderRadius: 3,
            pointerEvents: "none",
          }}
        >
          {HOTSPOTS.find((h) => h.id === hoveredId)?.label}
        </div>
      )}

      <DataPanel
        hotspot={activeHotspot}
        screenPos={panelPos}
        onClose={() => {
          setActiveHotspot(null);
          setPanelPos(null);
        }}
        onCtaClick={(id) => {
          onCtaClick?.(id);
          track("holo_protocol_cta", { organ_id: id });
        }}
      />
    </div>
  );
}

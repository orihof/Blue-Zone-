"use client";
import { Canvas } from "@react-three/fiber";
import { Suspense, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ORGAN_LABELS } from "@/lib/holo-organs";
import { SceneV2 } from "./SceneV2";
import { DataPanelV2 } from "./DataPanelV2";
import { analytics } from "@/lib/analytics";

interface HoloBodyProps {
  flaggedOrgans: string[];
  onCtaClick?: (organId: string) => void;
}

const CANVAS_POSITIONS: Record<string, { top: string; left: string }> = {
  knee_l: { top: "72%", left: "42%" },
  brain: { top: "12%", left: "50%" },
  shldr_r: { top: "30%", left: "60%" },
};

export function HoloBody({ flaggedOrgans }: HoloBodyProps) {
  const prefersReduced = useReducedMotion();
  const [activeOrgan, setActiveOrgan] = useState<string | null>(null);
  const [panelPosition, setPanelPosition] = useState({ x: 0, y: 0 });
  const triggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const handleHotspotActivate = (
    organId: string,
    pos: { x: number; y: number },
  ) => {
    setActiveOrgan(organId);
    setPanelPosition(pos);
    analytics.holoHotspotClicked(organId);
  };

  const handlePanelClose = () => {
    const organToReturn = activeOrgan;
    setActiveOrgan(null);
    if (organToReturn) {
      triggerRefs.current.get(organToReturn)?.focus();
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Canvas
        aria-hidden="true"
        role="presentation"
        style={{ width: "100%", height: "100%" }}
        camera={{ position: [0, 0, 5], fov: 45 }}
      >
        <Suspense fallback={null}>
          <SceneV2
            flaggedOrgans={flaggedOrgans}
            prefersReduced={prefersReduced ?? false}
          />
        </Suspense>
      </Canvas>

      {/* Screen reader summary — always in DOM, visually hidden */}
      <p className="sr-only">
        Interactive body visualization. {flaggedOrgans.length} health domain
        {flaggedOrgans.length !== 1 ? "s" : ""} flagged:{" "}
        {flaggedOrgans
          .map((id) => {
            const m = ORGAN_LABELS[id];
            return m ? `${m.label} (${m.domain} domain)` : id;
          })
          .join(", ")}
        . Use Tab to navigate flagged areas and Enter to open details.
      </p>

      {/* Keyboard-accessible hotspot buttons */}
      {flaggedOrgans.map((organId) => {
        const meta = ORGAN_LABELS[organId];
        if (!meta) return null;
        const pos = CANVAS_POSITIONS[organId] ?? {
          top: "50%",
          left: "50%",
        };
        return (
          <button
            key={organId}
            ref={(el) => {
              if (el) triggerRefs.current.set(organId, el);
            }}
            onClick={() =>
              handleHotspotActivate(organId, {
                x: parseInt(pos.left),
                y: parseInt(pos.top),
              })
            }
            aria-label={`${meta.label} \u2014 ${meta.domain} domain. Flagged. Activate to view details.`}
            aria-expanded={activeOrgan === organId}
            aria-controls={`data-panel-${organId}`}
            style={{
              position: "absolute",
              top: pos.top,
              left: pos.left,
              width: 44,
              height: 44,
              transform: "translate(-50%, -50%)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              borderRadius: "50%",
            }}
          />
        );
      })}

      {activeOrgan && (
        <DataPanelV2
          organId={activeOrgan}
          position={panelPosition}
          onClose={handlePanelClose}
        />
      )}
    </div>
  );
}

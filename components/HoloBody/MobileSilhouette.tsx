"use client";
import { useState } from "react";
import { ORGAN_LABELS, MOBILE_POSITIONS } from "@/lib/holo-organs";

interface MobileSilhouetteProps {
  flaggedOrgans: string[];
}

export function MobileSilhouette({ flaggedOrgans }: MobileSilhouetteProps) {
  const [activeOrgan, setActiveOrgan] = useState<string | null>(null);

  return (
    <div style={{ position: "relative" }}>
      <svg
        viewBox="0 0 200 400"
        width="100%"
        style={{ maxWidth: 200, margin: "0 auto", display: "block" }}
        role="img"
        aria-label="Human body silhouette showing flagged health domains"
      >
        <title>Body visualization &mdash; flagged health domains</title>
        {flaggedOrgans.map((organId) => {
          const pos = MOBILE_POSITIONS[organId];
          if (!pos) return null;
          const cx = (parseFloat(pos.left) / 100) * 200;
          const cy = (parseFloat(pos.top) / 100) * 400;
          return (
            <circle
              key={organId}
              cx={cx}
              cy={cy}
              r={8}
              fill="rgba(245,158,11,0.3)"
              stroke="#f59e0b"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          );
        })}
      </svg>

      {flaggedOrgans.map((organId) => {
        const meta = ORGAN_LABELS[organId];
        const pos = MOBILE_POSITIONS[organId] ?? {
          top: "50%",
          left: "50%",
        };
        const isOpen = activeOrgan === organId;
        return (
          <button
            key={organId}
            onClick={() => setActiveOrgan(isOpen ? null : organId)}
            aria-label={`${meta?.label ?? organId} \u2014 ${meta?.domain ?? ""} domain. Flagged.`}
            aria-expanded={isOpen}
            aria-controls={`mobile-panel-${organId}`}
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
              touchAction: "manipulation",
            }}
          />
        );
      })}

      {activeOrgan && (
        <div
          id={`mobile-panel-${activeOrgan}`}
          role="region"
          aria-label={`${ORGAN_LABELS[activeOrgan]?.label ?? ""} domain details`}
          aria-live="polite"
          style={{
            marginTop: 16,
            padding: 16,
            background: "var(--bz-surface)",
            border: "1px solid var(--bz-border-subtle)",
            borderRadius: 8,
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-label)",
              fontSize: 13,
              color: "var(--bz-text)",
              margin: "0 0 8px",
            }}
          >
            {ORGAN_LABELS[activeOrgan]?.label} &mdash;{" "}
            {ORGAN_LABELS[activeOrgan]?.domain}
          </h3>
          <button
            onClick={() => setActiveOrgan(null)}
            aria-label="Close domain details"
            style={{
              marginTop: 12,
              minHeight: 44,
              background: "none",
              border: "1px solid var(--bz-border-default)",
              borderRadius: 6,
              color: "var(--bz-text)",
              fontFamily: "var(--font-label)",
              fontSize: 12,
              padding: "8px 16px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

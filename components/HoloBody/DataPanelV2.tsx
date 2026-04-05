"use client";
import { useEffect, useRef } from "react";
import { ORGAN_LABELS } from "@/lib/holo-organs";

interface DataPanelProps {
  organId: string;
  position: { x: number; y: number };
  onClose: () => void;
}

export function DataPanelV2({ organId, onClose }: DataPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const meta = ORGAN_LABELS[organId];
  const titleId = `data-panel-title-${organId}`;

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const getFocusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      );

    getFocusable()[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const current = getFocusable();
        const first = current[0];
        const last = current[current.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      id={`data-panel-${organId}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      style={{
        position: "absolute",
        background: "var(--bz-elevated)",
        border: "1px solid var(--bz-border-default)",
        borderRadius: 8,
        padding: 20,
        width: 280,
        zIndex: 100,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <h2
          id={titleId}
          style={{
            fontFamily: "var(--font-label)",
            fontSize: 13,
            color: "var(--bz-text)",
            margin: 0,
          }}
        >
          {meta?.label} &mdash; {meta?.domain}
        </h2>
        <button
          onClick={onClose}
          aria-label={`Close ${meta?.label ?? ""} ${meta?.domain ?? ""} domain panel`}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--bz-muted)",
            fontSize: 18,
            padding: 4,
            minWidth: 44,
            minHeight: 44,
          }}
        >
          &times;
        </button>
      </div>
      <div style={{ marginTop: 12 }}>
        <a
          href={`/dashboard?focus=${organId}`}
          aria-label={`View full ${meta?.domain ?? ""} domain analysis`}
          style={{
            color: "var(--bz-cyan)",
            fontFamily: "var(--font-label)",
            fontSize: 12,
            textDecoration: "none",
          }}
        >
          View domain &rarr;
        </a>
      </div>
    </div>
  );
}

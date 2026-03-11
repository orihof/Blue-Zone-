/// components/dashboard/DetectedSignals.tsx
"use client";

import Link from "next/link";

interface Signal {
  id:       string;
  name:     string;
  value:    string;
  unit:     string;
  category: string;
  severity: "critical" | "attention";
}

interface DetectedSignalsProps {
  signals:     Signal[];
  hasLabData:  boolean;
  protocolId?: string;
}

export function DetectedSignals({ signals, hasLabData, protocolId }: DetectedSignalsProps) {
  return (
    <div className="signals-card">
      <div className="signals-card__header">
        <span className="signals-card__overline">Detected Signals</span>
        {signals.length > 0 && (
          <span className="signals-card__count">{signals.length} active</span>
        )}
      </div>

      {!hasLabData ? (
        <EmptyState />
      ) : signals.length === 0 ? (
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ui,'Inter',sans-serif)", padding: "12px 0" }}>
          No abnormal markers detected. Keep it up.
        </p>
      ) : (
        <div>
          {signals.map((s) => {
            const isCritical = s.severity === "critical";
            const dotColor   = isCritical ? "#EF4444" : "#F59E0B";
            return (
              <div key={s.id} className="signal-item">
                <div
                  className="signal-item__dot"
                  style={{
                    background: dotColor,
                    boxShadow:  `0 0 6px ${dotColor}99`,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div className="signal-item__name">
                    {s.name}: {s.value} {s.unit}
                  </div>
                  <div className="signal-item__detail">
                    {s.category} · {isCritical ? "Critical" : "Attention needed"}
                  </div>
                </div>
                {protocolId && (
                  <Link href={`/app/results/${protocolId}`} className="signal-item__link">
                    → Protocol
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <>
      {/* Radar animation */}
      <div className="signals-radar" aria-hidden="true">
        <div className="signals-radar__ring signals-radar__ring--1" />
        <div className="signals-radar__ring signals-radar__ring--2" />
        <div className="signals-radar__ring signals-radar__ring--3" />
        <div className="signals-radar__sweep" />
        <div className="signals-radar__center" />
      </div>

      {/* Ghost preview rows */}
      <div className="signals-ghost" aria-hidden="true">
        <div className="signals-ghost__item signals-ghost__item--attention" />
        <div className="signals-ghost__item signals-ghost__item--good" />
        <div className="signals-ghost__item signals-ghost__item--info" />
      </div>

      <div className="signals-card__empty-content">
        <p className="signals-card__empty-title">Awaiting lab data</p>
        <p className="signals-card__empty-body">
          Upload your results to detect biomarker signals and patterns.
        </p>
        <Link href="/app/onboarding/upload" className="signals-card__cta">
          Upload Lab Results →
        </Link>
      </div>
    </>
  );
}

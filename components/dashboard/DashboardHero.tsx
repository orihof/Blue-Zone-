/// components/dashboard/DashboardHero.tsx
"use client";

import { useMemo } from "react";
import { VitalityRing } from "./VitalityRing";

interface DashboardHeroProps {
  userName:          string;
  targetsCompleted:  number;
  targetsTotal:      number;
  attentionMetrics:  string[];   // e.g. ['HRV', 'Sleep Quality']
  vitalityScore?:    number;     // 0–100; undefined = no data yet
  hasProtocol:       boolean;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getAmbientGradient(): string {
  const h = new Date().getHours();
  if (h < 12)
    return "radial-gradient(ellipse 60% 40% at 70% -10%,rgba(99,102,241,0.12) 0%,transparent 70%)";
  if (h < 17)
    return "radial-gradient(ellipse 60% 40% at 70% -10%,rgba(34,211,238,0.08) 0%,transparent 70%)";
  return "radial-gradient(ellipse 60% 40% at 70% -10%,rgba(245,158,11,0.10) 0%,transparent 70%)";
}

export function DashboardHero({
  userName,
  targetsCompleted,
  targetsTotal,
  attentionMetrics,
  vitalityScore,
  hasProtocol,
}: DashboardHeroProps) {
  const subtitle = useMemo(() => {
    const parts: string[] = [];
    if (targetsCompleted > 0)
      parts.push(`${targetsCompleted} of ${targetsTotal} targets completed`);
    if (attentionMetrics.length > 0)
      parts.push(
        `${attentionMetrics.join(" & ")} ${attentionMetrics.length === 1 ? "needs" : "need"} attention today`,
      );
    if (parts.length === 0)
      return hasProtocol
        ? "Your protocol is active. Upload new data to refine it."
        : "Upload health data to generate your personal protocol.";
    return parts.join(" · ");
  }, [targetsCompleted, targetsTotal, attentionMetrics, hasProtocol]);

  return (
    <div className="dashboard-hero" style={{ background: getAmbientGradient() }}>
      <div className="dashboard-hero__text">
        <p className="dashboard-hero__overline">Living Dashboard</p>
        <h1 className="dashboard-hero__greeting">
          {getGreeting()}, {userName}.
        </h1>
        <p className="dashboard-hero__subtitle">{subtitle}</p>
      </div>

      {vitalityScore !== undefined && (
        <VitalityRing score={vitalityScore} />
      )}
    </div>
  );
}

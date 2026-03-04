/// components/results/ResultsPage.tsx
// Port of reference Results component.
// Uses CSS class-based styling (.card, .tab, .rec) from globals.css.
"use client";

import { useState } from "react";
import { RecommendationCard } from "@/components/RecommendationCard";
import type { CardAdoptionState } from "@/components/RecommendationCard";
import type { RecItem, ClinicItem } from "@/lib/db/payload";
import type { ProtocolPayload } from "@/lib/db/payload";
import type { Goal, BudgetTier, Preferences } from "@/lib/recommendations/generate";

const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const T = { text: "#F1F5F9", muted: "#64748B" };

interface Protocol {
  id:           string;
  selected_age: number;
  goals:        Goal[];
  budget:       BudgetTier;
  preferences:  Preferences;
  mode:         "demo" | "personal";
  created_at:   string;
}

type TabFilter = "all" | "pending" | "adopted" | "rejected";

interface ResultsPageProps {
  protocol: Protocol;
  payload:  ProtocolPayload;
}

export function ResultsPage({ protocol, payload }: ResultsPageProps) {
  const [statuses, setStatuses] = useState<Record<string, CardAdoptionState>>({});
  const [tab, setTab] = useState<TabFilter>("all");

  const allRecs: RecItem[] = [
    ...payload.recommendations.supplements,
    ...payload.recommendations.nutrition,
    ...payload.recommendations.home,
  ];

  const adopted  = allRecs.filter((r) => statuses[r.id] === "adopted").length;
  const rejected = allRecs.filter((r) => statuses[r.id] === "rejected").length;
  const pending  = allRecs.length - adopted - rejected;
  const pct      = allRecs.length > 0 ? Math.round((adopted / allRecs.length) * 100) : 0;

  function getStatus(id: string): CardAdoptionState { return statuses[id] ?? "pending"; }
  function handleAdopt(id: string)  { setStatuses((p) => ({ ...p, [id]: "adopted" })); }
  function handleReject(id: string) { setStatuses((p) => ({ ...p, [id]: "rejected" })); }
  function handleReset(id: string)  { setStatuses((p) => { const n = { ...p }; delete n[id]; return n; }); }

  function filterRecs(items: RecItem[]) {
    if (tab === "all")      return items;
    if (tab === "adopted")  return items.filter((r) => statuses[r.id] === "adopted");
    if (tab === "rejected") return items.filter((r) => statuses[r.id] === "rejected");
    return items.filter((r) => !statuses[r.id] || statuses[r.id] === "pending");
  }

  const createdDate = new Date(protocol.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div style={{ paddingBottom: 60 }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", marginBottom: 8, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const }}>MY PROTOCOL</div>
        <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(22px,3vw,32px)", color: T.text, marginBottom: 5, letterSpacing: "-.02em" }}>
          Your Optimization Protocol
        </h2>
        <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
          Generated {createdDate} · Age {protocol.selected_age} · {protocol.budget} budget
          {protocol.mode === "demo" && " · Demo"}
        </p>
      </div>

      {/* Analysis complete banner */}
      <div className="fu" style={{ background: "linear-gradient(135deg,rgba(16,185,129,.07),rgba(59,130,246,.07))", border: "1px solid rgba(16,185,129,.18)", borderRadius: 14, padding: "18px 22px", marginBottom: 24, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(16,185,129,.14)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>✓</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: 15, color: "#34D399", marginBottom: 2 }}>
            Analysis Complete — Personalized Protocol Ready
          </div>
          <div style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
            {allRecs.length} evidence-based recommendations generated from your unique biomarker profile.
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: 26, background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{pct}%</div>
          <div style={{ fontSize: 10, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>adopted</div>
        </div>
      </div>

      {/* Progress card */}
      <div className="card fu1" style={{ padding: 22, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: 14, color: T.text }}>Protocol Adherence</span>
          <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 12, color: "#A5B4FC", fontWeight: 300 }}>
            {adopted} adopted · {pending} pending · {rejected} dismissed
          </span>
        </div>
        <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden", marginBottom: 7 }}>
          <div style={{ height: "100%", borderRadius: 3, width: `${pct}%`, background: GRAD, transition: "width .7s cubic-bezier(.16,1,.3,1)", boxShadow: "0 0 10px rgba(99,102,241,.5)" }} />
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {[["#34D399", "Adopted", adopted], ["#6366F1", "Pending", pending], ["#475569", "Dismissed", rejected]].map(([c, l, v]) => (
            <span key={String(l)} style={{ fontSize: 11, color: String(c), fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>■ {String(l)}: {v}</span>
          ))}
        </div>
        {rejected > 0 && (
          <div style={{ marginTop: 11, fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, padding: "8px 12px", background: "rgba(99,102,241,.05)", borderRadius: 7, border: "1px solid rgba(99,102,241,.1)" }}>
            💡 {rejected} dismissed recommendation{rejected > 1 ? "s" : ""} excluded from next protocol update. Re-enable anytime.
          </div>
        )}
      </div>

      {/* Safety red flags */}
      {payload.safety?.redFlags && payload.safety.redFlags.length > 0 && (
        <div style={{ background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 14, padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 400, color: "#F87171", marginBottom: 6, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>⚠ Flags requiring attention</div>
          {payload.safety.redFlags.map((f, i) => (
            <div key={i} style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, marginBottom: 3 }}>{f}</div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 3, marginBottom: 18, background: "rgba(255,255,255,0.025)", padding: 3, borderRadius: 11, width: "fit-content" }}>
        {([["all", `All (${allRecs.length})`], ["pending", `Pending (${pending})`], ["adopted", `Adopted (${adopted})`], ["rejected", `Dismissed (${rejected})`]] as [TabFilter, string][]).map(([k, l]) => (
          <button key={k} className={`tab ${tab === k ? "on" : "off"}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* Supplements */}
      {payload.recommendations.supplements.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: 20, color: T.text, marginBottom: 12, letterSpacing: "-.01em" }}>Supplement Protocol</h3>
          {filterRecs(payload.recommendations.supplements).map((item, i) => (
            <RecommendationCard key={item.id} item={item}
              priority={i === 0 ? "high" : i <= 2 ? "medium" : "low"}
              adoptionState={getStatus(item.id)}
              onAdopt={handleAdopt} onReject={handleReject} onReset={handleReset} />
          ))}
          {filterRecs(payload.recommendations.supplements).length === 0 && (
            <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, padding: "12px 0" }}>No supplements match this filter.</p>
          )}
        </div>
      )}

      {/* Nutrition */}
      {payload.recommendations.nutrition.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: 20, color: T.text, marginBottom: 12, letterSpacing: "-.01em" }}>Nutrition Interventions</h3>
          {filterRecs(payload.recommendations.nutrition).map((item, i) => (
            <RecommendationCard key={item.id} item={item} priority={i === 0 ? "medium" : "low"}
              adoptionState={getStatus(item.id)}
              onAdopt={handleAdopt} onReject={handleReject} onReset={handleReset} />
          ))}
        </div>
      )}

      {/* Lifestyle */}
      {payload.recommendations.home.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: 20, color: T.text, marginBottom: 12, letterSpacing: "-.01em" }}>Lifestyle Protocols</h3>
          {filterRecs(payload.recommendations.home).map((item) => (
            <RecommendationCard key={item.id} item={item} priority="low"
              adoptionState={getStatus(item.id)}
              onAdopt={handleAdopt} onReject={handleReject} onReset={handleReset} />
          ))}
        </div>
      )}

      {/* Clinics */}
      {payload.recommendations.clinics.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: 20, color: T.text, marginBottom: 12, letterSpacing: "-.01em" }}>Recommended Clinics</h3>
          {payload.recommendations.clinics.map((clinic: ClinicItem) => (
            <div key={clinic.id} className="card" style={{ padding: "18px 22px", marginBottom: 12 }}>
              <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: 15, color: T.text, marginBottom: 4 }}>{clinic.name}</div>
              <div style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, marginBottom: 6 }}>{clinic.city} · {clinic.specialty.join(", ")}</div>
              <div style={{ fontSize: 12, color: "#94A3B8", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>{clinic.whyRelevant[0]}</div>
              {clinic.bookingUrl && (
                <div style={{ marginTop: 8, fontSize: 11, color: "#A5B4FC", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>{clinic.bookingUrl}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stack safety */}
      {payload.stackSafetyNotes?.length > 0 && (
        <div style={{ background: "rgba(245,158,11,.06)", border: "1px solid rgba(245,158,11,.20)", borderRadius: 14, padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 400, color: "#FCD34D", marginBottom: 6, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>⚡ Stack Safety Notes</div>
          {payload.stackSafetyNotes.map((note, i) => (
            <div key={i} style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, marginBottom: 3 }}>{note}</div>
          ))}
        </div>
      )}

      {/* Protocol update notice */}
      {(adopted > 0 || rejected > 0) && (
        <div className="card" style={{ padding: "18px 22px", marginTop: 8, display: "flex", gap: 14, alignItems: "center", border: "1px solid rgba(99,102,241,.18)", background: "rgba(99,102,241,.03)" }}>
          <div style={{ fontSize: 22 }}>🔄</div>
          <div>
            <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: 13, color: "#A5B4FC", marginBottom: 2 }}>
              Protocol updates at your next check-in
            </div>
            <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
              Future recommendations will adapt based on your adoption choices and new biomarker data.
            </div>
          </div>
        </div>
      )}

      {/* Legal disclaimer */}
      <div style={{ marginTop: 24, fontSize: 11, color: "#3D4F6E", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.6 }}>
        Blue Zone provides educational health information only. Nothing here constitutes medical advice, diagnosis, or treatment. Always consult a qualified clinician before beginning any supplement, dietary, or lifestyle protocol.
      </div>
    </div>
  );
}

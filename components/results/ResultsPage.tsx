/// components/results/ResultsPage.tsx
"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RecommendationCard } from "@/components/RecommendationCard";
import type { CardAdoptionState } from "@/components/RecommendationCard";
import type { RecItem, ClinicItem } from "@/lib/db/payload";
import type { ProtocolPayload } from "@/lib/db/payload";
import type { Goal, BudgetTier, Preferences } from "@/lib/recommendations/generate";
import type { CompetitionResult } from "@/lib/nutrient-competition";
import { CriticalValueGate }     from "@/app/components/CriticalValueGate";
import { PregnancySafetyBanner } from "@/app/components/PregnancySafetyBanner";
import { NutrientConflictPanel } from "@/app/components/NutrientConflictPanel";
import { OutcomeArcWidget }      from "@/app/components/OutcomeArcWidget";
import ProtocolTabs              from "@/components/protocol/ProtocolTabs";
import ProtocolSessionHero      from "@/components/protocol/ProtocolSessionHero";
import ProtocolMeta             from "@/components/protocol/ProtocolMeta";
import ProtocolRecommendationCard from "@/components/protocol/RecommendationCard";
import RecommendationTabs       from "@/components/protocol/RecommendationTabs";
import { useProtocolPhase }     from "@/hooks/useProtocolPhase";

const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const T = { text: "#F1F5F9", muted: "#64748B" };

// ── Health domain mapping (item 17) ───────────────────────────────────────
const DOMAIN_MAP: Record<string, string> = {
  immune: "immune function", bone: "bone density", foundational: "foundational health",
  sleep: "sleep quality", recovery: "physical recovery", stress: "stress resilience",
  heart: "cardiovascular health", inflammation: "systemic inflammation",
  energy: "cellular energy", mitochondria: "cellular energy", longevity: "longevity",
  aging: "healthy aging", strength: "muscle performance", muscle: "muscle performance",
  cognition: "cognitive performance", focus: "cognitive performance", calm: "cognitive performance",
  hormones: "hormonal balance", metabolic: "metabolic health", collagen: "tissue health",
  "anti-inflammatory": "systemic inflammation", mediterranean: "longevity nutrition",
  "air quality": "sleep environment", respiratory: "respiratory health", hrv: "recovery optimization",
};

function getTopDomains(recs: RecItem[]): string[] {
  const counts: Record<string, number> = {};
  recs.forEach((r) => r.tags.forEach((tag) => {
    const domain = DOMAIN_MAP[tag.toLowerCase().replace(/[↑↓]/g, "").trim()];
    if (domain) counts[domain] = (counts[domain] ?? 0) + 1;
  }));
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([d]) => d);
}

// ── Priority insight generation (item 14) ─────────────────────────────────
function buildPriorityInsight(supplements: RecItem[]): string | null {
  if (supplements.length === 0) return null;
  const top = supplements[0];
  return `Based on your profile, ${top.title} is your highest-leverage starting point. ${top.rationaleBullets[0]}`;
}

// ── Types ──────────────────────────────────────────────────────────────────
interface Protocol {
  id:           string;
  selected_age: number;
  goals:        Goal[];
  budget:       BudgetTier;
  preferences:  Preferences;
  mode:         "demo" | "personal";
  created_at:   string;
}

type TabFilter  = "all" | "pending" | "adopted" | "rejected";
type PrimaryTab = "daily" | "setup";

interface ResultsPageProps {
  protocol:             Protocol;
  payload:              ProtocolPayload;
  pregnancyStatus:      string;
  competitionConflicts: CompetitionResult[];
}

// ── Inner component (uses useSearchParams — needs Suspense) ────────────────
function ResultsPageInner({ protocol, payload, pregnancyStatus, competitionConflicts }: ResultsPageProps) {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const primaryTab = (searchParams.get("tab") as PrimaryTab) ?? "daily";

  const [statuses, setStatuses]       = useState<Record<string, CardAdoptionState>>({});
  const [filterTab, setFilterTab]     = useState<TabFilter>("all");
  const [showAll, setShowAll]         = useState(false);
  const [checkinDone, setCheckinDone] = useState(false);
  const { phase, advancePhase }      = useProtocolPhase();
  const firstCardRef                 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShowAll(localStorage.getItem("bz_has_adopted") === "true");
    const today = new Date().toDateString();
    if (localStorage.getItem("bz_checkin_date") === today) setCheckinDone(true);
  }, []);

  const allRecs: RecItem[] = [
    ...payload.recommendations.supplements,
    ...payload.recommendations.nutrition,
    ...payload.recommendations.home,
  ];

  const adopted  = allRecs.filter((r) => statuses[r.id] === "adopted").length;
  const rejected = allRecs.filter((r) => statuses[r.id] === "rejected").length;
  const pending  = allRecs.length - adopted - rejected;
  const pct      = allRecs.length > 0 ? Math.round((adopted / allRecs.length) * 100) : 0;

  // Persist first adoption (item 15)
  useEffect(() => {
    if (adopted > 0 && localStorage.getItem("bz_has_adopted") !== "true") {
      localStorage.setItem("bz_has_adopted", "true");
      setShowAll(true);
    }
  }, [adopted]);

  function getStatus(id: string): CardAdoptionState { return statuses[id] ?? "pending"; }
  function handleAdopt(id: string)  { setStatuses((p) => ({ ...p, [id]: "adopted" })); advancePhase(); }
  function handleReject(id: string) { setStatuses((p) => ({ ...p, [id]: "rejected" })); }
  function handleReset(id: string)  { setStatuses((p) => { const n = { ...p }; delete n[id]; return n; }); }

  function filterRecs(items: RecItem[]) {
    if (filterTab === "adopted")  return items.filter((r) => statuses[r.id] === "adopted");
    if (filterTab === "rejected") return items.filter((r) => statuses[r.id] === "rejected");
    if (filterTab === "pending")  return items.filter((r) => !statuses[r.id] || statuses[r.id] === "pending");
    return items;
  }

  function setPrimaryTab(tab: PrimaryTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
    setFilterTab("all");
  }

  // Content splits
  const dailySupplements  = filterRecs(payload.recommendations.supplements);
  const dailyNutrition    = filterRecs(payload.recommendations.nutrition);
  const setupItems        = filterRecs(payload.recommendations.home);
  const realClinics       = payload.recommendations.clinics.filter(
    (c: ClinicItem) => c.city && !c.city.toLowerCase().includes("your")
  );

  // Chain adoption momentum (item 24) — "core" = first 3 supplements
  const supplements    = payload.recommendations.supplements;
  const coreCount      = Math.min(3, supplements.length);
  const coreAdopted    = supplements.slice(0, coreCount).filter((s) => statuses[s.id] === "adopted").length;
  const corePct        = coreCount > 0 ? Math.round((coreAdopted / coreCount) * 100) : 0;

  // Collapsed view for supplements (item 15)
  const visibleSupplements = showAll ? dailySupplements : dailySupplements.slice(0, 2);
  const hiddenCount        = !showAll ? Math.max(0, dailySupplements.length - 2) : 0;

  // Filter tab counts for current primary tab
  const tabBase     = primaryTab === "daily"
    ? [...payload.recommendations.supplements, ...payload.recommendations.nutrition]
    : payload.recommendations.home;
  const tabAdopted  = tabBase.filter((r) => statuses[r.id] === "adopted").length;
  const tabRejected = tabBase.filter((r) => statuses[r.id] === "rejected").length;
  const tabPending  = tabBase.length - tabAdopted - tabRejected;

  // Generated content
  const topDomains      = getTopDomains([...payload.recommendations.supplements, ...payload.recommendations.nutrition]);
  const priorityInsight = buildPriorityInsight(payload.recommendations.supplements);
  const hasSleepTracker = payload.recommendations.home.some((h) => h.id === "sleep-tracker");

  return (
    <div style={{ paddingBottom: 60 }}>

      {/* Full-screen critical value gate — renders null when no active events */}
      <CriticalValueGate />

      {/* Check-in hero */}
      <ProtocolSessionHero
        checkInState={checkinDone ? "complete" : "pending"}
        topRecommendation={{
          title: payload.recommendations.supplements[0]?.title ?? "",
          detectedSignal: payload.recommendations.supplements[0]?.rationaleBullets[0] ?? "",
          category: "supplement",
        }}
        onCheckInSubmit={async (energy) => {
          await fetch("/api/checkin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ energy }),
          });
        }}
        onStartRecommendation={() => {}}
        onCheckInComplete={() => {
          setCheckinDone(true);
          localStorage.setItem("bz_checkin_date", new Date().toDateString());
          window.dispatchEvent(new CustomEvent("bz-checkin-done"));
        }}
      />

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", marginBottom: 8, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const }}>MY PROTOCOL</div>
        <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(22px,3vw,32px)", color: T.text, marginBottom: 5, letterSpacing: "-.02em" }}>
          Your Optimization Protocol
        </h2>
        <ProtocolMeta
          generatedAt={new Date(protocol.created_at)}
          focusAreas={topDomains}
        />
        {/* Health narrative (item 17) */}
        {topDomains.length > 0 && (
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.65, borderLeft: "2px solid rgba(99,102,241,.2)", paddingLeft: 10 }}>
            Your protocol is designed to address{" "}
            <span style={{ color: "#A5B4FC" }}>{topDomains[0]}</span>
            {topDomains[1] && <> and optimize <span style={{ color: "#A5B4FC" }}>{topDomains[1]}</span></>}.{" "}
            These {allRecs.length} interventions are ranked by projected impact on your biomarker profile.
          </p>
        )}
      </div>

      {/* Pregnancy safety banner — hidden for not_pregnant */}
      {pregnancyStatus !== "not_pregnant" && (
        <div style={{ marginBottom: 20 }}>
          <PregnancySafetyBanner
            pregnancyStatus={pregnancyStatus}
            blockedCount={0}
            cappedCount={0}
          />
        </div>
      )}

      {/* Analysis complete banner — hidden once phase 2 reached */}
      {phase === 1 && (
        <div className="fu" style={{ background: "linear-gradient(135deg,rgba(16,185,129,.07),rgba(59,130,246,.07))", border: "1px solid rgba(16,185,129,.18)", borderRadius: 14, padding: "18px 22px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(16,185,129,.14)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>✓</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: 15, color: "#34D399", marginBottom: 2 }}>
              Analysis Complete — Personalized Protocol Ready
            </div>
            <div style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
              {allRecs.length} evidence-based recommendations generated from your unique biomarker profile.
            </div>
          </div>
          <button
            type="button"
            onClick={() => firstCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
            style={{ textAlign: "right", flexShrink: 0, background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 100, background: "rgba(16,185,129,.12)", border: "1px solid rgba(16,185,129,.3)" }}>
              <span style={{ fontSize: 13, color: "#34D399", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400, whiteSpace: "nowrap" as const }}>
                See your starting point →
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Priority insight (item 14) */}
      {priorityInsight && (
        <div className="fu1" style={{ background: "rgba(99,102,241,.07)", border: "1px solid rgba(99,102,241,.22)", borderRadius: 14, padding: "16px 20px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 400, color: "#818CF8", marginBottom: 8, fontFamily: "var(--font-ui,'Inter',sans-serif)", letterSpacing: ".08em", textTransform: "uppercase" as const }}>🔬 Priority Insight</div>
          <div style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.65 }}>{priorityInsight}</div>
        </div>
      )}

      {/* ── Primary tabs (item 19) ── */}
      <ProtocolTabs
        activeTab={primaryTab === "setup" ? "sources" : "protocol"}
        onTabChange={(tab) => setPrimaryTab(tab === "sources" ? "setup" : "daily")}
        hasWearableConnected={payload.recommendations.home.length > 0}
        hasBloodTestUploaded={protocol.mode !== "demo"}
      />

      {/* ── Secondary filter tabs ── */}
      <RecommendationTabs
        total={tabBase.length}
        pending={tabPending}
        adopted={tabAdopted}
        deferred={tabRejected}
        activeTab={filterTab === "rejected" ? "deferred" : filterTab === "adopted" ? "adopted" : "all"}
        onTabChange={(tab) => {
          if (tab === "deferred") setFilterTab("rejected");
          else if (tab === "adopted") setFilterTab("adopted");
          else setFilterTab("all");
        }}
      />

      {/* ── Chain adoption momentum bar (item 24) ── */}
      {adopted > 0 && coreCount > 0 && (
        <div style={{ marginBottom: 18, padding: "14px 18px", borderRadius: 12, background: "rgba(16,185,129,.05)", border: "1px solid rgba(16,185,129,.15)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 400, letterSpacing: ".08em", color: "#34D399", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const }}>
              {coreAdopted === coreCount ? "✓ Foundation complete" : "Foundation building"}
            </span>
            <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 12, fontWeight: 400, color: "#34D399" }}>
              {coreAdopted} / {coreCount} core
            </span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 2, width: `${corePct}%`, background: "linear-gradient(90deg,#10B981,#34D399)", animation: "barFill .8s cubic-bezier(.16,1,.3,1) both" }} />
          </div>
          <div style={{ marginTop: 7, fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
            {coreAdopted === coreCount
              ? "Protocol adapting to your commitments — keep going."
              : `${coreCount - coreAdopted} more core supplement${coreCount - coreAdopted > 1 ? "s" : ""} to build your foundation`}
          </div>
        </div>
      )}

      {/* ══ DAILY PROTOCOL TAB ══════════════════════════════════════ */}
      {primaryTab === "daily" && (
        <>
          {/* Supplements with collapsed state (item 15) */}
          {payload.recommendations.supplements.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: 18, color: T.text, marginBottom: 12, letterSpacing: "-.01em" }}>
                Supplement Protocol
              </h3>
              {visibleSupplements.map((item, i) => {
                const isFirst = i === 0;
                const isLocked = phase === 1 && !isFirst;
                return (
                  <div
                    key={item.id}
                    ref={isFirst ? firstCardRef : undefined}
                    className={isLocked ? "pointer-events-none opacity-40 blur-[1px]" : ""}
                  >
                    <RecommendationCard item={item}
                      priority={isFirst ? "high" : i <= 1 ? "medium" : "low"}
                      adoptionState={getStatus(item.id)}
                      onAdopt={handleAdopt} onReject={handleReject} onReset={handleReset} />
                  </div>
                );
              })}

              {/* Phase 1 divider */}
              {phase === 1 && visibleSupplements.length > 1 && (
                <p className="py-4 text-center text-xs text-[#94A3B8]">
                  {visibleSupplements.length - 1} more recommendation{visibleSupplements.length - 1 > 1 ? "s" : ""} · Complete step 1 first
                </p>
              )}

              {/* Show all link — phase 1 override */}
              {phase === 1 && allRecs.length > 1 && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={advancePhase}
                    className="text-xs text-[#94A3B8] transition-colors hover:text-white"
                  >
                    Show all {allRecs.length} recommendations
                  </button>
                </div>
              )}

              {/* "See all" toggle — phase 2 collapsed supplements */}
              {phase === 2 && hiddenCount > 0 && (
                <button className="ghost"
                  onClick={() => setShowAll(true)}
                  style={{ width: "100%", marginTop: 6, textAlign: "center" as const, padding: "11px", fontSize: 13 }}>
                  See all {payload.recommendations.supplements.length} recommendations ↓
                </button>
              )}
              {dailySupplements.length === 0 && (
                <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, padding: "12px 0" }}>No supplements match this filter.</p>
              )}
            </div>
          )}

          {/* Nutrition */}
          {payload.recommendations.nutrition.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: 18, color: T.text, marginBottom: 12, letterSpacing: "-.01em" }}>Nutrition Interventions</h3>
              {dailyNutrition.map((item) => (
                <div key={item.id} className={phase === 1 ? "pointer-events-none opacity-40 blur-[1px]" : ""}>
                  <RecommendationCard item={item} priority="medium"
                    adoptionState={getStatus(item.id)}
                    onAdopt={handleAdopt} onReject={handleReject} onReset={handleReset} />
                </div>
              ))}
              {dailyNutrition.length === 0 && (
                <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, padding: "12px 0" }}>No nutrition items match this filter.</p>
              )}
            </div>
          )}

          {/* Nutrient interaction panel — below all recommendations in daily tab */}
          <NutrientConflictPanel conflicts={competitionConflicts} />
        </>
      )}

      {/* ══ OPTIMIZE YOUR SETUP TAB ═════════════════════════════════ */}
      {primaryTab === "setup" && (
        <>
          {/* Sleep tracker promotion (item 23) */}
          {hasSleepTracker && (
            <div style={{ marginBottom: 16, background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.22)", borderRadius: 14, padding: "12px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>📡</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#818CF8", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400, letterSpacing: ".08em", textTransform: "uppercase" as const, marginBottom: 3 }}>Unlock Better Insights</div>
                <div style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>Connect a wearable to unlock personalized sleep & HRV optimization across your protocol.</div>
              </div>
              <a href="/app/wearables" style={{ fontSize: 12, color: "#A5B4FC", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, whiteSpace: "nowrap" as const, textDecoration: "none" }}>
                Connect →
              </a>
            </div>
          )}

          {/* Home/product items */}
          {payload.recommendations.home.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: 18, color: T.text, marginBottom: 12, letterSpacing: "-.01em" }}>Environment & Tools</h3>
              {setupItems.map((item) => (
                <RecommendationCard key={item.id} item={item} priority="low"
                  adoptionState={getStatus(item.id)}
                  onAdopt={handleAdopt} onReject={handleReject} onReset={handleReset} />
              ))}
              {setupItems.length === 0 && (
                <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, padding: "12px 0" }}>No items match this filter.</p>
              )}
            </div>
          )}

          {/* Clinics */}
          {realClinics.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: 18, color: T.text, marginBottom: 12, letterSpacing: "-.01em" }}>Recommended Clinics</h3>
              {realClinics.map((clinic: ClinicItem) => (
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
        </>
      )}

      {/* Progress card (when adopted > 0) */}
      {adopted > 0 && (
        <div className="card" style={{ padding: 22, marginBottom: 20 }}>
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
      )}

      {/* Outcome arc widget */}
      <div style={{ marginBottom: 20 }}>
        <OutcomeArcWidget />
      </div>

      {/* Stack safety notes removed — safety notes now inline per RecommendationCard
         and a ProtocolDisclaimer banner handles the general disclaimer */}

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

// ── Exported wrapper with Suspense (required for useSearchParams) ──────────
export function ResultsPage(props: ResultsPageProps) {
  return (
    <Suspense fallback={<div style={{ paddingBottom: 60 }} />}>
      <ResultsPageInner {...props} />
    </Suspense>
  );
}


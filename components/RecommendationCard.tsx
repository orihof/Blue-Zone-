/// components/RecommendationCard.tsx
// Rec card with category-specific CTAs, timing prompt, priority visual tiers.
"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { RecItem } from "@/lib/db/payload";

export type CardAdoptionState = "pending" | "adopted" | "rejected";
export type Priority = "high" | "medium" | "low";

const T = { text: "#F1F5F9", muted: "#64748B" };
const TIMING_OPTIONS = ["Morning", "Afternoon", "Evening", "With meals"] as const;

const PRIORITY_LABEL_COLOR: Record<Priority, string> = {
  high:   "#FCA5A5",
  medium: "#FCD34D",
  low:    "#93C5FD",
};

function StatusBadge({ status }: { status: CardAdoptionState }) {
  if (status === "pending") return null;
  const adopted = status === "adopted";
  return (
    <span style={{
      padding: "2px 9px", borderRadius: 100, fontSize: 11, fontWeight: 400,
      background: adopted ? "rgba(16,185,129,.1)" : "rgba(100,116,139,.08)",
      color:      adopted ? "#34D399" : "#64748B",
      border:     `1px solid ${adopted ? "rgba(16,185,129,.28)" : "rgba(100,116,139,.2)"}`,
      fontFamily: "var(--font-ui,'Inter',sans-serif)",
    }}>
      {adopted ? "Adopted ✓" : "Dismissed"}
    </span>
  );
}

export interface RecommendationCardProps {
  item:          RecItem;
  priority?:     Priority;
  index?:        number;
  adoptionState: CardAdoptionState;
  onAdopt:       (id: string) => void;
  onReject:      (id: string) => void;
  onReset:       (id: string) => void;
}

export function RecommendationCard({
  item, priority = "low", adoptionState, onAdopt, onReject, onReset,
}: RecommendationCardProps) {
  const [expanded, setExpanded]       = useState(false);
  const [showTiming, setShowTiming]   = useState(false);
  const [timing, setTiming]           = useState<string | null>(null);
  const [justAdopted, setJustAdopted] = useState(false);
  const adopted  = adoptionState === "adopted";
  const rejected = adoptionState === "rejected";

  function handleAdopt() {
    if (adopted) {
      onReset(item.id);
      setShowTiming(false);
      setTiming(null);
    } else {
      onAdopt(item.id);
      if (item.category === "supplement") setShowTiming(true);
      setJustAdopted(true);
      setTimeout(() => setJustAdopted(false), 400);
    }
    fetch(`/api/recommendations/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: adopted ? "pending" : "adopted" }),
    }).catch(() => {/* silent — optimistic */});
  }

  function handleGroceryList() {
    try {
      const current = JSON.parse(localStorage.getItem("bz_grocery_list") || "[]") as { id: string; title: string }[];
      if (!current.find((i) => i.id === item.id)) {
        current.push({ id: item.id, title: item.title });
        localStorage.setItem("bz_grocery_list", JSON.stringify(current));
      }
    } catch { /* silent */ }
    onAdopt(item.id);
    toast.success(`"${item.title}" added to grocery list`);
  }

  function handleTiming(t: string) {
    setTiming(t);
    setShowTiming(false);
    fetch(`/api/recommendations/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timing: t }),
    }).catch(() => {/* silent — optimistic */});
  }

  function handleReject() {
    if (rejected) onReset(item.id);
    else          onReject(item.id);
    fetch(`/api/recommendations/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: rejected ? "pending" : "rejected" }),
    }).catch(() => {/* silent — optimistic */});
  }

  const cardClass = `rec ${priority}${adopted ? " adopted" : ""}${rejected ? " rejected" : ""}`;

  // Priority-based visual treatment (item 20)
  const bgStyle: React.CSSProperties["background"] =
    justAdopted
      ? "rgba(16,185,129,0.14)"
      : priority === "high" && !adopted && !rejected
      ? "radial-gradient(ellipse 80% 60% at top left, rgba(249,115,22,0.06) 0%, transparent 70%), #111827"
      : undefined;

  const cardStyle: React.CSSProperties = {
    animation: "fadeUp .45s cubic-bezier(.16,1,.3,1) both",
    transition: "background 0.35s ease",
    ...(priority === "low" && !adopted && !rejected ? { opacity: 0.88 } : {}),
    ...(bgStyle ? { background: bgStyle } : {}),
  };

  return (
    <div className={cardClass} style={cardStyle}>

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 7, flexWrap: "wrap" as const }}>
            <span style={{
              fontSize: 10,
              fontWeight: priority === "high" ? 600 : 400,
              letterSpacing: ".1em",
              fontFamily: "var(--font-ui,'Inter',sans-serif)",
              color: PRIORITY_LABEL_COLOR[priority],
            }}>
              {priority.toUpperCase()} PRIORITY
            </span>
            <span className="chip chip-p">{item.category}</span>
            <StatusBadge status={adoptionState} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
            <span style={{
              fontFamily: "var(--font-serif,'Syne',sans-serif)",
              fontWeight: 300,
              fontSize: priority === "low" ? 16 : 18,
              color: T.text,
              textDecoration: rejected ? "line-through" : "none",
            }}>
              {item.title}
            </span>
          </div>
          {item.howToUse && (
            <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, fontWeight: 400, color: "#A5B4FC", background: "rgba(99,102,241,.1)", padding: "2px 9px", borderRadius: 6 }}>
              {item.howToUse}
            </span>
          )}
        </div>
        <button
          onClick={() => setExpanded((e) => !e)}
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "7px 12px", color: T.muted, cursor: "pointer", fontSize: 11, whiteSpace: "nowrap" as const, flexShrink: 0, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, transition: "all .15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = T.text)}
          onMouseLeave={(e) => (e.currentTarget.style.color = T.muted)}>
          {expanded ? "Less ↑" : "Details ↓"}
        </button>
      </div>

      {/* Detected signal */}
      {item.rationaleBullets?.[0] && (
        <div style={{ background: "rgba(0,0,0,0.18)", borderRadius: 9, padding: "10px 14px", marginBottom: 14, borderLeft: "2px solid rgba(99,102,241,.28)" }}>
          <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", marginBottom: 3, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const }}>DETECTED SIGNAL</div>
          <div style={{ fontSize: 12, color: "#CBD5E1", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>{item.rationaleBullets[0]}</div>
        </div>
      )}

      {/* Biomarker chips */}
      {item.tags && item.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5, marginBottom: 14 }}>
          {item.tags.map((tag, i) => (
            <span key={i} className={`chip ${tag.includes("↑") ? "chip-r" : tag.includes("↓") ? "chip-a" : "chip-b"}`}>{tag}</span>
          ))}
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div style={{ animation: "fadeUp .28s ease both", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14, marginBottom: 14 }}>
          {[
            { l: "INTERPRETATION",  t: item.rationaleBullets?.slice(1).join(" ") || item.rationaleBullets?.[0] || "",  c: "#818CF8" },
            { l: "HOW TO USE",      t: item.howToUse || "",    c: "#A78BFA" },
            { l: "WHAT TO TRACK",   t: Array.isArray(item.whatToTrack) ? item.whatToTrack.join(", ") : (item.whatToTrack || ""), c: "#34D399" },
          ].filter((s) => s.t).map(({ l, t, c }) => (
            <div key={l} style={{ marginBottom: 13 }}>
              <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: c, marginBottom: 5, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const }}>{l}</div>
              <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.72, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>{t}</div>
            </div>
          ))}

          {item.whenToAvoid && item.whenToAvoid.some((w) => w && w !== "None" && !w.toLowerCase().startsWith("none")) && (
            <div style={{ marginBottom: 13 }}>
              <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#F87171", marginBottom: 5, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const }}>WHEN TO AVOID</div>
              {item.whenToAvoid.filter((w) => w && !w.toLowerCase().startsWith("none")).map((w, i) => (
                <div key={i} style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.72, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>{w}</div>
              ))}
            </div>
          )}

          {(item.links?.iherb || item.links?.amazon) && (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {item.links.iherb && (
                <a href={item.links.iherb} target="_blank" rel="noreferrer"
                  style={{ fontSize: 11, color: "#34D399", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
                  View on iHerb →
                </a>
              )}
              {item.links.amazon && (
                <a href={item.links.amazon} target="_blank" rel="noreferrer"
                  style={{ fontSize: 11, color: "#FCD34D", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
                  View on Amazon →
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── SUPPLEMENT CTAs ─────────────────────────────────── */}
      {item.category === "supplement" && (
        <>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" as const }}>
            <button className={`adopt-btn ${adopted ? "adopt-on" : "adopt-off"}`} onClick={handleAdopt}>
              {adopted && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1.5 6L5 9.5L10.5 2.5" stroke="#10B981" strokeWidth="2" strokeLinecap="round"
                    style={{ strokeDasharray: 20, animation: "drawCheck .35s ease both" }} />
                </svg>
              )}
              {adopted ? "Adopted — undo" : "I'm doing this"}
            </button>
            <button className={`reject-btn adopt-btn${rejected ? " reject-on" : ""}`} onClick={handleReject}>
              {rejected ? "↩ Re-enable" : "✕ Not for me"}
            </button>
          </div>

          {/* Timing micro-prompt */}
          {adopted && showTiming && (
            <div style={{ marginTop: 10, animation: "fadeUp .25s ease both" }}>
              <div style={{ fontSize: 11, color: "#A5B4FC", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, marginBottom: 6 }}>When do you take this?</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                {TIMING_OPTIONS.map((t) => (
                  <button key={t} onClick={() => handleTiming(t)}
                    style={{ fontSize: 11, padding: "4px 12px", borderRadius: 100, border: "1px solid rgba(99,102,241,.3)", background: "rgba(99,102,241,.08)", color: "#A5B4FC", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, transition: "all .15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99,102,241,.2)"; e.currentTarget.style.borderColor = "rgba(99,102,241,.6)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(99,102,241,.08)"; e.currentTarget.style.borderColor = "rgba(99,102,241,.3)"; }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
          {adopted && timing && !showTiming && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
              ⏰ {timing}
            </div>
          )}
        </>
      )}

      {/* ── NUTRITION CTAs ──────────────────────────────────── */}
      {item.category === "nutrition" && (
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" as const }}>
          <button className={`adopt-btn ${adopted ? "adopt-on" : "adopt-off"}`} onClick={handleAdopt}>
            {adopted ? "I do this ✓" : "I do this already"}
          </button>
          {!adopted && (
            <button
              onClick={handleGroceryList}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 400, cursor: "pointer", border: "1px solid rgba(99,102,241,.25)", background: "rgba(99,102,241,.06)", color: "#A5B4FC", fontFamily: "var(--font-ui,'Inter',sans-serif)", transition: "all .15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99,102,241,.14)"; e.currentTarget.style.borderColor = "rgba(99,102,241,.5)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(99,102,241,.06)"; e.currentTarget.style.borderColor = "rgba(99,102,241,.25)"; }}>
              + Grocery list
            </button>
          )}
          <button className={`reject-btn adopt-btn${rejected ? " reject-on" : ""}`} onClick={handleReject}>
            {rejected ? "↩ Re-enable" : "✕ Not for me"}
          </button>
        </div>
      )}

      {/* ── HOME/PRODUCT CTAs ───────────────────────────────── */}
      {item.category === "home" && (
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" as const, alignItems: "center" }}>
          <button className={`adopt-btn ${adopted ? "adopt-on" : "adopt-off"}`} onClick={handleAdopt}>
            {adopted ? "I own this ✓" : "I own this"}
          </button>
          {item.links?.amazon && (
            <a
              href={item.links.amazon} target="_blank" rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 400, border: "1px solid rgba(252,211,77,.25)", background: "rgba(252,211,77,.05)", color: "#FCD34D", fontFamily: "var(--font-ui,'Inter',sans-serif)", textDecoration: "none", transition: "background .15s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(252,211,77,.1)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(252,211,77,.05)"; }}>
              Shop on Amazon →
            </a>
          )}
          <button className={`reject-btn adopt-btn${rejected ? " reject-on" : ""}`} onClick={handleReject}>
            {rejected ? "↩ Re-enable" : "✕ Not for me"}
          </button>
        </div>
      )}

      {rejected && (
        <div style={{ marginTop: 10, fontSize: 11, color: "#475569", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, fontStyle: "italic" }}>
          Won&apos;t appear in next protocol update. Re-enable anytime.
        </div>
      )}
    </div>
  );
}

/// app/app/grocery/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface GroceryItem { id: string; title: string }

const T = { text: "#F1F5F9", muted: "#64748B" };

export default function GroceryPage() {
  const [items, setItems]       = useState<GroceryItem[]>([]);
  const [purchased, setPurchased] = useState<Set<string>>(new Set());
  const [loaded, setLoaded]     = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("bz_grocery_list");
      if (raw) setItems(JSON.parse(raw));
    } catch { /* silent */ }
    setLoaded(true);
  }, []);

  function markPurchased(id: string) {
    setPurchased((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); return next; }
      next.add(id);
      return next;
    });
  }

  function removeItem(id: string) {
    const next = items.filter((i) => i.id !== id);
    setItems(next);
    try { localStorage.setItem("bz_grocery_list", JSON.stringify(next)); } catch { /* silent */ }
  }

  function clearPurchased() {
    const remaining = items.filter((i) => !purchased.has(i.id));
    setItems(remaining);
    setPurchased(new Set());
    try { localStorage.setItem("bz_grocery_list", JSON.stringify(remaining)); } catch { /* silent */ }
  }

  if (!loaded) return null;

  return (
    <div className="px-4 lg:px-6 py-6 lg:py-8">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", marginBottom: 8, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>
          My Protocol
        </div>
        <h1 className="fu" style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(22px,3vw,30px)", color: T.text, marginBottom: 6, letterSpacing: "-.02em" }}>
          Grocery List
        </h1>
        <p className="fu1" style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
          Nutrition recommendations from your protocol. Check off as you shop.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="card fu2" style={{ padding: "32px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🛒</div>
          <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: 18, color: T.text, marginBottom: 8 }}>
            Your grocery list is empty
          </div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, marginBottom: 20 }}>
            Tap &quot;+ Grocery list&quot; on any nutrition recommendation in your protocol to add items here.
          </p>
          <Link href="/app/results">
            <button className="ghost" style={{ padding: "10px 24px" }}>Go to Protocol →</button>
          </Link>
        </div>
      ) : (
        <>
          {/* Progress indicator */}
          {purchased.size > 0 && (
            <div className="fu" style={{ marginBottom: 16, padding: "12px 18px", borderRadius: 12, background: "rgba(16,185,129,.07)", border: "1px solid rgba(16,185,129,.18)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "#34D399", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
                ✓ {purchased.size} of {items.length} purchased
              </span>
              <button
                onClick={clearPurchased}
                style={{ fontSize: 11, color: "#34D399", background: "rgba(16,185,129,.12)", border: "1px solid rgba(16,185,129,.28)", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
                Clear purchased
              </button>
            </div>
          )}

          {/* List */}
          <div className="card" style={{ padding: "8px 0", marginBottom: 20 }}>
            {items.map((item, i) => {
              const done = purchased.has(item.id);
              return (
                <div key={item.id}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 22px", borderBottom: i < items.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", animation: `fadeUp .35s cubic-bezier(.16,1,.3,1) ${i * .05}s both` }}>
                  {/* Checkbox */}
                  <button
                    onClick={() => markPurchased(item.id)}
                    style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: done ? "rgba(16,185,129,.15)" : "rgba(255,255,255,.04)", border: `1px solid ${done ? "rgba(16,185,129,.4)" : "rgba(255,255,255,.1)"}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 12, color: "#34D399", transition: "all .15s" }}>
                    {done && (
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <path d="M1.5 6L5 9.5L10.5 2.5" stroke="#10B981" strokeWidth="2" strokeLinecap="round"
                          style={{ strokeDasharray: 20, animation: "drawCheck .3s ease both" }} />
                      </svg>
                    )}
                  </button>

                  {/* Item info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: done ? T.muted : T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, textDecoration: done ? "line-through" : "none", transition: "all .2s" }}>
                      {item.title}
                    </div>
                    {done && (
                      <div style={{ fontSize: 11, color: "#34D399", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, marginTop: 2 }}>
                        Purchased ✓
                      </div>
                    )}
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(item.id)}
                    style={{ fontSize: 12, color: "#374151", background: "transparent", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, transition: "color .15s", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#F87171")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#374151")}>
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {/* CTA to protocol */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Link href="/app/results">
              <button className="ghost" style={{ padding: "10px 22px", fontSize: 13 }}>Back to Protocol</button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

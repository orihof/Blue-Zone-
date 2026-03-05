/// components/dashboard/GroceryListBanner.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface GroceryItem { id: string; title: string }

export function GroceryListBanner() {
  const [items, setItems] = useState<GroceryItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("bz_grocery_list");
      if (raw) setItems(JSON.parse(raw));
    } catch { /* silent */ }

    function onStorage() {
      try {
        const raw = localStorage.getItem("bz_grocery_list");
        setItems(raw ? JSON.parse(raw) : []);
      } catch { /* silent */ }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (items.length === 0) return null;

  return (
    <div style={{ marginBottom: 20, background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.2)", borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>🛒</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 400, letterSpacing: ".08em", color: "#818CF8", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 3 }}>
          Grocery List
        </div>
        <div style={{ fontSize: 13, color: "#CBD5E1", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
          {items.length} nutrition item{items.length > 1 ? "s" : ""} waiting to be purchased
        </div>
      </div>
      <Link href="/app/grocery"
        style={{ fontSize: 12, color: "#A5B4FC", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, whiteSpace: "nowrap", textDecoration: "none", padding: "7px 14px", borderRadius: 8, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.25)", transition: "background .15s" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,.2)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,.1)")}>
        View list →
      </Link>
    </div>
  );
}

/// components/consent/ConsentUpdateBanner.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

// Minimal shape we need from the consent status API response
interface ConsentStatusData {
  id:                   string;
  policy_version:       string;
  tier2_research:       boolean;
  tier2_research_types: string[];
  tier3_commercial:     boolean;
  tier3_partners:       unknown[];
}

export function ConsentUpdateBanner() {
  const [record,    setRecord]    = useState<ConsentStatusData | null>(null);
  const [visible,   setVisible]   = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    fetch("/api/consent/status")
      .then((r) => r.json())
      .then((data: unknown) => {
        // API returns ConsentRecord (has 'id') or { consent: null }
        if (data && typeof data === "object" && "id" in data) {
          const rec = data as ConsentStatusData;
          const currentVersion = process.env.NEXT_PUBLIC_POLICY_VERSION ?? "";
          if (rec.policy_version !== currentVersion) {
            setRecord(rec);
            setVisible(true);
          }
        }
      })
      .catch(() => { /* silently ignore fetch errors */ })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !visible || !record) return null;

  async function handleAcknowledge() {
    if (!record) return;
    setSaving(true);
    setSaveError(false);
    try {
      const res = await fetch("/api/consent/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier2_research:       record.tier2_research,
          tier2_research_types: record.tier2_research_types,
          tier3_commercial:     record.tier3_commercial,
          tier3_partners:       record.tier3_partners,
          method:               "policy_update_acknowledgment",
        }),
      });
      if (res.ok) {
        setVisible(false);
      } else {
        setSaveError(true);
      }
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="md:pl-[230px]" style={{
      width:        "100%",
      background:   "#0D1E35",
      borderBottom: "1px solid rgba(126,184,247,0.2)",
      padding:      "10px 20px",
      display:      "flex",
      alignItems:   "center",
      justifyContent: "space-between",
      flexWrap:     "wrap",
      gap:          10,
    }}>
      <span style={{ fontSize: 13, color: "#CBD5E1", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
        🔔 Our Privacy Policy was updated. Your existing data preferences are unchanged.
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {saveError && (
          <span style={{ fontSize: 12, color: "#F87171", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            Failed to save. Please try again.
          </span>
        )}
        <Link
          href="/app/settings/privacy"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 13, color: "#7EB8F7", textDecoration: "none", fontFamily: "var(--font-ui,'Inter',sans-serif)", whiteSpace: "nowrap" }}
        >
          See what changed →
        </Link>
        <button
          onClick={handleAcknowledge}
          disabled={saving}
          style={{
            background:   "#7EB8F7",
            color:        "#06090D",
            border:       "none",
            borderRadius: 8,
            padding:      "6px 16px",
            fontSize:     13,
            fontWeight:   500,
            cursor:       saving ? "wait" : "pointer",
            fontFamily:   "var(--font-ui,'Inter',sans-serif)",
            whiteSpace:   "nowrap",
            opacity:      saving ? 0.7 : 1,
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

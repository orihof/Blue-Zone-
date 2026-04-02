"use client";
import { useState } from "react";
import { useFeatureFlagVariantKey } from "posthog-js/react";
import BioAgeRing, { DEMO_DATA } from "@/components/BioAgeRing";
import EmailCapture from "@/components/EmailCapture";
import UrgencyBadge from "@/components/UrgencyBadge";
import BioAgeCardPreview from "@/components/BioAgeCardPreview";
import { useAnalytics } from "@/hooks/useAnalytics";

/* ── Static data ── */

const DOMAINS = [
  { label: "CARDIAC", metric: "52 bpm RHR", color: "var(--bz-cyan)", bars: 5 },
  {
    label: "VO\u2082MAX",
    metric: "61 ml/kg/min",
    color: "var(--bz-cyan)",
    bars: 5,
  },
  {
    label: "NEUROLOGICAL",
    metric: "Sleep 79%",
    color: "var(--bz-amber)",
    bars: 3,
  },
  {
    label: "METABOLIC",
    metric: "CRP 0.4 mg/L",
    color: "var(--bz-cyan)",
    bars: 5,
  },
  {
    label: "MUSCULOSKELETAL",
    metric: "Knee Risk HIGH",
    color: "var(--bz-amber)",
    bars: 2,
  },
  {
    label: "CIRCADIAN",
    metric: "Readiness 84%",
    color: "var(--bz-cyan)",
    bars: 4,
  },
] as const;

const WEARABLES = ["WHOOP", "OURA", "GARMIN", "APPLE HEALTH"] as const;

const SCIENCE_TAGS = [
  "\u2713 Longevity Biology",
  "\u2713 Exercise Physiology",
  "\u2713 Sleep Science",
  "\u2713 Epigenetics",
  "\u2713 Metabolic Health",
] as const;

const labelFont = "var(--font-label)";
const dataFont = "var(--font-data)";
const cyan = "var(--bz-cyan)";
const muted = "var(--bz-muted)";
const bg = "var(--bz-bg)";

export default function LeftColumnClient() {
  const [showAllDomains, setShowAllDomains] = useState(false);
  const { track } = useAnalytics();
  const ctaVariant =
    (useFeatureFlagVariantKey("landing_cta_copy") as string) ?? "control";
  const ctaLabels: Record<string, string> = {
    control: "Reveal My Biological Age \u2192",
    analysis: "Start Your Free Analysis \u2192",
    receipt: "Get The Receipt \u2192",
  };
  const ctaLabel = ctaLabels[ctaVariant] ?? ctaLabels.control;

  return (
    <>
      {/* Block 1 — HEADLINE */}
      <div>
        <div
          style={{
            fontSize: 10,
            fontFamily: labelFont,
            color: cyan,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 10,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: cyan,
              display: "inline-block",
            }}
            aria-hidden="true"
          />
          FOUNDING ATHLETE ACCESS
        </div>
        <h1
          className="bz-h1"
          style={{
            fontSize: 38,
            fontFamily: labelFont,
            fontWeight: 400,
            color: "#FFFFFF",
            lineHeight: 1.15,
            margin: "0 0 10px",
          }}
        >
          What&apos;s dragging your VO&#x2082;max?
        </h1>
        <p
          style={{
            fontSize: 15,
            fontFamily: labelFont,
            color: muted,
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Your complete biological readout. Every system. Every morning. Built
          with 18 world-class longevity scientists.
        </p>
      </div>

      {/* Block 2 — BIO AGE RING */}
      <div id="bio-age-ring-mount" className="bz-ring-wrap">
        <BioAgeRing
          {...DEMO_DATA}
          onRevealClick={() => {
            track("primary_cta_clicked", {
              source: "bio_age_ring",
              label: ctaLabel,
              variant: ctaVariant,
            });
            window.location.href = "/onboard";
          }}
        />
      </div>

      {/* Block 3 — SCIENTIFIC CREDIBILITY */}
      <div
        style={{
          background: "rgba(0,212,255,0.03)",
          border: "1px solid rgba(0,212,255,0.1)",
          borderRadius: 6,
          padding: "12px 14px",
        }}
      >
        <div
          style={{
            fontSize: 9,
            fontFamily: labelFont,
            color: cyan,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          SCIENTIFIC FOUNDATION
        </div>
        <p
          style={{
            fontSize: 11,
            fontFamily: labelFont,
            color: muted,
            lineHeight: 1.6,
            margin: "0 0 8px",
          }}
        >
          Built with an advisory council of{" "}
          <span style={{ color: "#FFFFFF", fontWeight: 500 }}>
            18 world-class scientists
          </span>{" "}
          in longevity, exercise physiology, sleep science, biological age
          measurement, and metabolic health.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {SCIENCE_TAGS.map((tag) => (
            <span
              key={tag}
              style={{ fontSize: 9, fontFamily: labelFont, color: muted }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Block 4 — DOMAIN CARDS */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {DOMAINS.map((d, idx) => (
          <div
            key={d.label}
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(0,212,255,0.15)",
              borderLeft: `3px solid ${d.color}`,
              borderRadius: 6,
              padding: "10px 14px",
              display: idx >= 4 && !showAllDomains ? "none" : "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 9,
                  fontFamily: labelFont,
                  color: muted,
                  letterSpacing: "0.06em",
                  marginBottom: 2,
                }}
              >
                {d.label}
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontFamily: dataFont,
                  fontWeight: 700,
                  color: "#FFFFFF",
                }}
              >
                {d.metric}
              </div>
            </div>
            <div
              className="bz-domain-bars"
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <div style={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 3,
                      height: 10,
                      borderRadius: 1,
                      background: d.color,
                      opacity: i < d.bars ? 1 : 0.2,
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: d.color,
                }}
              />
            </div>
          </div>
        ))}
        {!showAllDomains && (
          <button
            onClick={() => setShowAllDomains(true)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: cyan,
              fontSize: 9,
              fontFamily: labelFont,
              letterSpacing: "0.06em",
              marginTop: 4,
            }}
          >
            + 2 more domains
          </button>
        )}
      </div>

      {/* Block 5 — WEARABLES */}
      <div>
        <div
          style={{
            fontSize: 8,
            fontFamily: labelFont,
            color: muted,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          CONNECTS WITH
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {WEARABLES.map((w) => (
            <span
              key={w}
              style={{
                fontSize: 8,
                fontFamily: labelFont,
                color: muted,
                border: "1px solid rgba(0,212,255,0.2)",
                borderRadius: 20,
                padding: "3px 10px",
              }}
            >
              {w}
            </span>
          ))}
        </div>
      </div>

      {/* Block 6 — CTA */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          id="primary-cta"
          className="bz-cta-btn"
          aria-label="Reveal my Biological Age Score"
          onClick={() => {
            track("primary_cta_clicked", {
              source: "hero_left_column",
              label: ctaLabel,
              variant: ctaVariant,
            });
            window.location.href = "/onboard";
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: 46,
            background: cyan,
            color: bg,
            fontSize: 13,
            fontFamily: labelFont,
            fontWeight: 700,
            borderRadius: 6,
            textDecoration: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          {ctaLabel}
        </button>
        <div
          style={{
            fontSize: 10,
            fontFamily: labelFont,
            color: muted,
            textAlign: "center",
          }}
        >
          or
        </div>
        <div id="email-capture-form" className="bz-email-row">
          <EmailCapture />
        </div>
        <UrgencyBadge />
      </div>

      {/* Block 7 — BIO AGE CARD PREVIEW */}
      <BioAgeCardPreview />
    </>
  );
}

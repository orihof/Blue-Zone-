"use client";
import { useState, useEffect } from "react";
import { BioAgeRing } from "@/components/BioAgeRing/BioAgeRing";
import { EmailCapture } from "@/components/EmailCapture";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { analytics } from "@/lib/analytics";
import { useLiveRegion } from "@/lib/live-region";

const DOMAIN_CARDS = [
  { id: "cardiovascular", label: "Cardiovascular", metric: "VO\u2082 max \u00b7 HRV baseline" },
  { id: "sleep", label: "Sleep", metric: "REM \u00b7 circadian alignment" },
  { id: "hormonal", label: "Hormonal", metric: "Testosterone \u00b7 cortisol" },
  { id: "metabolic", label: "Metabolic", metric: "Glucose \u00b7 ApoB \u00b7 insulin" },
  { id: "recovery", label: "Recovery", metric: "CRP \u00b7 oxidative stress" },
  { id: "performance", label: "Performance", metric: "Training load \u00b7 readiness" },
  { id: "cognitive", label: "Cognitive", metric: "BDNF proxies \u00b7 sleep-cognition" },
  { id: "longevity", label: "Longevity", metric: "Bio age delta \u00b7 PhenoAge inputs" },
] as const;

const VISIBLE_COUNT = 4;

export default function LeftColumnClient() {
  const [showAllDomains, setShowAllDomains] = useState(false);
  const hiddenCount = DOMAIN_CARDS.length - VISIBLE_COUNT;
  const { announce } = useLiveRegion();

  useEffect(() => {
    announce("Page content loaded.");
  }, [announce]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p
        style={{
          fontFamily: "var(--font-label)",
          fontSize: 11,
          color: "var(--bz-muted)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          margin: 0,
        }}
      >
        For competitive athletes and biohackers
      </p>

      <h1
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: 48,
          fontWeight: 400,
          color: "var(--bz-text)",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          margin: 0,
        }}
      >
        You have the data.
        <br />
        You still don&apos;t have the answer.
      </h1>

      <p
        style={{
          color: "var(--bz-secondary)",
          fontSize: 18,
          lineHeight: 1.7,
          margin: 0,
        }}
      >
        Blood panels show what&apos;s out of range. Wearables show strain.
        Neither explains why your body isn&apos;t adapting. Blue Zone reads both
        together &mdash; and tells you{" "}
        <strong style={{ color: "var(--bz-cyan)" }}>exactly what to fix</strong>
        . In minutes.
      </p>

      <div id="bio-age-ring-mount" className="bio-age-ring-wrap">
        <BioAgeRing score={34} chronologicalAge={38} size={240} />
      </div>

      <section aria-label="Performance domains">
        <h2 className="sr-only">
          Your {DOMAIN_CARDS.length} performance domains
        </h2>

        <div
          id="domain-cards-container"
          style={{ display: "flex", flexDirection: "column", gap: 6 }}
        >
          {DOMAIN_CARDS.map((card, i) => (
            <div
              key={card.id}
              aria-hidden={
                i >= VISIBLE_COUNT && !showAllDomains ? true : undefined
              }
              style={{
                display:
                  i >= VISIBLE_COUNT && !showAllDomains ? "none" : "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid var(--bz-border-subtle)",
                background: "var(--bz-surface)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-label)",
                  fontSize: 12,
                  color: "var(--bz-text)",
                }}
              >
                {card.label}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-label)",
                  fontSize: 11,
                  color: "var(--bz-muted)",
                }}
              >
                {card.metric}
              </span>
            </div>
          ))}
        </div>

        {!showAllDomains && (
          <button
            onClick={() => setShowAllDomains(true)}
            aria-expanded={showAllDomains}
            aria-controls="domain-cards-container"
            className="domain-expand-btn"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--bz-cyan)",
              fontSize: 11,
              fontFamily: "var(--font-label)",
              letterSpacing: "0.06em",
              padding: "8px 0",
              minHeight: 44,
            }}
          >
            + {hiddenCount} more domains
          </button>
        )}
      </section>

      <div id="email-capture-form">
        <UrgencyBadge spotsLeft={50} />
        <EmailCapture />
      </div>

      <a
        href="/onboard"
        id="primary-cta"
        className="primary-cta"
        onClick={() => analytics.primaryCtaClicked()}
        aria-label="Reveal my biological age \u2014 go to onboarding"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 52,
          padding: "14px 24px",
          borderRadius: 8,
          background: "var(--bz-indigo)",
          color: "#fff",
          textDecoration: "none",
          fontFamily: "var(--font-label)",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Reveal My Biological Age &rarr;
      </a>
    </div>
  );
}

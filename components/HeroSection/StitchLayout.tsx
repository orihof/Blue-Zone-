import Link from "next/link";
import LandingDisclaimer from "@/components/LandingDisclaimer";
import {
  LeftColumnClient,
  RightColumnClient,
} from "./HeroColumns";
import styles from "./StitchLayout.module.css";

/* ── Static data for server-rendered right column panel ── */

const NEURO_METRICS = [
  {
    label: "Sleep Score",
    value: "79/100",
    arrow: "\u2193",
    arrowColor: "var(--bz-amber)",
  },
  {
    label: "HRV Trend",
    value: "\u22128%",
    arrow: "\u2193",
    arrowColor: "var(--bz-amber)",
  },
  {
    label: "Cognitive Load",
    value: "Medium",
    arrow: "\u2192",
    arrowColor: "var(--bz-teal)",
  },
] as const;

const labelFont = "var(--font-label)";
const dataFont = "var(--font-data)";
const cyan = "var(--bz-cyan)";
const muted = "var(--bz-muted)";

/* ── FAQ data for semantic section ── */

const FAQ = [
  {
    q: "What is a Biological Age Score?",
    a: "Your Biological Age Score is the age your body functions at, independent of your chronological age. Blue Zone calculates it by analyzing 8 health domains using biomarkers from your wearables and lab data.",
  },
  {
    q: "What devices does Blue Zone connect to?",
    a: "Blue Zone integrates with Whoop, Oura Ring, Garmin, and Apple Health. Wearable data feeds the AI analysis pipeline automatically each morning.",
  },
  {
    q: "How is Blue Zone different from InsideTracker or Function Health?",
    a: "Blue Zone combines continuous wearable data with an AI analysis layer built with 18 longevity scientists. Where other platforms report biomarkers, Blue Zone interprets them across all 8 domains and outputs a single actionable Biological Age Score with a specific improvement protocol.",
  },
  {
    q: "Who built Blue Zone?",
    a: "Blue Zone was built with an advisory council of 18 world-class scientists specializing in longevity, exercise physiology, sleep science, metabolic health, and biological age measurement.",
  },
];

export default function StitchLayout() {
  return (
    <div className={styles.wrapper}>
      {/* ═══════ NAV ═══════ */}
      <nav
        role="navigation"
        aria-label="Main navigation"
        style={{
          height: 56,
          background: "rgba(5,10,31,0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(0,212,255,0.2)",
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 18,
              fontFamily: labelFont,
              fontWeight: 700,
              color: cyan,
            }}
          >
            BZ
          </span>
          <span
            style={{
              fontSize: 11,
              fontFamily: labelFont,
              color: muted,
              letterSpacing: "0.12em",
            }}
          >
            BLUE ZONE
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            href="/auth/signin"
            className="bz-nav-login"
            style={{
              fontSize: 10,
              fontFamily: labelFont,
              color: cyan,
              border: `1px solid ${cyan}`,
              borderRadius: 4,
              padding: "6px 14px",
              textDecoration: "none",
              background: "transparent",
            }}
          >
            Log in
          </Link>
          <Link
            href="/onboard"
            style={{
              fontSize: 10,
              fontFamily: labelFont,
              fontWeight: 700,
              color: "var(--bz-bg)",
              background: cyan,
              borderRadius: 4,
              padding: "6px 14px",
              textDecoration: "none",
            }}
          >
            Start Free &rarr;
          </Link>
          <span
            style={{
              borderLeft: `1px solid ${muted}`,
              height: 20,
              margin: "0 4px",
            }}
            aria-hidden="true"
          />
          <Link
            href="/coaches"
            style={{
              fontSize: 9,
              fontFamily: labelFont,
              color: muted,
              textDecoration: "none",
            }}
          >
            For Coaches &rarr;
          </Link>
        </div>
      </nav>

      {/* ═══════ HERO ═══════ */}
      <div role="main" className={`${styles.hero} bz-hero-grid`}>
        {/* ─── LEFT COLUMN ─── */}
        <div className={`${styles.leftCol} bz-hero-left`}>
          <LeftColumnClient />
        </div>

        {/* ─── RIGHT COLUMN ─── */}
        <div className={`${styles.rightCol} bz-hero-right`}>
          {/* Centered oval — 3D body canvas */}
          <div
            id="holo-canvas-mount"
            className="stitch-canvas-zone"
            style={{
              width: "88%",
              height: "88%",
              border: "1px dashed rgba(0,212,255,0.3)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <RightColumnClient />
          </div>

          {/* Floating data panel (static preview) */}
          <div
            className={`${styles.floatingPanel} bz-float-panel`}
            style={{
              background: "rgba(5,10,31,0.95)",
              border: `1px solid ${cyan}`,
              borderRadius: 8,
              padding: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontFamily: labelFont,
                  color: cyan,
                  letterSpacing: "0.08em",
                }}
              >
                NEUROLOGICAL
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: muted,
                  cursor: "pointer",
                  lineHeight: 1,
                }}
                aria-hidden="true"
              >
                &times;
              </span>
            </div>
            <div
              style={{
                height: 1,
                background: "rgba(0,212,255,0.15)",
                marginBottom: 10,
              }}
            />
            {NEURO_METRICS.map((m) => (
              <div
                key={m.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      fontFamily: labelFont,
                      color: muted,
                      marginBottom: 1,
                    }}
                  >
                    {m.label}
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontFamily: dataFont,
                      fontWeight: 700,
                      color: "#FFFFFF",
                    }}
                  >
                    {m.value}
                  </div>
                </div>
                <span style={{ fontSize: 14, color: m.arrowColor }}>
                  {m.arrow}
                </span>
              </div>
            ))}
            <div
              style={{
                height: 1,
                background: "rgba(0,212,255,0.15)",
                marginBottom: 10,
              }}
            />
            <div
              style={{
                fontSize: 10,
                fontFamily: labelFont,
                color: cyan,
                cursor: "pointer",
              }}
            >
              View Full Protocol &rarr;
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ SEMANTIC SECTION ═══════ */}
      <section
        aria-label="About Blue Zone"
        style={{
          padding: "64px 40px",
          borderTop: "1px solid var(--bz-border)",
          background: "var(--bz-bg)",
        }}
      >
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: labelFont,
              fontSize: 22,
              color: "white",
              fontWeight: 400,
              marginBottom: 16,
            }}
          >
            What is Blue Zone?
          </h2>
          <p
            style={{
              fontFamily: labelFont,
              fontSize: 14,
              color: muted,
              lineHeight: 1.8,
              marginBottom: 32,
            }}
          >
            Blue Zone is an AI-powered longevity platform that calculates your{" "}
            <strong style={{ color: "var(--bz-text)" }}>
              Biological Age Score
            </strong>{" "}
            across 8 health domains: cardiovascular, metabolic, neurological,
            hormonal, inflammatory, immune, circadian, and musculoskeletal. It
            integrates with Whoop, Oura Ring, Garmin, and Apple Health to deliver
            a personalized Morning Readiness Score and protocol recommendations
            &mdash; built with an advisory council of{" "}
            <strong style={{ color: "var(--bz-text)" }}>
              18 world-class scientists
            </strong>{" "}
            in longevity, exercise physiology, sleep science, and biological age
            measurement.
          </p>

          <h2
            style={{
              fontFamily: labelFont,
              fontSize: 22,
              color: "white",
              fontWeight: 400,
              marginBottom: 24,
            }}
          >
            Frequently Asked Questions
          </h2>
          <dl
            style={{ display: "flex", flexDirection: "column", gap: 20 }}
          >
            {FAQ.map(({ q, a }) => (
              <div key={q}>
                <dt
                  style={{
                    fontFamily: labelFont,
                    fontSize: 13,
                    color: "white",
                    fontWeight: 500,
                    marginBottom: 6,
                  }}
                >
                  {q}
                </dt>
                <dd
                  style={{
                    fontFamily: labelFont,
                    fontSize: 13,
                    color: muted,
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ═══════ BOTTOM BAR ═══════ */}
      <footer
        style={{
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderTop: "1px solid rgba(0,212,255,0.1)",
          flexShrink: 0,
        }}
      >
        <LandingDisclaimer />
      </footer>
    </div>
  );
}

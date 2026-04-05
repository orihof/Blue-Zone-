import { LeftColumnClient, RightColumnClient } from "./HeroColumns";

function HeroNav() {
  return (
    <nav
      aria-label="Main navigation"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 24px",
        borderBottom: "1px solid var(--bz-border-subtle)",
      }}
    >
      <a
        href="/"
        aria-label="Blue Zone \u2014 go to homepage"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          textDecoration: "none",
          color: "var(--bz-text)",
          fontFamily: "var(--font-label)",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        <svg
          aria-hidden="true"
          focusable="false"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          style={{ display: "block" }}
        >
          <circle cx="10" cy="10" r="8" fill="currentColor" opacity="0.8" />
        </svg>
        Blue Zone
      </a>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <a
          href="/login"
          style={{
            color: "var(--bz-secondary)",
            textDecoration: "none",
            fontFamily: "var(--font-label)",
            fontSize: 12,
          }}
        >
          Log in
        </a>
        <a
          href="/onboard"
          aria-label="Get started with Blue Zone"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "8px 16px",
            borderRadius: 6,
            background: "var(--bz-indigo)",
            color: "#fff",
            textDecoration: "none",
            fontFamily: "var(--font-label)",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Get started &rarr;
        </a>
      </div>
    </nav>
  );
}

export default function StitchLayout() {
  return (
    <section aria-label="Blue Zone \u2014 biological age platform">
      <HeroNav />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 60% 50% at 70% 40%, rgba(99,102,241,0.06), transparent 65%)",
          zIndex: -1,
        }}
      />

      <div
        className="hero-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "38% 62%",
          gap: 36,
          padding: "48px 24px",
          maxWidth: 1200,
          margin: "0 auto",
          alignItems: "start",
        }}
      >
        {/* LEFT COLUMN */}
        <div>
          <LeftColumnClient />
        </div>

        {/* RIGHT COLUMN */}
        <div>
          <RightColumnClient />
        </div>
      </div>

      <p
        style={{
          fontSize: 10,
          color: "var(--bz-muted)",
          textAlign: "center",
          padding: "16px 24px",
          margin: 0,
        }}
        aria-label="Legal disclaimer: educational use only, not medical advice"
      >
        Educational use only. Not medical advice. Consult a physician before
        changing your protocol.
      </p>
    </section>
  );
}

/// app/demo/layout.tsx
// Public layout for /demo — same visual shell as the authenticated app,
// but no auth required. Includes a sticky conversion banner.
import Link from "next/link";

const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const GT = {
  background: GRAD,
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent" as const,
  backgroundClip: "text" as const,
};

const BANNER_H = 44;
const TOPNAV_H = 60;
const SIDEBAR_W = 210;
const OFFSET = BANNER_H + TOPNAV_H; // 104px

const DEMO_NAV = [
  { icon: "⬡", label: "Dashboard",  href: "#dashboard" },
  { icon: "◉", label: "Biomarkers", href: "#biomarkers" },
  { icon: "◫", label: "Trends",     href: "#trends" },
  { icon: "◻", label: "Products",   href: "#products" },
];

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#06080F" }}>

      {/* ── Conversion banner ─────────────────────────────────────────────── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 70, height: BANNER_H,
        background: GRAD,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px",
      }}>
        <div style={{
          fontSize: 12, color: "rgba(255,255,255,.92)",
          display: "flex", alignItems: "center", gap: 6,
          fontFamily: "var(--font-ui,'Inter',sans-serif)",
        }}>
          <span>🔍</span>
          <span>
            <strong>Demo Mode</strong> — this is sample data, not your actual biomarkers
          </span>
        </div>
        <Link href="/auth/signin">
          <button style={{
            padding: "5px 14px",
            background: "rgba(255,255,255,.2)",
            border: "1px solid rgba(255,255,255,.35)",
            borderRadius: 100, fontSize: 12, color: "#fff", cursor: "pointer",
            fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 500,
          }}>
            Get my real protocol →
          </button>
        </Link>
      </div>

      {/* ── Top nav ────────────────────────────────────────────────────────── */}
      <header style={{
        position: "sticky", top: BANNER_H, zIndex: 60, height: TOPNAV_H,
        display: "flex", alignItems: "center", padding: "0 28px",
        background: "rgba(6,8,15,0.9)", backdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, boxShadow: "0 0 18px rgba(99,102,241,0.4)" }}>
            ⬡
          </div>
          <span style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 18, letterSpacing: "-.02em", ...GT }}>
            Blue Zone
          </span>
        </Link>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/auth/signin"><button className="ghost">Sign in</button></Link>
          <Link href="/auth/signin"><button className="cta cta-sm">Get Started →</button></Link>
        </div>
      </header>

      {/* ── Body: sidebar + content ───────────────────────────────────────── */}
      <div style={{ display: "flex" }}>

        {/* Demo sidebar — sticky, visible at md+ */}
        <aside
          className="hidden md:flex"
          style={{
            width: SIDEBAR_W, flexShrink: 0, flexDirection: "column",
            position: "sticky", top: OFFSET, alignSelf: "flex-start",
            height: `calc(100vh - ${OFFSET}px)`, overflowY: "auto",
            background: "rgba(6,8,15,0.5)", backdropFilter: "blur(10px)",
            borderRight: "1px solid rgba(255,255,255,0.05)",
            padding: "20px 12px",
          }}
        >
          <div style={{ flex: 1 }}>
            {DEMO_NAV.map((it) => (
              <a key={it.href} href={it.href} className="nav-link" style={{ marginBottom: 2 }}>
                <span style={{ fontSize: 15 }}>{it.icon}</span>
                <span>{it.label}</span>
              </a>
            ))}
          </div>

          {/* Bottom CTA */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
            <Link href="/auth/signin" style={{ display: "block" }}>
              <button className="cta cta-sm" style={{ width: "100%", justifyContent: "center" }}>
                Start for free →
              </button>
            </Link>
            <p style={{
              fontSize: 10, color: "#64748B", textAlign: "center", marginTop: 10,
              fontFamily: "var(--font-ui,'Inter',sans-serif)", lineHeight: 1.6,
            }}>
              No credit card required.<br />
              Protocol ready in minutes.
            </p>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 px-4 md:px-6 lg:px-8 py-6 lg:py-8 overflow-x-hidden" style={{ flex: 1 }}>
          {children}
        </main>

      </div>
    </div>
  );
}

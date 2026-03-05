/// components/nav/AppNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import { LogOut, Settings, Menu, X } from "lucide-react";

const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const T = { muted: "#64748B", text: "#F1F5F9" };

interface AppNavProps {
  user: { name?: string | null; email?: string | null; image?: string | null };
  adherencePercent?: number;
}

const NAV_ITEMS = [
  { href: "/app/biomarkers", icon: "◉",  label: "My Data" },
  { href: "/app/results",    icon: "◈",  label: "My Protocol" },
  { href: "/app/dashboard",  icon: "⬡",  label: "Dashboard" },
  { href: "/app/wearables",  icon: "📡", label: "Wearables" },
  { href: "/app/trends",     icon: "◫",  label: "Trends" },
  { href: "/app/checkin",    icon: "◷",  label: "Check-in" },
  { href: "/app/products",   icon: "◻",  label: "Products" },
];

const MOBILE_TABS = NAV_ITEMS.slice(0, 5);

// ── Checkin status hook ─────────────────────────────────────────────────────
function useCheckinDone(): boolean {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const check = () => {
      setDone(localStorage.getItem("bz_checkin_date") === new Date().toDateString());
    };
    check();
    window.addEventListener("storage", check);
    window.addEventListener("bz-checkin-done", check);
    return () => {
      window.removeEventListener("storage", check);
      window.removeEventListener("bz-checkin-done", check);
    };
  }, []);

  return done;
}

// ── Checkin badge ───────────────────────────────────────────────────────────
function CheckinBadge({ done }: { done: boolean }) {
  if (done) {
    return (
      <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 100, background: "rgba(16,185,129,.18)", color: "#34D399", fontWeight: 400, transition: "all .3s" }}>
        ✓ Done
      </span>
    );
  }
  return (
    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 100, background: "rgba(239,68,68,.18)", color: "#F87171", fontWeight: 400 }}>
      Due
    </span>
  );
}

// ── Protocol Engagement ring ────────────────────────────────────────────────
function EngagementRing({ percent = 0, checkinDone }: { percent?: number; checkinDone: boolean }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const composite = Math.min(100, percent + (checkinDone ? 10 : 0));
  const pct = Math.max(0, composite);
  return (
    <div style={{ padding: "12px 14px", background: "rgba(99,102,241,.07)", borderRadius: 12, border: "1px solid rgba(99,102,241,.14)" }}>
      <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: T.muted, marginBottom: 10, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>
        Protocol Engagement
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <svg width="44" height="44" viewBox="0 0 44 44" style={{ filter: "drop-shadow(0 0 6px rgba(99,102,241,.45))" }}>
          <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
          <circle cx="22" cy="22" r={r} fill="none" stroke="url(#adh-grad)" strokeWidth="3"
            strokeDasharray={`${circ * (pct / 100)} ${circ}`} strokeLinecap="round"
            transform="rotate(-90 22 22)"
            style={{ transition: "stroke-dasharray .8s cubic-bezier(.16,1,.3,1)" }} />
          <defs>
            <linearGradient id="adh-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
          </defs>
        </svg>
        <div>
          <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 20, background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            {pct}%
          </div>
          <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            {checkinDone ? "check-in ✓" : "this week"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── User avatar ────────────────────────────────────────────────────────────────
function UserAvatar({ user, size = 32 }: { user: AppNavProps["user"]; size?: number }) {
  if (user.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.image} alt={user.name ?? ""} width={size} height={size} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  }
  const initials = (user.name ?? user.email ?? "?")[0].toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 400, fontFamily: "var(--font-ui,'Inter',sans-serif)", color: "#fff", flexShrink: 0 }}>
      {initials}
    </div>
  );
}

// ── Desktop sidebar ────────────────────────────────────────────────────────────
function Sidebar({ user, adherencePercent }: AppNavProps) {
  const pathname    = usePathname();
  const checkinDone = useCheckinDone();
  return (
    <aside style={{ width: 210, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.05)", padding: "20px 12px", position: "fixed", left: 0, top: 60, height: "calc(100vh - 60px)", overflowY: "auto", flexDirection: "column", background: "rgba(6,8,15,0.5)", backdropFilter: "blur(10px)", zIndex: 40 }}
      className="hidden md:flex">
      <div style={{ flex: 1 }}>
        {NAV_ITEMS.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          const isCheckin = it.href === "/app/checkin";
          return (
            <Link key={it.href} href={it.href} className={`nav-link${active ? " active" : ""}`}>
              <span style={{ fontSize: 15 }}>{it.icon}</span>
              <span style={{ flex: 1 }}>{it.label}</span>
              {isCheckin && <CheckinBadge done={checkinDone} />}
            </Link>
          );
        })}
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
        <EngagementRing percent={adherencePercent} checkinDone={checkinDone} />
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8, marginTop: 8 }}>
        <button onClick={() => signOut({ callbackUrl: "/" })}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: "transparent", border: "none", color: T.muted, cursor: "pointer", fontSize: 12, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#F87171")}
          onMouseLeave={(e) => (e.currentTarget.style.color = T.muted)}>
          <LogOut size={13} /> Sign out
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", marginTop: 4 }}>
          <UserAvatar user={user} size={24} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name ?? user.email}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ── Mobile nav ─────────────────────────────────────────────────────────────────
function MobileNav({ user }: AppNavProps) {
  const pathname    = usePathname();
  const checkinDone = useCheckinDone();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Top header */}
      <header className="md:hidden" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", background: "rgba(6,8,15,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⬡</div>
          <span style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 16, background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Blue Zone</span>
        </Link>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <UserAvatar user={user} size={28} />
          <button onClick={() => setDrawerOpen(true)} style={{ background: "transparent", border: "none", color: T.muted, cursor: "pointer", padding: 4 }}>
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(5,12,26,0.7)" }}
              onClick={() => setDrawerOpen(false)} />
            <motion.div key="drawer" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 36 }}
              style={{ position: "fixed", right: 0, top: 0, height: "100vh", width: 280, zIndex: 70, display: "flex", flexDirection: "column", background: "#0D1117", borderLeft: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <UserAvatar user={user} size={32} />
                  <div>
                    <div style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{user.name ?? user.email}</div>
                    {user.name && <div style={{ fontSize: 10, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{user.email}</div>}
                  </div>
                </div>
                <button onClick={() => setDrawerOpen(false)} style={{ background: "transparent", border: "none", color: T.muted, cursor: "pointer" }}>
                  <X size={16} />
                </button>
              </div>
              <nav style={{ flex: 1, padding: "12px 8px" }}>
                {NAV_ITEMS.map((it) => {
                  const active = pathname === it.href || pathname.startsWith(it.href + "/");
                  const isCheckin = it.href === "/app/checkin";
                  return (
                    <Link key={it.href} href={it.href} onClick={() => setDrawerOpen(false)}
                      className={`nav-link${active ? " active" : ""}`}
                      style={{ marginBottom: 2 }}>
                      <span style={{ fontSize: 15 }}>{it.icon}</span>
                      <span style={{ flex: 1 }}>{it.label}</span>
                      {isCheckin && <CheckinBadge done={checkinDone} />}
                    </Link>
                  );
                })}
              </nav>
              <div style={{ padding: "12px 8px 32px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <Link href="/app/settings" onClick={() => setDrawerOpen(false)}
                  className="nav-link" style={{ marginBottom: 2 }}>
                  <Settings size={14} /> Settings
                </Link>
                <button onClick={() => signOut({ callbackUrl: "/" })}
                  className="nav-link" style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", color: "#F87171" }}>
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom tab bar */}
      <nav className="md:hidden" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, display: "flex", alignItems: "stretch", height: 56, background: "rgba(6,8,15,0.9)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        {MOBILE_TABS.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link key={it.href} href={it.href} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, color: active ? "#A5B4FC" : T.muted, textDecoration: "none" }}>
              <span style={{ fontSize: 16 }}>{it.icon}</span>
              <span style={{ fontSize: 9, letterSpacing: "0.06em", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{it.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

// ── Top nav bar (shown on all pages at 60px) ───────────────────────────────────
function TopNav({ user }: AppNavProps) {
  return (
    <header className="hidden md:flex" style={{ position: "sticky", top: 0, zIndex: 50, height: 60, borderBottom: "1px solid rgba(255,255,255,0.05)", alignItems: "center", padding: "0 28px", background: "rgba(6,8,15,0.85)", backdropFilter: "blur(24px)" }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, boxShadow: "0 0 18px rgba(99,102,241,0.4)" }}>⬡</div>
        <span style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 18, letterSpacing: "-.02em", background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Blue Zone</span>
      </Link>
      <div style={{ flex: 1 }} />
      <UserAvatar user={user} size={32} />
    </header>
  );
}

// ── Export ─────────────────────────────────────────────────────────────────────
export function AppNav({ user, adherencePercent = 0 }: AppNavProps) {
  return (
    <>
      <TopNav user={user} adherencePercent={adherencePercent} />
      <Sidebar user={user} adherencePercent={adherencePercent} />
      <MobileNav user={user} />
    </>
  );
}

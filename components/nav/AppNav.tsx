/// components/nav/AppNav.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LogOut, Settings, Menu, X,
  Activity, Sparkles, LayoutDashboard, Watch, TrendingUp, ClipboardCheck, ShoppingBag,
} from "lucide-react";

const GRAD      = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const PERF_GRAD = "linear-gradient(135deg,#7C3AED 0%,#06B6D4 100%)";
const T         = { muted: "#64748B", text: "#F1F5F9" };
const ACTIVE_BG = "rgba(99,102,241,0.15)";

interface NavItem {
  href:  string;
  icon:  React.ElementType;
  label: string;
}
interface NavGroup {
  label: string | null;
  items: NavItem[];
}
interface AppNavProps {
  user: { name?: string | null; email?: string | null; image?: string | null };
  adherencePercent?: number;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { href: "/app/biomarkers", icon: Activity,       label: "My Data" },
      { href: "/app/results",    icon: Sparkles,        label: "My Protocol" },
      { href: "/app/dashboard",  icon: LayoutDashboard, label: "Dashboard" },
    ],
  },
  {
    label: "TRACK",
    items: [
      { href: "/app/wearables",  icon: Watch,          label: "Wearables" },
      { href: "/app/trends",     icon: TrendingUp,     label: "Trends" },
      { href: "/app/checkin",    icon: ClipboardCheck, label: "Check-in" },
    ],
  },
  {
    label: "SHOP",
    items: [
      { href: "/app/products",   icon: ShoppingBag,    label: "Products" },
    ],
  },
];

// Bottom nav: My Data | Protocol | [center Check-in] | Dashboard | Products
const BOTTOM_TABS: (NavItem | null)[] = [
  NAV_GROUPS[0].items[0],  // My Data
  NAV_GROUPS[0].items[1],  // My Protocol
  null,                     // center slot → Check-in
  NAV_GROUPS[0].items[2],  // Dashboard
  NAV_GROUPS[2].items[0],  // Products
];

const CHECKIN_ITEM = NAV_GROUPS[1].items[2]; // /app/checkin

// ── Checkin status hook ─────────────────────────────────────────────────────
function useCheckinDone(): boolean {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const check = () =>
      setDone(localStorage.getItem("bz_checkin_date") === new Date().toDateString());
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

// ── Check-in badge ──────────────────────────────────────────────────────────
function CheckinBadge({ done }: { done: boolean }) {
  if (done) {
    return (
      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 100, background: "rgba(16,185,129,.18)", color: "#34D399", fontWeight: 400 }}>
        ✓ Done
      </span>
    );
  }
  return (
    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 100, background: "rgba(6,182,212,.18)", color: "#22D3EE", fontWeight: 400 }}>
      Ready ✓
    </span>
  );
}

// ── Adherence Widget (3-state) ──────────────────────────────────────────────
function AdherenceWidget({ percent = 0, checkinDone }: { percent?: number; checkinDone: boolean }) {
  const composite = Math.min(100, percent + (checkinDone ? 10 : 0));

  // State 0: no meaningful data yet
  if (composite === 0) {
    return (
      <div style={{ padding: "12px 14px", background: "rgba(99,102,241,.07)", borderRadius: 12, border: "1px solid rgba(99,102,241,.14)" }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".12em", color: T.muted, marginBottom: 8, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>
          This Week
        </div>
        <Link href="/app/checkin" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <ClipboardCheck size={13} color="#6366F1" />
          <span style={{ fontSize: 12, color: "#A5B4FC", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            Log your first check-in
          </span>
        </Link>
      </div>
    );
  }

  // State 2: on track (≥70%)
  if (composite >= 70) {
    return (
      <div style={{ padding: "12px 14px", background: "rgba(16,185,129,.07)", borderRadius: 12, border: "1px solid rgba(16,185,129,.14)" }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".12em", color: T.muted, marginBottom: 8, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>
          Weekly Adherence
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 22, color: "#34D399" }}>
            {composite}%
          </div>
          <div style={{ fontSize: 11, color: "#34D399", fontFamily: "var(--font-ui,'Inter',sans-serif)", opacity: .8 }}>
            On track ✓
          </div>
        </div>
      </div>
    );
  }

  // State 1: building (0 < composite < 70) — progress bar
  return (
    <div style={{ padding: "12px 14px", background: "rgba(99,102,241,.07)", borderRadius: 12, border: "1px solid rgba(99,102,241,.14)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".12em", color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>
          Weekly Adherence
        </div>
        <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 14, background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          {composite}%
        </div>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${composite}%`, background: GRAD, borderRadius: 2, transition: "width .8s cubic-bezier(.16,1,.3,1)" }} />
      </div>
      <div style={{ fontSize: 10, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 6 }}>
        Building streak…
      </div>
    </div>
  );
}

// ── BZ monogram ─────────────────────────────────────────────────────────────
function BZMark({ size = 32 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.28), background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 18px rgba(99,102,241,0.4)", flexShrink: 0 }}>
      <span style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 700, fontSize: Math.round(size * 0.44), color: "#fff", letterSpacing: "-0.05em", lineHeight: 1 }}>BZ</span>
    </div>
  );
}

// ── User avatar ─────────────────────────────────────────────────────────────
function UserAvatar({ user, size = 32 }: { user: AppNavProps["user"]; size?: number }) {
  if (user.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.image} alt={user.name ?? ""} width={size} height={size} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  }
  const initials = (user.name ?? user.email ?? "?")[0].toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(size * 0.4), fontWeight: 400, fontFamily: "var(--font-ui,'Inter',sans-serif)", color: "#fff", flexShrink: 0 }}>
      {initials}
    </div>
  );
}

// ── Sidebar nav item ─────────────────────────────────────────────────────────
function SidebarItem({ it, active, isCheckin, checkinDone }: { it: NavItem; active: boolean; isCheckin: boolean; checkinDone: boolean }) {
  const [hovered, setHovered] = useState(false);
  const Icon = it.icon;
  return (
    <Link
      href={it.href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 13px",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: active ? 400 : 300,
        color: active ? "#fff" : hovered ? "#CBD5E1" : T.muted,
        background: active ? ACTIVE_BG : hovered ? "rgba(255,255,255,0.03)" : "transparent",
        textDecoration: "none",
        transition: "all .15s",
        fontFamily: "var(--font-ui,'Inter',sans-serif)",
        marginBottom: 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Icon size={15} color={active ? "#A5B4FC" : hovered ? "#CBD5E1" : T.muted} />
      <span style={{ flex: 1 }}>{it.label}</span>
      {isCheckin && <CheckinBadge done={checkinDone} />}
    </Link>
  );
}

// ── Desktop sidebar ─────────────────────────────────────────────────────────
function Sidebar({ user, adherencePercent }: AppNavProps) {
  const pathname    = usePathname();
  const checkinDone = useCheckinDone();
  return (
    <aside
      style={{ width: 210, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.05)", padding: "20px 12px", position: "fixed", left: 0, top: 60, height: "calc(100vh - 60px)", overflowY: "auto", flexDirection: "column", background: "rgba(6,8,15,0.5)", backdropFilter: "blur(10px)", zIndex: 40 }}
      className="hidden md:flex"
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} style={{ marginTop: gi > 0 ? 12 : 0 }}>
            {group.label && (
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: ".14em", color: T.muted, padding: "2px 13px 6px", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", opacity: .6 }}>
                {group.label}
              </div>
            )}
            {group.items.map((it) => {
              const active    = pathname === it.href || pathname.startsWith(it.href + "/");
              const isCheckin = it.href === "/app/checkin";
              return (
                <SidebarItem key={it.href} it={it} active={active} isCheckin={isCheckin} checkinDone={checkinDone} />
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
        <AdherenceWidget percent={adherencePercent} checkinDone={checkinDone} />
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8, marginTop: 8 }}>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: "transparent", border: "none", color: T.muted, cursor: "pointer", fontSize: 12, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#F87171")}
          onMouseLeave={(e) => (e.currentTarget.style.color = T.muted)}
        >
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

// ── Mobile nav ──────────────────────────────────────────────────────────────
function MobileNav({ user }: AppNavProps) {
  const pathname    = usePathname();
  const checkinDone = useCheckinDone();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Top header */}
      <header className="md:hidden" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", background: "rgba(6,8,15,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <BZMark size={28} />
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

              <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
                {NAV_GROUPS.map((group, gi) => (
                  <div key={gi} style={{ marginBottom: 8 }}>
                    {group.label && (
                      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: ".14em", color: T.muted, padding: "4px 13px 4px", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", opacity: .6 }}>
                        {group.label}
                      </div>
                    )}
                    {group.items.map((it) => {
                      const active    = pathname === it.href || pathname.startsWith(it.href + "/");
                      const Icon      = it.icon;
                      const isCheckin = it.href === "/app/checkin";
                      return (
                        <Link key={it.href} href={it.href} onClick={() => setDrawerOpen(false)}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", borderRadius: 10, fontSize: 13, fontWeight: active ? 400 : 300, color: active ? "#fff" : T.muted, background: active ? ACTIVE_BG : "transparent", textDecoration: "none", marginBottom: 1, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                          <Icon size={15} color={active ? "#A5B4FC" : T.muted} />
                          <span style={{ flex: 1 }}>{it.label}</span>
                          {isCheckin && <CheckinBadge done={checkinDone} />}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>

              <div style={{ padding: "12px 8px 32px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <Link href="/app/settings" onClick={() => setDrawerOpen(false)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", borderRadius: 10, fontSize: 13, fontWeight: 300, color: T.muted, textDecoration: "none", marginBottom: 4, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                  <Settings size={14} color={T.muted} /> Settings
                </Link>
                <button onClick={() => signOut({ callbackUrl: "/" })}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", borderRadius: 10, fontSize: 13, fontWeight: 300, color: "#F87171", background: "transparent", border: "none", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom tab bar */}
      <nav className="md:hidden" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        display: "flex", alignItems: "flex-end",
        minHeight: 64,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: "rgba(6,8,15,0.92)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.45)",
      }}>
        {BOTTOM_TABS.map((it) => {
          // Center slot → Check-in
          if (it === null) {
            const checkActive = pathname === CHECKIN_ITEM.href || pathname.startsWith(CHECKIN_ITEM.href + "/");
            if (!checkinDone) {
              // Raised FAB — check-in due
              return (
                <div key="checkin-fab" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingBottom: 10 }}>
                  <Link href="/app/checkin" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: "50%", background: PERF_GRAD, border: "2.5px solid rgba(13,17,23,1)", boxShadow: "0 -4px 20px rgba(99,102,241,0.55)", marginBottom: 0, marginTop: -18, textDecoration: "none" }}>
                    <ClipboardCheck size={22} color="#fff" />
                  </Link>
                  <span style={{ fontSize: 9, color: "#22D3EE", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 3, letterSpacing: "0.06em" }}>Check-in</span>
                </div>
              );
            }
            // Done → normal tab
            return (
              <Link key="checkin-done" href="/app/checkin" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingBottom: 10, gap: 2, color: checkActive ? "#A5B4FC" : T.muted, textDecoration: "none" }}>
                <ClipboardCheck size={18} color={checkActive ? "#A5B4FC" : T.muted} style={{ transform: checkActive ? "scale(1.1)" : "scale(1)", transition: "transform .2s" }} />
                <span style={{ fontSize: 9, letterSpacing: "0.06em", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>Check-in</span>
              </Link>
            );
          }

          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          const Icon   = it.icon;
          return (
            <Link key={it.href} href={it.href} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingBottom: 10, gap: 2, color: active ? "#A5B4FC" : T.muted, textDecoration: "none" }}>
              <Icon size={18} color={active ? "#A5B4FC" : T.muted} style={{ transform: active ? "scale(1.1)" : "scale(1)", transition: "transform .2s" }} />
              <span style={{ fontSize: 9, letterSpacing: "0.06em", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{it.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

// ── Top nav bar ─────────────────────────────────────────────────────────────
function TopNav({ user }: AppNavProps) {
  return (
    <header className="hidden md:flex" style={{ position: "sticky", top: 0, zIndex: 50, height: 60, borderBottom: "1px solid rgba(255,255,255,0.05)", alignItems: "center", padding: "0 28px", background: "rgba(6,8,15,0.85)", backdropFilter: "blur(24px)" }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
        <BZMark size={32} />
        <span style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 18, letterSpacing: "-.02em", background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Blue Zone</span>
      </Link>
      <div style={{ flex: 1 }} />
      <UserAvatar user={user} size={32} />
    </header>
  );
}

// ── Export ──────────────────────────────────────────────────────────────────
export function AppNav({ user, adherencePercent = 0 }: AppNavProps) {
  return (
    <>
      <TopNav user={user} adherencePercent={adherencePercent} />
      <Sidebar user={user} adherencePercent={adherencePercent} />
      <MobileNav user={user} />
    </>
  );
}

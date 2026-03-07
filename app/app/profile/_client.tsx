/// app/app/profile/_client.tsx
"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import {
  Camera, ChevronRight, ChevronDown, Settings,
  Sparkles, Target, Trophy, Watch,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────
interface ProfileData {
  name:                  string | null;
  tagline:               string | null;
  location:              string | null;
  prs:                   Record<string, string>;
  avatarUrl:             string | null;
  primaryGoal:           string | null;
  profileNudgeDismissed: boolean;
  goals:                 string[];
}

interface Protocol {
  id: string; label: string; budgetTier: number | null;
  createdAt: string; route: string; type: string;
}

interface Props {
  userId:           string;
  initialProfile:   ProfileData;
  email:            string;
  memberSince:      string | null;
  protocolCount:    number;
  totalCheckIns:    number;
  weekStreak:       number;
  protocols:        Protocol[];
  connectedDevices: { provider: string }[];
}

// ── Constants ────────────────────────────────────────────────────────────────
const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const T    = { text: "#F1F5F9", muted: "#64748B", sub: "#94A3B8" };

const GOAL_LABELS: Record<string, string> = {
  sports_prep:   "Competition Prep",
  sleep:         "Sleep Optimization",
  performance:   "Physical Performance",
  anti_aging:    "Anti-Aging",
  cognition:     "Sharper Thinking",
  hair:          "Hair Health",
  mood:          "Mood & Wellness",
  sexual_health: "Sexual Health",
  weight_loss:   "Weight Loss",
};

const DEVICE_LABELS: Record<string, string> = {
  whoop:        "WHOOP",
  oura:         "Oura Ring",
  garmin:       "Garmin",
  apple_health: "Apple Health",
  lumen:        "Lumen",
};

const PROTOCOL_LABELS: Record<string, string> = {
  triathlon: "Triathlon", running_race: "Running Race", cycling: "Cycling Event",
  mma: "MMA Competition", ski_racing: "Alpine Ski Racing", swimming: "Swimming",
  golf: "Golf Tournament",
  weight_loss: "Weight Loss", anti_aging: "Anti-Aging", performance: "Performance",
  sleep: "Sleep Optimization", cognition: "Cognition", hair: "Hair Health",
  mood: "Mood", sexual_health: "Sexual Health",
};

const PR_FIELDS = [
  { id: "marathon",        label: "Marathon"         },
  { id: "half_marathon",   label: "Half Marathon"    },
  { id: "10k",             label: "10K"              },
  { id: "5k",              label: "5K"               },
  { id: "triathlon_70_3",  label: "70.3 Triathlon"   },
  { id: "triathlon_140_6", label: "Ironman"          },
  { id: "cycling_ftp",     label: "Cycling FTP (W)"  },
  { id: "squat_1rm",       label: "Squat 1RM"        },
  { id: "deadlift_1rm",    label: "Deadlift 1RM"     },
];

const RELEVANT_PR_IDS: Record<string, string[]> = {
  sports_prep:   ["triathlon_70_3", "marathon", "cycling_ftp", "squat_1rm"],
  performance:   ["squat_1rm", "deadlift_1rm", "cycling_ftp", "5k"],
  sleep:         ["5k", "squat_1rm", "marathon", "cycling_ftp"],
  anti_aging:    ["5k", "squat_1rm", "marathon", "cycling_ftp"],
  cognition:     ["5k", "marathon", "squat_1rm", "cycling_ftp"],
  mood:          ["5k", "10k", "squat_1rm", "cycling_ftp"],
  sexual_health: ["squat_1rm", "deadlift_1rm", "5k", "cycling_ftp"],
  weight_loss:   ["5k", "10k", "marathon", "squat_1rm"],
};

function toLabel(s: string) {
  return PROTOCOL_LABELS[s] ?? s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  } catch { return iso; }
}

// ── Section wrapper ──────────────────────────────────────────────────────────
function Section({
  title, icon, children, action, collapsible, defaultCollapsed,
}: {
  title:            string;
  icon:             React.ReactNode;
  children:         React.ReactNode;
  action?:          { label: string; href: string };
  collapsible?:     boolean;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false);
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden", marginBottom: 12 }}>
      <div
        onClick={collapsible ? () => setCollapsed(c => !c) : undefined}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", cursor: collapsible ? "pointer" : "default" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: T.muted, display: "flex" }}>{icon}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {action && (
            <Link href={action.href} onClick={e => e.stopPropagation()}
              style={{ fontSize: 11, color: T.muted, textDecoration: "none", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#A5B4FC")}
              onMouseLeave={e => (e.currentTarget.style.color = T.muted)}>
              {action.label}
            </Link>
          )}
          {collapsible && (
            <ChevronDown size={14} color={T.muted}
              style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform .2s" }} />
          )}
        </div>
      </div>
      {!collapsed && (
        <div style={{ padding: "0 18px 16px" }}>{children}</div>
      )}
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
export function ProfileClient({
  initialProfile, email, memberSince,
  protocolCount, totalCheckIns, weekStreak,
  protocols, connectedDevices,
}: Props) {
  const router = useRouter();
  const [profile,      setProfile]      = useState(initialProfile);
  const [editMode,     setEditMode]     = useState(false);
  const [editName,     setEditName]     = useState(initialProfile.name ?? "");
  const [editTagline,  setEditTagline]  = useState(initialProfile.tagline ?? "");
  const [editLocation, setEditLocation] = useState(initialProfile.location ?? "");
  const [saving,       setSaving]       = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [showAllPRs,   setShowAllPRs]   = useState(false);
  const [editingPR,    setEditingPR]    = useState<string | null>(null);
  const [prDraft,      setPrDraft]      = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // ── Handlers ─────────────────────────────���────────────────────────────────
  async function handleSaveProfile() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:     editName.trim()     || null,
          tagline:  editTagline.trim()  || null,
          location: editLocation.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      setProfile(p => ({ ...p, name: editName.trim() || null, tagline: editTagline.trim() || null, location: editLocation.trim() || null }));
      setEditMode(false);
      toast.success("Profile saved");
    } catch { toast.error("Failed to save. Try again."); }
    finally { setSaving(false); }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5 MB"); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res  = await fetch("/api/profile/avatar", { method: "POST", body: form });
      const data = await res.json() as { avatarUrl?: string; error?: string };
      if (!res.ok) throw new Error(data.error);
      setProfile(p => ({ ...p, avatarUrl: data.avatarUrl! }));
      toast.success("Avatar updated");
    } catch { toast.error("Upload failed. Try again."); }
    finally {
      setUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  async function handlePRSave() {
    if (!editingPR) return;
    const newPrs = { ...profile.prs };
    if (prDraft.trim()) newPrs[editingPR] = prDraft.trim();
    else delete newPrs[editingPR];
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prs: newPrs }),
      });
      setProfile(p => ({ ...p, prs: newPrs }));
      toast.success("PR saved");
    } catch { toast.error("Failed to save"); }
    setEditingPR(null);
  }

  // Which PRs to show first (4 most relevant, rest behind "show more")
  const relevantIds = RELEVANT_PR_IDS[profile.primaryGoal ?? ""] ?? ["marathon", "5k", "squat_1rm", "cycling_ftp"];
  const orderedPRs  = [
    ...PR_FIELDS.filter(f => relevantIds.includes(f.id)),
    ...PR_FIELDS.filter(f => !relevantIds.includes(f.id)),
  ];
  const visiblePRs = showAllPRs ? orderedPRs : orderedPRs.slice(0, 4);

  const initial = (profile.name ?? email ?? "?")[0].toUpperCase();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 580, margin: "0 auto", padding: "20px 16px 120px" }}>

      {/* ── Identity Card ─────────────────────────────────────────────── */}
      <div style={{
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 20, overflow: "hidden", marginBottom: 12,
      }}>
        {/* Gradient strip */}
        <div style={{ height: 72, background: "linear-gradient(135deg,rgba(124,58,237,.35) 0%,rgba(20,184,166,.2) 100%)" }} />

        <div style={{ padding: "0 20px 20px" }}>
          {/* Avatar row */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14, marginTop: -36 }}>
            {/* Avatar */}
            <div style={{ position: "relative" }}>
              <div style={{
                width: 72, height: 72, borderRadius: 18,
                border: "3px solid #0D1117",
                background: profile.avatarUrl ? "transparent" : GRAD,
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", flexShrink: 0,
              }}>
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 28, fontWeight: 300, color: "#fff", fontFamily: "var(--font-serif,'Syne',sans-serif)" }}>
                    {initial}
                  </span>
                )}
              </div>
              {/* Camera button */}
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploading}
                style={{
                  position: "absolute", bottom: -4, right: -4,
                  width: 26, height: 26, borderRadius: "50%",
                  background: "#1E293B", border: "2px solid #0D1117",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: uploading ? "default" : "pointer", opacity: uploading ? 0.6 : 1,
                }}
              >
                <Camera size={11} color={T.muted} />
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
            </div>

            {/* Edit profile button */}
            {!editMode && (
              <button
                onClick={() => { setEditMode(true); setEditName(profile.name ?? ""); setEditTagline(profile.tagline ?? ""); setEditLocation(profile.location ?? ""); }}
                style={{ fontSize: 11, border: "1px solid rgba(255,255,255,.12)", color: T.muted, padding: "6px 14px", borderRadius: 8, background: "transparent", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.25)"; e.currentTarget.style.color = T.text; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.12)"; e.currentTarget.style.color = T.muted; }}
              >
                Edit profile
              </button>
            )}
          </div>

          {/* Name + tagline (display or edit) */}
          {editMode ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Name", val: editName, set: setEditName, placeholder: "Your name" },
                { label: "Tagline", val: editTagline, set: setEditTagline, placeholder: "e.g. Ironman athlete · biohacker" },
                { label: "Location", val: editLocation, set: setEditLocation, placeholder: "e.g. Tel Aviv, Israel" },
              ].map(({ label, val, set, placeholder }) => (
                <div key={label}>
                  <div style={{ fontSize: 9, color: T.muted, letterSpacing: ".1em", textTransform: "uppercase", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 6 }}>{label}</div>
                  <input
                    value={val}
                    onChange={e => set(e.target.value)}
                    placeholder={placeholder}
                    maxLength={80}
                    style={{
                      width: "100%", background: "transparent",
                      borderBottom: "1px solid rgba(255,255,255,.15)",
                      borderTop: "none", borderLeft: "none", borderRight: "none",
                      color: T.text, fontSize: 14, padding: "6px 0",
                      fontFamily: "var(--font-ui,'Inter',sans-serif)", outline: "none",
                    }}
                  />
                </div>
              ))}
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={handleSaveProfile} disabled={saving}
                  style={{ flex: 1, padding: "11px 0", borderRadius: 12, background: GRAD, color: "#fff", border: "none", cursor: saving ? "default" : "pointer", fontSize: 13, fontWeight: 500, fontFamily: "var(--font-ui,'Inter',sans-serif)", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
                <button onClick={() => setEditMode(false)}
                  style={{ fontSize: 12, color: T.muted, background: "transparent", border: "none", cursor: "pointer", padding: "0 12px", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 400, color: T.text, fontFamily: "var(--font-serif,'Syne',sans-serif)" }}>
                {profile.name ?? "Athlete"}
              </h1>
              {profile.tagline ? (
                <p style={{ fontSize: 13, color: T.muted, margin: "0 0 4px", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>{profile.tagline}</p>
              ) : (
                <button onClick={() => setEditMode(true)} style={{ fontSize: 12, color: "#334155", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 4, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontStyle: "italic" }}>
                  Add a tagline…
                </button>
              )}
              {profile.location && (
                <p style={{ fontSize: 12, color: "#475569", margin: "0 0 16px", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>📍 {profile.location}</p>
              )}
              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: profile.location ? 0 : 16 }}>
                {[
                  { label: "Protocols",  value: protocolCount },
                  { label: "Check-ins",  value: totalCheckIns },
                  { label: "Wk streak",  value: `${weekStreak}w` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "rgba(255,255,255,.04)", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 300, color: T.text, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", lineHeight: 1 }}>{value}</div>
                    <div style={{ fontSize: 10, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 4, letterSpacing: ".04em" }}>{label}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── My Goals ──────────────────────────────────────────────────── */}
      <Section title="My Goals" icon={<Target size={15} />}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {profile.goals.length > 0 ? profile.goals.map(g => (
            <span key={g} style={{
              fontSize: 12, padding: "5px 14px", borderRadius: 100,
              background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.25)",
              color: "#A5B4FC", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300,
            }}>
              {GOAL_LABELS[g] ?? toLabel(g)}
            </span>
          )) : (
            <span style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontStyle: "italic" }}>No goal set yet</span>
          )}
          <Link href="/onboarding/goal" style={{
            fontSize: 12, padding: "5px 14px", borderRadius: 100,
            border: "1px dashed rgba(255,255,255,.15)", color: T.muted,
            textDecoration: "none", fontFamily: "var(--font-ui,'Inter',sans-serif)",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.3)"; e.currentTarget.style.color = T.sub; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.15)"; e.currentTarget.style.color = T.muted; }}
          >
            + Update goal
          </Link>
        </div>
      </Section>

      {/* ── Personal Records ──────────────────────────────────────────── */}
      <Section title="Personal Records" icon={<Trophy size={15} />}>
        <div>
          {visiblePRs.map(field => (
            <div key={field.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,.05)",
            }}>
              <span style={{ fontSize: 13, color: T.sub, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>{field.label}</span>

              {editingPR === field.id ? (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    autoFocus
                    value={prDraft}
                    onChange={e => setPrDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handlePRSave(); if (e.key === "Escape") setEditingPR(null); }}
                    placeholder="e.g. 3:42:15"
                    style={{
                      background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.15)",
                      borderRadius: 8, padding: "4px 10px", color: T.text, fontSize: 12,
                      fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", width: 110, outline: "none",
                    }}
                  />
                  <button onClick={handlePRSave} style={{ fontSize: 11, color: "#34D399", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>Save</button>
                  <button onClick={() => setEditingPR(null)} style={{ fontSize: 11, color: T.muted, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>×</button>
                </div>
              ) : profile.prs[field.id] ? (
                <button onClick={() => { setEditingPR(field.id); setPrDraft(profile.prs[field.id]); }}
                  style={{ fontSize: 13, color: T.text, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#A5B4FC")}
                  onMouseLeave={e => (e.currentTarget.style.color = T.text)}>
                  {profile.prs[field.id]}
                </button>
              ) : (
                <button onClick={() => { setEditingPR(field.id); setPrDraft(""); }}
                  style={{ fontSize: 12, color: "#334155", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontStyle: "italic" }}
                  onMouseEnter={e => (e.currentTarget.style.color = T.muted)}
                  onMouseLeave={e => (e.currentTarget.style.color = "#334155")}>
                  Add →
                </button>
              )}
            </div>
          ))}
          {!showAllPRs && orderedPRs.length > 4 && (
            <button onClick={() => setShowAllPRs(true)}
              style={{ marginTop: 10, fontSize: 12, color: T.muted, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
              Show {orderedPRs.length - 4} more…
            </button>
          )}
        </div>
      </Section>

      {/* ── Protocol History ──────────────────────────────────────────── */}
      {protocols.length > 0 && (
        <Section title="Protocol History" icon={<Sparkles size={15} />}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {protocols.map(p => (
              <div
                key={p.id}
                onClick={() => router.push(p.route)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 12px", borderRadius: 12, cursor: "pointer",
                  background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)",
                  transition: "background .15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.06)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.03)")}
              >
                <div>
                  <div style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400 }}>
                    {toLabel(p.label)}
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, marginTop: 2 }}>
                    {fmtDate(p.createdAt)}{p.budgetTier ? ` · Tier ${p.budgetTier}` : ""}
                  </div>
                </div>
                <ChevronRight size={14} color={T.muted} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Connected Devices ─────────────────────────────────────────── */}
      <Section title="Connected Devices" icon={<Watch size={15} />} action={{ label: "Manage", href: "/app/wearables" }}>
        {connectedDevices.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {connectedDevices.map(d => (
              <span key={d.provider} style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 12, padding: "5px 14px", borderRadius: 100,
                background: "rgba(20,184,166,.08)", border: "1px solid rgba(20,184,166,.2)",
                color: "#2DD4BF", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2DD4BF", flexShrink: 0 }} />
                {DEVICE_LABELS[d.provider] ?? d.provider}
              </span>
            ))}
          </div>
        ) : (
          <Link href="/app/wearables" style={{ fontSize: 13, color: T.muted, textDecoration: "none", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontStyle: "italic" }}>
            Connect your first device →
          </Link>
        )}
      </Section>

      {/* ── Account ───────────────────────────────────────────────────── */}
      <Section title="Account" icon={<Settings size={15} />} collapsible defaultCollapsed>
        <div>
          {[
            { label: "Email", value: email },
            { label: "Member since", value: memberSince ? fmtDate(memberSince) : "—" },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
              <span style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>{label}</span>
              <span style={{ fontSize: 12, color: T.sub, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>{value}</span>
            </div>
          ))}
          <Link href="/app/settings" style={{ display: "block", marginTop: 12, fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", textDecoration: "none" }}>
            Privacy & data settings →
          </Link>
          <button onClick={() => signOut({ callbackUrl: "/" })}
            style={{ marginTop: 8, fontSize: 13, color: "#F87171", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            Sign out
          </button>
        </div>
      </Section>

    </div>
  );
}

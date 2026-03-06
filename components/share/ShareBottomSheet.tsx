/// components/share/ShareBottomSheet.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Link2, Twitter, Check } from "lucide-react";
import { toast } from "sonner";

const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const T    = { text: "#F1F5F9", muted: "#64748B" };

interface ShareBottomSheetProps {
  isOpen:  boolean;
  onClose: () => void;
}

export function ShareBottomSheet({ isOpen, onClose }: ShareBottomSheetProps) {
  const [code,   setCode]   = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Lazy-load referral code when sheet opens
  useEffect(() => {
    if (!isOpen || code) return;
    fetch("/api/referral/code")
      .then(r => r.json())
      .then((d: { code: string }) => setCode(d.code))
      .catch(() => {});
  }, [isOpen, code]);

  const referralUrl = useCallback(() => {
    if (typeof window === "undefined" || !code) return "";
    return `${window.location.origin}/r/${code}`;
  }, [code]);

  async function handleCopyLink() {
    const url = referralUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Couldn't copy — please copy manually.");
    }
  }

  function handleShareX() {
    const url  = referralUrl();
    const text = encodeURIComponent(
      `I'm using Blue Zone to optimize my health with AI-powered protocols. Join me 👇`
    );
    const href = `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`;
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=400");
    onClose();
  }

  async function handleNativeShare() {
    const url = referralUrl();
    if (!url) return;
    try {
      await navigator.share({
        title: "Blue Zone — AI Health Protocol",
        text:  "Check out Blue Zone — personalized longevity protocols built around your bloodwork and wearable data.",
        url,
      });
    } catch { /* user cancelled */ }
    onClose();
  }

  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(5,12,26,0.7)" }}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 38 }}
            style={{
              position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 91,
              background: "#111827",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "20px 20px 0 0",
              padding: "20px 20px max(28px,env(safe-area-inset-bottom))",
              fontFamily: "var(--font-ui,'Inter',sans-serif)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: T.text }}>Invite a friend</div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 2, fontWeight: 300 }}>
                  Share your personal referral link
                </div>
              </div>
              <button
                onClick={onClose}
                style={{ background: "rgba(255,255,255,.07)", border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: T.muted, display: "flex", alignItems: "center" }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Referral URL preview */}
            {code && (
              <div style={{
                padding: "10px 14px", borderRadius: 10,
                background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)",
                fontSize: 12, color: T.muted, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
                marginBottom: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {typeof window !== "undefined" ? window.location.origin : ""}/r/<span style={{ color: "#A5B4FC" }}>{code}</span>
              </div>
            )}

            {/* Action rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Copy link */}
              <ActionRow
                icon={copied ? <Check size={16} color="#34D399" /> : <Link2 size={16} color="#A5B4FC" />}
                label={copied ? "Copied!" : "Copy referral link"}
                sublabel="Share your personal invite URL"
                onClick={handleCopyLink}
                highlight={!copied}
              />

              {/* Native share (mobile) */}
              {canNativeShare && (
                <ActionRow
                  icon={<span style={{ fontSize: 16 }}>↗</span>}
                  label="Share via…"
                  sublabel="Messages, WhatsApp, email and more"
                  onClick={handleNativeShare}
                />
              )}

              {/* Twitter/X */}
              <ActionRow
                icon={<Twitter size={16} color="#1DA1F2" />}
                label="Share on X / Twitter"
                sublabel="Post a pre-written tweet"
                onClick={handleShareX}
              />
            </div>

            {/* Referral stats hint */}
            {code && (
              <p style={{ fontSize: 11, color: "#334155", marginTop: 16, textAlign: "center", fontWeight: 300 }}>
                Every friend who joins counts toward your referral score
              </p>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Reusable action row ────────────────────────────────────────────────────────
function ActionRow({
  icon, label, sublabel, onClick, highlight = false,
}: {
  icon:       React.ReactNode;
  label:      string;
  sublabel?:  string;
  onClick:    () => void;
  highlight?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 14,
        padding: "12px 14px", borderRadius: 12, border: "none", cursor: "pointer",
        background: hovered
          ? (highlight ? "rgba(99,102,241,.18)" : "rgba(255,255,255,.06)")
          : (highlight ? "rgba(99,102,241,.1)"  : "rgba(255,255,255,.03)"),
        textAlign: "left" as const, transition: "background .15s",
        outline: highlight ? `1px solid rgba(99,102,241,${hovered ? ".35" : ".2"})` : "none",
      }}
    >
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 13, color: highlight ? "#A5B4FC" : T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400 }}>
          {label}
        </div>
        {sublabel && (
          <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, marginTop: 2 }}>
            {sublabel}
          </div>
        )}
      </div>
    </button>
  );
}

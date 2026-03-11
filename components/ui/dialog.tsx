/// components/ui/dialog.tsx
// Minimal shadcn-compatible Dialog built on framer-motion + React createPortal.
// Drop-in replacement for @radix-ui/react-dialog without the Radix dependency.
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

// ── Context ───────────────────────────────────────────────────────────────────
const DialogCtx = createContext<{ onClose: () => void }>({ onClose: () => {} });

// ── Dialog (root) ─────────────────────────────────────────────────────────────
export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const close = () => onOpenChange(false);

  return createPortal(
    <DialogCtx.Provider value={{ onClose: close }}>
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={close}
              style={{
                position: "fixed", inset: 0, zIndex: 9998,
                background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
              }}
            />
            {/* Content positioner */}
            <div style={{
              position: "fixed", inset: 0, zIndex: 9999,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "16px", pointerEvents: "none",
            }}>
              <motion.div
                key="content"
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                onClick={(e) => e.stopPropagation()}
                style={{ pointerEvents: "auto", width: "100%", maxWidth: 420 }}
              >
                <DialogContent>{children}</DialogContent>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </DialogCtx.Provider>,
    document.body,
  );
}

// ── DialogContent ─────────────────────────────────────────────────────────────
export function DialogContent({ children }: { children: ReactNode }) {
  return (
    <div style={{
      background: "#0C0C18",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 20,
      padding: "24px",
      boxShadow: "0 24px 80px rgba(0,0,0,0.65)",
    }}>
      {children}
    </div>
  );
}

// ── DialogHeader ──────────────────────────────────────────────────────────────
export function DialogHeader({ children }: { children: ReactNode }) {
  return <div style={{ marginBottom: 20 }}>{children}</div>;
}

// ── DialogTitle ───────────────────────────────────────────────────────────────
export function DialogTitle({ children }: { children: ReactNode }) {
  return (
    <p style={{
      fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 800,
      color: "rgba(255,255,255,0.92)", lineHeight: 1.2, marginBottom: 4,
    }}>
      {children}
    </p>
  );
}

// ── DialogDescription ─────────────────────────────────────────────────────────
export function DialogDescription({ children }: { children: ReactNode }) {
  return (
    <p style={{
      fontFamily: "'Syne', sans-serif", fontSize: 12,
      color: "rgba(255,255,255,0.35)", lineHeight: 1.5,
    }}>
      {children}
    </p>
  );
}

// ── DialogClose ───────────────────────────────────────────────────────────────
export function DialogClose({ children }: { children: ReactNode }) {
  const { onClose } = useContext(DialogCtx);
  return <span onClick={onClose} style={{ cursor: "pointer" }}>{children}</span>;
}

// ── DialogFooter ──────────────────────────────────────────────────────────────
export function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
      {children}
    </div>
  );
}

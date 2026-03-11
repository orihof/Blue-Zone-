/// components/ui/sheet.tsx
// Minimal shadcn-compatible bottom Sheet built on React createPortal + CSS transitions.
// Drop-in replacement for @radix-ui/react-dialog / shadcn Sheet without Radix dependency.
"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

// ── Context ───────────────────────────────────────────────────────────────────
const SheetCtx = createContext<{ onClose: () => void }>({ onClose: () => {} });

// ── Sheet (root) ───────────────────────────────────────────────────────────────
export function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Drive CSS transition: open → visible after one frame; close → invisible then unmount
  useEffect(() => {
    if (!mounted) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (open) {
      setVisible(false);
      timerRef.current = setTimeout(() => setVisible(true), 16);
    } else {
      setVisible(false);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [open, mounted]);

  if (!mounted || !open) return null;

  const close = () => onOpenChange(false);

  return createPortal(
    <SheetCtx.Provider value={{ onClose: close }}>
      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.25s ease",
        }}
      />
      {/* Sheet panel — slides up from bottom */}
      <div
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 9999,
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        <SheetContent>{children}</SheetContent>
      </div>
    </SheetCtx.Provider>,
    document.body,
  );
}

// ── SheetContent ───────────────────────────────────────────────────────────────
export function SheetContent({ children }: { children: ReactNode }) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: "#0C0C18",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "20px 20px 0 0",
        padding: "20px 24px 32px",
        boxShadow: "0 -24px 80px rgba(0,0,0,0.65)",
        maxHeight: "85dvh",
        overflowY: "auto",
      }}
    >
      {/* Drag handle */}
      <div style={{
        width: 40, height: 4, borderRadius: 99,
        background: "rgba(255,255,255,0.12)",
        margin: "0 auto 20px",
      }} />
      {children}
    </div>
  );
}

// ── SheetHeader ────────────────────────────────────────────────────────────────
export function SheetHeader({ children }: { children: ReactNode }) {
  return <div style={{ marginBottom: 16 }}>{children}</div>;
}

// ── SheetTitle ─────────────────────────────────────────────────────────────────
export function SheetTitle({ children }: { children: ReactNode }) {
  return (
    <p style={{
      fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800,
      color: "rgba(255,255,255,0.92)", lineHeight: 1.2, marginBottom: 4,
    }}>
      {children}
    </p>
  );
}

// ── SheetDescription ──────────────────────────────────────────────────────────
export function SheetDescription({ children }: { children: ReactNode }) {
  return (
    <p style={{
      fontFamily: "'Syne', sans-serif", fontSize: 12,
      color: "rgba(255,255,255,0.35)", lineHeight: 1.5,
    }}>
      {children}
    </p>
  );
}

// ── SheetClose ────────────────────────────────────────────────────────────────
export function SheetClose({ children }: { children: ReactNode }) {
  const { onClose } = useContext(SheetCtx);
  return <span onClick={onClose} style={{ cursor: "pointer" }}>{children}</span>;
}

// ── SheetFooter ───────────────────────────────────────────────────────────────
export function SheetFooter({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
      {children}
    </div>
  );
}

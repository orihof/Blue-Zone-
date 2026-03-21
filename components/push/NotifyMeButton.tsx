/// components/push/NotifyMeButton.tsx
"use client";
import { useState } from "react";

interface NotifyMeButtonProps {
  title?: string;
  body?:  string;
  url?:   string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function NotifyMeButton({ title, body, url }: NotifyMeButtonProps) {
  const [state, setState] = useState<"idle" | "requesting" | "granted" | "denied" | "unsupported">("idle");

  async function handleClick() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setState("unsupported");
      return;
    }
    setState("requesting");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      await fetch("/api/push/subscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(subscription.toJSON()),
      });
      setState("granted");
    } catch (err) {
      console.error("[NotifyMeButton]", err);
      setState("denied");
    }
  }

  const labels: Record<typeof state, string> = {
    idle:        "🔔 Notify me when ready",
    requesting:  "Setting up notifications…",
    granted:     "✓ You'll be notified",
    denied:      "Notifications blocked — check browser settings",
    unsupported: "Notifications not supported on this device",
  };

  return (
    <button
      onClick={state === "idle" ? handleClick : undefined}
      style={{
        padding: "10px 20px",
        borderRadius: 10,
        fontSize: 13,
        fontFamily: "var(--font-ui,'Inter',sans-serif)",
        cursor: state === "idle" ? "pointer" : "default",
        background: state === "granted"
          ? "rgba(16,185,129,0.08)"
          : "rgba(255,255,255,0.06)",
        border: `1px solid ${state === "granted"
          ? "rgba(16,185,129,0.25)"
          : "rgba(255,255,255,0.12)"}`,
        color: state === "granted" ? "#34D399" : "#94A3B8",
        transition: "all .15s",
        display: "flex",
        alignItems: "center",
        gap: 8,
        whiteSpace: "nowrap" as const,
        opacity: state === "requesting" ? 0.7 : 1,
      }}
    >
      {labels[state]}
    </button>
  );
}

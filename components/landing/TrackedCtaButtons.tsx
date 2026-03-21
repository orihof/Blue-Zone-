/// components/landing/TrackedCtaButtons.tsx
"use client";

import Link from "next/link";
import { trackPrimaryCtaClick, trackSecondaryCtaClick, trackBottomCtaClick, trackHowItWorksCtaClick } from "@/lib/analytics";

export function PrimaryCtaButton() {
  return (
    <Link href="/auth/signin" onClick={trackPrimaryCtaClick}>
      <button className="cta" style={{ fontSize: 18, padding: "17px 50px" }}>Get My Personal Protocol →</button>
    </Link>
  );
}

export function SecondaryCtaButton() {
  return (
    <Link href="/how-it-works" onClick={trackSecondaryCtaClick}>
      <button className="ghost" style={{ fontSize: 14, padding: "11px 22px", border: "1px solid rgba(99,102,241,0.14)" }}>See how it works →</button>
    </Link>
  );
}

export function BottomCtaButton() {
  return (
    <Link href="/auth/signin" onClick={trackBottomCtaClick}>
      <button className="cta">Get My Personal Protocol →</button>
    </Link>
  );
}

export function HowItWorksCtaButton() {
  return (
    <Link href="/auth/signin" onClick={trackHowItWorksCtaClick}>
      <button className="cta" style={{ fontSize: 18, padding: "17px 50px" }}>Find out why your training stalled →</button>
    </Link>
  );
}

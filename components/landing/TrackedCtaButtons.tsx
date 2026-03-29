/// components/landing/TrackedCtaButtons.tsx
"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { trackPrimaryCtaClick, trackSecondaryCtaClick, trackBottomCtaClick, trackHowItWorksCtaClick } from "@/lib/analytics";

const ARROW = <ArrowRight size={15} strokeWidth={1.5} style={{ display: "inline", verticalAlign: "middle", marginTop: -1 }} />;

export function PrimaryCtaButton() {
  return (
    <Link href="/auth/signin" onClick={trackPrimaryCtaClick}>
      <button className="cta" style={{ fontSize: 18, padding: "17px 50px" }}>Get My Personal Protocol {ARROW}</button>
    </Link>
  );
}

export function SecondaryCtaButton() {
  return (
    <a
      href="#how-it-works"
      onClick={trackSecondaryCtaClick}
      className="text-xs text-white/45 md:text-sm md:text-[--stellar] hover:text-white transition-colors underline-offset-4 hover:underline cursor-pointer"
    >
      See a sample protocol {ARROW}
    </a>
  );
}

export function BottomCtaButton() {
  return (
    <Link href="/auth/signin" onClick={trackBottomCtaClick}>
      <button className="cta">Apply for Early Access {ARROW}</button>
    </Link>
  );
}

export function HowItWorksCtaButton() {
  return (
    <Link href="/auth/signin" onClick={trackHowItWorksCtaClick}>
      <button className="cta" style={{ fontSize: 18, padding: "17px 50px" }}>Find out why your training stalled {ARROW}</button>
    </Link>
  );
}

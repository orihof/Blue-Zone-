/// components/dashboard/ViewProtocolCTA.tsx
"use client";

import Link from "next/link";

interface ViewProtocolCTAProps {
  href:                  string;
  label:                 string;
  itemsDue?:             number;
  lastUpdatedDaysAgo?:   number;
}

export function ViewProtocolCTA({ href, label, itemsDue, lastUpdatedDaysAgo }: ViewProtocolCTAProps) {
  const meta =
    itemsDue !== undefined && lastUpdatedDaysAgo !== undefined
      ? `${itemsDue} item${itemsDue !== 1 ? "s" : ""} due this week · last updated ${lastUpdatedDaysAgo}d ago`
      : itemsDue !== undefined
      ? `${itemsDue} item${itemsDue !== 1 ? "s" : ""} due this week`
      : undefined;

  return (
    <Link href={href} className="protocol-cta" style={{ display: "flex" }}>
      <span className="protocol-cta__main">{label}</span>
      {meta && (
        <span className="protocol-cta__meta">{meta}</span>
      )}
      <span className="protocol-cta__arrow">→</span>
      <span className="protocol-cta__shimmer" aria-hidden="true" />
    </Link>
  );
}

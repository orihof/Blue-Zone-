/// components/ui/ProductCard.tsx
// Product card for supplement catalog — glass surface, expandable biomarker chips.
"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { EASE_BZ, G, C, GLASS } from "./tokens";
import type { CatalogProduct } from "@/lib/types/health";

// ── Inline expandable biomarker chip ──────────────────────────────────────

function ExpandChip({ label }: { label: string }) {
  return (
    <motion.span
      layout
      className="chip-biomarker cursor-pointer"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2, ease: EASE_BZ }}
    >
      {label}
    </motion.span>
  );
}

// ── Source badge ──────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: CatalogProduct["source"] }) {
  return (
    <span
      className="absolute top-3 right-3 text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full border"
      style={{
        background:  C.deep,
        borderColor: "rgba(0,138,255,0.30)",
        color:        C.cerulean,
        fontFamily:  "var(--font-ui, var(--font-sans))",
        boxShadow:   "0 0 0 1px rgba(0,138,255,0.08)",
      }}
    >
      {source === "amazon" ? "Amazon" : "iHerb"}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface ProductCardProps {
  product: CatalogProduct;
  whyForYou?: string;
  biomarkers?: string[];
  index?: number;
  onAddToStack?: (product: CatalogProduct) => void;
}

export function ProductCard({
  product,
  whyForYou,
  biomarkers = [],
  index = 0,
  onAddToStack,
}: ProductCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.5, ease: EASE_BZ, delay: index * 0.08 }}
      whileHover={{ y: -6, transition: { duration: 0.25, ease: EASE_BZ } }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative rounded-2xl overflow-hidden flex flex-col"
      style={{
        ...GLASS.base,
        border: hovered ? "1px solid rgba(0,138,255,0.25)" : GLASS.base.border,
        boxShadow: hovered
          ? "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(91,33,255,0.12)"
          : GLASS.base.boxShadow,
        transition: "border-color 0.25s, box-shadow 0.25s",
      }}
    >
      {/* Image area */}
      <div
        className="relative flex items-center justify-center"
        style={{
          height: 140,
          background: C.deep,
          overflow: "hidden",
        }}
      >
        {/* Radial glow behind image */}
        <div
          className="absolute inset-0"
          style={{
            background: hovered
              ? `radial-gradient(circle at 50% 60%, rgba(0,138,255,0.18) 0%, transparent 65%)`
              : `radial-gradient(circle at 50% 60%, rgba(0,138,255,0.08) 0%, transparent 65%)`,
            transition: "background 0.3s",
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl}
          alt={product.title}
          width={80}
          height={80}
          className="relative z-10 object-contain"
          style={{ width: 80, height: 80 }}
        />
        <SourceBadge source={product.source} />
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-5 space-y-3">
        {/* Brand */}
        <p
          className="text-[11px] font-medium uppercase tracking-[0.10em]"
          style={{ color: C.dust, fontFamily: "var(--font-ui, var(--font-sans))" }}
        >
          {product.brand}
        </p>

        {/* Name */}
        <h3
          className="font-light leading-snug line-clamp-2"
          style={{
            fontSize: 18,
            color: C.stellar,
            fontFamily: "var(--font-serif)",
          }}
        >
          {product.title}
        </h3>

        {/* Price */}
        <p
          className="font-light italic"
          style={{
            fontSize: 22,
            background: G.gold,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            fontFamily: "var(--font-editorial, var(--font-serif), Georgia, serif)",
          }}
        >
          {product.price}
        </p>

        {/* Why For You section */}
        {whyForYou && (
          <div>
            <hr className="sep-aurora mb-3" />
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-1.5"
              style={{ color: C.ionBlue, fontFamily: "var(--font-ui, var(--font-sans))" }}
            >
              Why For You
            </p>
            <p className="text-xs leading-relaxed" style={{ color: C.dust }}>
              {whyForYou}
            </p>
            {biomarkers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {biomarkers.map((b) => (
                  <ExpandChip key={b} label={b} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* CTA row — pushed to bottom */}
        <div className="flex items-center justify-between pt-2 mt-auto">
          <a
            href={product.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color: C.ionBlue, fontFamily: "var(--font-ui, var(--font-sans))" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = C.cerulean)}
            onMouseLeave={(e) => (e.currentTarget.style.color = C.ionBlue)}
          >
            Buy <ExternalLink className="w-3 h-3" />
          </a>

          {onAddToStack && (
            <button
              onClick={() => onAddToStack(product)}
              className="btn-aurora"
              style={{ height: 36, minWidth: "unset", padding: "0 16px", fontSize: 12 }}
            >
              Add to Stack
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

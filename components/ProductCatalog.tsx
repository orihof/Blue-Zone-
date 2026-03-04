/// components/ProductCatalog.tsx
"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import type { CatalogProduct } from "@/lib/types/health";

function ProductCard({ product }: { product: CatalogProduct }) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl p-3 transition-colors"
      style={{
        background: "rgba(15,32,64,0.6)",
        border: "1px solid var(--bz-border)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={product.imageUrl}
        alt={product.title}
        width={48}
        height={48}
        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
        style={{ background: "var(--bz-navy-light)" }}
      />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-xs font-semibold leading-tight line-clamp-2" style={{ color: "var(--bz-white)" }}>
          {product.title}
        </p>
        <p className="text-[11px]" style={{ color: "var(--bz-muted)" }}>
          {product.brand}
        </p>
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-xs font-bold"
            style={{ color: "var(--bz-blue)", fontFamily: "var(--font-mono)" }}
          >
            {product.price}
          </span>
          <a href={product.affiliateUrl} target="_blank" rel="noopener noreferrer sponsored">
            <button
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors"
              style={{
                borderColor: "var(--bz-border)",
                color: "var(--bz-muted)",
                background: "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--bz-blue)";
                e.currentTarget.style.color = "var(--bz-blue)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--bz-border)";
                e.currentTarget.style.color = "var(--bz-muted)";
              }}
            >
              <ExternalLink className="w-2.5 h-2.5" />
              {product.source === "amazon" ? "Amazon" : "iHerb"}
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}

interface Props {
  query: string;
}

export function ProductCatalog({ query }: Props) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/products?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [query]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs" style={{ color: "var(--bz-muted)" }}>
        <Loader2 className="w-3 h-3 animate-spin" />
        Finding products…
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

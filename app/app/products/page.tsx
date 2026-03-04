/// app/app/products/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import type { RecItem, ProtocolPayload } from "@/lib/db/payload";


function chipClass(tag: string): string {
  if (tag.includes("↑")) return "chip chip-r";
  if (tag.includes("↓")) return "chip chip-a";
  return "chip chip-b";
}

function SourceBadge({ source }: { source: "iherb" | "amazon" | null }) {
  if (!source) return null;
  const isIherb = source === "iherb";
  return (
    <span style={{
      fontSize: 10, fontWeight: 400, padding: "2px 8px", borderRadius: "100px",
      background: isIherb ? "rgba(16,185,129,.1)" : "rgba(255,165,0,.1)",
      color: isIherb ? "#34D399" : "#FCD34D",
      border: `1px solid ${isIherb ? "rgba(16,185,129,.25)" : "rgba(255,165,0,.25)"}`,
      fontFamily: "'Inter',sans-serif",
    }}>
      {isIherb ? "iHerb" : "Amazon"}
    </span>
  );
}

export default async function ProductsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const db = getAdminClient();

  // Fetch latest ready protocol
  const { data: protocolRow } = await db
    .from(TABLES.PROTOCOLS)
    .select("id,payload")
    .eq(COLS.USER_ID, session.user.id)
    .eq(COLS.STATUS, "ready")
    .order(COLS.CREATED_AT, { ascending: false })
    .limit(1)
    .single();

  if (!protocolRow) {
    redirect("/app/onboarding/dial");
  }

  const payload = protocolRow.payload as ProtocolPayload;
  const supplements: RecItem[] = payload?.recommendations?.supplements ?? [];

  // Filter to items that have at least one purchase link
  const products = supplements.filter(s => s.links.iherb || s.links.amazon);

  // Category icons (best effort map)
  const ICONS: Record<string, string> = {
    supplement: "💊",
    nutrition: "🥗",
    home: "🏠",
  };

  return (
    <div className="px-4 lg:px-6 py-6 lg:py-8">
      {/* Header */}
      <div className="fu" style={{ marginBottom: 24 }}>
        <div style={{
          fontSize: 11, fontWeight: 400, letterSpacing: ".1em",
          color: "#6366F1", fontFamily: "'Inter',sans-serif",
          textTransform: "uppercase", marginBottom: 8,
        }}>
          Product Stack
        </div>
        <h1 style={{
          fontFamily: "'Syne',sans-serif", fontWeight: 400,
          fontSize: "clamp(22px,3vw,32px)", color: "#F1F5F9", letterSpacing: "-.02em",
        }}>
          Recommended Supplements
        </h1>
        <p style={{
          fontSize: 13, color: "#64748B", fontFamily: "'Inter',sans-serif",
          fontWeight: 300, marginTop: 6,
        }}>
          Every product below is tied to a detected gap in your biomarker data.
        </p>
      </div>

      {products.length === 0 ? (
        <div className="card fu1" style={{ padding: "48px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🛒</div>
          <h3 style={{
            fontFamily: "'Syne',sans-serif", fontWeight: 400, fontSize: 20,
            color: "#F1F5F9", marginBottom: 8, letterSpacing: "-.02em",
          }}>
            No products in your protocol yet
          </h3>
          <p style={{
            fontSize: 13, color: "#64748B", fontFamily: "'Inter',sans-serif",
            fontWeight: 300, lineHeight: 1.65,
          }}>
            Your protocol{"'"}s supplement recommendations will appear here once they{"'"}re generated.
          </p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
          gap: 14,
        }}>
          {products.map((p, i) => {
            const source = p.links.iherb ? "iherb" : p.links.amazon ? "amazon" : null;
            const href = p.links.iherb ?? p.links.amazon ?? "#";
            const icon = ICONS[p.category] ?? "💊";

            return (
              <div
                key={p.id}
                className="card"
                style={{
                  padding: 22,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  animation: `fadeUp .45s cubic-bezier(.16,1,.3,1) ${i * 0.06}s both`,
                }}
              >
                {/* Icon + source badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontSize: 32 }}>{icon}</div>
                  <SourceBadge source={source} />
                </div>

                {/* Title + price */}
                <div>
                  <div style={{
                    fontSize: 10, fontWeight: 400, letterSpacing: ".08em",
                    color: "#64748B", fontFamily: "'Inter',sans-serif", marginBottom: 3,
                  }}>
                    {p.category.toUpperCase()}
                  </div>
                  <div style={{
                    fontFamily: "'Syne',sans-serif", fontWeight: 400,
                    fontSize: 15, color: "#F1F5F9", marginBottom: 4,
                  }}>
                    {p.title}
                  </div>
                  {/* No price in RecItem — show category chip instead */}
                  <span className={`chip chip-b`} style={{ fontSize: 10 }}>
                    {p.category}
                  </span>
                </div>

                {/* Why for you */}
                <div style={{ borderTop: "1px solid rgba(99,102,241,.12)", paddingTop: 12 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 400, letterSpacing: ".08em",
                    color: "#6366F1", fontFamily: "'Inter',sans-serif",
                    textTransform: "uppercase", marginBottom: 5,
                  }}>
                    Why for you
                  </div>
                  <div style={{
                    fontSize: 12, color: "#64748B", fontFamily: "'Inter',sans-serif",
                    fontWeight: 300, lineHeight: 1.65, marginBottom: 8,
                  }}>
                    {p.rationaleBullets[0]}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {p.tags.slice(0, 3).map((tag, ti) => (
                      <span key={ti} className={chipClass(tag)}>{tag}</span>
                    ))}
                  </div>
                </div>

                {/* Buy button */}
                <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  <button
                    className="cta cta-sm"
                    style={{ width: "100%", justifyContent: "center", animation: "none", boxShadow: "none" }}
                  >
                    View on {source === "iherb" ? "iHerb" : "Amazon"} →
                  </button>
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

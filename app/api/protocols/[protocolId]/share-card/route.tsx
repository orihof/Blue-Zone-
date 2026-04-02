/// app/api/protocols/[protocolId]/share-card/route.tsx
import { ImageResponse } from "next/og";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";

interface ShareCardData {
  revelationHeadline: string;
  rootCause: string;
  evidenceSignals: string[];
  protocolName: string;
  protocolHow: string;
  recoveryScore: number;
  readinessScore: number;
  metabolicScore: number;
  signalCount: number;
  protocolDate: string;
  firstName: string;
  protocolId: string;
  cardVariant: "discovery" | "progress";
  retestIn: string;
  whatToWatch: string;
}

function extractDose(howToUse: string): string {
  const match = howToUse.match(/(\d[\d,]*\s*(?:mg|mcg|IU|g|ml|µg))/i);
  return match ? match[1].trim() : "";
}

function getProtocolDisplayNumber(id: string): string {
  const num = (parseInt(id.slice(0, 4), 16) % 999) + 1;
  return String(num).padStart(3, "0");
}

function truncateAtWord(str: string, max: number): string {
  if (str.length <= max) return str;
  const truncated = str.slice(0, max);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > 0 ? truncated.slice(0, lastSpace) + "..." : truncated + "...";
}

function isQuantified(s: string): boolean {
  return /\d/.test(s);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ protocolId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { protocolId } = await params;
  const userId = session.user.id;
  const supabase = getAdminClient();

  // ── Fetch card data from cache ──
  let { data: card } = await supabase
    .from(TABLES.PROTOCOL_SHARE_CARDS)
    .select(`${COLS.CARD_DATA}, ${COLS.SHARE_TOKEN}`)
    .eq(COLS.USER_ID, userId)
    .eq(COLS.PROTOCOL_REF_ID, protocolId)
    .order(COLS.CREATED_AT, { ascending: false })
    .limit(1)
    .maybeSingle();

  // If no card exists, generate one
  if (!card?.card_data) {
    try {
      const genResponse = await fetch(
        new URL(
          `/api/protocols/${protocolId}/share-card/generate`,
          request.url,
        ),
        {
          method: "POST",
          headers: {
            cookie: request.headers.get("cookie") ?? "",
          },
        },
      );

      if (genResponse.ok) {
        // Re-fetch from DB
        const { data: refetched } = await supabase
          .from(TABLES.PROTOCOL_SHARE_CARDS)
          .select(`${COLS.CARD_DATA}, ${COLS.SHARE_TOKEN}`)
          .eq(COLS.USER_ID, userId)
          .eq(COLS.PROTOCOL_REF_ID, protocolId)
          .order(COLS.CREATED_AT, { ascending: false })
          .limit(1)
          .maybeSingle();

        card = refetched;
      }
    } catch {
      // Generation failed — fall through to 404
    }
  }

  if (!card?.card_data) {
    return new Response("Card not found", { status: 404 });
  }

  const d = card.card_data as ShareCardData;

  const doseDisplay = extractDose(d.protocolHow);
  const protocolNumber = getProtocolDisplayNumber(d.protocolId);
  const headlineParts = d.revelationHeadline.split(" — ");
  const headlinePart1 = headlineParts[0] ?? d.revelationHeadline;
  const headlinePart2 = headlineParts[1] ?? null;
  const headlineFontSize = d.revelationHeadline.length > 45 ? 42 : 48;
  const fomoLine = d.evidenceSignals.some((s) =>
    /\d+.*(?:mg|ng|mIU|µg|IU|ms|bpm)/i.test(s),
  )
    ? "The answer was always in your data."
    : "What is your body actually telling you?";

  // Load Blue Zone logo for card
  let logoDataUrl: string | null = null;
  try {
    const { readFile } = await import("fs/promises");
    const { join } = await import("path");
    const logoPath = join(process.cwd(), "public", "Blue-zone-white-full.svg");
    const logoBuffer = await readFile(logoPath);
    const logoBase64 = logoBuffer.toString("base64");
    logoDataUrl = `data:image/svg+xml;base64,${logoBase64}`;
  } catch {
    logoDataUrl = null;
  }

  const imageResponse = new ImageResponse(
    (
      <div style={{ display: "flex", width: 1200, height: 630, backgroundColor: "#0A0A0F", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 16, overflow: "hidden", fontFamily: "sans-serif", position: "relative" }}>
        {/* Background glow */}
        <div style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, background: "radial-gradient(ellipse 900px 500px at 200px 0px, rgba(99,102,241,0.16) 0%, transparent 65%)", display: "flex" }} />
        {/* Diagonal texture */}
        <div style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, background: "linear-gradient(135deg, rgba(99,102,241,0.04) 0%, transparent 45%, rgba(45,212,191,0.03) 100%)", display: "flex" }} />

        {/* CONTENT WRAPPER */}
        <div style={{ display: "flex", flexDirection: "column", width: 1200, height: 630, paddingTop: 44, paddingLeft: 56, paddingRight: 48, paddingBottom: 0, position: "relative" }}>

          {/* ── TOP BAR (h:32 + mb:12) ── */}
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: 1096, height: 32, marginBottom: 12 }}>
            {logoDataUrl ? (
              <img src={logoDataUrl} style={{ height: 20, opacity: 0.80 }} />
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 9, height: 9, borderRadius: 4, backgroundColor: "#6366F1", display: "flex" }} />
                <span style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.45)", display: "flex" }}>Blue Zone</span>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 5, paddingBottom: 5, paddingLeft: 14, paddingRight: 14, backgroundColor: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.22)", borderRadius: 100 }}>
              <span style={{ fontSize: 10, letterSpacing: 2.5, color: "rgba(99,102,241,0.85)", fontWeight: 700, display: "flex" }}>FOUNDING MEMBER</span>
              <span style={{ width: 1, height: 10, backgroundColor: "rgba(99,102,241,0.25)", display: "flex" }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", display: "flex" }}>{d.protocolDate}</span>
            </div>
          </div>

          {/* ── MAIN CONTENT (h:490) ── */}
          <div style={{ display: "flex", flexDirection: "row", width: 1096, height: 490, gap: 40 }}>

            {/* ── LEFT COLUMN ── */}
            <div style={{ display: "flex", flexDirection: "column", width: 804, height: 490, overflow: "hidden" }}>

              {/* NAME ROW (h:86 + mb:6) */}
              <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-end", height: 86, marginBottom: 6, gap: 0 }}>
                <span style={{ fontSize: 82, fontWeight: 200, lineHeight: 1, letterSpacing: -3, display: "flex", color: "rgba(230,228,255,0.93)" }}>
                  {d.firstName && d.firstName !== "Athlete" ? d.firstName.toUpperCase() : "YOUR"}
                </span>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", height: 86, paddingBottom: 14, paddingLeft: 10 }}>
                  <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 0 }}>
                    <span style={{ fontSize: 22, fontWeight: 300, color: "#818cf8", display: "flex", lineHeight: 1 }}>{d.firstName && d.firstName !== "Athlete" ? "'s" : ""}</span>
                    <span style={{ fontSize: 12, letterSpacing: 4, color: "rgba(99,102,241,0.65)", fontWeight: 700, display: "flex", marginLeft: d.firstName && d.firstName !== "Athlete" ? 8 : 0, lineHeight: 1 }}>DISCOVERY</span>
                  </div>
                </div>
              </div>
              {/* Name accent line */}
              <div style={{ display: "flex", width: 120, height: 2, backgroundColor: "rgba(99,102,241,0.35)", borderRadius: 1, marginBottom: 14, marginTop: -8 }} />

              {/* HEADLINE */}
              <div style={{ display: "flex", flexDirection: "column", marginBottom: 14 }}>
                <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", gap: 0 }}>
                  <span style={{ fontSize: headlineFontSize > 45 ? 38 : 44, fontWeight: 300, color: "rgba(255,255,255,0.65)", lineHeight: 1.12, letterSpacing: -1, display: "flex" }}>
                    {headlinePart1}
                  </span>
                  {headlinePart2 && (
                    <span style={{ fontSize: headlineFontSize > 45 ? 38 : 44, fontWeight: 300, color: "rgba(255,255,255,0.18)", lineHeight: 1.12, marginLeft: 10, marginRight: 10, display: "flex" }}>—</span>
                  )}
                </div>
                {headlinePart2 && (
                  <span style={{ fontSize: headlineFontSize > 45 ? 38 : 44, fontWeight: 900, color: "#818cf8", lineHeight: 1.12, letterSpacing: -1.5, display: "flex" }}>
                    {headlinePart2}
                  </span>
                )}
              </div>

              {/* DIVIDER */}
              <div style={{ display: "flex", width: 760, height: 1, background: "linear-gradient(to right, rgba(99,102,241,0.30), rgba(99,102,241,0.08), transparent)", marginBottom: 14 }} />

              {/* SIGNAL CHAIN */}
              <div style={{ display: "flex", flexDirection: "column", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <div style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(99,102,241,0.35)", display: "flex" }} />
                  <div style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(99,102,241,0.35)", display: "flex" }} />
                  <div style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(99,102,241,0.35)", display: "flex" }} />
                  <span style={{ fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.20)", fontWeight: 600, marginLeft: 4, display: "flex" }}>THE SIGNAL CHAIN</span>
                </div>
                {d.evidenceSignals.map((signal, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 13, color: isQuantified(signal) ? "rgba(251,146,60,0.70)" : "rgba(99,102,241,0.55)", display: "flex", width: 14, flexShrink: 0 }}>→</span>
                      <span style={{ fontSize: 14, fontWeight: 500, color: isQuantified(signal) ? "rgba(255,255,255,0.80)" : "rgba(255,255,255,0.55)", display: "flex", fontFamily: "monospace" }}>{signal}</span>
                    </div>
                    {i < d.evidenceSignals.length - 1 && (
                      <div style={{ display: "flex", width: 1, height: 8, backgroundColor: "rgba(99,102,241,0.18)", marginLeft: 7, marginTop: 2, marginBottom: 2 }} />
                    )}
                  </div>
                ))}
              </div>

              {/* ROOT CAUSE */}
              <div style={{ display: "flex", flexDirection: "column", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                  <span style={{ fontSize: 8, color: "rgba(99,102,241,0.40)", display: "flex" }}>↓</span>
                  <span style={{ fontSize: 9, letterSpacing: 2.5, color: "rgba(99,102,241,0.40)", fontWeight: 600, display: "flex" }}>ROOT CAUSE</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", paddingTop: 7, paddingBottom: 7, paddingLeft: 12, paddingRight: 12, backgroundColor: "rgba(99,102,241,0.09)", border: "1px solid rgba(99,102,241,0.16)", borderRadius: 8, alignSelf: "flex-start" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.82)", display: "flex" }}>
                    {d.rootCause.length > 42 ? d.rootCause.slice(0, 42) + "..." : d.rootCause}
                  </span>
                </div>
              </div>

              {/* PROTOCOL */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", paddingTop: 3, paddingBottom: 3, paddingLeft: 9, paddingRight: 9, backgroundColor: "rgba(45,212,191,0.07)", border: "1px solid rgba(45,212,191,0.18)", borderRadius: 100, alignSelf: "flex-start", marginBottom: 7 }}>
                  <span style={{ fontSize: 9, letterSpacing: 2.5, color: "rgba(45,212,191,0.72)", fontWeight: 700, display: "flex" }}>PROTOCOL</span>
                </div>
                <div style={{ display: "flex", flexDirection: "row", alignItems: "baseline", gap: 14 }}>
                  <span style={{ fontSize: 21, fontWeight: 700, color: "rgba(255,255,255,0.90)", display: "flex" }}>{d.protocolName}</span>
                  {doseDisplay && (
                    <span style={{ fontSize: 26, fontWeight: 800, color: "#2DD4BF", letterSpacing: -0.5, display: "flex" }}>{doseDisplay}</span>
                  )}
                </div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", fontStyle: "italic", marginTop: 4, display: "flex" }}>
                  {truncateAtWord(d.protocolHow, 58)}
                </span>
                {/* Retest + Track row */}
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 20, marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: "rgba(45,212,191,0.65)", fontWeight: 600, display: "flex" }}>
                    {"↗ Retest in " + (d.retestIn ?? "6 weeks")}
                  </span>
                  <span style={{ width: 1, height: 10, backgroundColor: "rgba(255,255,255,0.08)", display: "flex" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.18)", fontWeight: 600, display: "flex" }}>TRACK</span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", fontStyle: "italic", display: "flex" }}>{truncateAtWord(d.whatToWatch ?? "Morning energy and HRV", 36)}</span>
                  </div>
                </div>
                {/* Expected impact block */}
                <div style={{ display: "flex", flexDirection: "column", marginTop: 16, paddingTop: 12, paddingBottom: 12, paddingLeft: 14, paddingRight: 14, backgroundColor: "rgba(45,212,191,0.04)", border: "1px solid rgba(45,212,191,0.10)", borderRadius: 10, gap: 6 }}>
                  <span style={{ fontSize: 9, letterSpacing: 2.5, color: "rgba(45,212,191,0.45)", fontWeight: 700, display: "flex" }}>EXPECTED IMPACT</span>
                  <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <div style={{ display: "flex", width: 200, height: 4, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                      <div style={{ display: "flex", width: 150, height: 4, background: "linear-gradient(to right, rgba(45,212,191,0.4), rgba(45,212,191,0.8))", borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 11, color: "rgba(45,212,191,0.60)", fontWeight: 600, display: "flex" }}>High</span>
                  </div>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", display: "flex" }}>Based on your signal pattern and protocol fit score</span>
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div style={{ display: "flex", flexDirection: "column", width: 252, height: 490, flexShrink: 0, gap: 10 }}>
              {/* Recovery */}
              <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: 252, height: 100, backgroundColor: "rgba(13,13,22,0.96)", border: "1px solid rgba(99,102,241,0.14)", borderRadius: 14, paddingLeft: 22, paddingRight: 20, paddingTop: 0, paddingBottom: 0 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 44, fontWeight: 800, color: "#818cf8", lineHeight: 1, display: "flex" }}>{d.recoveryScore}</span>
                  <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2.5, color: "rgba(255,255,255,0.27)", display: "flex" }}>RECOVERY</span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", display: "flex", marginTop: 3 }}>optimal: 85+</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", height: 58 }}>
                  <div style={{ display: "flex", width: 8, height: 58, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden", alignItems: "flex-end" }}>
                    <div style={{ display: "flex", width: 8, height: Math.max(8, Math.round((d.recoveryScore / 100) * 58)), background: "linear-gradient(to top, #4338ca, #818cf8)", borderRadius: 4 }} />
                  </div>
                </div>
              </div>
              {/* Metabolic */}
              <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: 252, height: 100, backgroundColor: "rgba(13,13,22,0.96)", border: "1px solid rgba(167,139,250,0.12)", borderRadius: 14, paddingLeft: 22, paddingRight: 20, paddingTop: 0, paddingBottom: 0 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 44, fontWeight: 800, color: "#A78BFA", lineHeight: 1, display: "flex" }}>{d.metabolicScore ?? d.readinessScore}</span>
                  <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2.5, color: "rgba(255,255,255,0.27)", display: "flex" }}>METABOLIC</span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", display: "flex", marginTop: 3 }}>optimal: 80+</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", height: 58 }}>
                  <div style={{ display: "flex", width: 8, height: 58, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden", alignItems: "flex-end" }}>
                    <div style={{ display: "flex", width: 8, height: Math.max(8, Math.round(((d.metabolicScore ?? d.readinessScore) / 100) * 58)), background: "linear-gradient(to top, #7c3aed, #A78BFA)", borderRadius: 4 }} />
                  </div>
                </div>
              </div>
              {/* Credibility */}
              <div style={{ display: "flex", flexDirection: "column", width: 252, paddingTop: 14, paddingBottom: 14, paddingLeft: 18, paddingRight: 18, backgroundColor: "rgba(255,255,255,0.022)", border: "1px solid rgba(255,255,255,0.055)", borderRadius: 12, gap: 4, marginTop: 2 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: "rgba(255,255,255,0.62)", display: "flex" }}>{d.signalCount}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.26)", display: "flex" }}>signals</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: "rgba(99,102,241,0.48)", display: "flex" }}>→</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(99,102,241,0.72)", display: "flex" }}>1 root cause</span>
                </div>
                <div style={{ display: "flex", width: 216, height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginBottom: 8 }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.20)", display: "flex" }}>Athletic reference ranges</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(99,102,241,0.48)", display: "flex" }}>Not population norms</span>
              </div>
            </div>
          </div>

          {/* ── BOTTOM STRIP ── */}
          <div style={{ position: "absolute", bottom: 0, left: 0, width: 1200, height: 52, backgroundColor: "rgba(8,8,14,0.98)", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 56, paddingRight: 48, paddingTop: 0, paddingBottom: 0 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.32)", fontStyle: "italic", display: "flex" }}>{fomoLine}</span>
            <span style={{ fontSize: 11, color: "rgba(99,102,241,0.38)", letterSpacing: 1.5, fontWeight: 500, display: "flex" }}>PROTOCOL #{protocolNumber}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#6366F1", display: "flex" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(99,102,241,0.58)", display: "flex" }}>bluezone.ai</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );

  // Override cache headers
  imageResponse.headers.set(
    "Cache-Control",
    "public, max-age=3600, stale-while-revalidate=86400",
  );

  return imageResponse;
}

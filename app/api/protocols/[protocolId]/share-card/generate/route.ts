/// app/api/protocols/[protocolId]/share-card/generate/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { TABLES, COLS } from "@/lib/db/schema";
import { ProtocolPayloadSchema } from "@/lib/db/payload";

interface ShareCardData {
  revelationHeadline: string;
  rootCause: string;
  evidenceSignals: string[];
  protocolName: string;
  protocolHow: string;
  recoveryScore: number;
  readinessScore: number;
  signalCount: number;
  protocolDate: string;
  firstName: string;
  protocolId: string;
  cardVariant: "discovery" | "progress";
}

const HEADLINE_SYSTEM_PROMPT = `You generate viral revelation headlines for health insights. Your headlines follow this exact structure: '[Felt symptom] isn't [assumed cause] — it's [actual root cause].'

Rules:
- Under 70 characters total
- Plain athlete language — no medical jargon
- Must describe what the athlete FEELS, not what the lab shows
- The assumed cause should be the most common misattribution for this symptom
- The actual cause comes from the root cause
- Never use the word 'deficiency'
- Never start with 'Your'
- Examples of good headlines:
  'HRV decline isn't overtraining — it's iron'
  'Poor recovery isn't sleep — it's inflammation'
  'Stalled fitness isn't effort — it's cortisol'
- Return ONLY the headline string. No quotes, no explanation, nothing else.`;

async function generateHeadline(
  rootCause: string,
  evidenceSignals: string[],
  protocolName: string,
  sourcedFrom: string,
  bioAgeHeadline: string | null,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return buildFallbackHeadline(rootCause, bioAgeHeadline);
  }

  const userPrompt = [
    `Root cause: ${rootCause}`,
    `Evidence signals: ${evidenceSignals.join(", ")}`,
    `Top protocol intervention: ${protocolName}`,
    `Data source: ${sourcedFrom}`,
    bioAgeHeadline ? `Bio age context: ${bioAgeHeadline}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 60,
        system: HEADLINE_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      console.error("[share-card/generate] Anthropic API error:", response.status);
      return buildFallbackHeadline(rootCause, bioAgeHeadline);
    }

    const data = await response.json();
    const rawText = data.content
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("")
      .trim()
      .replace(/^["']|["']$/g, "");

    if (!rawText || rawText.length > 120) {
      return buildFallbackHeadline(rootCause, bioAgeHeadline);
    }

    return rawText;
  } catch (err) {
    console.error("[share-card/generate] Headline generation failed:", err);
    return buildFallbackHeadline(rootCause, bioAgeHeadline);
  }
}

function buildFallbackHeadline(rootCause: string, bioAgeHeadline: string | null): string {
  if (bioAgeHeadline) return bioAgeHeadline;
  if (rootCause) {
    return `Training plateau isn't fitness — it's ${rootCause.toLowerCase()}`;
  }
  return "Your biology is more specific than your training plan.";
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ protocolId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { protocolId } = await params;
  const userId = session.user.id;
  const supabase = getAdminClient();

  // ── Step 1: Check cache ──
  const { data: cached } = await supabase
    .from(TABLES.PROTOCOL_SHARE_CARDS)
    .select(`${COLS.CARD_DATA}, ${COLS.SHARE_TOKEN}, ${COLS.CREATED_AT}`)
    .eq(COLS.USER_ID, userId)
    .eq(COLS.PROTOCOL_REF_ID, protocolId)
    .order(COLS.CREATED_AT, { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached?.card_data && cached.created_at) {
    const age = Date.now() - new Date(cached.created_at).getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    if (age < twentyFourHours) {
      return NextResponse.json({
        data: cached.card_data as ShareCardData,
        shareToken: cached.share_token as string,
        cached: true,
      });
    }
  }

  // ── Step 2: Fetch protocol data ──
  const { data: protocol, error: protocolError } = await supabase
    .from(TABLES.PROTOCOLS)
    .select(`${COLS.ID}, ${COLS.PAYLOAD}, ${COLS.CREATED_AT}, ${COLS.MODE}`)
    .eq(COLS.ID, protocolId)
    .eq(COLS.USER_ID, userId)
    .maybeSingle();

  if (protocolError || !protocol) {
    return NextResponse.json({ error: "Protocol not found" }, { status: 404 });
  }

  if (!protocol.payload) {
    return NextResponse.json({ error: "Protocol has no payload" }, { status: 400 });
  }

  const parseResult = ProtocolPayloadSchema.safeParse(protocol.payload);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid protocol data" }, { status: 400 });
  }

  const payload = parseResult.data;

  // Fetch user profile for first name
  const { data: profile } = await supabase
    .from(TABLES.PROFILES)
    .select(COLS.NAME)
    .eq(COLS.ID, userId)
    .maybeSingle();

  const firstName = profile?.name?.split(" ")[0] ?? "Athlete";

  // ── Step 3: Derive card data from payload ──
  const primaryDriver = payload.explainability?.keyDrivers?.[0];
  const rootCause = primaryDriver?.title ?? "";
  const evidenceSignals = primaryDriver?.evidence?.slice(0, 3) ?? [];
  const sourcedFrom = primaryDriver?.sourcedFrom ?? "labs";

  const topSupplement = payload.recommendations.supplements[0];
  const protocolName = topSupplement?.title ?? "";
  const protocolHow = topSupplement?.howToUse ?? "";

  const recoveryScore = Math.round(payload.scores.recovery);
  const readinessScore = Math.round(payload.scores.readiness);

  const bioAgeHeadline = payload.biologicalAgeNarrative?.headline ?? null;

  const signalCount =
    payload.explainability?.keyDrivers?.reduce(
      (acc, d) => acc + (d.evidence?.length ?? 0),
      0,
    ) ?? evidenceSignals.length;

  const protocolDate = new Date(protocol.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // ── Step 4: Generate revelation headline ──
  const revelationHeadline = await generateHeadline(
    rootCause,
    evidenceSignals,
    protocolName,
    sourcedFrom,
    bioAgeHeadline,
  );

  // ── Step 5: Build card data object ──
  const cardData: ShareCardData = {
    revelationHeadline,
    rootCause,
    evidenceSignals,
    protocolName,
    protocolHow: protocolHow.slice(0, 65),
    recoveryScore,
    readinessScore,
    signalCount: Math.max(signalCount, evidenceSignals.length),
    protocolDate,
    firstName,
    protocolId,
    cardVariant: "discovery",
  };

  // ── Step 6: Cache in protocol_share_cards ──
  const shareToken = protocolId.slice(0, 8) + "-" + Date.now().toString(36);

  const { error: insertError } = await supabase
    .from(TABLES.PROTOCOL_SHARE_CARDS)
    .insert({
      [COLS.USER_ID]: userId,
      [COLS.SHARE_TOKEN]: shareToken,
      [COLS.CARD_TYPE]: "public",
      [COLS.CARD_DATA]: cardData,
      [COLS.PROTOCOL_REF_ID]: protocolId,
    });

  if (insertError) {
    console.error("[share-card/generate] Cache insert failed:", insertError.message);
    // Return card data anyway — card can render without being cached
  }

  return NextResponse.json({
    data: cardData,
    shareToken,
    cached: false,
  });
}

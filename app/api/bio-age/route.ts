/// app/api/bio-age/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from(TABLES.PROFILES)
    .select(`
      ${COLS.BIOLOGICAL_AGE},
      ${COLS.BIOLOGICAL_AGE_DELTA},
      ${COLS.BIO_AGE_PERCENTILE},
      ${COLS.BIO_AGE_CALCULATED_AT},
      ${COLS.BIO_AGE_CONFIDENCE},
      ${COLS.BIO_AGE_REVEALED},
      ${COLS.BIO_AGE_DRIVERS}
    `)
    .eq(COLS.ID, session.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    biologicalAge:    data?.biological_age    ?? null,
    delta:            data?.biological_age_delta ?? null,
    percentile:       data?.bio_age_percentile ?? null,
    calculatedAt:     data?.bio_age_calculated_at ?? null,
    confidenceLevel:  data?.bio_age_confidence ?? null,
    revealed:         data?.bio_age_revealed   ?? false,
    primaryDrivers:   data?.bio_age_drivers    ?? [],
  });
}

export async function PATCH() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getAdminClient();
  const { error } = await supabase
    .from(TABLES.PROFILES)
    .upsert({ id: session.user.id, bio_age_revealed: true, updated_at: new Date().toISOString() });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

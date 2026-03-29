/// app/api/apply/route.ts
import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES } from "@/lib/db/schema";

interface ApplyBody {
  first_name: string;
  email: string;
  athlete_type: string;
  wearables: string[];
  blood_sources: string[];
  primary_goal?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<ApplyBody>;

    // Validate required fields
    if (!body.first_name?.trim() || !body.email?.trim() || !body.athlete_type?.trim()) {
      return NextResponse.json(
        { error: "First name, email, and athlete type are required." },
        { status: 400 }
      );
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const db = getAdminClient();

    // Rate limit: check if same email submitted within 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: existing } = await db
      .from(TABLES.FOUNDING_APPLICATIONS)
      .select("id, created_at")
      .eq("email", body.email.trim().toLowerCase())
      .gte("created_at", oneHourAgo)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Application already received. We'll be in touch within 48 hours." },
        { status: 409 }
      );
    }

    // Insert application
    const { error: insertError } = await db
      .from(TABLES.FOUNDING_APPLICATIONS)
      .upsert(
        {
          first_name: body.first_name.trim(),
          email: body.email.trim().toLowerCase(),
          athlete_type: body.athlete_type.trim(),
          wearables: body.wearables ?? [],
          blood_sources: body.blood_sources ?? [],
          primary_goal: body.primary_goal?.trim() || null,
          status: "pending",
        },
        { onConflict: "email" }
      );

    if (insertError) {
      console.error("Founding application insert error:", insertError);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Apply route error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

/// app/api/waitlist/route.ts
import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const supabase = getAdminClient();
    const { error } = await supabase.from("waitlist").insert({
      email,
      source: body.source || "founding-cohort",
    });

    if (error) {
      // Unique constraint violation — email already on the list
      if (error.code === "23505") {
        return NextResponse.json({ success: true });
      }
      console.error("[waitlist] insert error:", error.message);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

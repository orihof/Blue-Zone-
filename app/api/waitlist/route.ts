/// app/api/waitlist/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";

// In-memory rate limiter: 3 requests per IP per 60 seconds
// NOTE: This Map resets on each Vercel serverless cold start — safe for launch scale.
// For persistent Node.js deployments, replace with Redis or an LRU cache
// (e.g. npm install lru-cache) to prevent unbounded memory growth.
const rateLimitMap = new Map<string, { count: number; reset: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + 60_000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

export async function POST(req: Request) {
  // Rate limiting
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    // 1. Store in Supabase
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
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 },
      );
    }

    // 2. Trigger Loops confirmation email (non-blocking — don't fail if Loops is down)
    const LOOPS_API_KEY = process.env.LOOPS_API_KEY;
    if (LOOPS_API_KEY) {
      try {
        // Create contact
        await fetch("https://app.loops.so/api/v1/contacts/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOOPS_API_KEY}`,
          },
          body: JSON.stringify({
            email,
            userGroup: "waitlist",
            source: body.source ?? "landing",
            mailingLists: {
              [process.env.LOOPS_WAITLIST_LIST_ID ?? ""]: true,
            },
          }),
        });

        // Trigger confirmation email event
        await fetch("https://app.loops.so/api/v1/events/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOOPS_API_KEY}`,
          },
          body: JSON.stringify({
            email,
            eventName: "waitlistConfirmation",
            eventProperties: {
              source: body.source ?? "landing",
              launch_date: "May 4, 2026",
            },
          }),
        });
      } catch (loopsErr) {
        // Log but don't fail the request — Supabase insert already succeeded
        console.error("[waitlist] Loops error (non-fatal):", loopsErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

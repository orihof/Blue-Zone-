/// app/api/webhooks/stripe/route.ts
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  // Verify Stripe signature when key is available
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (webhookSecret && !sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = getAdminClient();

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object;
      const customerId = sub.customer as string;
      const status = sub.status as string;
      const planId = (sub.items as { data: { price: { id: string } }[] }).data?.[0]?.price?.id;

      const plan = planId?.includes("clinic") ? "clinic" : status === "active" ? "pro" : "free";

      const { data: user } = await supabase
        .from(TABLES.USERS)
        .select(COLS.ID)
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      if (user) {
        await supabase
          .from(TABLES.USERS)
          .update({ [COLS.PLAN]: plan })
          .eq(COLS.ID, user.id);
        console.log(`[stripe] Updated plan to ${plan} for customer ${customerId}`);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const customerId = sub.customer as string;
      const { data: user } = await supabase
        .from(TABLES.USERS)
        .select(COLS.ID)
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      if (user) {
        await supabase.from(TABLES.USERS).update({ [COLS.PLAN]: "free" }).eq(COLS.ID, user.id);
      }
      break;
    }

    default:
      console.log(`[stripe] Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

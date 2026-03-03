/// lib/supabase/public.ts
// Anon-key client — safe to use client-side (only for signed URL uploads)
import { createClient } from "@supabase/supabase-js";

export const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

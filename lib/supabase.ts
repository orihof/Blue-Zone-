/**
 * CLIENT-SAFE SUPABASE EXPORTS
 * Safe to import in 'use client' components.
 * Never contains secrets.
 *
 * Auth rule:
 *   getUser()    → server-side auth verification (route handlers, middleware)
 *   getSession() → client-side display only (trusts unverified cookie)
 */
import { createBrowserClient } from "@supabase/ssr";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Route handler client — import in each API route, do not export from here:
// import { createServerClient } from "@supabase/ssr";
// import { cookies } from "next/headers";
// const supabase = createServerClient(url, anonKey, { cookies: { getAll, setAll } });

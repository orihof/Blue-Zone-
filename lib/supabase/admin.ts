/// lib/supabase/admin.ts
// Server-only — never import this from client components
import { createClient } from "@supabase/supabase-js";

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Module-level singleton — safe in serverless (each cold start gets its own module)
let _client: ReturnType<typeof createAdminClient> | null = null;

export function getAdminClient() {
  if (!_client) _client = createAdminClient();
  return _client;
}

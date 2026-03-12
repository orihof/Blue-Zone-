# Blue Zone — Security Architecture: Auth & RLS Model

**Last updated:** Migration 027
**Status:** Pre-launch

---

## Why This Document Exists

Blue Zone uses **NextAuth.js** for authentication and **Supabase** for the database.
This is a non-standard combination — Supabase's built-in Row-Level Security (RLS)
system is designed to work with Supabase Auth, not NextAuth. This document explains
how the two systems interact, why `auth.uid()` is not available, and how data
isolation is enforced instead.

This document is a **due diligence artifact** — it answers the questions an
acquirer's security team will ask about data access control.

---

## Authentication Architecture

```
User → Browser → NextAuth.js (JWT cookie) → Next.js API routes → getAdminClient() → Supabase
                                                                   (service role key)
```

### How It Works

1. User signs in via Google OAuth or magic link (Resend)
2. NextAuth creates/looks up a row in `nextauth_users`
3. NextAuth issues a **signed JWT** stored as an httpOnly cookie
4. Every API route calls `getServerSession(authOptions)` to extract `session.user.id`
5. `session.user.id` = `nextauth_users.id` (UUID)
6. The API route calls `getAdminClient()` — a Supabase client initialized with
   `SUPABASE_SERVICE_ROLE_KEY`
7. The route queries Supabase with an explicit `WHERE user_id = session.user.id`

### What This Means

- **Supabase Auth is not active.** No Supabase session is created. No Supabase JWT
  is issued.
- **`auth.uid()` always returns `NULL`** in any Supabase context (RLS policies,
  database functions, etc.)
- **RLS policies that reference `auth.uid()` will silently fail** — they evaluate
  `user_id = NULL`, which is `UNKNOWN`, which means the row is excluded.
- **The service role key bypasses RLS entirely.** Since all API routes use service
  role, RLS is not the primary access control — it is a safety net.

---

## Data Isolation Model

### Primary: Application-Layer Isolation

Every API route enforces user isolation through this pattern:

```typescript
const session = await getServerSession(authOptions);
if (!session?.user?.id) return unauthorized();

const db = getAdminClient(); // service role — bypasses RLS
const { data } = await db
  .from(TABLES.BIOMARKERS)
  .select('*')
  .eq(COLS.USER_ID, session.user.id); // ← isolation enforced here
```

**User A cannot access User B's data** because:
1. `session.user.id` comes from a signed JWT that only NextAuth can issue
2. The JWT is bound to the user's `nextauth_users.id`
3. Every query filters by this ID
4. There is no code path that accepts a user ID from the request body or query
   params for data access (user ID always comes from the session)

### Secondary: RLS Defence-in-Depth

RLS is enabled on all tables containing user data with `block_anon_*` policies:

```sql
CREATE POLICY block_anon_biomarkers ON biomarkers FOR ALL USING (false);
```

These policies:
- **Block all access via the anon key** (the key exposed to the browser)
- **Block all access via any authenticated non-service-role client**
- **Do NOT affect service role access** (service role bypasses RLS)

This means that even if a code path accidentally uses the anon/public Supabase
client to query a health data table, it will get zero rows — not a data leak.

### Why Not Per-User RLS?

Per-user RLS (e.g., `USING (user_id = auth.uid())`) requires `auth.uid()` to be
set, which requires Supabase Auth. Since Blue Zone uses NextAuth, `auth.uid()` is
never set.

Alternatives considered:
- **Switch to Supabase Auth**: Would break NextAuth's session model, OAuth
  provider management, and middleware integration. Not worth the migration risk
  pre-launch.
- **`SET LOCAL` per request**: Would require wrapping every query in a transaction
  that sets a custom Supabase config variable. Adds complexity and latency for
  marginal security benefit when all access already goes through service role.

**Decision**: Application-layer isolation via service role is the primary model.
RLS `block_anon_*` policies are the safety net. This is a standard, well-understood
pattern for NextAuth + Supabase stacks.

---

## RLS Coverage Matrix

All tables containing user data have RLS enabled with `block_anon_*` policies.
Service role (used by all API routes) bypasses RLS.

| Table | RLS Enabled | Policy | Migration |
|---|---|---|---|
| rate_limit_buckets | Yes | `block_anon_rate_limits` | 001 |
| health_uploads | Yes | `block_anon_health_uploads` | 001 |
| biomarkers | Yes | `block_anon_biomarkers` | 001 |
| wearable_snapshots | Yes | `block_anon_wearable_snapshots` | 001 |
| protocol_outputs | Yes | `block_anon_protocol_outputs` | 001 |
| analysis_reports | Yes | `block_anon_analysis_reports` | 027 (fixed) |
| consent_records | Yes | `block_anon_consent_records` | 027 |
| consent_audit_log | Yes | `block_anon_consent_audit_log` | 027 |
| uploads | Yes | `block_anon_uploads` | 027 |
| health_snapshots | Yes | `block_anon_health_snapshots` | 027 |
| protocols | Yes | `block_anon_protocols` | 027 |
| bookmarks | Yes | `block_anon_bookmarks` | 027 |
| checkin_responses | Yes | `block_anon_checkin_responses` | 027 |
| profiles | Yes | `block_anon_profiles` | 027 |
| api_usage | Yes | `block_anon_api_usage` | 027 |
| nextauth_users | No | N/A | Auth table — managed by NextAuth adapter |
| nextauth_accounts | No | N/A | Auth table — managed by NextAuth adapter |
| nextauth_sessions | No | N/A | Auth table — managed by NextAuth adapter |
| nextauth_verification_tokens | No | N/A | Auth table — managed by NextAuth adapter |

**Tables added after migration 027** must include `ENABLE ROW LEVEL SECURITY` and
a `block_anon_*` policy following this same pattern.

---

## Client-Side Supabase Access

The browser has access to only one Supabase client (`lib/supabase/public.ts`),
initialized with `NEXT_PUBLIC_SUPABASE_ANON_KEY`. This client is used **exclusively
for file uploads** via signed URLs:

1. Client calls `POST /api/uploads/sign` (server-side, service role generates signed URL)
2. Client uploads file directly to Supabase Storage via XHR
3. Client calls `POST /api/uploads/commit` (server-side, service role writes metadata)

**The anon-key client never performs database queries.** The `block_anon_*` RLS
policies ensure that if it ever did, it would receive zero rows.

---

## Service Role Key Protection

`SUPABASE_SERVICE_ROLE_KEY` is the single most sensitive credential in the system.
It bypasses all RLS policies. Protection measures:

1. Stored in `.env.local` — never committed to version control
2. **Not prefixed with `NEXT_PUBLIC_`** — never included in browser bundles
3. Used only in `lib/supabase/admin.ts` via `getAdminClient()`
4. All API routes import `getAdminClient()` — no route constructs its own client

**CI/build guard**: Any occurrence of `NEXT_PUBLIC_SUPABASE_SERVICE` in the
codebase is a critical security violation and should fail the build.

---

## Known Limitations

1. **No database-layer per-user isolation.** User isolation is enforced at the
   application layer. A bug in an API route that omits the `user_id` filter
   could return data from all users. Mitigation: code review discipline and
   the API authentication matrix.

2. **Consent tier enforcement is application-layer only.** When a user withdraws
   consent, the consent state change is recorded in `consent_records`, but data
   access restriction is enforced by API route logic checking `is_current` —
   not by a database constraint. Mitigation: the `block_anon_*` policies prevent
   any non-service-role path from reaching the data regardless.

3. **Audit log immutability depends on access control, not database grants.**
   `consent_audit_log` is append-only by convention (no UPDATE/DELETE in
   application code), but the service role key has full write access.
   Mitigation: acceptable pre-launch for a solo developer; revisit with
   restricted database roles pre-acquisition.

---

## Revision History

| Migration | Change | Date |
|---|---|---|
| 001 | RLS enabled + `block_anon_*` on 5 core tables | Initial |
| 014 | RLS enabled on `analysis_reports` with `auth.uid()` policy (broken) | Initial |
| 027 | Fixed broken policy; added `block_anon_*` to all remaining tables | 2026-03-12 |

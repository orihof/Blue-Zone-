# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

```bash
npm run dev          # Start local dev server (localhost:3000)
npm run build        # Production build
npm run type-check   # TypeScript check — run before every commit (npx tsc --noEmit)
npm run lint         # ESLint via next lint
npm test             # Jest (unit tests)
```

No `.env.local` → app won't start. Minimum required:
```
NEXTAUTH_SECRET=          # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
INTERNAL_GUARD_SECRET=    # any random string; used by middleware → /api/auth/guard
```

---

## Architecture Overview

### Request Flow
```
Browser → middleware.ts → /api/auth/guard (Node.js route, checks onboarding + consent)
                       → Next.js App Router pages (server components)
                       → API route handlers → getAdminClient() → Supabase
```

**Middleware** (`middleware.ts`) — runs on Edge runtime. Protects `/app/**` and `/onboarding/**`. Does NOT touch Supabase directly — calls `/api/auth/guard` via internal HTTP with `x-guard-secret` header. Fails open on guard errors.

**Auth** — NextAuth v4, JWT strategy. Session = signed cookie. `session.user.id` = `nextauth_users.id`. All DB FKs point to `nextauth_users(id)`, never `auth.users(id)`.

**Database access** — Only through `getAdminClient()` (service role). Client never touches Supabase directly. All table/column names go through `TABLES.X` / `COLS.X` from `lib/db/schema.ts` — no hardcoded strings.

**AI calls** — All Anthropic calls live in `lib/ai/`. Two-part parallel generation pattern: `Promise.all([callWithRetry(...partA), callWithRetry(...partB)])`, results merged + Zod-validated before DB write.

### Key Route Segments
| URL | Source |
|---|---|
| `/app/**` | `app/app/` directory (note: `app/app/`, not `app/(app)/`) |
| `/onboarding/**` | `app/onboarding/` |
| `/auth/**` | `app/auth/` |
| `/api/**` | `app/api/` |

### Core Data Pipeline
```
File upload → /api/uploads/sign (get signed URL) → XHR to Supabase Storage
           → /api/uploads/commit → health_uploads row
           → /api/ingest → AWS Textract OCR → biomarkers + wearable_snapshots
           → /api/protocol/generate → Claude AI → protocol_outputs
```

### AI Protocol Packs
Two parallel features, same generation pattern:
- **Sports Prep** (`sports_protocols` table) → `lib/ai/generateSportsProtocol.ts` → `app/app/results/sports/[id]`
- **Goal Prep** (`goal_protocols` table, 8 categories) → `lib/ai/generateGoalProtocol.ts` → `app/app/results/goal/[id]`

Generation API routes: insert row with `status: "processing"` → generate → update to `"ready"` or `"failed"`. Client polls `/api/[type]/status/[id]` every 1500ms; 120s timeout.

### CSS Architecture
- Global styles: `app/globals.css` — design tokens (`--radius-xs/sm/md/lg/xl`, `--card-radius`, palette)
- Component-level: scoped CSS classes in globals.css (not CSS modules)
- Typography: Syne (display), Inter (body), JetBrains Mono (numeric data)
- Shimmer animation: `shimmerDiag` keyframe using `background-position` on 135° gradient

### Critical Patterns
- **`.maybeSingle()` not `.single()`** — `.single()` throws PGRST116 on missing rows; always use `.maybeSingle()`
- **Suspense for `useSearchParams()`** — every page that uses `useSearchParams()` must be wrapped in `<Suspense>`, or it will throw in production
- **`cookies()` is synchronous** in Next.js 14 — no `await`
- **`Array.from(new Set(...))`** not spread — TypeScript target doesn't support `[...Set]`
- **Soft deletes** — never hard-delete health data; use `deleted_at TIMESTAMPTZ`
- **Migrations** — sequential `001–024` exist; new ones start at `025`; header comment required (see `CLAUDE_ENGINEERING.md`)

---
@CLAUDE_FRONTEND.md
@CLAUDE_ENGINEERING.md
@CLAUDE_REVENUE.md
@CLAUDE_SCIENCE.md
@import SECURITY.md

---

## Design Prototype Reference

This section documents a standalone HTML design prototype that exists
separately from the Next.js app. It is used for UI/UX iteration only.
Do not treat it as a Next.js component or apply its conventions to
app/ code.

### Prototype file
- Current file: bluezone-wearables-v23.html
- Location: project root (not inside app/ or components/)
- Stack: single-file HTML + CSS + vanilla JS — no React, no TypeScript,
  no Supabase, no NextAuth
- Versioning: each change saves a new file (v24, v25, etc.)
  Never edit the current version in place

### What this prototype covers
Step 3 of 5 in the Competition Prep onboarding flow — the wearables
connection screen. The user has completed Profile (1) and Goals (2)
and has not yet connected a device.

Full flow detail: context/flows.md

### Prototype design tokens
These tokens exist only inside the HTML prototype. They do not exist
in globals.css and must never be copied into the Next.js app.

  --void:   #07080e   page background
  --depth:  #0b0c18   sidebar background
  --layer:  #0f1120   card background
  --raise:  #141628   card hover background
  --ink:    #6c5ce7   primary purple
  --ink-hi: #a29bfe   purple light
  --wave:   #00cec9   teal accent
  --t1:     #eef0ff   primary text
  --t2:     #737aaa   secondary text
  --t3:     #343960   muted
  --go:     #00b894   green / success
  --warn:   #e08a40   amber / manual import only
  --btn-w:  152px     uniform button width

Note: the prototype uses Plus Jakarta Sans (body) and Syne (display).
The Next.js app uses Inter (body) and Syne (display). These are
different and intentional — do not mix them.

### Rules when working on the prototype
- Never change .step-track-fill width — it is 50% by design
- Never remove the "14 days to race day" chip — it is Competition
  Prep-specific and does not appear in other flows
- Never make the skip footer visually prominent — low weight is
  intentional
- The continue CTA must stay hidden until connectedCount === 1
- All new cards must follow the .dc pattern with --layer bg and
  --b0 border
- All new buttons must use --btn-w: 152px
- Never hardcode hex values that have a token equivalent
- Never apply these rules to Next.js app/ code

### Rules when working on the Next.js app
- The prototype does not define how Next.js components should be built
- Use globals.css tokens (--radius-xs/sm/md/lg/xl etc.) not prototype
  tokens
- Use Inter for body text, not Plus Jakarta Sans
- Follow all patterns in CLAUDE_FRONTEND.md and CLAUDE_ENGINEERING.md
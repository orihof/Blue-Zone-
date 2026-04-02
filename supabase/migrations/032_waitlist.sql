-- Migration: Create waitlist table for landing page email capture
-- Reversible: yes
-- Risk: low
-- Rollback: DROP TABLE public.waitlist;

create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  source      text not null default 'landing',
  created_at  timestamptz not null default now(),
  constraint waitlist_email_unique unique (email)
);

-- Enable RLS
alter table public.waitlist enable row level security;

-- Only service role can read/write (no public access)
-- No policies needed — admin client bypasses RLS

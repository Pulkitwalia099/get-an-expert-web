-- Phase 2/3: durable usage counters (rate limits, spend caps, SerpAPI quota)
-- and per-request API events for monitoring.
--
-- Same posture as the first migration: RLS on, no policies, all access via
-- the secret key from server routes.

-- Generic atomic counters. Keys are built in lib/usage.ts, for example
-- d:chat:2026-07-24 (daily route counter), m:serp:2026-07 (monthly SerpAPI
-- quota), r:chat:203.0.113.7:202607240215 (per-IP minute bucket).
create table usage_counters (
  key text primary key,
  count bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- Atomic increment-and-read. Calling with by = 0 reads without counting.
create or replace function bump_usage(counter_key text, by integer default 1)
returns bigint
language sql
as $$
  insert into usage_counters as u (key, count, updated_at)
  values (counter_key, greatest(by, 0), now())
  on conflict (key) do update
    set count = u.count + greatest(by, 0), updated_at = now()
  returning count;
$$;

-- One row per API request: status, latency, and the error class when one
-- was caught. Feeds the daily report (5xx rate, p95 latency).
create table api_events (
  id bigint generated always as identity primary key,
  route text not null,
  status integer not null,
  latency_ms integer,
  error text,
  created_at timestamptz not null default now()
);

create index api_events_created_at_idx on api_events (created_at);

-- Retention, run daily by the report route. Leads (the only personal data)
-- are kept 12 months; sessions cascade to messages and searches; counter
-- rows and events only matter for recent reporting.
create or replace function purge_expired()
returns void
language sql
as $$
  delete from leads where created_at < now() - interval '12 months';
  delete from sessions where last_seen < now() - interval '12 months';
  delete from usage_counters where updated_at < now() - interval '2 months';
  delete from api_events where created_at < now() - interval '3 months';
$$;

alter table usage_counters enable row level security;
alter table api_events enable row level security;

-- The publishable key's roles can neither touch the tables nor call the
-- helpers.
revoke all on function bump_usage(text, integer) from public, anon, authenticated;
revoke all on function purge_expired() from public, anon, authenticated;

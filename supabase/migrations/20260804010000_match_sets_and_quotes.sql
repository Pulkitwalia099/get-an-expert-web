-- Matched profiles that outlive the browser tab, and the quote requests the
-- outbound agents work.
--
-- Until now a search existed only in React state: the cards were rendered and
-- then gone, and `finalizeExperts` threw the profile link away entirely. A
-- dashboard cannot show you the people you picked if nobody wrote them down,
-- so they are written down here.
--
-- This is also what makes the blur real rather than decorative. Names, photos
-- and links live in these rows and are handed to a browser only after the
-- session cookie says who is asking. A CSS blur over a name that is already in
-- the HTML is a blur anyone removes in devtools.
--
-- ADDITIVE ONLY. Nothing existing is altered, because a second project shares
-- this database and reads tables prefixed `ob_`.
--
-- SAFE TO RUN MORE THAN ONCE. Every statement is guarded, following the same
-- rule as the accounts migration: one failed statement in an unguarded batch
-- rolls back the whole thing and it looks like it ran.

-- -------------------------------------------------------------- match_sets

-- One search that produced results. The id is a uuid rather than a serial
-- because the browser holds it for the length of a visit and then hands it
-- back to claim the set after signing in. A guessable id would let somebody
-- claim a stranger's search and read the names out of it.
--
-- `sub` is null until that claim happens. An anonymous visitor's set is
-- claimable; a claimed one never changes hands.
create table if not exists match_sets (
  id          uuid primary key default gen_random_uuid(),
  session_id  text,
  sub         text references accounts (sub) on delete set null,
  brief       jsonb not null,
  query       text not null,
  demo        boolean not null default false,
  created_at  timestamptz not null default now(),
  claimed_at  timestamptz
);

create index if not exists match_sets_sub_idx on match_sets (sub, created_at desc);
create index if not exists match_sets_session_idx on match_sets (session_id);

alter table match_sets enable row level security;

-- ---------------------------------------------------------- match_profiles

-- The people. Three to eight rows per set.
--
-- `slot` is the public identity of a row, not `id`. The browser selects by
-- slot while every name is still withheld, so the thing it names has to be
-- meaningless on its own.
--
-- Two text blocks, deliberately separate columns rather than one. `why` is
-- held to what the search snippet supports. `projected` is the richer read of
-- what the brief needs, rendered under a heading that says so. Merging them
-- would make the honest half indistinguishable from the inferred half, which
-- is the entire reason the second column exists.
create table if not exists match_profiles (
  id          bigint generated always as identity primary key,
  set_id      uuid not null references match_sets (id) on delete cascade,
  slot        integer not null,
  name        text not null,
  link        text not null,
  photo       text,
  source      text not null default '',
  country     text not null default '',
  flag        text not null default '',
  rating      numeric,
  reviews     integer,
  price       text,
  why         text not null,
  projected   text not null default '',
  top_match   boolean not null default false,
  created_at  timestamptz not null default now()
);

create unique index if not exists match_profiles_set_slot_idx on match_profiles (set_id, slot);

alter table match_profiles enable row level security;

-- ---------------------------------------------------------- quote_requests

-- What somebody asked us to go and get, and what the outbound agents work.
--
-- `sub` is null on the email path: somebody who will not sign in with Google
-- still gets their quotes, they just have no dashboard to read them in. The
-- email column is filled either way, because it is the address the quotes go
-- to and it must never depend on an account existing.
--
-- `ref` is the idempotency key, following credit_entries and orders. A double
-- tap, a retried fetch, or a second pass through the auth callback all carry
-- the same ref and the unique index below turns the repeat into a no-op
-- rather than a second request and a second round of outreach.
create table if not exists quote_requests (
  id          uuid primary key default gen_random_uuid(),
  set_id      uuid not null references match_sets (id) on delete cascade,
  sub         text references accounts (sub) on delete set null,
  email       text not null,
  name        text,
  slots       integer[] not null default '{}',
  status      text not null default 'open'
                check (status in ('open', 'contacting', 'quotes_ready', 'closed')),
  ref         text not null,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists quote_requests_set_ref_idx on quote_requests (set_id, ref);
create index if not exists quote_requests_sub_idx on quote_requests (sub, created_at desc);
-- The outbound agents poll this one: everything still to be worked, oldest
-- first. Kept as its own index so that query stays cheap as the table grows.
create index if not exists quote_requests_status_idx on quote_requests (status, created_at);

alter table quote_requests enable row level security;

-- PostgREST answers from a cached copy of the schema. Without this the new
-- tables stay invisible to the API until the cache happens to refresh, which
-- is the PGRST204 that made an earlier migration look like it did nothing.
notify pgrst, 'reload schema';

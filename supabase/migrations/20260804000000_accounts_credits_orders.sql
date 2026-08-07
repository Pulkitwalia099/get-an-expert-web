-- Google sign in, a credit ledger, and orders that carry no payment.
--
-- No Stripe anywhere in here on purpose. Money is still collected by hand
-- after the setup is running, which is what the booking sheet promises, so an
-- order is a request with a price attached rather than a charge.
--
-- SAFE TO RUN MORE THAN ONCE. Every statement is guarded, because the
-- migration before this one taught us what an unguarded batch costs: one
-- failed statement rolls the whole thing back and it looks like it ran.

-- ---------------------------------------------------------------- accounts

-- Identity comes from Google, so there is no password column here and never
-- will be. `sub` is Google's stable subject id, which survives the user
-- changing their display name or even their address, so it is the key that
-- credits and orders hang off rather than the email.
create table if not exists accounts (
  id          bigint generated always as identity primary key,
  sub         text not null unique,
  email       text not null,
  name        text,
  picture     text,
  created_at  timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists accounts_email_idx on accounts (email);

alter table accounts enable row level security;

-- ------------------------------------------------------------ credit ledger

-- Append only, and deliberately not a balance column. A stored balance and a
-- history that disagree is a bug you discover in a customer complaint rather
-- than in a test, and the fix is always an argument about which number was
-- right. The balance is the sum of these rows and cannot drift from them.
--
-- Amounts are integer cents. Money in floating point rounds in ways that only
-- show up once the amounts are real.
--
-- `ref` is the idempotency key. The unique index below is what stops a second
-- sign in granting a second welcome credit, so the grant can be written on
-- every sign in without checking first.
create table if not exists credit_entries (
  id          bigint generated always as identity primary key,
  sub         text not null references accounts (sub) on delete cascade,
  delta_cents integer not null,
  reason      text not null check (reason in ('signup', 'spend', 'refund', 'manual', 'expiry')),
  ref         text not null,
  note        text,
  created_at  timestamptz not null default now()
);

create unique index if not exists credit_entries_sub_ref_idx on credit_entries (sub, ref);
create index if not exists credit_entries_sub_idx on credit_entries (sub, created_at desc);

alter table credit_entries enable row level security;

-- The balance, derived. Kept as a view so the number has exactly one
-- definition and nothing can compute it a second way.
create or replace view credit_balances as
  select sub, coalesce(sum(delta_cents), 0)::integer as balance_cents
    from credit_entries
   group by sub;

-- ------------------------------------------------------------------ orders

-- What someone asked for, what it lists at, what their credit covered, and
-- what they still owe. due_cents is stored rather than computed on read
-- because it is what we will actually invoice, and a price change later must
-- not silently rewrite what an old order said.
-- `ref` is the idempotency key, and it matches the one on the matching credit
-- entry. Cal retries any delivery it did not get a 2xx for, so the same
-- booking genuinely does arrive twice; the unique index below is what makes
-- the second delivery a no-op instead of a second order and a second debit.
create table if not exists orders (
  id                  bigint generated always as identity primary key,
  sub                 text not null references accounts (sub) on delete cascade,
  ref                 text not null,
  setup_slug          text not null,
  setup_title         text not null,
  price_cents         integer not null,
  credit_applied_cents integer not null default 0,
  due_cents           integer not null,
  -- 'placed' is where every order starts. Nothing here charges a card, so
  -- there is no 'paid' until a human marks it.
  status              text not null default 'placed'
                        check (status in ('placed', 'scheduled', 'delivered', 'paid', 'cancelled')),
  note                text,
  created_at          timestamptz not null default now()
);

create unique index if not exists orders_sub_ref_idx on orders (sub, ref);
create index if not exists orders_sub_idx on orders (sub, created_at desc);
create index if not exists orders_status_idx on orders (status);

alter table orders enable row level security;

-- PostgREST answers from a cached copy of the schema. Without this the new
-- tables are invisible to the API until the cache happens to refresh, which
-- is the PGRST204 that made the last migration look like it did nothing.
notify pgrst, 'reload schema';

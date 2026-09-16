-- What a customer chose on their monthly plan page.
--
-- One row per plan per address. A second confirmation updates the row rather
-- than adding one, so a double tap, a retried fetch and a change of mind all
-- leave one answer, and the current answer is the row. (The next migration
-- adds `actor` to that key; see 20260916000000_plan_choices_per_actor.sql.)
--
-- The plan itself is not here. Its copy, tiers and formats live in
-- lib/plans.ts, keyed by `plan_slug`, because one customer's plan is reviewed
-- in a diff and not in an editor. This table holds the only thing the
-- customer writes: how many videos a month, and from when.
--
-- `actor` says who pressed the button. `customer:<email>` is the real thing.
-- `operator` and `preview` are us checking the page, and the email that
-- follows a row like that is marked as a test.

create table if not exists public.plan_choices (
  id           bigserial primary key,
  plan_slug    text        not null,
  -- The address the plan belongs to, lowercase, from lib/plans.ts. Not the
  -- session's address: an operator confirming on a customer's behalf still
  -- files it under the customer.
  email        text        not null,
  -- Videos a month. Only the tiers the plan offers are accepted.
  cadence      integer     not null,
  start_on     date        not null,
  actor        text        not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint plan_choices_cadence_positive check (cadence > 0),
  constraint plan_choices_one_per_plan unique (plan_slug, email)
);

-- Written with the service key from a server route only, same as order_*.
alter table public.plan_choices enable row level security;

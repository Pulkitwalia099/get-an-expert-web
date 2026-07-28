-- The /setups page had no persistence at all. Both of these were going
-- nowhere durable.
--
-- 1. "Seen a setup we're missing?" submissions were written to the Vercel log
--    and, if INSIGHTS_WEBHOOK_URL happened to be set, posted to a webhook.
--    Vercel logs roll off. Somebody handing over a reel link and an email
--    address is a lead, and leads belong in a table.
--
-- 2. Bookings are taken by Cal.com, so nothing on this side knew which setup
--    a booking was for. Without that you cannot answer the only question the
--    catalog raises: which setups actually convert.

create table setup_requests (
  id          bigint generated always as identity primary key,
  link        text not null,
  contact     text,
  status      text not null default 'new' check (status in ('new', 'scoped', 'listed', 'declined')),
  note        text,
  created_at  timestamptz not null default now()
);

create index setup_requests_status_idx on setup_requests (status);
create index setup_requests_created_at_idx on setup_requests (created_at desc);

alter table setup_requests enable row level security;

-- One row per Cal booking for a setup. setup_slug comes out of the booking
-- notes the page writes, so it is nullable: a booking made straight from the
-- Cal link rather than from a card has no setup attached, and that is fine.
create table setup_bookings (
  id            bigint generated always as identity primary key,
  cal_booking_uid text unique,
  setup_slug    text,
  attendee_email text,
  attendee_name text,
  starts_at     timestamptz,
  status        text not null default 'booked' check (status in ('booked', 'cancelled', 'rescheduled')),
  payload       jsonb,
  created_at    timestamptz not null default now()
);

create index setup_bookings_setup_slug_idx on setup_bookings (setup_slug);
create index setup_bookings_starts_at_idx on setup_bookings (starts_at desc);

alter table setup_bookings enable row level security;

-- RLS is on with no policies, which denies everyone. The server writes with
-- the secret key, which bypasses RLS, and nothing else should ever read these
-- two tables. Same posture as every other table in this schema.

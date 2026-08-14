-- Archive two orphaned tables, 2026-08-14.
--
-- Neither has a writer any more, and both were checked three ways before this
-- ran: no code in this repo names them, the marketplace bundle at the apex
-- touches Supabase only through /api/signup, and neither has an inbound foreign
-- key, a dependent view, or an RLS policy.
--
--   expert_applications  4 rows, last written 22 Jul 2026.
--     Superseded by mk_orders. The supply side form on /register posts to
--     /api/signup, which files expert signups into mk_orders under kind
--     'expert'. That table was written to today.
--
--   waitlist_signups     5 rows, last written 28 Jul 2026.
--     The only form that fed it was on /classic, archived to
--     archive/static/classic in the same change. That form posted to the older
--     get-an-expert-v2 deployment, which this repo cannot see inside, so the
--     page and the table move together: the form is closed before the table
--     goes, rather than left pointing at something that moved.
--
-- SET SCHEMA rather than DROP, on purpose. Every row, index and constraint is
-- preserved. PostgREST exposes only `public`, so the tables stop being
-- reachable through the API and stop appearing in the table list, while the
-- data stays queryable from SQL.
--
-- To put one back:
--   alter table archive.waitlist_signups set schema public;

create schema if not exists archive;

comment on schema archive is
  'Tables kept for their history but no longer written to. Not exposed through the API. See supabase/migrations for why each one is here.';

alter table public.expert_applications set schema archive;
alter table public.waitlist_signups   set schema archive;

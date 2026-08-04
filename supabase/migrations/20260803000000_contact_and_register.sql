-- Contact card and the expert / agent register.
--
-- APPLY THIS TO PRODUCTION SUPABASE BEFORE EITHER FORM WILL PERSIST.
-- Until it runs, Postgres rejects every kind = 'contact' and kind = 'register'
-- insert. The route treats that like any other write failure: the person still
-- gets a confirmation, the notification email still goes out, and the
-- rejection only shows up in the server log as
-- "[midsesh:supabase] leads write failed". Nothing else breaks.
--
-- Both land in `leads` rather than in tables of their own. That table is
-- already the only one holding personal data, which is what the privacy policy
-- says and what the deletion path in it depends on. A second table of names and
-- email addresses would make that sentence false and would have to be found by
-- hand on every deletion request.

alter table leads drop constraint leads_kind_check;

alter table leads
  add constraint leads_kind_check
  check (kind in ('intros', 'custom', 'expert', 'contact', 'register'));

-- The register asks four questions whose answers have no column: skills, the
-- agents on offer, the price wanted, and when they are free to meet. They go in
-- one jsonb rather than four columns because the two paths through that form
-- ask different things, and a column that is null for half the rows is a column
-- that teaches you nothing.
--
-- `need` still carries the free text message from the contact card, so nothing
-- about the existing shape moves.
alter table leads add column if not exists details jsonb;

comment on column leads.details is
  'Structured answers from /register. Null for every other lead kind.';

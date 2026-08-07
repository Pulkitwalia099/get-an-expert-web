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
--
-- SAFE TO RUN MORE THAN ONCE. The first version of this file began with a bare
-- `alter table leads drop constraint leads_kind_check`, which fails outright if
-- that is not the constraint's name, and one failed statement rolls back the
-- whole batch. The result was a migration that looked like it ran and changed
-- nothing: contact rows still hit a 23514 check violation and register rows
-- still hit PGRST204 for a missing column. The block below finds the
-- constraint by what it does rather than by what it is called.

do $$
declare
  existing text;
begin
  select conname into existing
    from pg_constraint
   where conrelid = 'leads'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%kind%';

  if existing is not null then
    execute format('alter table leads drop constraint %I', existing);
  end if;
end $$;

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

-- PostgREST answers from a cached copy of the schema. A column added without
-- this is invisible to the API until the cache happens to refresh, which is
-- the PGRST204 above: the column exists, the API cannot see it yet.
notify pgrst, 'reload schema';

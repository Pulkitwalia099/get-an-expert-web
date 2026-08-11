-- Marketplace forms land in `leads`.
--
-- APPLY THIS TO PRODUCTION SUPABASE BEFORE THE WAITLIST FORM WILL PERSIST.
-- Until it runs, Postgres rejects every kind = 'waitlist' insert with a 23514
-- check violation. The route treats that like any other write failure: the
-- visitor still gets their confirmation, the notification email still goes out,
-- and the rejection only shows up in the server log as
-- "[midsesh:supabase] leads write failed". Nothing else breaks. The other two
-- marketplace kinds, 'custom' and 'expert', already pass the constraint and
-- persist today with no migration at all.
--
-- The second site, `agon-agent`, is its own repo and its own Vercel project,
-- and it writes here over PostgREST with the same secret key. It is the third
-- writer of this database after this repo and `midsesh-outbound`.
--
-- Its four forms land in `leads` rather than in tables of their own, for the
-- reason spelled out in 20260803000000_contact_and_register.sql: this is
-- already the only table holding personal data, which is what the privacy
-- policy says and what the deletion path depends on. A second table of names
-- and email addresses would make that sentence false.
--
-- SAFE TO RUN MORE THAN ONCE. The constraint is found by what it does rather
-- than by its generated name, because a bare `drop constraint leads_kind_check`
-- fails outright when that is not its name, and one failed statement rolls back
-- the whole batch.

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

-- 'waitlist' is new: somebody asking to be told when a service that is not
-- live yet goes live. It is not 'intros' and it is not 'custom', because
-- there is no brief and nothing to work. Counting it as either would overstate
-- demand in the daily report.
alter table leads
  add constraint leads_kind_check
  check (kind in ('intros', 'custom', 'expert', 'contact', 'register', 'waitlist'));

-- Two sites now write here, so a row has to say which one it came from. That
-- goes in the existing `details` jsonb rather than a new column: it is
-- nullable, it needs no migration, and `source` is the only key every
-- marketplace row carries.
--
-- Rows from this repo keep writing details for /register only, or null. Rows
-- from the marketplace always carry source, and carry `surface` because three
-- of its four forms share kind = 'custom' and are otherwise
-- indistinguishable.
comment on column leads.details is
  'Structured answers from /register, or marketplace form context. '
  'Marketplace rows carry source = ''marketplace'' plus surface, and may carry '
  'service and intent. Null for every other lead kind.';

-- Partial index so "how is the marketplace doing" does not sequential scan
-- every lead this repo has ever written. The null rows are dead weight here.
create index if not exists leads_details_source_idx
  on leads ((details ->> 'source'))
  where details is not null;

-- PostgREST answers from a cached copy of the schema. Without this the new
-- constraint is enforced immediately but a stale cache can keep rejecting the
-- kind it now allows.
notify pgrst, 'reload schema';

-- Widen the leads kind check so freelancer applications can be stored.
--
-- APPLY THIS TO PRODUCTION SUPABASE BEFORE EXPERT APPLICATIONS WILL PERSIST.
-- Until it runs, Postgres rejects every kind = 'expert' insert. The route
-- treats that like any other write failure: the applicant still gets a
-- thank you, and the rejection only shows up in the server log as
-- "[midsesh:supabase] leads write failed". Nothing else breaks.
--
-- The constraint name below is the one Postgres generated for the inline
-- check in 20260724000000_phase1_persistence.sql, which never named it.

alter table leads drop constraint leads_kind_check;

alter table leads
  add constraint leads_kind_check check (kind in ('intros', 'custom', 'expert'));

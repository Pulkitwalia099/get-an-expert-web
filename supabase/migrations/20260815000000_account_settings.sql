-- Two columns behind the settings on /account.
--
-- SAFE TO RUN MORE THAN ONCE. Both are `add column if not exists` with a
-- default, so a second run does nothing and no existing row changes.
--
-- session_version is what "sign out everywhere" moves. It defaults to 0 and
-- every session cookie already out there carries no version at all, which the
-- check in lib/accounts.ts reads as unknown and accepts. That is what makes
-- applying this deploy sign nobody out. The cost is stated where it belongs,
-- in lib/accounts.ts: a cookie signed before this went live survives a revoke
-- until that browser signs in again, and SESSION_MAX_AGE bounds that at thirty
-- days.
--
-- name_locked exists because ensureAccount upserts with merge-duplicates on
-- every single sign in, so whatever Google holds overwrites accounts.name.
-- Without this, somebody edits their name, the next order email greets them
-- correctly, and a week later their sign in silently puts Google's version
-- back. ensureAccount now sends the name through a patch filtered on this
-- flag, and setAccountName sets it.

alter table accounts add column if not exists session_version integer not null default 0;
alter table accounts add column if not exists name_locked boolean not null default false;

-- PostgREST caches the schema, so a new column is invisible to the API until
-- it is told. Every other migration here ends the same way.
notify pgrst, 'reload schema';

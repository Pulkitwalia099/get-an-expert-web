-- Which pack routed a search, and which engine found each person in it.
--
-- Two columns that exist to settle an argument with data instead of opinion.
-- The search path is about to run more than one retrieval engine at once, and
-- the only honest way to judge one against another is to ask which of them
-- found the people a visitor actually asked to be introduced to. That question
-- is a join away once these are recorded, and unanswerable forever if they are
-- not, because the raw results are discarded the moment ranking finishes.
--
-- Result counts are the wrong metric. An engine that returns forty profiles
-- nobody picks is losing to one that returns four that get picked twice.
-- `quote_requests` already records which slots were chosen, so `engine` on the
-- profile row is the last piece needed to close that loop.
--
-- ADDITIVE ONLY. Nothing existing is altered, because a second project shares
-- this database and reads tables prefixed `ob_`.
--
-- SAFE TO RUN MORE THAN ONCE. Every statement is guarded.

-- ---------------------------------------------------------------- match_sets

-- The source pack the brief classified into: 'marketing', 'ai', 'video',
-- 'web', or null when nothing matched and the generic queries ran.
--
-- Nullable with no default and no check constraint. Nullable because every row
-- written before today has no pack and inventing one would be a lie. No check
-- constraint because the set of packs is expected to grow, and a constraint
-- here would turn "add the design pack" into a migration.
alter table if exists public.match_sets
  add column if not exists pack text;

-- Partial index: the analytics question is always "how did pack X do", never
-- "show me the sets with no pack", so the null rows are dead weight in an
-- index and are left out of it.
create index if not exists match_sets_pack_idx
  on public.match_sets (pack)
  where pack is not null;

-- ------------------------------------------------------------ match_profiles

-- Which retrieval engine produced this profile: 'serpapi' today, 'exa' and
-- 'youcom' shortly.
--
-- Recorded per profile rather than per set, because a single search runs every
-- engine at once and the eight survivors can come from different ones. Storing
-- it on the set would only tell us which engines ran, which we already know.
--
-- Never rendered. It is absent from the `Expert` type the browser receives, so
-- this column is read by analytics and by nothing a visitor can reach.
alter table if exists public.match_profiles
  add column if not exists engine text;

create index if not exists match_profiles_engine_idx
  on public.match_profiles (engine)
  where engine is not null;

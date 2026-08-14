-- One account per person.
--
-- Two sign in doors minted two different ids for the same human: Google's
-- numeric subject id, and `email:<address>` derived in lib/emailAuth. Anybody
-- who used both holds two rows in accounts, and because credits and orders
-- both hang off `sub`, their balance and their history split down the middle
-- with nothing anywhere looking broken. Pulkit has two.
--
-- The runtime half of the fix is `resolveAccount` in lib/credits.ts, which
-- looks an address up before the session cookie is signed, so no new pair can
-- be created. This is the half that repairs the pairs already in the table.
--
-- SAFE TO RUN MORE THAN ONCE. The second run finds no address holding two
-- accounts and does nothing at all, so the balance it leaves is the balance
-- the first run left. Nothing here deletes a ledger row: every credit_entries
-- row is carried across to the survivor, which is the only way a sum over the
-- ledger can come out the same on both sides of the merge.

do $$
declare
  m record;
begin
  -- Every account that is not the one its address should be using. The
  -- survivor is the oldest row for the address, because that is the account
  -- the person has been on longest and the one accountByEmail already returns.
  --
  -- Grouped on lower(email) rather than email: ensureAccount normalises now,
  -- but rows written before it did are still in here in whatever case they
  -- were typed, and those are exactly the pairs being repaired.
  for m in
    select a.sub as loser, w.survivor
      from accounts a
      join (
        select lower(email) as addr,
               (array_agg(sub order by created_at asc, id asc))[1] as survivor
          from accounts
         group by lower(email)
        having count(*) > 1
      ) w on w.addr = lower(a.email)
     where a.sub <> w.survivor
  loop
    -- Keep whatever the loser knew that the survivor does not. An account made
    -- by the email door carries no name and no photo, so merging a Google row
    -- into it would otherwise throw away the only display name we have.
    update accounts s
       set name = coalesce(s.name, l.name),
           picture = coalesce(s.picture, l.picture),
           last_seen_at = greatest(s.last_seen_at, l.last_seen_at)
      from accounts l
     where s.sub = m.survivor
       and l.sub = m.loser;

    -- credit_entries and orders are both unique on (sub, ref), and both
    -- accounts were granted a welcome credit under the fixed ref 'signup', so
    -- the move would collide on it. The colliding row is renamed rather than
    -- dropped. This person really was granted twice, the ledger is append only
    -- and says what happened, and deleting an entry to make a balance come out
    -- differently is the exact thing this schema was shaped to prevent.
    update credit_entries e
       set ref = e.ref || ' merged:' || m.loser
     where e.sub = m.loser
       and exists (
         select 1 from credit_entries k where k.sub = m.survivor and k.ref = e.ref
       );
    update credit_entries set sub = m.survivor where sub = m.loser;

    -- Same collision, different table. The survivor keeps the original ref, so
    -- a Cal redelivery of that booking still lands on a row that exists and
    -- still turns into a no-op.
    update orders o
       set ref = o.ref || ' merged:' || m.loser
     where o.sub = m.loser
       and exists (
         select 1 from orders k where k.sub = m.survivor and k.ref = o.ref
       );
    update orders set sub = m.survivor where sub = m.loser;

    -- No foreign key on either of these, and nothing unique on sub, so they
    -- are a plain move. They are here because a dashboard reads both by sub:
    -- leaving them behind would hide somebody's own searches and quote
    -- requests from them the moment their accounts merged.
    update match_sets set sub = m.survivor where sub = m.loser;
    update quote_requests set sub = m.survivor where sub = m.loser;

    -- Everything that pointed at it now points at the survivor, so the cascade
    -- on credit_entries and orders has nothing left to take.
    delete from accounts where sub = m.loser;
  end loop;
end $$;

-- What stops the pair coming back. resolveAccount is a read before a write and
-- two sign ins racing through different doors could both find nothing, so the
-- invariant is stated here as well, where it cannot be raced. lower(email) to
-- match the grouping above.
--
-- A rejected insert is survivable: ensureAccount is already allowed to fail,
-- and the sign in it belongs to completes either way.
create unique index if not exists accounts_email_key on accounts (lower(email));

import { randomUUID } from 'node:crypto';
import { insertRows, selectRows } from '@/lib/supabase';
import type { Brief, ExpertRecord } from '@/lib/types';

// Where a search goes after the cards are drawn.
//
// Two jobs. It gives a set of matches a life longer than one React state, so a
// dashboard can show somebody who they picked a week ago. And it is the half
// of the gate that holds the withheld fields: names, photos and links live in
// Postgres and reach a browser only through a read that checked the session
// cookie first.

if (typeof window !== 'undefined') {
  throw new Error('lib/matches is server-only and must never reach the client');
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A set id off the wire is a bare uuid or it is nothing. */
export function parseSetId(input: unknown): string | null {
  return typeof input === 'string' && UUID_RE.test(input) ? input.toLowerCase() : null;
}

export interface StoreInput {
  sessionId: string | null;
  /** Set straight away when the search was run by somebody already signed in,
   *  which skips the claim step entirely and means their cards never lock. */
  sub: string | null;
  brief: Brief;
  query: string;
  demo: boolean;
  records: ExpertRecord[];
}

/**
 * Write the set and its people, and hand back the id the browser will hold.
 *
 * The uuid is minted here rather than by the default on the column, because
 * PostgREST is called with `return=minimal` everywhere in this codebase and a
 * generated id would need a second round trip to read back.
 *
 * Returns null when nothing landed. A caller that gets null still has the
 * cards in memory and should render them; it just has no set to claim later,
 * which is the correct degradation for a Supabase outage. It must never be
 * treated as "no matches".
 */
export async function storeMatchSet(input: StoreInput): Promise<string | null> {
  if (input.records.length === 0) return null;

  const id = randomUUID();
  const set = await insertRows('match_sets', {
    id,
    session_id: input.sessionId,
    sub: input.sub,
    claimed_at: input.sub ? new Date().toISOString() : null,
    brief: input.brief,
    query: input.query.slice(0, 200),
    demo: input.demo,
  });
  if (!set.ok) return null;

  const profiles = await insertRows(
    'match_profiles',
    input.records.map((r) => ({
      set_id: id,
      slot: r.slot,
      name: r.name,
      link: r.link,
      photo: r.photo,
      source: r.source,
      country: r.country,
      flag: r.flag,
      rating: r.rating,
      reviews: r.reviews,
      price: r.price,
      why: r.why,
      projected: r.projected,
      top_match: r.top_match,
    })),
  );
  // A set with no people in it is worse than no set: the browser would hold an
  // id that reveals an empty list after somebody signs in to see it.
  if (!profiles.ok) return null;

  return id;
}

interface ProfileRow {
  slot: number;
  name: string;
  link: string;
  photo: string | null;
  source: string;
  country: string;
  flag: string;
  rating: number | string | null;
  reviews: number | null;
  price: string | null;
  why: string;
  projected: string;
  top_match: boolean;
}

interface SetRow {
  id: string;
  sub: string | null;
  brief: Brief;
  query: string;
  created_at: string;
}

function toRecord(row: ProfileRow): ExpertRecord {
  return {
    slot: row.slot,
    name: row.name,
    country: row.country ?? '',
    flag: row.flag ?? '',
    // Postgres numeric comes back over PostgREST as a string, so a rating of
    // 4.9 arrives as "4.9" and would render as one if it were passed through.
    rating: row.rating === null ? null : Number(row.rating),
    reviews: row.reviews,
    price: row.price,
    why: row.why,
    projected: row.projected ?? '',
    source: row.source ?? '',
    photo: row.photo,
    link: row.link,
    top_match: row.top_match,
  };
}

export interface MatchSet {
  id: string;
  sub: string | null;
  brief: Brief;
  query: string;
  createdAt: string;
  records: ExpertRecord[];
}

/** The set and its people, or null when it does not exist or cannot be read. */
export async function readMatchSet(setId: string): Promise<MatchSet | null> {
  const sets = await selectRows<SetRow>(
    'match_sets',
    `id=eq.${encodeURIComponent(setId)}&select=id,sub,brief,query,created_at&limit=1`,
  );
  const set = sets?.[0];
  if (!set) return null;

  const rows = await selectRows<ProfileRow>(
    'match_profiles',
    `set_id=eq.${encodeURIComponent(setId)}&select=slot,name,link,photo,source,country,flag,rating,reviews,price,why,projected,top_match&order=slot.asc`,
  );

  return {
    id: set.id,
    sub: set.sub,
    brief: set.brief,
    query: set.query,
    createdAt: set.created_at,
    records: (rows ?? []).map(toRecord),
  };
}

/**
 * Who is allowed to see the names in a set.
 *
 * An unclaimed set is readable by whoever holds its id, because that is the
 * person who just ran the search and is about to sign in and claim it. Once
 * `sub` is set the set belongs to one account and nobody else, so a shared or
 * leaked id stops working the moment it has an owner.
 */
export function canReveal(set: MatchSet, sub: string | null): boolean {
  if (set.sub === null) return sub !== null;
  return set.sub === sub;
}

/**
 * Bind an unclaimed set to an account.
 *
 * Refuses a set that already has an owner rather than overwriting it, so the
 * worst a replayed or guessed id can do is fail. Returns whether the caller
 * may now treat the set as theirs, which is true when they already owned it.
 */
export async function claimMatchSet(setId: string, sub: string): Promise<boolean> {
  const set = await readMatchSet(setId);
  if (!set) return false;
  if (set.sub !== null) return set.sub === sub;

  // A conditional PATCH, not a blind one. `sub=is.null` is part of the filter,
  // so two requests racing to claim the same set cannot both succeed: the
  // second one matches no rows.
  const ok = await patchRows(
    'match_sets',
    `id=eq.${encodeURIComponent(setId)}&sub=is.null`,
    { sub, claimed_at: new Date().toISOString() },
  );
  return ok;
}

// PATCH is not something lib/supabase.ts offered, because nothing before this
// updated a row it had already written. Kept here rather than added there
// until a second caller needs it.
async function patchRows(
  table: string,
  filter: string,
  patch: Record<string, unknown>,
): Promise<boolean> {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return false;
  try {
    const res = await fetch(`${url}/rest/v1/${table}?${filter}`, {
      method: 'PATCH',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(patch),
      signal: AbortSignal.timeout(3_000),
    });
    if (!res.ok) {
      console.error(`[midsesh:supabase] ${table} patch failed`, res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[midsesh:supabase] ${table} patch failed`, err);
    return false;
  }
}

export { patchRows };

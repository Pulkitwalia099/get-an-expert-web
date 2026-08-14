import { patchRows } from '@/lib/matches';
import { briefLine } from '@/lib/quotes';
import { isQuoteStatus, type QuoteStatus } from '@/lib/quote-status';
import { selectRows } from '@/lib/supabase';
import type { Brief } from '@/lib/types';

// The operator's view of quote_requests.
//
// lib/quotes.ts already reads this table, and cannot be used here: its reader
// is scoped to one account's `sub` and returns every expert record in the set,
// which is a customer's dashboard, not a queue. The operator needs every open
// request whoever placed it, and one line of text to recognise it by.
//
// The outbound agents own these in the normal case. This exists because "the
// automation has not touched seven requests since the fourth" is a thing that
// has to be visible on a phone, and until this landed nothing in the operator
// tool read the table at all.

if (typeof window !== 'undefined') {
  throw new Error('lib/operatorQuotes is server-only and must never reach the client');
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface QueueQuote {
  id: string;
  email: string;
  status: QuoteStatus;
  slots: number[];
  setId: string;
  createdAt: string;
  updatedAt: string | null;
  /** The search this came from, as the person would recognise it. */
  title: string;
}

interface RequestRow {
  id: string;
  set_id: string;
  email: string;
  slots: number[] | null;
  status: string;
  created_at: string;
  updated_at: string | null;
}

interface SetRow {
  id: string;
  brief: Brief | null;
  query: string | null;
}

/**
 * Everything still to be worked, oldest first.
 *
 * Returns null when the read failed, the same contract queue() has, and that
 * is the point of the function. The route this replaces did `rows ?? []`, so a
 * Supabase timeout rendered "no quote requests" on the one page whose whole
 * job is to say there are seven of them.
 */
export async function quoteQueue(limit = 50): Promise<QueueQuote[] | null> {
  const rows = await selectRows<RequestRow>(
    'quote_requests',
    'status=in.(open,contacting)&select=id,set_id,email,slots,status,created_at,updated_at' +
      `&order=created_at.asc&limit=${limit}`,
  );
  if (rows === null) return null;

  const titles = await titlesFor(rows.map((r) => r.set_id));

  return rows
    .filter((row): row is RequestRow & { status: QuoteStatus } => isQuoteStatus(row.status))
    .map((row) => ({
      id: row.id,
      email: row.email,
      status: row.status,
      slots: row.slots ?? [],
      setId: row.set_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // A request whose set has been deleted still has somebody waiting on it,
      // so it keeps its place in the queue and is named by its address.
      title: titles.get(row.set_id) ?? row.email,
    }));
}

/**
 * One query for every set, not one per request.
 *
 * readMatchSet is two round trips each, because it also reads the profiles,
 * and a fifty row queue would be a hundred calls to draw fifty headings. The
 * headings only need the brief, so they are fetched in a single `in.(...)`.
 */
async function titlesFor(setIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(setIds)].filter((id) => UUID.test(id));
  const titles = new Map<string, string>();
  if (ids.length === 0) return titles;

  const sets = await selectRows<SetRow>(
    'match_sets',
    `id=in.(${ids.join(',')})&select=id,brief,query&limit=${ids.length}`,
  );
  for (const set of sets ?? []) {
    titles.set(set.id, briefLine(set.brief, set.query ?? ''));
  }
  return titles;
}

export type MoveResult =
  | { ok: true }
  /** `reason` is what the route turns into a status code: the caller's mistake
   *  and our storage being down are the same sentence on screen and two very
   *  different things to a retry. */
  | { ok: false; reason: 'input' | 'storage'; error: string };

/**
 * Move a request along by hand.
 *
 * Both checks were inline in the route before this. They are here so they can
 * be tested, and because the id goes straight into a PostgREST filter: an id
 * that is not a bare uuid is a filter somebody else wrote, and it must never
 * reach the wire.
 */
export async function moveQuote(id: unknown, status: unknown): Promise<MoveResult> {
  if (typeof id !== 'string' || !UUID.test(id)) {
    return { ok: false, reason: 'input', error: 'Unknown request' };
  }
  if (!isQuoteStatus(status)) {
    return { ok: false, reason: 'input', error: 'Unknown status' };
  }

  const moved = await patchRows('quote_requests', `id=eq.${encodeURIComponent(id)}`, {
    status,
    updated_at: new Date().toISOString(),
  });
  if (!moved) return { ok: false, reason: 'storage', error: 'That did not save.' };
  return { ok: true };
}

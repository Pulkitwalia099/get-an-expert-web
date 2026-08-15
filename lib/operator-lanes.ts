import type { OrderStatus } from '@/lib/order-status';
import type { QuoteStatus } from '@/lib/quote-status';
import { clockStartsAt, promiseFor, quoteClockStartsAt, type Promised } from '@/lib/promise-clock';

// Whose turn it is, and what order to work them in.
//
// The queue used to be one newest-first list, which answers the question
// nobody has. What an operator wants at a glance is: what has gone past the
// promise, what is mine to do, and what am I waiting on somebody else for. So
// the list is grouped by that and nothing else.
//
// Client safe, like lib/promise-clock. The input types are declared here
// structurally rather than imported from lib/operatorOrders, which is
// server-only: lib/__tests__/server-only-imports.test.ts matches import lines
// and does not care that a type import erases, so importing QueueOrder even as
// a type would fail it. The real objects satisfy these shapes, and the
// generics carry them through untouched.

export type Lane = 'late' | 'yours' | 'theirs' | 'quotes' | 'closed';

/** The four counts in the header. Every one of them is a filter control. */
export type Tile = 'late' | 'yours' | 'theirs' | 'quotes';

export interface OrderInput {
  id: string;
  status: OrderStatus;
  createdAt: string;
  statusAt: string | null;
}

export interface QuoteInput {
  id: string;
  status: QuoteStatus;
  createdAt: string;
}

export type Placed<O, Q> =
  | { kind: 'order'; lane: Lane; promise: Promised; order: O }
  | { kind: 'quote'; lane: Lane; promise: Promised; quote: Q };

export interface Board<O, Q> {
  late: Placed<O, Q>[];
  yours: Placed<O, Q>[];
  theirs: Placed<O, Q>[];
  quotes: Placed<O, Q>[];
  closed: Placed<O, Q>[];
  counts: Record<Tile, number>;
}

/**
 * Which side of the table each status sits on.
 *
 * One table rather than a condition spread through the markup, so moving a
 * status between groups is one line somebody can find.
 *
 * `approved` is ours, not theirs, which is the one place this departs from how
 * the statuses read at first glance. The code is unambiguous about it:
 * STATUS_NOTES.approved says "We are preparing the clean file", and the next
 * tap OperatorActions offers is Deliver. An approved order is work we owe, and
 * it has to be able to go late.
 */
export const ORDER_LANE: Record<OrderStatus, 'yours' | 'theirs' | 'closed'> = {
  new: 'yours',
  working: 'yours',
  approved: 'yours',
  sample_sent: 'theirs',
  delivered: 'closed',
  declined: 'closed',
  refunded: 'closed',
};

/**
 * What each status is called on this side of the wall.
 *
 * Not the map in lib/order-status.ts. That one is written for the customer,
 * where sample_sent reads "Your sample is ready". Here the same row has to say
 * whose turn it is, so it reads "Waiting on them".
 */
export const ORDER_QUEUE_LABELS: Record<OrderStatus, string> = {
  new: 'New',
  working: 'Working',
  sample_sent: 'Waiting on them',
  approved: 'Approved',
  delivered: 'Delivered',
  declined: 'Declined',
  refunded: 'Refunded',
};

const QUOTE_LANE: Record<QuoteStatus, 'quotes' | 'closed'> = {
  open: 'quotes',
  contacting: 'quotes',
  quotes_ready: 'closed',
  closed: 'closed',
};

/**
 * Only work we can actually do is allowed to be called late.
 *
 * A sample that has sat unapproved for a week is a customer not replying. A
 * tile that stays red for something nobody here can fix is a tile people learn
 * to ignore, and then it is red on the day it means something.
 */
function promote(lane: Lane, promise: Promised): Lane {
  return promise.late && (lane === 'yours' || lane === 'quotes') ? 'late' : lane;
}

/**
 * A row nobody here is holding up carries no promise.
 *
 * Lateness is decided once, by the lane, and the promise is brought into line
 * with that before it leaves this module. Without this the tile and the pill
 * read the same row two different ways: `promote` deliberately keeps a quiet
 * customer out of Late, while `promiseFor` still returns red and "3d late", so
 * the Waiting on them section painted a red warning that the Late tile did not
 * count and that tapping Late did not show. Two answers to "is this late" is
 * worse than either answer on its own.
 *
 * `age` survives, because how long a sample has sat unanswered is still worth
 * knowing. It is a duration, not a deadline.
 */
function settle(lane: Lane, promise: Promised): Promised {
  if (lane === 'theirs') return { ...promise, heat: 'green', late: false, label: '' };
  // Closed loses the age as well. "waiting 8h" on an order that was delivered
  // eight hours ago is not a wait, it is how long ago it finished, and an
  // archive that reads like a queue is what the Closed section exists to stop.
  if (lane === 'closed') return { ...promise, heat: 'green', late: false, label: '', age: '' };
  return promise;
}

function startMs(p: Placed<unknown, unknown>): number {
  const ms = new Date(p.promise.startedAt).getTime();
  // A start we could not read sorts to the top of its lane. It is the row
  // somebody has to go and look at, so it goes where it will be seen.
  return Number.isFinite(ms) ? ms : 0;
}

/** Oldest first, on a copy. The caller's arrays are never reordered. */
function oldestFirst<O, Q>(rows: Placed<O, Q>[]): Placed<O, Q>[] {
  return [...rows].sort((a, b) => startMs(a) - startMs(b));
}

/**
 * Everything, sorted into the five lanes.
 *
 * Oldest first everywhere except Closed, because oldest is most at risk of
 * somebody giving up on it. Closed is newest first: an archive is not a queue
 * and none of it is waiting on anybody.
 */
export function board<O extends OrderInput, Q extends QuoteInput>(
  orders: O[],
  quotes: Q[],
  now: number,
): Board<O, Q> {
  const placed: Placed<O, Q>[] = [];

  for (const order of orders) {
    const promise = promiseFor(clockStartsAt(order.status, order.createdAt, order.statusAt), now);
    const lane = promote(ORDER_LANE[order.status], promise);
    placed.push({ kind: 'order', lane, promise: settle(lane, promise), order });
  }

  for (const quote of quotes) {
    const promise = promiseFor(quoteClockStartsAt(quote.status, quote.createdAt), now);
    const lane = promote(QUOTE_LANE[quote.status], promise);
    placed.push({ kind: 'quote', lane, promise: settle(lane, promise), quote });
  }

  const inLane = (lane: Lane) => placed.filter((p) => p.lane === lane);

  return {
    late: oldestFirst(inLane('late')),
    yours: oldestFirst(inLane('yours')),
    theirs: oldestFirst(inLane('theirs')),
    quotes: oldestFirst(inLane('quotes')),
    closed: [...inLane('closed')].sort((a, b) => startMs(b) - startMs(a)),
    counts: {
      late: inLane('late').length,
      yours: inLane('yours').length,
      theirs: inLane('theirs').length,
      // Every LIVE request, wherever it ended up.
      //
      // The four tiles are four questions, not four buckets, so this
      // deliberately double counts with Late: "how many requests are live" has
      // to keep answering 7 while all seven of them also sit in Late.
      //
      // What it must not count is a request that is finished, because tapping
      // this tile shows the late and quotes lanes and never the closed one. A
      // tile reading 9 that opens 7 rows is a tile people stop believing.
      quotes: placed.filter((p) => p.kind === 'quote' && p.lane !== 'closed').length,
    },
  };
}

/** What one tile shows when it is the active filter. */
export function rowsFor<O, Q>(b: Board<O, Q>, tile: Tile): Placed<O, Q>[] {
  if (tile === 'quotes') {
    return oldestFirst([...b.late, ...b.quotes].filter((p) => p.kind === 'quote'));
  }
  return b[tile];
}

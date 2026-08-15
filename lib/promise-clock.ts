import type { OrderStatus } from '@/lib/order-status';
import type { QuoteStatus } from '@/lib/quote-status';

// Age read as a promise rather than as a duration.
//
// The queue used to print "waiting 6d" and leave the operator to work out
// whether that was fine. It is not fine: we say 24 hours, so 6 days is five
// days of a broken promise and it should read that way without arithmetic.
//
// Client safe on purpose, the same split lib/credit-math.ts is to lib/credits.
// The dashboard is a client component, so anything it renders has to live in a
// module that carries no secrets and touches nothing.
//
// One rule here matters more than the rest, and it is clockStartsAt. Every
// other bug in this file paints a pill the wrong colour. That one hides late
// work.

/** What we promise: a first response inside a day. */
export const PROMISE_MS = 24 * 60 * 60 * 1000;

/** How close to the deadline turns the pill amber. */
export const AMBER_MS = 4 * 60 * 60 * 1000;

export type Heat = 'green' | 'amber' | 'red';

export interface Promised {
  /** The timestamp the clock runs from. Also the sort key inside a lane. */
  startedAt: string;
  /** Negative once the promise is broken. Clamped up on a start in the future. */
  msLeft: number;
  heat: Heat;
  late: boolean;
  /** What the pill says: "9d late", "6h left", or "unknown". */
  label: string;
  /** How long this has been waiting, whatever the deadline says. */
  age: string;
}

/**
 * Which timestamp the promise runs from.
 *
 * status_at is the newest event, so reading it for every status would let an
 * order buy itself another day by being touched. Somebody marking a six day
 * old order `working` would watch it go green, which is the one thing a
 * cockpit must never do: the customer has still been waiting six days.
 *
 * So created_at while the order is ours to start, and status_at only once a
 * sample has gone out, because at that point the wait genuinely restarted and
 * it restarted on their side.
 *
 * Every order with no events at all has a null status_at, which is all of the
 * ones sitting at `new`. Passing that into new Date() gives 1970 and paints
 * the whole board red, so it falls back rather than being trusted.
 */
export function clockStartsAt(
  status: OrderStatus,
  createdAt: string,
  statusAt: string | null,
): string {
  if (status === 'new' || status === 'working') return createdAt;
  return statusAt ?? createdAt;
}

/**
 * The same question for a quote request, which has a simpler answer.
 *
 * The quote ladder has no handover. `contacting` means we are out asking
 * people, not that the customer owes us anything, so nothing on it restarts
 * the clock and created_at is the only honest start.
 */
export function quoteClockStartsAt(_status: QuoteStatus, createdAt: string): string {
  return createdAt;
}

/**
 * A duration in the roughest useful unit.
 *
 * Floored, not rounded, which is how a person reads a clock: ten days and
 * seventeen hours is "10d", never "11d". Precision past that is noise on a
 * page whose promise is measured in days.
 */
function coarse(ms: number): string {
  const mins = Math.floor(Math.max(0, ms) / 60_000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/** Where a row sits against its promise, ready to render. */
export function promiseFor(startedAt: string, now: number): Promised {
  const start = new Date(startedAt).getTime();

  // A timestamp we cannot read is not a green one. Painting it green hides it
  // for good, so it goes red and says it does not know, which is a thing a
  // person will go and look at.
  if (!Number.isFinite(start)) {
    return { startedAt, msLeft: 0, heat: 'red', late: false, label: 'unknown', age: '' };
  }

  const elapsed = now - start;
  // A start in the future is clock skew between a phone and Postgres, not a
  // negative age. Clamped, so nothing ever reads "-10m late".
  const msLeft = elapsed < 0 ? PROMISE_MS : PROMISE_MS - elapsed;

  if (msLeft <= 0) {
    return {
      startedAt,
      msLeft,
      heat: 'red',
      late: true,
      label: `${coarse(-msLeft)} late`,
      age: coarse(Math.max(0, elapsed)),
    };
  }

  return {
    startedAt,
    msLeft,
    heat: msLeft <= AMBER_MS ? 'amber' : 'green',
    late: false,
    label: `${coarse(msLeft)} left`,
    age: coarse(Math.max(0, elapsed)),
  };
}

/**
 * How long ago, short.
 *
 * Moved out of app/operator/orders/page.tsx when the promise clock took over
 * the rest of that page's arithmetic. Unchanged: the order detail view still
 * prints "3h ago" in its subtitle and its trail, and those are durations, not
 * promises.
 */
export function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

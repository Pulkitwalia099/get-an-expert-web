import { insertRows } from '@/lib/supabase';

// Writes to the `mk_` tables, which this repo does not own.
//
// The schema lives in ~/Programs/get-an-expert-orders/migrations. That repo
// holds the migrations and the operator tooling; this one holds the form
// handler, so this one has to do the writing. The shape below is therefore a
// second statement of the same contract, and the two can drift.
//
// Two things keep them honest. `refFor` is the same djb2 as
// `lib/orders.ts` over there, character for character, because a second
// definition producing different keys for one submission is the failure that
// would show up as duplicate orders rather than as an error. And the column
// list is asserted in lib/__tests__/marketplaceOrders.test.ts, so a rename on
// the other side fails here rather than at 2am against real traffic.
//
// If these ever need to diverge, publish the schema module instead of copying
// it a third time.

/**
 * What somebody submitted.
 *
 * - `order`   asking for the work on a live service
 * - `notify`  joining the waitlist for one that is not open yet
 * - `expert`  applying to deliver work, or listing their agents
 * - `contact` a general enquiry
 */
export type OrderKind = 'order' | 'notify' | 'expert' | 'contact';

export interface MarketplaceOrder {
  kind: OrderKind;
  email: string;
  name?: string | null;
  /** Slug from lib/services.ts. Null for anything not tied to one service. */
  serviceSlug?: string | null;
  serviceName?: string | null;
  /** The submission as one readable block, the same text the alert email sends. */
  brief?: string | null;
  /** The submission as label to value pairs, for anything that gets queried. */
  fields?: Record<string, string>;
  /** Headline price in cents at the time of asking. Null when there was none. */
  priceCents?: number | null;
  referrer?: string | null;
  userAgent?: string | null;
}

// Capped here rather than in the schema. A column-level limit rejects the whole
// insert, so a merely long brief would cost the customer their words and tell
// them nothing about why.
const MAX_BRIEF = 8_000;
const MAX_FIELD = 2_000;
const MAX_META = 400;

function cap(value: string | null | undefined, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, max) : null;
}

/**
 * A stable idempotency key for one submission.
 *
 * Derived from what was submitted, never from a clock or a random value: a
 * retried fetch has to land on the unique index rather than become a second
 * order. Two genuinely different briefs from one person still differ, which is
 * what you want, because ordering two ads is normal.
 */
export function refFor(kind: string, email: string, body: string): string {
  const normalised = `${kind}|${email.trim().toLowerCase()}|${body.trim()}`;
  let hash = 5381;
  for (let i = 0; i < normalised.length; i += 1) {
    hash = ((hash << 5) + hash + normalised.charCodeAt(i)) >>> 0;
  }
  return `${kind}-${hash.toString(36)}`;
}

/**
 * Record a submission and open its status trail.
 *
 * Deliberately never throws. The caller has already sent the email that
 * actually reaches a human, so a failed row must not turn a delivered brief
 * into an error page for somebody who did nothing wrong. It returns what
 * happened so the route can log it.
 */
export async function recordMarketplaceOrder(
  order: MarketplaceOrder,
): Promise<{ ok: boolean; ref: string }> {
  const brief = cap(order.brief, MAX_BRIEF);
  const ref = refFor(order.kind, order.email, brief ?? order.email);

  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(order.fields ?? {})) {
    const clean = cap(value, MAX_FIELD);
    if (clean) fields[key.slice(0, 120)] = clean;
  }

  const written = await insertRows(
    'mk_orders',
    {
      ref,
      kind: order.kind,
      service_slug: order.serviceSlug ?? null,
      service_name: cap(order.serviceName, 200),
      email: order.email.trim().toLowerCase(),
      name: cap(order.name, 120),
      brief,
      fields,
      price_cents: order.priceCents ?? null,
      referrer: cap(order.referrer, MAX_META),
      user_agent: cap(order.userAgent, MAX_META),
    },
    { ignoreDuplicatesOn: 'ref' },
  );

  // No opening event is written here, and that is deliberate rather than
  // missing. mk_order_events.order_id is NOT NULL, and this repo's insertRows
  // asks PostgREST for `return=minimal`, so the new id never comes back to
  // write one against. Reading it back by ref would be a second round trip on
  // the request path to record something already known.
  //
  // Nothing is lost. mk_orders_current reads 'new' for an order with no events,
  // so it lands in the queue exactly as it should, and arrival time is
  // mk_orders.created_at. The event trail starts at the first status change,
  // which is the only part a human needs history for.
  return { ok: written.ok, ref };
}

import { insertRows, selectRows } from '@/lib/supabase';
import { parseFrames, type Frame, type FrameNote } from '@/lib/frames';
import {
  MAX_COMMENT,
  isOrderStatus,
  type OrderAction,
  type OrderStatus,
} from '@/lib/order-status';

// Reading a marketplace order back to the person who placed it.
//
// lib/marketplaceOrders.ts writes these rows; this reads them. They are split
// because the write path runs on the intake form with nobody signed in and
// must never throw, while this one runs behind a session and has to be strict
// about who is asking. One module doing both would have to hold both stances.
//
// Everything here reads `mk_orders_current`, never `mk_orders`. Status is the
// newest event and the view is the single place that is worked out. A query
// against the base table would have to compute it a second way, which is the
// drift the schema was built to prevent.

if (typeof window !== 'undefined') {
  throw new Error('lib/orderTracking is server-only and must never reach the client');
}

/** One order, as its owner sees it. Nothing internal survives into this. */
export interface CustomerOrder {
  id: string;
  /**
   * Whose order this is.
   *
   * On the customer's own page this is their own address and says nothing they
   * did not already know. It is here for operator preview, where the whole
   * question is which account you are looking at.
   */
  email: string;
  status: OrderStatus;
  /** What they typed in the name field. Used to greet them in email. */
  name: string | null;
  statusAt: string | null;
  statusNote: string | null;
  serviceName: string | null;
  serviceSlug: string | null;
  brief: string | null;
  priceCents: number | null;
  createdAt: string;
}

export interface OrderAssets {
  sampleUrl: string | null;
  finalUrl: string | null;
  /** The shot list published with this sample, or null when there is none. */
  frames: Frame[] | null;
  /** What the cut is, written for the customer. */
  deliveredCut: string | null;
  /** Where it differs from the brief and why. The one a client actually needs. */
  deliveredDiff: string | null;
}

interface CurrentRow {
  id: string;
  email: string;
  status: string;
  name: string | null;
  status_at: string | null;
  status_note: string | null;
  service_name: string | null;
  service_slug: string | null;
  brief: string | null;
  price_cents: number | null;
  created_at: string;
}

const COLUMNS =
  'id,email,status,status_at,status_note,name,service_name,service_slug,brief,price_cents,created_at';

// Postgres uuid. Checked before the value reaches a filter, because
// selectRows takes a raw query string: an id straight from the URL is
// somebody else's input landing in our query.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalise(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * An unrecognised status is dropped rather than shown.
 *
 * This repo does not own the `mk_` tables. If a status is added over there
 * and not here, rendering it raw would put a database string in front of a
 * customer. Falling back to `working` says something true and vague instead.
 */
function toOrder(row: CurrentRow): CustomerOrder {
  return {
    id: row.id,
    email: row.email,
    status: isOrderStatus(row.status) ? row.status : 'working',
    name: row.name,
    statusAt: row.status_at,
    statusNote: row.status_note,
    serviceName: row.service_name,
    serviceSlug: row.service_slug,
    brief: row.brief,
    priceCents: row.price_cents,
    createdAt: row.created_at,
  };
}

/**
 * Every order placed under this address, newest first.
 *
 * Matched on email rather than on an account id, so somebody who ordered
 * months before they had an account still finds their work, and so the two
 * sign in doors land on the same list. Null means Supabase could not be
 * reached, which the page renders differently from an honest empty list.
 */
export async function listOrdersForEmail(email: string): Promise<CustomerOrder[] | null> {
  const address = normalise(email);
  if (!address) return [];

  const rows = await selectRows<CurrentRow>(
    'mk_orders_current',
    // `kind=eq.order` deliberately. A waitlist signup, an expert application
    // and a contact message are all rows in this table, and none of them is
    // work somebody is waiting on. Listing them would put things on the page
    // that can never reach a status.
    `select=${COLUMNS}&email=eq.${encodeURIComponent(address)}&kind=eq.order` +
      `&order=created_at.desc&limit=50`,
  );
  if (rows === null) return null;
  return rows.map(toOrder);
}

/**
 * One order, but only for the address that placed it.
 *
 * The ownership check is in the query rather than after it. Reading the row
 * and then comparing is the same thing until somebody edits the comparison
 * out; a filter cannot be forgotten in the same way.
 */
export async function getOrderForEmail(
  id: string,
  email: string,
): Promise<CustomerOrder | null> {
  if (!UUID.test(id)) return null;
  const address = normalise(email);
  if (!address) return null;

  const rows = await selectRows<CurrentRow>(
    'mk_orders_current',
    `select=${COLUMNS}&id=eq.${id}&email=eq.${encodeURIComponent(address)}&limit=1`,
  );
  if (!rows || rows.length === 0) return null;
  return toOrder(rows[0]);
}

/**
 * One order, with no ownership check at all. Operator preview only.
 *
 * Every other read in this file puts the customer's address in the query
 * precisely so the check cannot be forgotten. This one deliberately does not,
 * which makes it the most dangerous function in the module and the reason it
 * is named the way it is: nothing called `getOrderForEmail` can be swapped for
 * it by accident, and a reviewer seeing `Unchecked` in a call site knows to
 * ask what guards it.
 *
 * The guard is the caller's, and there is exactly one: the order page, behind
 * a valid operator cookie. If a second caller ever appears, the right move is
 * to give this an explicit operator argument rather than to trust the next
 * person to remember.
 *
 * Read only by construction. It returns a `CustomerOrder` and nothing here or
 * downstream of it writes, so the worst a bug can do is show an operator a
 * page they were already allowed to see through the cockpit.
 */
export async function getOrderUnchecked(id: string): Promise<CustomerOrder | null> {
  if (!UUID.test(id)) return null;
  const rows = await selectRows<CurrentRow>(
    'mk_orders_current',
    `select=${COLUMNS}&id=eq.${id}&limit=1`,
  );
  if (!rows || rows.length === 0) return null;
  return toOrder(rows[0]);
}

const NO_ASSETS: OrderAssets = {
  sampleUrl: null,
  finalUrl: null,
  frames: null,
  deliveredCut: null,
  deliveredDiff: null,
};

/**
 * The current sample, the current clean file, and what was published with them.
 *
 * All four come from `mk_order_assets`, which keys the frames and the note to
 * the newest `sample_sent` event rather than to the newest event of any kind.
 * Asking for changes writes a `working` row, so reading the latest event would
 * blank the shot list on a cut that is still on screen.
 */
export async function assetsFor(id: string): Promise<OrderAssets> {
  if (!UUID.test(id)) return NO_ASSETS;
  const rows = await selectRows<{
    sample_url: string | null;
    final_url: string | null;
    frames: unknown;
    delivered_cut: string | null;
    delivered_diff: string | null;
  }>(
    'mk_order_assets',
    `select=sample_url,final_url,frames,delivered_cut,delivered_diff&order_id=eq.${id}&limit=1`,
  );
  if (!rows || rows.length === 0) return NO_ASSETS;
  return {
    sampleUrl: rows[0].sample_url,
    finalUrl: rows[0].final_url,
    // Validated rather than trusted. The `mk_` tables belong to the orders
    // repo, and a junk list must render no picker rather than throw on a page
    // somebody is waiting on.
    frames: parseFrames(rows[0].frames),
    // Coerced rather than passed through. A column the view has not learned
    // about yet reads as undefined, and one shape for "there is nothing here"
    // is what keeps every caller's `null` check honest.
    deliveredCut: rows[0].delivered_cut ?? null,
    deliveredDiff: rows[0].delivered_diff ?? null,
  };
}

/**
 * How many revisions this customer has already asked for.
 *
 * Counted from the trail rather than stored, for the same reason status is
 * derived: a column and a history that disagree is a bug you find in an
 * argument with a customer. Only events whose actor names a customer count, so
 * our own `working` moves never eat somebody's included revision.
 *
 * Null means the count could not be read. The caller shows no warning in that
 * case rather than guessing, because warning somebody they are out of
 * revisions when they are not is worse than staying quiet.
 */
export async function revisionsUsed(orderId: string): Promise<number | null> {
  if (!UUID.test(orderId)) return null;
  const rows = await selectRows<{ id: number }>(
    'mk_order_events',
    `select=id&order_id=eq.${orderId}&status=eq.working&actor=like.customer:*&limit=20`,
  );
  return rows ? rows.length : null;
}

/**
 * Record what the customer decided.
 *
 * Approving and asking for changes are both events on the same trail as every
 * operator move, which is what makes "who marked this approved" answerable
 * later. Asking for changes writes `working` rather than a status of its own,
 * so the order returns to the queue without anything else being told.
 *
 * The actor names the customer rather than an operator. Every other row in
 * this table was written by us, and a trail that cannot tell our approval from
 * theirs is not worth keeping.
 */
export async function appendCustomerEvent(
  orderId: string,
  action: OrderAction,
  email: string,
  comment: string | null,
  /**
   * The same feedback before it was written out.
   *
   * Stored beside the prose rather than instead of it. The block in `note` is
   * what an editor reads and what the alert email carries, and it stays the
   * record. This is the structure behind it, so "which shot draws change
   * requests" is a query rather than a regex over English later. Captured now
   * because it only exists while it is being written: a column added in six
   * months cannot backfill what nobody kept.
   */
  notes?: FrameNote[] | null,
  /**
   * They were deciding on a recut rather than a first cut.
   *
   * Turning one down ends the order instead of handing it back to us. There is
   * no round after this one to ask for, so a `working` row here would put the
   * order in the queue promising work nobody agreed to make.
   */
  onRecut = false,
): Promise<boolean> {
  if (!UUID.test(orderId)) return false;

  const status: OrderStatus =
    action === 'approve' ? 'approved' : onRecut ? 'declined' : 'working';
  const note = comment ? comment.slice(0, MAX_COMMENT) : null;

  const written = await insertRows('mk_order_events', {
    order_id: orderId,
    status,
    note,
    notes: notes && notes.length > 0 ? notes : null,
    actor: `customer:${normalise(email)}`,
  });
  return written.ok;
}

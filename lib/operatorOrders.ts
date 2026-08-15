import { list } from '@vercel/blob';
import { deliveryFor } from '@/lib/delivery';
import { parseFrames, type Frame } from '@/lib/frames';
import { appendDraft, draftThread, type DraftThread } from '@/lib/orderDrafts';
import { notifyCustomer } from '@/lib/orderMail';
import { isOrderStatus, type OrderStatus } from '@/lib/order-status';
import { deleteRows, insertRows, patchRows, selectRows } from '@/lib/supabase';

// The queue, and moving one order along.
//
// The same work `npm run send` does in ~/Programs/get-an-expert-orders, reached
// from a page instead of a terminal. Both write the same append only events
// table on purpose: the command line keeps working, and nothing is stranded
// mid-order if this page has a bad day.
//
// The clean file is uploaded at the same time as the sample and parked in Blob
// under the order's own prefix, never written to the database until delivery.
// That is what makes Deliver one tap with nothing to fetch or find, and it is
// why the customer cannot see the file early: the page they read derives its
// download from a `delivered` event, and no such event exists yet.

if (typeof window !== 'undefined') {
  throw new Error('lib/operatorOrders is server-only and must never reach the client');
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Where a parked clean file lives. One prefix per order, so a list is cheap. */
export function finalPrefix(orderId: string): string {
  return `orders/${orderId}/final/`;
}

export function samplePrefix(orderId: string): string {
  return `orders/${orderId}/sample/`;
}

/**
 * That a link really is this order's parked clean file.
 *
 * The watermark route is handed a URL by the dashboard and gives it to ffmpeg
 * as an input. ffmpeg opens most things it is handed, so without this an
 * operator session is also a way to make the server fetch an arbitrary
 * address. Narrowing it to our own storage, under this order's own prefix,
 * leaves nothing to point it at except a file the operator just uploaded.
 */
export function isParkedFinalUrl(orderId: string, url: string): boolean {
  if (!UUID.test(orderId)) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return (
    parsed.protocol === 'https:' &&
    parsed.hostname.endsWith('.vercel-storage.com') &&
    parsed.pathname.startsWith(`/${finalPrefix(orderId)}`)
  );
}

export interface QueueOrder {
  id: string;
  email: string;
  name: string | null;
  status: OrderStatus;
  serviceName: string | null;
  /** Which entry in lib/services.ts this is, and so what it delivers. */
  serviceSlug: string | null;
  brief: string | null;
  createdAt: string;
  statusAt: string | null;
}

interface QueueRow {
  id: string;
  email: string;
  name: string | null;
  status: string;
  service_name: string | null;
  service_slug: string | null;
  brief: string | null;
  created_at: string;
  status_at: string | null;
}

const QUEUE_COLUMNS =
  'id,email,name,status,service_name,service_slug,brief,created_at,status_at';

function toQueueOrder(row: QueueRow): QueueOrder | null {
  if (!isOrderStatus(row.status)) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    status: row.status,
    serviceName: row.service_name,
    serviceSlug: row.service_slug,
    brief: row.brief,
    createdAt: row.created_at,
    statusAt: row.status_at,
  };
}

/**
 * Everything that is still somebody's problem, oldest first.
 *
 * Oldest first because that is the queue: the order that has waited longest is
 * the one most at risk of a person giving up on it. Delivered, declined and
 * refunded orders are done and are left out, so the page is a to-do list
 * rather than an archive.
 */
export async function queue(): Promise<QueueOrder[] | null> {
  const rows = await selectRows<QueueRow>(
    'mk_orders_current',
    `select=${QUEUE_COLUMNS}&kind=eq.order` +
      `&status=in.(new,working,sample_sent,approved)&order=created_at.asc&limit=100`,
  );
  if (rows === null) return null;
  return rows.map(toQueueOrder).filter((o): o is QueueOrder => o !== null);
}

/**
 * The last few orders that are finished, newest first.
 *
 * A separate bounded read rather than a wider filter on queue(), because that
 * function is deliberately a to-do list and widening it would put finished
 * work back in the middle of live work. The dashboard shows these collapsed,
 * under everything else, so ten is plenty: it is there to answer "did that one
 * actually go out", not to be browsed.
 */
export async function recentlyClosed(limit = 10): Promise<QueueOrder[] | null> {
  const rows = await selectRows<QueueRow>(
    'mk_orders_current',
    `select=${QUEUE_COLUMNS}&kind=eq.order` +
      `&status=in.(delivered,declined,refunded)&order=created_at.desc&limit=${limit}`,
  );
  if (rows === null) return null;
  return rows.map(toQueueOrder).filter((o): o is QueueOrder => o !== null);
}

export interface OrderEvent {
  status: string;
  note: string | null;
  actor: string | null;
  assetUrl: string | null;
  createdAt: string;
}

export interface OrderDetail extends QueueOrder {
  events: OrderEvent[];
  /** A clean file already uploaded and waiting for the delivery tap. */
  parkedFinalUrl: string | null;
  /**
   * A watermarked sample already made and waiting to be sent.
   *
   * The encode can run for two minutes, and an operator who closes the tab
   * while it does would otherwise pay for it twice: the file is sitting in
   * storage and only the page knew where. Read back the same way the clean
   * file is, so reopening the order finds it.
   */
  parkedSampleUrl: string | null;
  /** Change requests the customer has spent. */
  revisions: number;
  /**
   * The written deliverable, for services that hand over words.
   *
   * Read for every order rather than only text ones, because it is two cheap
   * queries against an indexed column and the alternative is the dashboard
   * knowing about delivery types twice: once to decide whether to ask, and
   * again to decide what to draw.
   */
  draft: DraftThread;
  /**
   * What is published with the current sample, so the boxes open filled in.
   *
   * An operator correcting a paragraph should see the paragraph, not an empty
   * field that silently wipes what is live the moment they press Save.
   */
  delivery: { cut: string | null; diff: string | null; frames: Frame[] | null };
}

export async function detail(id: string): Promise<OrderDetail | null> {
  if (!UUID.test(id)) return null;

  const [rows, events, parked, parkedSample, draft, published] = await Promise.all([
    selectRows<QueueRow>('mk_orders_current', `select=${QUEUE_COLUMNS}&id=eq.${id}&limit=1`),
    selectRows<{
      status: string;
      note: string | null;
      actor: string | null;
      asset_url: string | null;
      created_at: string;
    }>(
      'mk_order_events',
      `select=status,note,actor,asset_url,created_at&order_id=eq.${id}` +
        `&order=created_at.desc&limit=50`,
    ),
    newestUnder(finalPrefix(id)),
    newestUnder(samplePrefix(id)),
    draftThread(id),
    selectRows<{ delivered_cut: string | null; delivered_diff: string | null; frames: unknown }>(
      'mk_order_assets',
      `select=delivered_cut,delivered_diff,frames&order_id=eq.${id}&limit=1`,
    ),
  ]);

  const order = rows?.[0] ? toQueueOrder(rows[0]) : null;
  if (!order) return null;

  const trail = (events ?? []).map((e) => ({
    status: e.status,
    note: e.note,
    actor: e.actor,
    assetUrl: e.asset_url,
    createdAt: e.created_at,
  }));

  return {
    ...order,
    events: trail,
    parkedFinalUrl: parked,
    parkedSampleUrl: parkedSample,
    draft,
    delivery: {
      cut: published?.[0]?.delivered_cut ?? null,
      diff: published?.[0]?.delivered_diff ?? null,
      frames: parseFrames(published?.[0]?.frames),
    },
    // Only the customer's own change requests count. Our own `working` moves
    // must never eat somebody's included revision.
    revisions: trail.filter((e) => e.status === 'working' && e.actor?.startsWith('customer:'))
      .length,
  };
}

/** The newest clean file parked for this order, or null when none is waiting. */
export async function parkedFinal(orderId: string): Promise<string | null> {
  if (!UUID.test(orderId)) return null;
  return newestUnder(finalPrefix(orderId));
}

/** The newest file under one of an order's prefixes, or null when there is none. */
async function newestUnder(prefix: string): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { blobs } = await list({ prefix, limit: 20 });
    if (blobs.length === 0) return null;
    const newest = blobs.reduce((a, b) => (a.uploadedAt > b.uploadedAt ? a : b));
    return newest.url;
  } catch (err) {
    // A storage outage must not stop the queue rendering. It shows as no file
    // parked, which is visible, rather than as a page that will not load.
    console.error('[midsesh:operator] could not list parked files', err);
    return null;
  }
}

export interface AdvanceInput {
  orderId: string;
  status: OrderStatus;
  note?: string | null;
  assetUrl?: string | null;
  /**
   * The draft, for an order that delivers words.
   *
   * Saved with the move rather than by a separate call, so the operator presses
   * Send once. A draft that is unchanged since the last version is dropped
   * rather than failing the move, because pressing Send twice on the same words
   * is not a mistake worth stopping for.
   */
  draft?: string | null;
  /** What the cut is. Shown to the customer with the sample. */
  deliveredCut?: string | null;
  /** Where it differs from the brief and why. Shown to the customer. */
  deliveredDiff?: string | null;
  /** The shot list published with this sample. */
  frames?: unknown;
}

/**
 * What the customer reads under the player, kept apart from the private note.
 *
 * Three fields, all optional, all nullable. Written onto the `sample_sent`
 * event rather than onto the order for the same reason the file is: a recut has
 * different shots in it and a different argument for itself, and a column on
 * `mk_orders` would hold only the last one while relabelling feedback written
 * against the first.
 */
function deliveryColumns(input: {
  deliveredCut?: string | null;
  deliveredDiff?: string | null;
  frames?: unknown;
}): Record<string, unknown> {
  const frames = parseFrames(input.frames);
  return {
    delivered_cut: input.deliveredCut?.trim().slice(0, 4000) || null,
    delivered_diff: input.deliveredDiff?.trim().slice(0, 4000) || null,
    // Stored in the shape the customer page reads, already sorted and
    // renumbered, so the browser and the database cannot disagree about which
    // shot is frame 4.
    frames: frames ? frames.map((f) => ({ n: f.n, t: f.t, d: f.d, name: f.name })) : null,
  };
}

/**
 * Correct what was published with a sample that has already gone out.
 *
 * A patch on the newest `sample_sent` row rather than a new event, deliberately.
 * Appending would email the customer a second time, restart the promise clock
 * and put a duplicate in the trail, all to fix a typo in a paragraph. The file
 * and the status are untouched: only the three things a person reads change.
 */
export async function updateDelivery(
  orderId: string,
  input: { deliveredCut?: string | null; deliveredDiff?: string | null; frames?: unknown },
): Promise<{ ok: boolean; error?: string }> {
  if (!UUID.test(orderId)) return { ok: false, error: 'That is not an order id' };

  const rows = await selectRows<{ id: number }>(
    'mk_order_events',
    `select=id&order_id=eq.${orderId}&status=eq.sample_sent&order=created_at.desc,id.desc&limit=1`,
  );
  if (rows === null) return { ok: false, error: 'Could not reach the order. Nothing changed.' };
  const eventId = rows[0]?.id;
  if (eventId === undefined) {
    return { ok: false, error: 'No sample has been sent yet, so there is nothing to edit.' };
  }

  const written = await patchRows('mk_order_events', `id=eq.${eventId}`, deliveryColumns(input));
  return written ? { ok: true } : { ok: false, error: 'That did not save. Nothing changed.' };
}

export type AdvanceResult =
  | { ok: true; emailed: string }
  | { ok: false; error: string };

/**
 * Write the event, then tell the customer.
 *
 * In that order, and the email is never allowed to fail the write. The status
 * change is true whether or not an inbox was reachable, and rolling one back
 * because a mail server was down would keep the wrong half.
 */
export async function advance(input: AdvanceInput): Promise<AdvanceResult> {
  if (!UUID.test(input.orderId)) return { ok: false, error: 'That is not an order id' };

  const order = await detail(input.orderId);
  if (!order) return { ok: false, error: 'No order with that id' };

  // The same rule the command line has. An order marked ready with nothing to
  // read or watch shows the customer a status change and an empty page, which
  // is worse than not having moved it at all.
  //
  // What counts as "something" depends on what the service delivers. A video
  // needs a file in storage; a LinkedIn post needs words, and asking it for a
  // file would make the one status it has to pass through unreachable.
  const handover = input.status === 'sample_sent' || input.status === 'delivered';
  const text = deliveryFor(order.serviceSlug) === 'text';

  if (text) {
    // Written first, so the check below sees the version being sent rather
    // than the one before it.
    if (input.draft) {
      const saved = await appendDraft(input.orderId, input.draft, 'operator');
      // "Same as the current version" is not a failure here. It means Send was
      // pressed twice on words that did not change, and the right response is
      // to carry on and send them.
      if (!saved.ok && saved.error !== 'That is the same as the current version') {
        return { ok: false, error: saved.error ?? 'The draft did not save. Nothing was sent.' };
      }
    }
    if (handover && order.draft.versions.length === 0 && !input.draft?.trim()) {
      return { ok: false, error: 'There is no draft to send. Write one first.' };
    }
  }

  const url = input.assetUrl ?? (input.status === 'delivered' ? order.parkedFinalUrl : null);
  if (handover && !text && !url) {
    return {
      ok: false,
      error:
        input.status === 'delivered'
          ? 'No clean file is parked for this order. Upload one first.'
          : 'A sample needs a file. Upload one first.',
    };
  }
  if (url && !url.startsWith('https://')) {
    return { ok: false, error: 'That file link is not https' };
  }

  const written = await insertRows('mk_order_events', {
    order_id: input.orderId,
    status: input.status,
    note: input.note?.slice(0, 2000) || null,
    actor: 'operator',
    asset_url: url,
    // Only onto the event that hands something over. A `working` row carrying
    // a shot list would put frames on the customer's page for a cut that has
    // not been sent yet.
    ...(handover ? deliveryColumns(input) : {}),
  });
  if (!written.ok) return { ok: false, error: 'The status did not save. Nothing was sent.' };

  const told = await notifyCustomer({
    orderId: input.orderId,
    email: order.email,
    status: input.status,
    serviceName: order.serviceName,
    name: order.name,
    brief: order.brief,
  });

  return {
    ok: true,
    emailed:
      told === 'sent'
        ? `Emailed ${order.email}`
        : told === 'skipped'
          ? 'Saved. This status sends no email.'
          : told === 'unavailable'
            ? 'Saved. Email is not configured here.'
            : 'Saved, but the email did not send.',
  };
}

/**
 * Delete an order and its trail.
 *
 * Test rows are a real category here: a cutover check, a walk through of the
 * customer flow, an order placed to prove an email fires. Each one sits in the
 * queue looking like work somebody is waiting on, which is exactly how a real
 * order gets missed.
 *
 * One id at a time, never a pattern. The events cascade from the foreign key.
 * There is no undo, which is why the button that calls this sits behind a fold
 * and says what it is.
 */
export async function remove(orderId: string): Promise<AdvanceResult> {
  if (!UUID.test(orderId)) return { ok: false, error: 'That is not an order id' };

  const order = await detail(orderId);
  if (!order) return { ok: false, error: 'No order with that id' };

  const gone = await deleteRows('mk_orders', `id=eq.${orderId}`);
  if (!gone.ok) return { ok: false, error: 'That order could not be deleted.' };

  return { ok: true, emailed: `Deleted the order from ${order.email}. Nobody was emailed.` };
}

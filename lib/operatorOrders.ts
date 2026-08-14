import { list } from '@vercel/blob';
import { notifyCustomer } from '@/lib/orderMail';
import { isOrderStatus, type OrderStatus } from '@/lib/order-status';
import { insertRows, selectRows } from '@/lib/supabase';

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

export interface QueueOrder {
  id: string;
  email: string;
  name: string | null;
  status: OrderStatus;
  serviceName: string | null;
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
  brief: string | null;
  created_at: string;
  status_at: string | null;
}

const QUEUE_COLUMNS = 'id,email,name,status,service_name,brief,created_at,status_at';

function toQueueOrder(row: QueueRow): QueueOrder | null {
  if (!isOrderStatus(row.status)) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    status: row.status,
    serviceName: row.service_name,
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
  /** Change requests the customer has spent. */
  revisions: number;
}

export async function detail(id: string): Promise<OrderDetail | null> {
  if (!UUID.test(id)) return null;

  const [rows, events, parked] = await Promise.all([
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
    parkedFinal(id),
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
    // Only the customer's own change requests count. Our own `working` moves
    // must never eat somebody's included revision.
    revisions: trail.filter((e) => e.status === 'working' && e.actor?.startsWith('customer:'))
      .length,
  };
}

/** The newest clean file parked for this order, or null when none is waiting. */
export async function parkedFinal(orderId: string): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { blobs } = await list({ prefix: finalPrefix(orderId), limit: 20 });
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
  // watch shows the customer a status change and an empty page, which is worse
  // than not having moved it at all.
  const needsFile = input.status === 'sample_sent' || input.status === 'delivered';
  const url = input.assetUrl ?? (input.status === 'delivered' ? order.parkedFinalUrl : null);
  if (needsFile && !url) {
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
  });
  if (!written.ok) return { ok: false, error: 'The status did not save. Nothing was sent.' };

  const told = await notifyCustomer({
    orderId: input.orderId,
    email: order.email,
    status: input.status,
    serviceName: order.serviceName,
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

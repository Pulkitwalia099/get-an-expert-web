import { MAX_DRAFT } from '@/lib/delivery';
import { MAX_COMMENT } from '@/lib/order-status';
import { insertRows, selectRows } from '@/lib/supabase';

// The draft on a LinkedIn order, and what people said about it.
//
// Both tables are append only. The newest draft row is the current one, the
// rest are the history, and the customer's own edits sit in the same list as
// ours with a different actor. That is what makes "who wrote this" answerable
// after the fact, and it is why an edit cannot lose the version before it.
//
// Nothing here decides whether an order is a text order. That is
// `deliveryFor` in lib/delivery.ts, from the service slug, and the callers
// have already asked before they get here.

if (typeof window !== 'undefined') {
  throw new Error('lib/orderDrafts is server-only and must never reach the client');
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** How many versions and comments are read back. Past this, nobody is reading. */
const HISTORY_LIMIT = 40;

export interface DraftVersion {
  id: number;
  body: string;
  actor: string;
  createdAt: string;
}

export interface DraftThread {
  /** Newest first, so `[0]` is the current draft. Empty when none is written. */
  versions: DraftVersion[];
  comments: DraftVersion[];
}

interface Row {
  id: number;
  body: string;
  actor: string;
  created_at: string;
}

function toVersion(row: Row): DraftVersion {
  return { id: row.id, body: row.body, actor: row.actor, createdAt: row.created_at };
}

/**
 * Every version and every comment on one order, newest first.
 *
 * One call for both, because every page that wants one wants the other: the
 * operator reads the draft to edit it and the remarks to know what to change,
 * and the customer reads the same two things for the same reason.
 *
 * A failure comes back as empty rather than null. A draft that cannot be read
 * renders as an order with nothing written yet, which is wrong but harmless,
 * and it is the same shape the page already handles.
 */
export async function draftThread(orderId: string): Promise<DraftThread> {
  if (!UUID.test(orderId)) return { versions: [], comments: [] };

  const query = `select=id,body,actor,created_at&order_id=eq.${orderId}` +
    `&order=created_at.desc,id.desc&limit=${HISTORY_LIMIT}`;
  const [versions, comments] = await Promise.all([
    selectRows<Row>('mk_order_drafts', query),
    selectRows<Row>('mk_order_comments', query),
  ]);

  return {
    versions: (versions ?? []).map(toVersion),
    comments: (comments ?? []).map(toVersion),
  };
}

/** The current draft, which is the newest version. Null when none is written. */
export async function currentDraft(orderId: string): Promise<DraftVersion | null> {
  if (!UUID.test(orderId)) return null;
  const rows = await selectRows<Row>(
    'mk_order_drafts',
    `select=id,body,actor,created_at&order_id=eq.${orderId}&order=created_at.desc,id.desc&limit=1`,
  );
  return rows?.[0] ? toVersion(rows[0]) : null;
}

/**
 * Write a new version.
 *
 * Refuses an empty one, and refuses one identical to the version it would
 * replace. A customer who opens the editor, changes their mind and saves would
 * otherwise add a version that reads as an edit and contains no edit, and the
 * history is only worth keeping if every row in it is a change.
 */
export async function appendDraft(
  orderId: string,
  body: string,
  actor: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!UUID.test(orderId)) return { ok: false, error: 'That is not an order id' };

  const text = body.trim().slice(0, MAX_DRAFT);
  if (!text) return { ok: false, error: 'There is nothing to save' };

  const current = await currentDraft(orderId);
  if (current && current.body.trim() === text) {
    return { ok: false, error: 'That is the same as the current version' };
  }

  const written = await insertRows('mk_order_drafts', { order_id: orderId, body: text, actor });
  return written.ok ? { ok: true } : { ok: false, error: 'That did not save. Try again.' };
}

/** Say something about the draft without changing it. */
export async function appendComment(
  orderId: string,
  body: string,
  actor: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!UUID.test(orderId)) return { ok: false, error: 'That is not an order id' };

  const text = body.trim().slice(0, MAX_COMMENT);
  if (!text) return { ok: false, error: 'There is nothing to send' };

  const written = await insertRows('mk_order_comments', { order_id: orderId, body: text, actor });
  return written.ok ? { ok: true } : { ok: false, error: 'That did not save. Try again.' };
}

import { selectRows } from '@/lib/supabase';

// What we did about each thing they asked for, keyed to the cut that answered.
//
// Written by us. Their words are on the `working` event and stay there: this
// sits above them and the page keeps both, because a client reading a tick list
// has to be able to check it against what they actually wrote. Summarising
// somebody's feedback and then hiding the original is how a summary stops being
// trusted.
//
// Server only. It reads with the service key.

if (typeof window !== 'undefined') {
  throw new Error('lib/orderChanges is server-only and must never reach the client');
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Most ticks one round will render. Past this it is not a checklist. */
const MAX_CHANGES = 12;
/** Longest single line. Cut, not dropped. */
const MAX_TEXT = 300;

export interface Change {
  text: string;
  /** False for something asked for and not done. */
  done: boolean;
  /** Why not, when not. Null while `done`. */
  note: string | null;
}

interface ChangeRow {
  version: number;
  text: string;
  done: boolean;
  note: string | null;
  position: number;
}

const COLUMNS = 'version,text,done,note,position';

function prose(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim().slice(0, max);
  return text.length > 0 ? text : null;
}

/**
 * Every round's checklist, keyed by the version that answered it.
 *
 * A Map rather than a list because the trail looks these up by version while
 * rendering, and an order with two rounds has two lists that must not merge.
 *
 * Empty for every order nobody has written a list for, which is all of them
 * until somebody does. The trail falls back to printing their note verbatim in
 * that case, which is what it did before this existed, so this ships dark.
 */
export async function changesFor(orderId: string): Promise<Map<number, Change[]>> {
  const out = new Map<number, Change[]>();
  if (!UUID.test(orderId)) return out;

  const rows = await selectRows<ChangeRow>(
    'order_changes',
    `select=${COLUMNS}&order_id=eq.${orderId}` +
      `&order=version.asc,position.asc&limit=${MAX_CHANGES * 4}`,
  );
  if (!rows || rows.length === 0) return out;

  for (const row of rows) {
    const text = prose(row.text, MAX_TEXT);
    if (!text) continue;
    if (!Number.isInteger(row.version) || row.version < 1) continue;

    const list = out.get(row.version) ?? [];
    if (list.length >= MAX_CHANGES) continue;
    // `done` is defaulted true in the column, so anything but an explicit false
    // is a tick. Coerced rather than passed through, for the same reason
    // `picked` is on an avatar: one shape for the answer keeps the page honest.
    const done = row.done !== false;
    list.push({ text, done, note: done ? null : prose(row.note, MAX_TEXT) });
    out.set(row.version, list);
  }
  return out;
}

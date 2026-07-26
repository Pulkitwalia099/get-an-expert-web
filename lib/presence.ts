import { MATCH_ORDER, type OperatorId } from '@/lib/operators';
import { selectRows } from '@/lib/supabase';

// Server-only reader and writer for operator_presence. Availability is
// computed in exactly one place, so the operator page and the chat can
// never disagree about who is around.

if (typeof window !== 'undefined') {
  throw new Error('lib/presence is server-only and must never reach the client');
}

export const PRESENCE_HOURS = 4;

const TIMEOUT_MS = 3_000;

export interface PresenceRow {
  id: OperatorId;
  online: boolean;
  expires_at: string | null;
}

/**
 * The whole rule. A switch left on is only meaningful until its expiry,
 * which is what stops a forgotten toggle from ringing at 3am.
 */
export function isAvailable(row: PresenceRow | null, now: Date = new Date()): boolean {
  if (!row || !row.online || !row.expires_at) return false;
  const expires = Date.parse(row.expires_at);
  return Number.isFinite(expires) && expires > now.getTime();
}

function allOffline(): Record<OperatorId, boolean> {
  return { pulkit: false, rohit: false };
}

/**
 * Availability for everyone. Any failure returns all false: showing a
 * booking link we can honour beats a call button we cannot.
 */
export async function readPresence(): Promise<Record<OperatorId, boolean>> {
  const rows = await selectRows<PresenceRow>(
    'operator_presence',
    'select=id,online,expires_at',
  );
  if (!rows) return allOffline();
  const out = allOffline();
  for (const id of MATCH_ORDER) {
    out[id] = isAvailable(rows.find((r) => r.id === id) ?? null);
  }
  return out;
}

export async function setPresence(id: OperatorId, online: boolean): Promise<void> {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return;
  const expiresAt = online
    ? new Date(Date.now() + PRESENCE_HOURS * 3_600_000).toISOString()
    : null;
  try {
    const res = await fetch(`${url}/rest/v1/operator_presence?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        online,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error('[midsesh:presence] toggle failed', res.status, await res.text());
    }
  } catch (err) {
    console.error('[midsesh:presence] toggle failed', err);
  }
}

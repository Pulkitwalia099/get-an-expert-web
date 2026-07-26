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

/**
 * Returns false when the switch did not move. A PATCH filtered on a row that
 * does not exist updates nothing and still answers 204, so without asking
 * for the rows back this reports success while doing nothing. That is how a
 * missing seed row turns into a switch that silently refuses to flip.
 */
export async function setPresence(id: OperatorId, online: boolean): Promise<boolean> {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return false;
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
        Prefer: 'return=representation',
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
      return false;
    }
    const rows = (await res.json()) as unknown[];
    if (!Array.isArray(rows) || rows.length === 0) {
      console.error(
        `[midsesh:presence] no row for '${id}'. The migration seed did not run: ` +
          `insert into operator_presence (id) values ('pulkit'), ('rohit');`,
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error('[midsesh:presence] toggle failed', err);
    return false;
  }
}

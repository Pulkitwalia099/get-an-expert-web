import type { OperatorId } from '@/lib/operators';
import { selectRows } from '@/lib/supabase';

// Reads and writes to the calls table. Split out from the route so the
// route can be tested without Supabase, and so the conditional answer
// update lives in one place.

if (typeof window !== 'undefined') {
  throw new Error('lib/callStore is server-only and must never reach the client');
}

const TIMEOUT_MS = 3_000;

export interface CallRow {
  id: string;
  status: 'ringing' | 'answered' | 'missed' | 'ended';
  room_url: string | null;
  operator_id: string | null;
  telegram_message_id: number | null;
}

function config(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
  const key = process.env.SUPABASE_SECRET_KEY;
  return url && key ? { url, key } : null;
}

function headers(key: string, prefer: string): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: prefer,
  };
}

export async function createCall(row: {
  id: string;
  sessionId: string | null;
  operatorId: OperatorId;
  roomUrl: string;
  summary: string;
  telegramMessageId: number | null;
}): Promise<void> {
  const cfg = config();
  if (!cfg) return;
  try {
    await fetch(`${cfg.url}/rest/v1/calls`, {
      method: 'POST',
      headers: headers(cfg.key, 'return=minimal'),
      body: JSON.stringify({
        id: row.id,
        session_id: row.sessionId,
        operator_id: row.operatorId,
        room_url: row.roomUrl,
        summary: row.summary,
        telegram_message_id: row.telegramMessageId,
        status: 'ringing',
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    console.error('[midsesh:calls] create failed', err);
  }
}

export async function readCall(id: string): Promise<CallRow | null> {
  const rows = await selectRows<CallRow>(
    'calls',
    `id=eq.${encodeURIComponent(id)}&select=id,status,room_url,operator_id,telegram_message_id&limit=1`,
  );
  return rows?.[0] ?? null;
}

/**
 * Flips ringing to answered. Filtering on status=eq.ringing makes this a
 * compare-and-set: the Telegram tap and the operator page tap race, and
 * whichever lands second gets an empty result and learns it lost.
 */
export async function answerCall(id: string): Promise<boolean> {
  const cfg = config();
  if (!cfg) return false;
  try {
    const res = await fetch(
      `${cfg.url}/rest/v1/calls?id=eq.${encodeURIComponent(id)}&status=eq.ringing`,
      {
        method: 'PATCH',
        headers: headers(cfg.key, 'return=representation'),
        body: JSON.stringify({ status: 'answered', answered_at: new Date().toISOString() }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (!res.ok) return false;
    const rows = (await res.json()) as unknown[];
    return Array.isArray(rows) && rows.length > 0;
  } catch (err) {
    console.error('[midsesh:calls] answer failed', err);
    return false;
  }
}

export async function endCall(
  id: string,
  status: 'ended' | 'missed' = 'ended',
): Promise<void> {
  const cfg = config();
  if (!cfg) return;
  try {
    await fetch(`${cfg.url}/rest/v1/calls?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: headers(cfg.key, 'return=minimal'),
      body: JSON.stringify({ status, ended_at: new Date().toISOString() }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    console.error('[midsesh:calls] end failed', err);
  }
}

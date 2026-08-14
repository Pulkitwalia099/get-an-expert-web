import type { ApiRole, Brief } from '@/lib/types';

// Server-only writer for the Supabase tables in supabase/migrations. All
// writes go through PostgREST with the secret key, which bypasses RLS.
// Every function swallows its own errors: persistence is fire and forget
// and a Supabase outage must never break the chat.

if (typeof window !== 'undefined') {
  throw new Error('lib/supabase is server-only and must never reach the client');
}

const TIMEOUT_MS = 3_000;

interface Config {
  url: string;
  key: string;
}

function config(): Config | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ''), key };
}

export function hasSupabase(): boolean {
  return config() !== null;
}

function headers(cfg: Config, extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: cfg.key,
    Authorization: `Bearer ${cfg.key}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

export interface WriteResult {
  ok: boolean;
  /** null when the request never reached Postgres, or Supabase is unset. */
  status: number | null;
}

/**
 * Insert, reporting whether it landed.
 *
 * Most writes here are fire and forget, because a lost analytics row must
 * never break a conversation. An order is not one of those: somebody who
 * pressed a button and was told yes has to actually have an order, so the
 * caller needs the answer. `resolveOn` upserts, `ignoreDuplicatesOn` makes the
 * insert idempotent against a unique index, which is how a credit grant can be
 * written on every sign in without granting twice.
 */
export async function insertRows(
  table: string,
  rows: object | object[],
  opts: { resolveOn?: string; ignoreDuplicatesOn?: string } = {},
): Promise<WriteResult> {
  const cfg = config();
  if (!cfg) return { ok: false, status: null };

  const conflict = opts.resolveOn ?? opts.ignoreDuplicatesOn;
  const query = conflict ? `?on_conflict=${conflict}` : '';
  const resolution = opts.resolveOn
    ? ',resolution=merge-duplicates'
    : opts.ignoreDuplicatesOn
      ? ',resolution=ignore-duplicates'
      : '';

  try {
    const res = await fetch(`${cfg.url}/rest/v1/${table}${query}`, {
      method: 'POST',
      headers: headers(cfg, { Prefer: `return=minimal${resolution}` }),
      body: JSON.stringify(rows),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[midsesh:supabase] ${table} write failed`, res.status, await res.text());
      return { ok: false, status: res.status };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    console.error(`[midsesh:supabase] ${table} write failed`, err);
    return { ok: false, status: null };
  }
}

async function write(
  table: string,
  rows: object | object[],
  opts: { upsertOn?: string } = {},
): Promise<void> {
  await insertRows(table, rows, { resolveOn: opts.upsertOn });
}

// Calls a Postgres function. Returns null when unconfigured or on any
// failure, so callers can fail open.
export async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  const cfg = config();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: headers(cfg),
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[midsesh:supabase] rpc ${fn} failed`, res.status, await res.text());
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[midsesh:supabase] rpc ${fn} failed`, err);
    return null;
  }
}

// Row count for a PostgREST filter string, e.g. "created_at=gte.2026-07-23".
// Null (not zero) when the count could not be fetched.
export async function countRows(table: string, filter: string): Promise<number | null> {
  const cfg = config();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.url}/rest/v1/${table}?select=id&limit=1&${filter}`, {
      headers: headers(cfg, { Prefer: 'count=exact' }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const range = res.headers.get('content-range');
    const total = range?.split('/')[1];
    return total && total !== '*' ? Number(total) : null;
  } catch (err) {
    console.error(`[midsesh:supabase] count ${table} failed`, err);
    return null;
  }
}

/**
 * Deletes rows matching a raw PostgREST filter.
 *
 * The only destructive call in this file, and it takes a filter rather than a
 * table-wide sweep on purpose: PostgREST deletes everything when handed no
 * filter, so an empty string here would empty a table. Callers pass an
 * explicit `id=eq.<uuid>` and nothing else does.
 */
export async function deleteRows(table: string, filter: string): Promise<WriteResult> {
  const cfg = config();
  if (!cfg) return { ok: false, status: null };
  if (!filter.trim()) return { ok: false, status: null };
  try {
    const res = await fetch(`${cfg.url}/rest/v1/${table}?${filter}`, {
      method: 'DELETE',
      headers: headers(cfg, { Prefer: 'return=minimal' }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[midsesh:supabase] ${table} delete failed`, res.status, await res.text());
      return { ok: false, status: res.status };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    console.error(`[midsesh:supabase] ${table} delete failed`, err);
    return { ok: false, status: null };
  }
}

// Reads rows with a raw PostgREST query string. Null on any failure.
export async function selectRows<T>(table: string, query: string): Promise<T[] | null> {
  const cfg = config();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.url}/rest/v1/${table}?${query}`, {
      headers: headers(cfg),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch (err) {
    console.error(`[midsesh:supabase] select ${table} failed`, err);
    return null;
  }
}

// One row per API request, for the 5xx rate and p95 latency in the daily
// report. Fire and forget like every other write here.
export async function recordEvent(
  route: string,
  status: number,
  latencyMs: number,
  error: string | null = null,
): Promise<void> {
  await write('api_events', {
    route,
    status,
    latency_ms: latencyMs,
    error: error?.slice(0, 300) ?? null,
  });
}

export interface SessionMeta {
  userAgent: string | null;
  referrer: string | null;
}

// Upserts so the row appears on the first message and last_seen advances on
// every later one. first_seen is never sent, so the original value survives.
// flow is only sent for the dev funnel: the column defaults to 'main', and
// omitting it keeps main-site writes working even if the dev_flow migration
// has not been applied yet.
export async function recordSession(
  id: string,
  meta: SessionMeta,
  opts: { completed?: boolean; flow?: 'main' | 'dev'; demo?: boolean } = {},
): Promise<void> {
  const row: Record<string, unknown> = {
    id,
    user_agent: meta.userAgent?.slice(0, 400) ?? null,
    referrer: meta.referrer?.slice(0, 400) ?? null,
    last_seen: new Date().toISOString(),
  };
  if (opts.completed) row.completed = true;
  if (opts.flow === 'dev') row.flow = 'dev';
  // Only sent when true, so the column default (false) survives a lagging
  // migration and never blocks a write.
  if (opts.demo) row.demo = true;
  await write('sessions', row, { upsertOn: 'id' });
}

export interface MessageRow {
  role: ApiRole;
  content: string;
  question_no: number;
}

export async function recordMessages(sessionId: string, rows: MessageRow[]): Promise<void> {
  if (rows.length === 0) return;
  await write(
    'messages',
    rows.map((r) => ({ session_id: sessionId, ...r })),
  );
}

export interface SearchRecord {
  brief: Brief;
  query: string;
  resultCount: number;
  latencyMs: number;
  demo: boolean;
}

export async function recordSearch(
  sessionId: string | null,
  search: SearchRecord,
): Promise<void> {
  await write('searches', {
    session_id: sessionId,
    brief: search.brief,
    query: search.query,
    result_count: search.resultCount,
    latency_ms: search.latencyMs,
    demo: search.demo,
  });
}

export interface LeadRecord {
  email: string;
  name: string | null;
  // 'expert' is a freelancer applying to join, not a client asking for
  // help. Requires the migration widening the leads kind check constraint.
  // 'contact' is the contact card, 'register' is someone offering their own
  // skills or their agents. Both require the migration widening the check.
  kind: 'intros' | 'custom' | 'expert' | 'contact' | 'register';
  selected: string[];
  need: string | null;
  // Null for a lead that never ran the client intake, such as an expert
  // application. The column is nullable.
  brief: Brief | null;
  consent: boolean;
  flow?: 'main' | 'dev';
  // Structured answers from /register, which asks four things no column
  // covers. Omitted for every other kind.
  details?: Record<string, string> | null;
}

export async function recordLead(sessionId: string | null, lead: LeadRecord): Promise<void> {
  const row: Record<string, unknown> = {
    session_id: sessionId,
    email: lead.email,
    name: lead.name,
    kind: lead.kind,
    selected: lead.selected,
    need: lead.need,
    brief: lead.brief,
    consent: lead.consent,
  };
  if (lead.flow === 'dev') row.flow = 'dev';
  // Only sent when there is something in it, so a row written before the
  // details migration lands is still a valid insert.
  if (lead.details) row.details = lead.details;
  await write('leads', row);
}

export interface SetupRequestRow {
  link: string;
  contact?: string;
}

// "Seen a setup we're missing?" submissions. These used to exist only in the
// Vercel log, which rolls off, so a reel link plus an email address was
// effectively thrown away.
export async function recordSetupRequest(request: SetupRequestRow): Promise<void> {
  await write('setup_requests', {
    link: request.link,
    contact: request.contact ?? null,
  });
}

export interface SetupBookingRow {
  calBookingUid: string;
  setupSlug: string | null;
  attendeeEmail: string | null;
  attendeeName: string | null;
  startsAt: string | null;
  status: 'booked' | 'cancelled' | 'rescheduled';
  payload: unknown;
}

// One row per Cal booking. Upserted on the Cal uid so a cancellation or a
// reschedule updates the booking it belongs to instead of adding a second row.
export async function recordSetupBooking(booking: SetupBookingRow): Promise<void> {
  await write(
    'setup_bookings',
    {
      cal_booking_uid: booking.calBookingUid,
      setup_slug: booking.setupSlug,
      attendee_email: booking.attendeeEmail,
      attendee_name: booking.attendeeName,
      starts_at: booking.startsAt,
      status: booking.status,
      payload: booking.payload,
    },
    { upsertOn: 'cal_booking_uid' },
  );
}

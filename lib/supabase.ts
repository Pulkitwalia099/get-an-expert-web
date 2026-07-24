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

async function write(
  table: string,
  rows: object | object[],
  opts: { upsertOn?: string } = {},
): Promise<void> {
  const cfg = config();
  if (!cfg) return;
  const query = opts.upsertOn ? `?on_conflict=${opts.upsertOn}` : '';
  const prefer = opts.upsertOn
    ? 'return=minimal,resolution=merge-duplicates'
    : 'return=minimal';
  try {
    const res = await fetch(`${cfg.url}/rest/v1/${table}${query}`, {
      method: 'POST',
      headers: headers(cfg, { Prefer: prefer }),
      body: JSON.stringify(rows),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[midsesh:supabase] ${table} write failed`, res.status, await res.text());
    }
  } catch (err) {
    console.error(`[midsesh:supabase] ${table} write failed`, err);
  }
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
  kind: 'intros' | 'custom';
  selected: string[];
  need: string | null;
  brief: Brief;
  consent: boolean;
  flow?: 'main' | 'dev';
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
  await write('leads', row);
}

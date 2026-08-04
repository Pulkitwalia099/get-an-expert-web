import { createHmac, timingSafeEqual } from 'node:crypto';
import { insertRows, selectRows } from '@/lib/supabase';
import { readMatchSet, type MatchSet } from '@/lib/matches';
import type { Brief, ExpertRecord } from '@/lib/types';

// What somebody asked us to go and get, and the small piece of state that has
// to survive a round trip to Google.
//
// The order of the gate is deliberate: people tick the profiles they want
// while every name is still withheld, and only then are they asked to sign in.
// That means the selection is made before the browser leaves the site and has
// to still be there when it comes back, so it is put in a signed cookie rather
// than trusted to survive in a tab.

if (typeof window !== 'undefined') {
  throw new Error('lib/quotes is server-only and must never reach the client');
}

export const INTENT_COOKIE = 'midsesh_intent';

// Long enough to read a consent screen and pick an account, short enough that
// a cookie left on a shared machine is worth nothing an hour later.
export const INTENT_MAX_AGE = 15 * 60;

export const MAX_SLOTS = 8;

export type QuoteStatus = 'open' | 'contacting' | 'quotes_ready' | 'closed';

/** What a visitor is told each status means. The stored values never appear. */
export const STATUS_LABELS: Record<QuoteStatus, string> = {
  open: 'Reaching out',
  contacting: 'Waiting on replies',
  quotes_ready: 'Quotes sent to you',
  closed: 'Closed',
};

export const STATUS_NOTES: Record<QuoteStatus, string> = {
  open: 'We have your request and are contacting these people now.',
  contacting: 'Messages are out. We email you as soon as prices come back.',
  quotes_ready: 'Check your inbox. Every quote we got back is in there.',
  closed: 'This one is finished.',
};

function secret(): string | null {
  return process.env.SESSION_SECRET || null;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function sameValue(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export interface Intent {
  setId: string;
  slots: number[];
}

interface IntentPayload extends Intent {
  exp: number;
}

/**
 * Only ever whole numbers in range, deduplicated, sorted, and capped.
 *
 * Sorted because the slots go into the idempotency key: picking 3 then 1 and
 * picking 1 then 3 are the same request, and an unsorted key would let the
 * second one through as a new one.
 */
export function parseSlots(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  const slots = new Set<number>();
  for (const raw of input) {
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > MAX_SLOTS) continue;
    slots.add(n);
  }
  return [...slots].sort((a, b) => a - b).slice(0, MAX_SLOTS);
}

/** The signed cookie value, or null when no session secret is configured. */
export function signIntent(intent: Intent, now = Date.now()): string | null {
  const key = secret();
  if (!key) return null;
  const payload: IntentPayload = { ...intent, exp: Math.floor(now / 1000) + INTENT_MAX_AGE };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${b64url(createHmac('sha256', key).update(body).digest())}`;
}

/** What the cookie says, or null for anything tampered with or expired. */
export function readIntent(cookie: string | undefined, now = Date.now()): Intent | null {
  const key = secret();
  if (!key || !cookie) return null;

  const cut = cookie.lastIndexOf('.');
  if (cut <= 0) return null;
  const body = cookie.slice(0, cut);
  if (!sameValue(cookie.slice(cut + 1), b64url(createHmac('sha256', key).update(body).digest()))) {
    return null;
  }

  let payload: IntentPayload;
  try {
    payload = JSON.parse(fromB64url(body).toString('utf8')) as IntentPayload;
  } catch {
    return null;
  }
  if (!payload.exp || payload.exp * 1000 <= now) return null;
  if (typeof payload.setId !== 'string') return null;

  const slots = parseSlots(payload.slots);
  if (slots.length === 0) return null;
  return { setId: payload.setId, slots };
}

/**
 * The idempotency key for a request.
 *
 * Derived from the selection rather than random, so the same person asking for
 * the same people twice writes one row. The auth callback and a retried fetch
 * both land here, and the unique index on (set_id, ref) is what turns the
 * second one into a no-op instead of a second round of outreach.
 */
export function refFor(slots: number[]): string {
  return `gate:${slots.join('-')}`;
}

export interface CreateInput {
  setId: string;
  slots: number[];
  sub: string | null;
  email: string;
  name?: string | null;
}

/**
 * Write the request. Returns whether it landed.
 *
 * Not fire and forget, unlike most writes in this codebase. Somebody who
 * pressed a button and was told their request is in has to actually have one,
 * so a failure here has to reach the screen rather than the log.
 */
export async function createQuoteRequest(input: CreateInput): Promise<boolean> {
  if (input.slots.length === 0) return false;
  const res = await insertRows(
    'quote_requests',
    {
      set_id: input.setId,
      sub: input.sub,
      email: input.email.trim().toLowerCase(),
      name: input.name?.trim() || null,
      slots: input.slots,
      status: 'open',
      ref: refFor(input.slots),
    },
    { ignoreDuplicatesOn: 'set_id,ref' },
  );
  return res.ok;
}

interface RequestRow {
  id: string;
  set_id: string;
  slots: number[];
  status: QuoteStatus;
  created_at: string;
}

export interface QuoteRequest {
  id: string;
  setId: string;
  slots: number[];
  status: QuoteStatus;
  createdAt: string;
  brief: Brief | null;
  query: string;
  /** Everyone in the set, picked or not. The account owns all of them. */
  experts: ExpertRecord[];
}

/**
 * Every request this account has made, newest first.
 *
 * Two round trips rather than one embedded query: the sets are fetched by id
 * after the requests are known. Embedding would be one call, but a nested
 * PostgREST select fails silently into an empty array when a relationship is
 * not what you assumed, and an empty dashboard is exactly the failure nobody
 * would notice.
 */
export async function listQuoteRequests(sub: string, limit = 20): Promise<QuoteRequest[]> {
  const rows = await selectRows<RequestRow>(
    'quote_requests',
    `sub=eq.${encodeURIComponent(sub)}&select=id,set_id,slots,status,created_at&order=created_at.desc&limit=${limit}`,
  );
  if (!rows || rows.length === 0) return [];

  const sets = new Map<string, MatchSet>();
  await Promise.all(
    [...new Set(rows.map((r) => r.set_id))].map(async (id) => {
      const set = await readMatchSet(id);
      if (set) sets.set(id, set);
    }),
  );

  return rows.map((row) => {
    const set = sets.get(row.set_id);
    return {
      id: row.id,
      setId: row.set_id,
      slots: row.slots ?? [],
      status: row.status,
      createdAt: row.created_at,
      brief: set?.brief ?? null,
      query: set?.query ?? '',
      experts: set?.records ?? [],
    };
  });
}

/**
 * A brief written back as the sentence somebody would recognise.
 *
 * The dashboard has to show "the query you raised", and a visitor never typed
 * a Brief: they typed prose that a model turned into seven fields. This puts
 * the useful ones back into one line rather than printing the object.
 */
export function briefLine(brief: Brief | null, fallback: string): string {
  if (!brief) return fallback;
  const head = [brief.expert_type, brief.domain].map((s) => s?.trim()).filter(Boolean).join(' · ');
  const specifics = brief.specifics?.trim();
  if (head && specifics) return `${head}. ${specifics}`;
  return head || specifics || fallback || 'Your search';
}

import type { NextRequest } from 'next/server';

const WINDOW_MS = 60_000;
const MAX_HITS = 20;
const MAX_TRACKED_CLIENTS = 5_000;

const hits = new Map<string, number[]>();

// Per-instance limiter. Good enough for one serverless instance; swap for a
// shared store (KV/Upstash) if abuse shows up in production.
export function rateLimit(id: string, limit = MAX_HITS): boolean {
  const now = Date.now();
  const recent = (hits.get(id) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= limit) {
    hits.set(id, recent);
    return false;
  }
  recent.push(now);
  if (hits.size > MAX_TRACKED_CLIENTS) hits.clear();
  hits.set(id, recent);
  return true;
}

export function clientId(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}

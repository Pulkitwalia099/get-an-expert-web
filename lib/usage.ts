import { rpc } from '@/lib/supabase';

// Durable counters on top of the bump_usage Postgres function. The
// in-memory limiter in lib/ratelimit.ts dies with each serverless
// instance; these survive cold starts and are shared across instances.
// Every check fails open: if Supabase is unreachable the request proceeds,
// because protecting API spend must never take the chat down with it.

const DEFAULT_DAILY_CAPS: Record<string, number> = {
  chat: 500,
  search: 150,
  intros: 200,
};

export const SERP_DEFAULT_MONTHLY_CAP = 250;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function dayKey(route: string, at = new Date()): string {
  return `d:${route}:${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())}`;
}

export function monthKey(scope: string, at = new Date()): string {
  return `m:${scope}:${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}`;
}

export function minuteKey(route: string, ip: string, at = new Date()): string {
  const stamp = `${at.getUTCFullYear()}${pad(at.getUTCMonth() + 1)}${pad(at.getUTCDate())}${pad(at.getUTCHours())}${pad(at.getUTCMinutes())}`;
  return `r:${route}:${ip}:${stamp}`;
}

// Atomic increment-and-read; by = 0 reads without counting. Null when
// Supabase is unconfigured or unreachable.
export async function bumpUsage(key: string, by = 1): Promise<number | null> {
  return rpc<number>('bump_usage', { counter_key: key, by });
}

export function dailyCap(route: string): number {
  const fromEnv = Number(process.env[`DAILY_CAP_${route.toUpperCase()}`]);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : (DEFAULT_DAILY_CAPS[route] ?? 500);
}

export function serpMonthlyCap(): number {
  const fromEnv = Number(process.env.SERPAPI_MONTHLY_CAP);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : SERP_DEFAULT_MONTHLY_CAP;
}

export type LimitVerdict = 'ok' | 'ip' | 'daily';

// Two counters in one round trip: a per-IP minute bucket and the global
// daily cap for the route. The minute limit stops one client scripting the
// endpoint; the daily cap bounds total spend however many IPs attack.
export async function durableLimit(
  route: string,
  ip: string,
  perMinute: number,
): Promise<LimitVerdict> {
  const [minute, day] = await Promise.all([
    bumpUsage(minuteKey(route, ip)),
    bumpUsage(dayKey(route)),
  ]);
  if (minute !== null && minute > perMinute) return 'ip';
  if (day !== null && day > dailyCap(route)) return 'daily';
  return 'ok';
}

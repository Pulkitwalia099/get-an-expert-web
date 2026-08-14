import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The Google door, both ends of the round trip.
//
// What is worth pinning here is not that sign in works, it is where the
// browser is sent afterwards. The response that carries that redirect is the
// response that sets a thirty day session cookie, so a destination that slips
// through the allowlist is a phishing page wearing our sign in.

const exchangeCode = vi.hoisted(() => vi.fn());
const resolveAccount = vi.hoisted(() => vi.fn(async (u: unknown) => u));
const ensureAccount = vi.hoisted(() => vi.fn(async () => undefined));
const readIntent = vi.hoisted(() => vi.fn(() => null));

vi.mock('@/lib/metrics', () => ({ withMetrics: (_r: string, fn: unknown) => fn }));
vi.mock('@/lib/credits', () => ({ resolveAccount, ensureAccount }));
vi.mock('@/lib/matches', () => ({ claimMatchSet: vi.fn(async () => false) }));
vi.mock('@/lib/quotes', () => ({
  INTENT_COOKIE: 'midsesh_intent',
  readIntent,
  createQuoteRequest: vi.fn(async () => false),
}));
// Everything real except the network call to Google, so the allowlist and the
// cookie signing under test are the ones that ship.
vi.mock('@/lib/auth', async (original) => ({
  ...(await original<typeof import('@/lib/auth')>()),
  exchangeCode,
}));

import { NEXT_COOKIE, SESSION_COOKIE, STATE_COOKIE, readSession } from '@/lib/auth';
import { GET as start } from '@/app/api/auth/google/route';
import { GET as callback } from '@/app/api/auth/callback/route';
import type { NextRequest } from 'next/server';

const USER = { sub: '1', email: 'a@b.co', name: null, picture: null };
const ORDER = '/orders/b1029c04-c43d-422b-9000-ff79632847a6';

function request(url: string, cookies: Record<string, string> = {}): NextRequest {
  return {
    nextUrl: new URL(url),
    cookies: { get: (k: string) => (k in cookies ? { value: cookies[k] } : undefined) },
  } as unknown as NextRequest;
}

/** The path and query of wherever the response points, origin stripped. */
function target(res: { headers: Headers }): string {
  const url = new URL(res.headers.get('location') ?? '');
  return `${url.pathname}${url.search}`;
}

beforeEach(() => {
  vi.stubEnv('GOOGLE_CLIENT_ID', 'client-id');
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'client-secret');
  vi.stubEnv('SESSION_SECRET', 'test-secret-for-the-google-door');
  exchangeCode.mockReset().mockResolvedValue(USER);
  resolveAccount.mockClear();
  readIntent.mockReset().mockReturnValue(null);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('the Google door, going out', () => {
  it('parks a destination it allows, with the attributes that make it work', async () => {
    const res = await start(request(`https://midsesh.com/api/auth/google?next=${ORDER}`));
    // sameSite is load bearing. Strict would not be sent on Google's cross
    // site navigation back, so the destination would vanish on every trip.
    expect(res.cookies.get(NEXT_COOKIE)).toMatchObject({
      value: ORDER,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    expect(res.headers.get('location')).toContain('accounts.google.com');
  });

  it('clears a destination it does not allow, and still sends them to Google', async () => {
    const res = await start(
      request('https://midsesh.com/api/auth/google?next=https://evil.example'),
    );
    expect(res.cookies.get(NEXT_COOKIE)?.value).toBe('');
    expect(res.headers.get('location')).toContain('accounts.google.com');
  });

  it('clears rather than ignores when nothing was asked for', async () => {
    // The bug this pins: only the callback clears this cookie, and a sign in
    // abandoned at Google's account picker never reaches the callback. Leaving
    // the old value alone means the next, unrelated sign in spends it.
    const res = await start(request('https://midsesh.com/api/auth/google'));
    expect(res.cookies.get(NEXT_COOKIE)?.value).toBe('');
    expect(res.cookies.get(NEXT_COOKIE)?.maxAge).toBe(0);
  });
});

describe('the Google door, coming back', () => {
  const good = { [STATE_COOKIE]: 'state-value' };
  const back = 'https://midsesh.com/api/auth/callback?code=abc&state=state-value';

  it('honours the parked destination', async () => {
    const res = await callback(request(back, { ...good, [NEXT_COOKIE]: ORDER }));
    expect(target(res)).toBe(`${ORDER}?signin=ok`);
    expect(readSession(res.cookies.get(SESSION_COOKIE)?.value)?.email).toBe('a@b.co');
  });

  it('lands on the dashboard when nothing was parked', async () => {
    const res = await callback(request(back, good));
    // Orders, not the dashboard. Orders are what this business takes now.
    expect(target(res)).toBe('/orders?signin=ok');
  });

  it('refuses a destination that reached the cookie some other way', async () => {
    // Belt and braces: the value is checked on the way in too, so this cookie
    // cannot come from our own route. It could come from an allowlist that was
    // tightened after the cookie was set.
    const res = await callback(request(back, { ...good, [NEXT_COOKIE]: 'https://evil.example' }));
    expect(target(res)).toBe('/orders?signin=ok');
  });

  it('clears the destination cookie once it is spent', async () => {
    const res = await callback(request(back, { ...good, [NEXT_COOKIE]: ORDER }));
    expect(res.cookies.get(NEXT_COOKIE)?.value).toBe('');
  });

  it('sends every failure to the doors, never to a page that needs a session', async () => {
    const expired = await callback(request(back, { [STATE_COOKIE]: 'a-different-value' }));
    // 'stale', not 'expired'. On this door there is no link to have expired:
    // the consent screen sat open past the state cookie's five minutes.
    expect(target(expired)).toBe('/signin?signin=stale');

    exchangeCode.mockResolvedValue(null);
    const failed = await callback(request(back, good));
    expect(target(failed)).toBe('/signin?signin=failed');

    const cancelled = await callback(
      request('https://midsesh.com/api/auth/callback?error=access_denied', good),
    );
    expect(target(cancelled)).toBe('/signin');
  });

  it('does not carry a parked destination into a failure', async () => {
    const res = await callback(request(back, { [NEXT_COOKIE]: ORDER }));
    expect(target(res)).toBe('/signin?signin=stale');
    expect(res.cookies.get(NEXT_COOKIE)?.value).toBe('');
  });
});

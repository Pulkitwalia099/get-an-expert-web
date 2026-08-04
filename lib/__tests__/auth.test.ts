import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  authConfigured,
  authorizeUrl,
  callbackUrl,
  newState,
  readSession,
  signSession,
  stateMatches,
} from '@/lib/auth';
import { MAX_CREDIT_SHARE, SIGNUP_CREDIT_CENTS, formatCents, splitPrice } from '@/lib/credits';

const USER = { sub: '10769150350006150715', email: 'a@example.com', name: 'A', picture: null };

const KEYS = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SESSION_SECRET', 'AUTH_ORIGIN'] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of KEYS) saved[k] = process.env[k];
  process.env.GOOGLE_CLIENT_ID = 'client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'client-secret';
  process.env.SESSION_SECRET = 'session-secret';
  delete process.env.AUTH_ORIGIN;
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('session cookie', () => {
  it('round trips a signed session', () => {
    const cookie = signSession(USER);
    expect(cookie).toBeTruthy();
    expect(readSession(cookie!)).toEqual(USER);
  });

  // The whole point of signing it. A cookie is user editable storage, so a
  // payload the user can rewrite is a payload that says whatever they like.
  it('rejects a tampered payload', () => {
    const cookie = signSession(USER)!;
    const [body, sig] = cookie.split('.');
    const forged = Buffer.from(JSON.stringify({ ...USER, sub: 'someone-else', exp: 9e9 }))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(readSession(`${forged}.${sig}`)).toBeNull();
    expect(body).not.toBe(forged);
  });

  it('rejects a session signed with a different secret', () => {
    const cookie = signSession(USER)!;
    process.env.SESSION_SECRET = 'rotated';
    expect(readSession(cookie)).toBeNull();
  });

  it('rejects an expired session', () => {
    const cookie = signSession(USER, Date.now())!;
    const wayLater = Date.now() + 400 * 24 * 60 * 60 * 1000;
    expect(readSession(cookie, wayLater)).toBeNull();
  });

  it('rejects junk and missing cookies', () => {
    expect(readSession(undefined)).toBeNull();
    expect(readSession('')).toBeNull();
    expect(readSession('nodot')).toBeNull();
    expect(readSession('.')).toBeNull();
  });

  it('cannot mint a session with no secret set', () => {
    delete process.env.SESSION_SECRET;
    expect(signSession(USER)).toBeNull();
    expect(authConfigured()).toBe(false);
  });
});

describe('oauth start', () => {
  it('asks only for identity scopes', () => {
    const url = new URL(authorizeUrl('abc', 'https://midsesh.com')!);
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('state')).toBe('abc');
    expect(url.searchParams.get('redirect_uri')).toBe('https://midsesh.com/api/auth/callback');
    // The client secret must never be in a URL the browser follows.
    expect(url.search).not.toContain('client-secret');
  });

  it('pins the callback to AUTH_ORIGIN when one is set', () => {
    process.env.AUTH_ORIGIN = 'https://midsesh.com';
    expect(callbackUrl('https://preview-xyz.vercel.app')).toBe(
      'https://midsesh.com/api/auth/callback',
    );
  });

  it('offers no url when unconfigured', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    expect(authorizeUrl('abc', 'https://midsesh.com')).toBeNull();
  });

  it('state is unguessable and compared exactly', () => {
    const a = newState();
    expect(a).toHaveLength(32);
    expect(newState()).not.toBe(a);
    expect(stateMatches(a, a)).toBe(true);
    expect(stateMatches(a, `${a}x`)).toBe(false);
    expect(stateMatches(a, undefined)).toBe(false);
    expect(stateMatches(undefined, undefined)).toBe(false);
  });
});

describe('credit split', () => {
  // The reason the cap exists. During the launch sale a setup lists at $11,
  // and an uncapped $50 would buy four of them and collect nothing.
  it('never lets credit cover a whole order', () => {
    const sale = splitPrice(1_100, SIGNUP_CREDIT_CENTS);
    expect(sale.creditCents).toBe(550);
    expect(sale.dueCents).toBe(550);
    expect(sale.dueCents).toBeGreaterThan(0);
  });

  it('caps at half no matter how big the balance', () => {
    for (const price of [1_100, 3_500, 7_500, 12_000]) {
      const s = splitPrice(price, 10_000_000);
      expect(s.creditCents).toBe(Math.floor(price * MAX_CREDIT_SHARE));
      expect(s.creditCents + s.dueCents).toBe(price);
    }
  });

  it('spends only what is there', () => {
    const s = splitPrice(7_500, 900);
    expect(s.creditCents).toBe(900);
    expect(s.dueCents).toBe(6_600);
  });

  it('handles an empty balance and a free order', () => {
    expect(splitPrice(7_500, 0)).toEqual({ priceCents: 7_500, creditCents: 0, dueCents: 7_500 });
    expect(splitPrice(0, 5_000)).toEqual({ priceCents: 0, creditCents: 0, dueCents: 0 });
  });

  // A negative balance should never happen, but if a refund ever writes one
  // it must not turn into credit the customer can spend.
  it('treats a negative balance as nothing', () => {
    expect(splitPrice(7_500, -5_000).creditCents).toBe(0);
  });

  it('always adds back up to the price', () => {
    for (let price = 0; price <= 20_000; price += 137) {
      for (const bal of [0, 313, 5_000, 99_999]) {
        const s = splitPrice(price, bal);
        expect(s.creditCents + s.dueCents).toBe(s.priceCents);
        expect(s.creditCents).toBeGreaterThanOrEqual(0);
        expect(s.dueCents).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('formats money the way a person reads it', () => {
    expect(formatCents(5_000)).toBe('$50');
    expect(formatCents(550)).toBe('$5.50');
    expect(formatCents(0)).toBe('$0');
  });
});

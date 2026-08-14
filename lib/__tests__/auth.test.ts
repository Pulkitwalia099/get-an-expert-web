import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  authConfigured,
  authorizeUrl,
  callbackUrl,
  newState,
  readSession,
  safeNext,
  signSession,
  stateMatches,
} from '@/lib/auth';
import {
  MAX_CREDIT_SHARE,
  SIGNUP_CREDIT_CENTS,
  coversEveryPrice,
  firstOrderLabel,
  formatCents,
  splitPrice,
} from '@/lib/credit-math';
import { MAIN_SETUPS } from '@/lib/setups';

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
  // The claim printed on the sign in control. The grant was cut to $20 on
  // 2026-08-10 and no longer covers a first booking: a $35 setup leaves $15
  // and a $75 setup leaves $55. This used to assert the free promise. What it
  // asserts now is the thing that actually has to stay true, that the words on
  // the button are the arithmetic, so it can never read free while money is
  // owed.
  it('prints what is really left to pay on every setup in the catalog', () => {
    const prices = MAIN_SETUPS.map((s) => s.price);
    expect(coversEveryPrice(prices)).toBe(false);
    for (const price of prices) {
      const { dueCents } = splitPrice(price * 100, SIGNUP_CREDIT_CENTS);
      expect(dueCents).toBe(price * 100 - SIGNUP_CREDIT_CENTS);
      expect(firstOrderLabel(price)).toBe(`${formatCents(dueCents)} on your first`);
    }
  });

  // The free branch still exists and still has to work, for the day a price
  // drops under the grant or the grant goes back up.
  it('still says free when the credit does cover the price', () => {
    expect(firstOrderLabel(SIGNUP_CREDIT_CENTS / 100)).toBe('Free on your first');
    expect(coversEveryPrice([SIGNUP_CREDIT_CENTS / 100])).toBe(true);
  });

  // The same guard from the other side: one dollar over the grant and the
  // promise has to change wording rather than quietly break.
  it('stops claiming a free first setup once a price passes the grant', () => {
    const tooDear = SIGNUP_CREDIT_CENTS / 100 + 1;
    expect(coversEveryPrice([35, tooDear])).toBe(false);
    expect(firstOrderLabel(tooDear)).toBe('$1 on your first');
  });

  it('spends the balance and no more, however big the order', () => {
    for (const price of [3_500, 7_500, 12_000]) {
      const s = splitPrice(price, SIGNUP_CREDIT_CENTS);
      expect(s.creditCents).toBe(Math.min(SIGNUP_CREDIT_CENTS, price));
      expect(s.creditCents + s.dueCents).toBe(price);
    }
  });

  // The cap is lifted, not deleted. If it is ever put back this keeps the two
  // in step instead of leaving the constant lying about what it does.
  it('honours whatever MAX_CREDIT_SHARE says', () => {
    for (const price of [3_500, 7_500]) {
      const s = splitPrice(price, 10_000_000);
      expect(s.creditCents).toBe(Math.floor(price * MAX_CREDIT_SHARE));
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

describe('safeNext', () => {
  // This is the allowlist both doors share. The response that acts on it is
  // the response that sets a thirty day session cookie, so a value that slips
  // through hands a freshly signed in person to somebody else's page at the
  // moment they have most reason to trust what is on screen.

  it('allows the three destinations that exist', () => {
    expect(safeNext('/dashboard')).toBe('/dashboard');
    expect(safeNext('/orders')).toBe('/orders');
    const order = '/orders/b1029c04-c43d-422b-9000-ff79632847a6';
    expect(safeNext(order)).toBe(order);
  });

  it('refuses another origin, however it is spelled', () => {
    expect(safeNext('https://evil.example/orders')).toBeNull();
    // The case a "must start with a slash" check famously admits.
    expect(safeNext('//evil.example')).toBeNull();
    expect(safeNext('//evil.example/orders')).toBeNull();
    expect(safeNext('http:/evil.example')).toBeNull();
    expect(safeNext('\\evil.example')).toBeNull();
  });

  it('refuses anything appended or prefixed, because both ends are anchored', () => {
    expect(safeNext('/orders/../admin')).toBeNull();
    expect(safeNext('/orders?x=1')).toBeNull();
    expect(safeNext('/orders#x')).toBeNull();
    expect(safeNext('/ordersomething')).toBeNull();
    expect(safeNext('x/orders')).toBeNull();
    expect(safeNext(' /orders')).toBeNull();
  });

  it('refuses a uuid on the route that has no uuid', () => {
    expect(safeNext('/dashboard/b1029c04-c43d-422b-9000-ff79632847a6')).toBeNull();
  });

  it('refuses an order id that is not a uuid', () => {
    expect(safeNext('/orders/all')).toBeNull();
    expect(safeNext('/orders/b1029c04')).toBeNull();
    expect(safeNext('/orders/../../etc')).toBeNull();
  });

  it('answers null for nothing at all, so callers pick their own landing', () => {
    expect(safeNext(null)).toBeNull();
    expect(safeNext(undefined)).toBeNull();
    expect(safeNext('')).toBeNull();
  });
});

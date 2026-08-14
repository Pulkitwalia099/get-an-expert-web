import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The email door, end to end from the link to the cookie.
//
// The unit tests next door prove resolveAccount picks the right sub. This one
// proves the route actually signs the session with it, which is the half that
// matters: the sub in the cookie is what every later request reads a balance
// and an order list by, and it is set once and then trusted for thirty days.

// Hoisted, because the route below is a static import and vi.mock runs before
// anything in this file's body would have defined these.
const { selectRows, insertRows } = vi.hoisted(() => ({
  selectRows: vi.fn<(table: string, query: string) => Promise<unknown[] | null>>(async () => []),
  insertRows: vi.fn<
    (
      table: string,
      rows: Record<string, unknown>,
      opts?: Record<string, string>,
    ) => Promise<{ ok: boolean; status: number }>
  >(async () => ({ ok: true, status: 201 })),
}));
vi.mock('@/lib/supabase', () => ({ selectRows, insertRows }));
vi.mock('@/lib/metrics', () => ({ withMetrics: (_route: string, fn: unknown) => fn }));

import { SESSION_COOKIE, readSession } from '@/lib/auth';
import { signEmailToken } from '@/lib/emailAuth';
import { GET } from '@/app/api/auth/email/callback/route';
import type { NextRequest } from 'next/server';

const GOOGLE_SUB = '104729384756102938475';

function request(token: string, next?: string): NextRequest {
  const nextUrl = new URL(
    `https://midsesh.com/api/auth/email/callback?t=${token}` +
      (next ? `&next=${encodeURIComponent(next)}` : ''),
  );
  return { nextUrl, cookies: { get: () => undefined } } as unknown as NextRequest;
}

async function open(email: string, next?: string) {
  const token = signEmailToken(email);
  if (!token) throw new Error('no token');
  return GET(request(token, next));
}

async function signIn(email: string) {
  const res = await open(email);
  return readSession(res.cookies.get(SESSION_COOKIE)?.value);
}

beforeEach(() => {
  vi.stubEnv('SESSION_SECRET', 'test-secret-for-the-email-door');
  selectRows.mockReset();
  selectRows.mockResolvedValue([]);
  insertRows.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('the email callback', () => {
  it('signs the session with the account this address already has', async () => {
    selectRows.mockResolvedValue([{ sub: GOOGLE_SUB }]);
    const session = await signIn('pulkit@example.com');
    expect(session?.sub).toBe(GOOGLE_SUB);
    expect(session?.email).toBe('pulkit@example.com');
  });

  it('records the account under that same sub, not the derived one', async () => {
    selectRows.mockResolvedValue([{ sub: GOOGLE_SUB }]);
    await signIn('pulkit@example.com');
    const row = insertRows.mock.calls[0][1];
    expect(row.sub).toBe(GOOGLE_SUB);
  });

  it('derives a sub for an address that has never been here', async () => {
    const session = await signIn('nobody@example.com');
    expect(session?.sub).toBe('email:nobody@example.com');
  });

  it('still signs somebody in when the lookup fails', async () => {
    selectRows.mockResolvedValue(null);
    const session = await signIn('pulkit@example.com');
    expect(session?.sub).toBe('email:pulkit@example.com');
  });
});

describe('the destination on a status email link', () => {
  // The only next in production today: lib/orderMail.ts deep links a status
  // email to one order rather than to the list. The allowlist that decides it
  // moved to lib/auth, so this is the spec that it still decides the same way.
  const ORDER = '/orders/b1029c04-c43d-422b-9000-ff79632847a6';

  it('opens the order the email was about', async () => {
    const res = await open('pulkit@example.com', ORDER);
    expect(new URL(res.headers.get('location') ?? '').pathname).toBe(ORDER);
  });

  it('stays on this origin when handed another one', async () => {
    const res = await open('pulkit@example.com', 'https://evil.example/orders');
    const url = new URL(res.headers.get('location') ?? '');
    expect(url.origin).toBe('https://midsesh.com');
    expect(url.pathname).toBe('/orders');
  });

  it('ignores the destination when the token is dead', async () => {
    // A dead link must not drop somebody on an order page that will only 404
    // them for being signed out.
    const res = await GET(request('forged', ORDER));
    const url = new URL(res.headers.get('location') ?? '');
    expect(url.pathname).toBe('/orders');
    expect(url.searchParams.get('signin')).toBe('expired');
  });
});

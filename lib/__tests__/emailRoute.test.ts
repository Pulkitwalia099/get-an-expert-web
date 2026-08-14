import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// What goes into the outbound link.
//
// This route is the only place a destination somebody typed can end up printed
// inside an email that another person is invited to click. The callback checks
// it again on the way back, but a rejected value must never reach the mail in
// the first place: a link is forwarded, screenshotted and pasted into support
// threads long after the click that made it.

const sendEmail = vi.hoisted(() =>
  vi.fn<(mail: { to: string; subject: string; text: string }) => Promise<boolean>>(async () => true),
);
const durableLimit = vi.hoisted(() => vi.fn(async () => 'ok' as const));

vi.mock('@/lib/metrics', () => ({ withMetrics: (_r: string, fn: unknown) => fn }));
vi.mock('@/lib/usage', () => ({ durableLimit }));
vi.mock('@/lib/email', async (original) => ({
  ...(await original<typeof import('@/lib/email')>()),
  hasEmailKey: () => true,
  sendEmail,
}));

import { POST } from '@/app/api/auth/email/route';
import type { NextRequest } from 'next/server';

const ORDER = '/orders/b1029c04-c43d-422b-9000-ff79632847a6';

// The in-process limiter keeps state across this file, so every request gets
// its own client id.
let client = 0;

function request(body: object): NextRequest {
  client += 1;
  return {
    nextUrl: new URL('https://midsesh.com/api/auth/email'),
    headers: new Headers({
      origin: 'https://midsesh.com',
      host: 'midsesh.com',
      'x-forwarded-for': `203.0.113.${client}`,
    }),
    json: async () => body,
  } as unknown as NextRequest;
}

/** The link as it appears in the sent mail. */
async function linkFor(body: object): Promise<string> {
  sendEmail.mockClear();
  const res = await POST(request(body));
  expect(res.status).toBe(200);
  const sent = sendEmail.mock.calls[0]?.[0];
  const match = sent?.text.match(/https:\/\/\S+/);
  return match?.[0] ?? '';
}

beforeEach(() => {
  vi.stubEnv('SESSION_SECRET', 'test-secret-for-the-email-route');
  vi.stubEnv('AUTH_ORIGIN', 'https://midsesh.com');
  sendEmail.mockClear();
  durableLimit.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('the link this route sends', () => {
  it('carries a destination it allows', async () => {
    const link = await linkFor({ email: 'a@b.co', next: ORDER });
    expect(new URL(link).searchParams.get('next')).toBe(ORDER);
  });

  it('carries no destination at all when the one asked for is refused', async () => {
    const link = await linkFor({ email: 'a@b.co', next: 'https://evil.example' });
    expect(new URL(link).searchParams.get('next')).toBeNull();
    expect(link).not.toContain('evil.example');
  });

  it('carries none when none was asked for', async () => {
    const link = await linkFor({ email: 'a@b.co' });
    expect(new URL(link).searchParams.get('next')).toBeNull();
  });

  it('survives a destination that is not a string', async () => {
    const link = await linkFor({ email: 'a@b.co', next: { toString: 'no' } });
    expect(new URL(link).searchParams.get('next')).toBeNull();
  });

  it('still answers the same way, so nothing about the address leaks', async () => {
    const res = await POST(request({ email: 'a@b.co', next: 'https://evil.example' }));
    expect(await res.json()).toEqual({ ok: true });
  });
});

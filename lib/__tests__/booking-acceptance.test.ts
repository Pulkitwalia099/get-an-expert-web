import { describe, expect, it } from 'vitest';
import { processSetupRequest } from '@/lib/requests';

// Acceptance specs for POST /api/requests, run against the same handler the
// route uses. Each scenario gets its own client key so the rate limiter
// never bleeds between tests.
//
// The consultation scenarios that used to live here went with the booking
// itself: Cal.com takes the booking now, so there is no consult body for this
// handler to accept or reject.

const reel = (overrides: Record<string, unknown> = {}) => ({
  type: 'reel',
  link: 'https://www.tiktok.com/@x/video/123',
  ...overrides,
});

const today = new Date('2026-07-26T12:00:00Z');

describe('Feature: sending a reel we are missing', () => {
  it('Given an https reel link, When I send it, Then it is accepted with optional contact', async () => {
    const res = await processSetupRequest(
      { type: 'reel', link: 'https://www.tiktok.com/@x/video/123', contact: '@rohit' },
      'reel-1',
      today,
    );
    expect(res.status).toBe(200);
  });

  it('Given javascript, data, or file schemes, Then the link is rejected', async () => {
    for (const link of ['javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd', 'ftp://x']) {
      const res = await processSetupRequest({ type: 'reel', link }, `scheme-${link}`, today);
      expect(res.status).toBe(400);
    }
  });

  it('Given a 2,000 character link, Then it is rejected instead of stored', async () => {
    const link = `https://x.com/${'a'.repeat(2000)}`;
    const res = await processSetupRequest({ type: 'reel', link }, 'long-link', today);
    expect(res.status).toBe(400);
  });
});

describe('Feature: abuse handling', () => {
  it('Given junk bodies, Then nothing crashes and everything is a 400', async () => {
    for (const body of [null, 'text', [], { type: 'exploit' }, { type: 42 }]) {
      const res = await processSetupRequest(body, `junk-${JSON.stringify(body)}`, today);
      expect(res.status).toBe(400);
    }
  });

  it('Given one client fires 11 requests in a minute, Then the 11th is throttled with 429', async () => {
    let last = 0;
    for (let i = 0; i < 11; i++) {
      const res = await processSetupRequest(reel(), 'burst-client', today);
      last = res.status;
    }
    expect(last).toBe(429);
  });
});

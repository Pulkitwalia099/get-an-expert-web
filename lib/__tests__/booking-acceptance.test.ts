import { describe, expect, it } from 'vitest';
import { processSetupRequest } from '@/lib/requests';

// Acceptance specs for POST /api/requests, run against the same handler the
// route uses. Each scenario gets its own client key so the rate limiter
// never bleeds between tests.

const today = new Date('2026-07-26T12:00:00Z');

const consult = (overrides: Record<string, unknown> = {}) => ({
  type: 'consult',
  email: 'rohit@example.com',
  date: '2026-07-27',
  slot: '10:30 AM',
  setups: ['openclaw', 'ollama'],
  ...overrides,
});

describe('Feature: booking the free consultation', () => {
  it('Given setups in the cart and a valid slot, When I book, Then the booking is accepted', async () => {
    const res = await processSetupRequest(consult(), 'happy-1', today);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('Given an empty cart, When I book, Then the consult still goes through', async () => {
    const res = await processSetupRequest(consult({ setups: [] }), 'happy-2', today);
    expect(res.status).toBe(200);
  });

  it('Given a malformed email, Then the booking is rejected', async () => {
    for (const email of ['nope', 'a@b', 'a b@c.com', '', 42]) {
      const res = await processSetupRequest(consult({ email }), `email-${String(email)}`, today);
      expect(res.status).toBe(400);
    }
  });

  it('Given a date in the past or too far out, Then the booking is rejected', async () => {
    for (const date of ['2026-07-25', '2025-01-01', '2027-07-26', '26-07-2026', 'tomorrow']) {
      const res = await processSetupRequest(consult({ date }), `date-${date}`, today);
      expect(res.status).toBe(400);
    }
  });

  it('Given a slot outside 10:00 AM to 11:30 PM PST, Then the booking is rejected', async () => {
    for (const slot of ['9:30 AM', '11:45 PM', '10:00', 'midnight', 7]) {
      const res = await processSetupRequest(consult({ slot }), `slot-${String(slot)}`, today);
      expect(res.status).toBe(400);
    }
  });

  it('Given unknown or forged setup slugs, Then the booking is rejected', async () => {
    const forged = [['nope'], ['openclaw', 'DROP TABLE'], [42], 'openclaw'];
    for (const setups of forged) {
      const res = await processSetupRequest(consult({ setups }), `slugs-${JSON.stringify(setups)}`, today);
      expect(res.status).toBe(400);
    }
  });

  it('Given a cart stuffed past the cap, Then the booking is rejected', async () => {
    const setups = Array.from({ length: 11 }, () => 'openclaw');
    const res = await processSetupRequest(consult({ setups }), 'stuffed', today);
    expect(res.status).toBe(400);
  });
});

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
      const res = await processSetupRequest(consult(), 'burst-client', today);
      last = res.status;
    }
    expect(last).toBe(429);
  });
});

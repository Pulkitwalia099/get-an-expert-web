import { beforeEach, describe, expect, it, vi } from 'vitest';

// The customer emails.
//
// These are the only words most customers ever read from us, and they are
// assembled from a service name that arrives as free text from another repo.
// The failure mode is not an exception, it is a sentence that reads as though
// nobody looked: "Your LinkedIn Growth Engine ad is ready to watch".

const sendEmail = vi.hoisted(() =>
  vi.fn<(mail: { to: string; subject: string; text: string }) => Promise<boolean>>(async () => true),
);
vi.mock('@/lib/email', async (original) => ({
  ...(await original<typeof import('@/lib/email')>()),
  hasEmailKey: () => true,
  sendEmail,
}));

import { notifyCustomer, type OrderMailInput } from '@/lib/orderMail';

async function mail(input: Partial<OrderMailInput> = {}) {
  sendEmail.mockClear();
  await notifyCustomer({
    orderId: 'b1029c04-c43d-422b-9000-ff79632847a6',
    email: 'someone@example.com',
    status: 'sample_sent',
    serviceName: 'AI UGC Campaign Engine',
    ...input,
  });
  return sendEmail.mock.calls[0]?.[0];
}

beforeEach(() => {
  vi.stubEnv('SESSION_SECRET', 'test-secret-for-order-mail');
  vi.stubEnv('AUTH_ORIGIN', 'https://midsesh.com');
});

describe('the service name', () => {
  it('says watch for something you watch', async () => {
    const sent = await mail({ serviceName: 'AI UGC Campaign Engine' });
    expect(sent?.subject).toBe('Your AI UGC Campaign Engine is ready to watch');
    expect(sent?.text).toContain('Watch it:');
  });

  it('does not say watch for something you read', async () => {
    const sent = await mail({ serviceName: 'LinkedIn Growth Engine' });
    expect(sent?.subject).toBe('Your LinkedIn Growth Engine is ready to review');
    expect(sent?.text).not.toMatch(/watch/i);
  });

  it('never calls a written deliverable an ad', async () => {
    const sent = await mail({ serviceName: 'LinkedIn Growth Engine' });
    expect(sent?.subject).not.toMatch(/\bad\b/i);
  });

  it('never promises a watermark removal on something with no watermark', async () => {
    for (const status of ['new', 'approved', 'delivered'] as const) {
      const sent = await mail({ status, serviceName: 'LinkedIn Growth Engine' });
      expect(sent?.text).not.toMatch(/watermark/i);
    }
    // And still says it where it is true.
    const video = await mail({ status: 'delivered', serviceName: 'Video Editing' });
    expect(video?.text).toMatch(/watermark/i);
  });

  it('still makes a sentence when the order has no service', async () => {
    const sent = await mail({ serviceName: null });
    expect(sent?.subject).toBe('Your order is ready to review');
  });

  it('drops the qualifier the marketplace appends', async () => {
    const sent = await mail({ serviceName: 'Video Editing · 48 hour' });
    expect(sent?.subject).toBe('Your Video Editing is ready to watch');
  });
});

describe('the confirmation', () => {
  it('shows what they ordered and what is included', async () => {
    const sent = await mail({
      status: 'new',
      serviceName: 'LinkedIn Growth Engine',
      brief: '  Twelve posts a month   about fintech hiring ',
    });
    expect(sent?.subject).toBe('We have your LinkedIn Growth Engine order');
    // Their own words, tidied of the whitespace a textarea leaves behind.
    expect(sent?.text).toContain('Twelve posts a month about fintech hiring');
    expect(sent?.text).toContain('one round of changes');
    expect(sent?.text).toMatch(/rights are yours|with full rights/);
    expect(sent?.text).toContain('Nothing is charged automatically');
  });

  it('thanks a first time customer, and only them', async () => {
    const first = await mail({ status: 'new', firstOrder: true });
    expect(first?.text).toContain('This is your first order with us');
    // A returning customer told they are new reads as a form letter that
    // cannot count, so unknown has to fall the other way.
    const returning = await mail({ status: 'new', firstOrder: false });
    expect(returning?.text).not.toContain('first order');
    const unknown = await mail({ status: 'new' });
    expect(unknown?.text).not.toContain('first order');
  });

  it('says a call may be needed, and why', async () => {
    const sent = await mail({ status: 'new' });
    expect(sent?.text).toContain('ask for a short call before we start');
    // The reason has to travel with the ask. On its own it reads as a delay.
    expect(sent?.text).toContain('leaves us guessing');
  });

  it('survives an order with no brief', async () => {
    const sent = await mail({ status: 'new', brief: null });
    expect(sent?.text).toContain('WHAT YOU ORDERED');
  });

  it('does not paste an essay into an email', async () => {
    const long = await mail({ status: 'new', brief: 'x'.repeat(600) });
    const short = await mail({ status: 'new', brief: 'four words only here' });
    expect(long?.text).toContain('...');
    // The brief is capped rather than the email: a 600 character brief adds
    // about 240 characters, not 600, so it never becomes the email.
    expect((long?.text.length ?? 0) - (short?.text.length ?? 0)).toBeLessThan(260);
  });
});

describe('every email', () => {
  const STATES: OrderMailInput['status'][] = [
    'new',
    'sample_sent',
    'approved',
    'delivered',
    'declined',
    'refunded',
  ];

  it('signs off the same way and carries a working link', async () => {
    for (const status of STATES) {
      const sent = await mail({ status });
      expect(sent?.text).toContain('midsesh team\nmidsesh.com');
      expect(sent?.text).toContain(
        'https://midsesh.com/api/auth/email/callback?t=',
      );
      expect(sent?.text).toContain('next=%2Forders%2Fb1029c04');
    }
  });

  it('never mentions money', async () => {
    // Nothing is charged automatically and the price was agreed before the
    // order existed, so a figure here either repeats or contradicts it.
    for (const status of STATES) {
      const sent = await mail({ status });
      expect(sent?.text).not.toMatch(/[$£€]\s?\d|\bprice\b|\bpay\b|\binvoice\b/i);
    }
  });

  it('uses no em dashes, in any state', async () => {
    for (const status of STATES) {
      const sent = await mail({ status });
      expect(sent?.text).not.toContain('—');
      expect(sent?.subject).not.toContain('—');
    }
  });
});

describe('the states that stay silent', () => {
  it('says nothing when work simply starts', async () => {
    expect(await mail({ status: 'working' })).toBeUndefined();
  });

  it('speaks when work restarts on the customer’s notes', async () => {
    const sent = await mail({ status: 'working', afterChanges: true });
    expect(sent?.subject).toBe('We are on your notes');
  });
});

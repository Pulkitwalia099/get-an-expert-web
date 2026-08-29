import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Who hears about a customer acting on their order.
//
// Alerts used to go to one address. They go to a list now, because the people
// who need to see an order move are a team, and the failure mode of getting
// this wrong is silent: nothing errors, one person simply stops being told.

const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));

const { sendEmail, operatorRecipients } = await import('@/lib/email');

const OLD = { ...process.env };

beforeEach(() => {
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
  process.env.RESEND_API_KEY = 'test-key';
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...OLD };
});

/** The `to` array Resend was actually handed. */
function sentTo(): string[] {
  const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body);
  return body.to as string[];
}

describe('operatorRecipients', () => {
  it('splits a comma separated list so a second person is a variable, not a deploy', () => {
    process.env.BOOKING_NOTIFY_EMAIL = 'pulkit@midsesh.com, pulkitwalia099@gmail.com';
    expect(operatorRecipients('fallback@example.com')).toEqual([
      'pulkit@midsesh.com',
      'pulkitwalia099@gmail.com',
    ]);
  });

  it('still works for a single address, which is what was there before', () => {
    process.env.BOOKING_NOTIFY_EMAIL = 'one@example.com';
    expect(operatorRecipients('fallback@example.com')).toEqual(['one@example.com']);
  });

  it('falls back when the variable is unset or empty rather than sending nowhere', () => {
    delete process.env.BOOKING_NOTIFY_EMAIL;
    expect(operatorRecipients('fallback@example.com')).toEqual(['fallback@example.com']);
    process.env.BOOKING_NOTIFY_EMAIL = '  ,  ,';
    expect(operatorRecipients('fallback@example.com')).toEqual(['fallback@example.com']);
  });
});

describe('sendEmail with several recipients', () => {
  it('sends one mail to everyone rather than one mail each', async () => {
    const ok = await sendEmail({
      to: ['pulkit@midsesh.com', 'pulkitwalia099@gmail.com'],
      subject: 'Chose Team A',
      text: 'body',
    });
    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sentTo()).toEqual(['pulkit@midsesh.com', 'pulkitwalia099@gmail.com']);
  });

  it('drops one bad address instead of losing the alert for everyone', async () => {
    const ok = await sendEmail({
      to: ['pulkit@midsesh.com', 'not-an-address', 'pulkitwalia099@gmail.com'],
      subject: 's',
      text: 't',
    });
    expect(ok).toBe(true);
    expect(sentTo()).toEqual(['pulkit@midsesh.com', 'pulkitwalia099@gmail.com']);
  });

  it('deduplicates, so the same person listed twice gets one copy', async () => {
    await sendEmail({
      to: ['pulkit@midsesh.com', ' pulkit@midsesh.com '],
      subject: 's',
      text: 't',
    });
    expect(sentTo()).toEqual(['pulkit@midsesh.com']);
  });

  it('refuses to send when every address is junk', async () => {
    const ok = await sendEmail({ to: ['nope', ''], subject: 's', text: 't' });
    expect(ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('still accepts a single string, so customer mail is unchanged', async () => {
    await sendEmail({ to: 'someone@example.com', subject: 's', text: 't' });
    expect(sentTo()).toEqual(['someone@example.com']);
  });
});

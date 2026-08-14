import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isValidEmail, sendEmail } from '../email';

describe('isValidEmail', () => {
  it('accepts normal addresses', () => {
    expect(isValidEmail('sam@acme.co')).toBe(true);
    expect(isValidEmail('  first.last+tag@sub.domain.io ')).toBe(true);
  });

  it('rejects malformed addresses', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('sam')).toBe(false);
    expect(isValidEmail('sam@acme')).toBe(false);
    expect(isValidEmail('sam acme@x.co')).toBe(false);
    expect(isValidEmail('@acme.co')).toBe(false);
    expect(isValidEmail('a@b.c')).toBe(false);
  });

  it('rejects oversized addresses', () => {
    expect(isValidEmail(`${'a'.repeat(300)}@x.co`)).toBe(false);
  });

  it('rejects header injection attempts', () => {
    expect(isValidEmail('a@b.co\r\nBcc: everyone@evil.example')).toBe(false);
    expect(isValidEmail('a\n@b.co')).toBe(false);
  });
});

describe('sendEmail', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('skips quietly without an API key', async () => {
    // Explicit: a developer with RESEND_API_KEY exported in their shell would
    // otherwise take the real send path and fail this.
    vi.stubEnv('RESEND_API_KEY', '');
    expect(await sendEmail({ to: 'o@x.co', subject: 's', text: 't' })).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends through Resend with a flattened subject', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    const ok = await sendEmail({ to: 'o@x.co', subject: 'line1\r\nBcc: x', text: 'body' });
    expect(ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_test');
    const body = JSON.parse(init.body as string);
    expect(body.subject).toBe('line1 Bcc: x');
    expect(body.to).toEqual(['o@x.co']);
  });

  it('carries the configured reply address, trimmed', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('REPORT_REPLY_TO', '  someone@example.com  ');
    await sendEmail({ to: 'o@x.co', subject: 's', text: 't' });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    // A trailing space in a Vercel variable is invisible and Resend rejects
    // the whole send for it.
    expect(body.reply_to).toBe('someone@example.com');
  });

  it('always carries one, so no send goes out unanswerable', async () => {
    // The sending domain has no inbox. Mail with no reply address reaches the
    // customer and their answer reaches nobody, which is only discovered from
    // the customer's side.
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('REPORT_REPLY_TO', '');
    await sendEmail({ to: 'o@x.co', subject: 's', text: 't' });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.reply_to).toBe('pulkitwalia099@gmail.com');
  });

  it('refuses invalid recipients and survives API failures', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    expect(await sendEmail({ to: 'not-an-email', subject: 's', text: 't' })).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValue(new Response('nope', { status: 500 }));
    expect(await sendEmail({ to: 'o@x.co', subject: 's', text: 't' })).toBe(false);
    fetchMock.mockRejectedValue(new Error('net down'));
    expect(await sendEmail({ to: 'o@x.co', subject: 's', text: 't' })).toBe(false);
  });
});

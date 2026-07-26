import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { editRing, sendRing } from '../telegram';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv('TELEGRAM_BOT_TOKEN', 'bot-token');
  vi.stubEnv('TELEGRAM_CHAT_ID_ROHIT', '111');
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('sendRing', () => {
  it('returns the message id', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: { message_id: 42 } }), { status: 200 }),
    );
    expect(await sendRing('rohit', 'needs help', 'https://x.daily.co/a')).toBe(42);
  });

  it('sends to that operator chat id with a join button', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: { message_id: 42 } }), { status: 200 }),
    );
    await sendRing('rohit', 'needs help', 'https://x.daily.co/a');
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.chat_id).toBe('111');
    expect(body.text).toContain('needs help');
    expect(JSON.stringify(body.reply_markup)).toContain('https://x.daily.co/a');
  });

  it('returns null when that operator has no chat id configured', async () => {
    vi.stubEnv('TELEGRAM_CHAT_ID_ROHIT', '');
    expect(await sendRing('rohit', 'x', 'https://x.daily.co/a')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null when Telegram errors', async () => {
    fetchMock.mockResolvedValue(new Response('bad', { status: 500 }));
    expect(await sendRing('rohit', 'x', 'https://x.daily.co/a')).toBeNull();
  });
});

describe('editRing', () => {
  it('edits the message in place', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await editRing('rohit', 42, 'They left.');
    expect(String(fetchMock.mock.calls[0][0])).toContain('editMessageText');
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.message_id).toBe(42);
    expect(body.text).toBe('They left.');
  });

  it('does nothing without a token', async () => {
    vi.stubEnv('TELEGRAM_BOT_TOKEN', '');
    await editRing('rohit', 42, 'x');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

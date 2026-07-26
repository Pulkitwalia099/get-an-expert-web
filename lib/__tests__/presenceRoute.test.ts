import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The presence route resolves which card the chat shows when a visitor taps
// the pill. Supabase is not involved: readPresence is mocked so these tests
// are about the routing decision and the response shape, and withMetrics is
// mocked away so the real handler is the thing under test.

vi.mock('@/lib/presence', () => ({ readPresence: vi.fn() }));
vi.mock('@/lib/metrics', () => ({
  withMetrics: (_route: string, fn: unknown) => fn,
}));

import { readPresence } from '@/lib/presence';
import { POST } from '@/app/api/presence/route';
import type { NextRequest } from 'next/server';

// The in-memory limiter keeps its state between tests in this file, so each
// request gets its own client id.
let clientCount = 0;

function request(body: object): NextRequest {
  clientCount += 1;
  return {
    headers: new Headers({
      origin: 'https://midsesh.com',
      host: 'midsesh.com',
      'x-forwarded-for': `203.0.113.${clientCount}`,
    }),
    json: async () => body,
  } as unknown as NextRequest;
}

const BRIEF = {
  expert_type: 'Backend engineer',
  domain: 'fintech',
  specifics: 'stripe webhooks dropping events',
  engagement: 'fix',
  budget: '$500',
  timeline: 'now',
  search_query: 'stripe engineer',
};

beforeEach(() => {
  vi.stubEnv('TELEGRAM_CHAT_ID_ROHIT', '111222333');
  vi.stubEnv('TELEGRAM_CHAT_ID_PULKIT', '444555666');
  vi.mocked(readPresence).mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('POST /api/presence', () => {
  it('offers the matched person when they are on', async () => {
    vi.mocked(readPresence).mockResolvedValue({ pulkit: false, rohit: true });
    const res = await POST(request({ brief: BRIEF, lastMessage: 'stripe is broken' }));
    const data = await res.json();
    expect(data.online).toBe(true);
    expect(data.card.id).toBe('rohit');
    expect(data.card.tag).toBe('Payments & APIs');
  });

  it('offers the other person, with their own tag, when the match is off', async () => {
    vi.mocked(readPresence).mockResolvedValue({ pulkit: true, rohit: false });
    const res = await POST(request({ brief: BRIEF, lastMessage: 'stripe is broken' }));
    const data = await res.json();
    expect(data.online).toBe(true);
    expect(data.card.id).toBe('pulkit');
    expect(data.card.tag).toBe('GTM & automations');
  });

  it('still returns the matched card when nobody is on', async () => {
    vi.mocked(readPresence).mockResolvedValue({ pulkit: false, rohit: false });
    const res = await POST(request({ brief: BRIEF, lastMessage: 'stripe is broken' }));
    const data = await res.json();
    expect(data.online).toBe(false);
    expect(data.card.id).toBe('rohit');
  });

  it('works with no brief, matching on the message alone', async () => {
    vi.mocked(readPresence).mockResolvedValue({ pulkit: true, rohit: false });
    const res = await POST(request({ lastMessage: 'my n8n workflow keeps failing' }));
    const data = await res.json();
    expect(data.card.id).toBe('pulkit');
    expect(data.card.tag).toBe('Workflow automation');
  });

  it('returns a card even for an empty body', async () => {
    vi.mocked(readPresence).mockResolvedValue({ pulkit: false, rohit: false });
    const res = await POST(request({}));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.online).toBe(false);
    expect(data.card.id).toBe('rohit');
    expect(data.card.tag).toBe('Code & engineering');
  });
});

describe('what the presence route is allowed to say', () => {
  it('returns exactly the card fields the chat needs and nothing else', async () => {
    vi.mocked(readPresence).mockResolvedValue({ pulkit: false, rohit: true });
    const res = await POST(request({ brief: BRIEF, lastMessage: 'stripe' }));
    const data = await res.json();
    expect(Object.keys(data).sort()).toEqual(['card', 'online']);
    expect(Object.keys(data.card).sort()).toEqual([
      'companies',
      'fixes',
      'id',
      'linkedin',
      'location',
      'name',
      'photo',
      'rating',
      'role',
      'tag',
    ]);
  });

  it('never leaks the telegram env name, a chat id, or the cal link', async () => {
    vi.mocked(readPresence).mockResolvedValue({ pulkit: false, rohit: true });
    const res = await POST(request({ brief: BRIEF, lastMessage: 'stripe' }));
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain('TELEGRAM');
    expect(text).not.toContain('telegramEnv');
    expect(text).not.toContain('111222333');
    expect(text).not.toContain('444555666');
    expect(text).not.toContain('pulkit-walia-plcgb7');
    expect(text).not.toContain('calLink');
  });

  it('never says anything about the person who is off', async () => {
    vi.mocked(readPresence).mockResolvedValue({ pulkit: false, rohit: true });
    const res = await POST(request({ brief: BRIEF, lastMessage: 'stripe' }));
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain('Pulkit W.');
    expect(text).not.toContain('keywords');
    expect(text).not.toContain('fallbackTag');
  });

  it('has no em dash in anything it returns', async () => {
    vi.mocked(readPresence).mockResolvedValue({ pulkit: false, rohit: true });
    const res = await POST(request({ brief: BRIEF, lastMessage: 'stripe' }));
    expect(JSON.stringify(await res.json())).not.toContain('—');
  });
});

describe('presence route guards', () => {
  it('rejects a cross origin request', async () => {
    const req = {
      headers: new Headers({ origin: 'https://evil.com', host: 'midsesh.com' }),
      json: async () => ({}),
    } as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(readPresence).not.toHaveBeenCalled();
  });

  it('rejects a body that is not JSON', async () => {
    const req = {
      headers: new Headers({
        origin: 'https://midsesh.com',
        host: 'midsesh.com',
        'x-forwarded-for': '203.0.113.200',
      }),
      json: async () => {
        throw new SyntaxError('bad json');
      },
    } as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(readPresence).not.toHaveBeenCalled();
  });

  it('rate limits one client without blocking another', async () => {
    vi.mocked(readPresence).mockResolvedValue({ pulkit: false, rohit: true });
    const noisy = (): NextRequest =>
      ({
        headers: new Headers({
          origin: 'https://midsesh.com',
          host: 'midsesh.com',
          'x-forwarded-for': '198.51.100.7',
        }),
        json: async () => ({ lastMessage: 'stripe' }),
      }) as unknown as NextRequest;

    let limited = false;
    for (let i = 0; i < 40; i += 1) {
      if ((await POST(noisy())).status === 429) {
        limited = true;
        break;
      }
    }
    expect(limited).toBe(true);
    expect((await POST(request({ lastMessage: 'stripe' }))).status).toBe(200);
  });
});

describe('matching uses the whole conversation', () => {
  it('routes on words from the opening turn, not just the newest line', async () => {
    vi.mocked(readPresence).mockResolvedValue({ pulkit: true, rohit: true });
    // Exactly the real case: n8n named up front, last line has no keywords.
    const res = await POST(
      request({
        conversation:
          'I need to wire HubSpot into sheets with n8n and the field mapping keeps breaking \n' +
          'deals with custom properties mostly \n' +
          'one way into sheets for now, but it needs to run hourly without babysitting',
        lastMessage: 'one way into sheets for now, but it needs to run hourly without babysitting',
      }),
    );
    const data = await res.json();
    expect(data.card.id).toBe('pulkit');
    expect(data.card.tag).toBe('Workflow automation');
  });

  it('falls back to the last message when no conversation is sent', async () => {
    vi.mocked(readPresence).mockResolvedValue({ pulkit: true, rohit: true });
    const res = await POST(request({ lastMessage: 'my stripe webhook is dropping events' }));
    expect((await res.json()).card.id).toBe('rohit');
  });
});

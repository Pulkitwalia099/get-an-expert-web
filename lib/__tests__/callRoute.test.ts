import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/daily', () => ({ createAudioRoom: vi.fn() }));
vi.mock('@/lib/telegram', () => ({ sendRing: vi.fn(), editRing: vi.fn() }));
vi.mock('@/lib/presence', () => ({ readPresence: vi.fn() }));
vi.mock('@/lib/callStore', () => ({
  createCall: vi.fn(),
  readCall: vi.fn(),
  answerCall: vi.fn(),
  endCall: vi.fn(),
}));
vi.mock('@/lib/usage', () => ({
  bumpUsage: vi.fn(async () => 0),
  callsMonthlyCap: () => 300,
  monthKey: (scope: string) => `m:${scope}:2026-07`,
}));
vi.mock('@/lib/metrics', () => ({ withMetrics: (_r: string, fn: unknown) => fn }));

const SESSION = '3b241101-e2bb-4255-8caf-4136c566a962';
const ROOM = 'https://x.daily.co/abc';

function post(body: object): NextRequest {
  return {
    headers: new Headers({ origin: 'https://midsesh.com', host: 'midsesh.com' }),
    json: async () => body,
  } as unknown as NextRequest;
}

function get(id: string): NextRequest {
  return {
    headers: new Headers({ origin: 'https://midsesh.com', host: 'midsesh.com' }),
    nextUrl: new URL(`https://midsesh.com/api/call?id=${id}`),
  } as unknown as NextRequest;
}

// Two module level Maps decide whether a request is allowed: the route's own
// lastRing, and the hits map inside lib/ratelimit. Loading a fresh module
// registry per test empties both, so no test depends on what ran before it.
async function load() {
  vi.resetModules();
  const daily = await import('@/lib/daily');
  const telegram = await import('@/lib/telegram');
  const presence = await import('@/lib/presence');
  const store = await import('@/lib/callStore');
  const route = await import('@/app/api/call/route');

  vi.mocked(presence.readPresence).mockResolvedValue({ pulkit: false, rohit: true });
  vi.mocked(daily.createAudioRoom).mockResolvedValue(ROOM);
  vi.mocked(telegram.sendRing).mockResolvedValue(7);
  vi.mocked(telegram.editRing).mockResolvedValue(undefined);
  vi.mocked(store.createCall).mockResolvedValue(undefined);
  vi.mocked(store.answerCall).mockResolvedValue(true);
  vi.mocked(store.endCall).mockResolvedValue(undefined);
  vi.mocked(store.readCall).mockResolvedValue(null);

  return {
    POST: route.POST,
    GET: route.GET,
    RING_SECONDS: route.RING_SECONDS,
    createAudioRoom: vi.mocked(daily.createAudioRoom),
    sendRing: vi.mocked(telegram.sendRing),
    editRing: vi.mocked(telegram.editRing),
    readPresence: vi.mocked(presence.readPresence),
    createCall: vi.mocked(store.createCall),
    readCall: vi.mocked(store.readCall),
    answerCall: vi.mocked(store.answerCall),
    endCall: vi.mocked(store.endCall),
  };
}

type Loaded = Awaited<ReturnType<typeof load>>;

let app: Loaded;

beforeEach(async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  app = await load();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const RING = {
  action: 'ring',
  operatorId: 'rohit',
  sessionId: SESSION,
  lastMessage: 'stripe',
};

describe('ring', () => {
  it('rings for 60 seconds', () => {
    expect(app.RING_SECONDS).toBe(60);
  });

  it('creates a room and returns it', async () => {
    const res = await app.POST(post(RING));
    const data = await res.json();
    expect(data.roomUrl).toBe(ROOM);
    expect(data.callId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('pushes to Telegram with the summary', async () => {
    await app.POST(post(RING));
    expect(app.sendRing).toHaveBeenCalledWith('rohit', expect.stringContaining('stripe'), ROOM);
  });

  it('writes the ringing row before the push goes out', async () => {
    const res = await app.POST(post(RING));
    const data = await res.json();
    expect(app.createCall).toHaveBeenCalledWith(
      expect.objectContaining({ id: data.callId, operatorId: 'rohit', roomUrl: ROOM }),
    );
  });

  it('refuses when that operator is not on', async () => {
    app.readPresence.mockResolvedValue({ pulkit: false, rohit: false });
    const res = await app.POST(post(RING));
    expect(res.status).toBe(503);
    expect(app.createAudioRoom).not.toHaveBeenCalled();
  });

  it('rechecks presence on the server rather than trusting the client', async () => {
    // The client says the operator is live. The switch flipped off since the
    // tap, so the server refuses anyway.
    app.readPresence.mockResolvedValue({ pulkit: false, rohit: false });
    const res = await app.POST(post({ ...RING, online: true }));
    expect(app.readPresence).toHaveBeenCalled();
    expect(res.status).toBe(503);
    expect(app.sendRing).not.toHaveBeenCalled();
  });

  it('refuses when Daily cannot make a room', async () => {
    app.createAudioRoom.mockResolvedValue(null);
    const res = await app.POST(post(RING));
    expect(res.status).toBe(503);
    expect(app.sendRing).not.toHaveBeenCalled();
  });

  it('rejects an unknown operator id', async () => {
    const res = await app.POST(post({ ...RING, operatorId: 'mallory' }));
    expect(res.status).toBe(400);
    expect(app.createAudioRoom).not.toHaveBeenCalled();
  });

  it('rejects an unknown action', async () => {
    expect((await app.POST(post({ action: 'launch' }))).status).toBe(400);
  });

  it('rejects a cross origin request', async () => {
    const req = {
      headers: new Headers({ origin: 'https://evil.com', host: 'midsesh.com' }),
      json: async () => RING,
    } as unknown as NextRequest;
    expect((await app.POST(req)).status).toBe(403);
  });

  it('rejects a body that is not JSON', async () => {
    const req = {
      headers: new Headers({ origin: 'https://midsesh.com', host: 'midsesh.com' }),
      json: async () => {
        throw new Error('bad json');
      },
    } as unknown as NextRequest;
    expect((await app.POST(req)).status).toBe(400);
  });

  it('rate limits a session to one ring every five minutes', async () => {
    expect((await app.POST(post(RING))).status).toBe(200);
    expect((await app.POST(post(RING))).status).toBe(429);
  });

  it('lets a second ring through once the five minutes are up', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-07-25T12:00:00Z'));
      expect((await app.POST(post(RING))).status).toBe(200);
      vi.setSystemTime(new Date('2026-07-25T12:05:01Z'));
      expect((await app.POST(post(RING))).status).toBe(200);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not consume the window when the ring failed', async () => {
    app.createAudioRoom.mockResolvedValueOnce(null);
    expect((await app.POST(post(RING))).status).toBe(503);
    expect((await app.POST(post(RING))).status).toBe(200);
  });
});

describe('status', () => {
  it('reports the current status', async () => {
    app.readCall.mockResolvedValue({
      id: 'abc',
      status: 'answered',
      room_url: ROOM,
      operator_id: 'rohit',
      telegram_message_id: 7,
    });
    const res = await app.GET(get('abc'));
    expect(await res.json()).toMatchObject({ status: 'answered', roomUrl: ROOM });
  });

  it('404s an unknown call', async () => {
    app.readCall.mockResolvedValue(null);
    expect((await app.GET(get('nope'))).status).toBe(404);
  });
});

describe('end', () => {
  // The operator and the message id come from the stored row, never from
  // the request. A client-supplied message id would let anyone rewrite the
  // bot's Telegram history by guessing small integers.
  const ringingRow = {
    id: 'abc',
    status: 'ringing' as const,
    room_url: 'https://x.daily.co/abc',
    operator_id: 'rohit',
    telegram_message_id: 7,
  };

  it('edits the Telegram message when the call was missed', async () => {
    vi.mocked(app.readCall).mockResolvedValue(ringingRow);
    await app.POST(post({ action: 'end', callId: 'abc', missed: true }));
    expect(app.endCall).toHaveBeenCalledWith('abc', 'missed');
    expect(app.editRing).toHaveBeenCalledWith('rohit', 7, expect.stringContaining('booked'));
  });

  it('ignores an operator id and message id supplied by the caller', async () => {
    vi.mocked(app.readCall).mockResolvedValue(ringingRow);
    await app.POST(
      post({ action: 'end', callId: 'abc', missed: true, messageId: 99, operatorId: 'pulkit' }),
    );
    expect(app.editRing).toHaveBeenCalledWith('rohit', 7, expect.anything());
    expect(app.editRing).not.toHaveBeenCalledWith('pulkit', 99, expect.anything());
  });

  it('does not edit a call that was already answered', async () => {
    vi.mocked(app.readCall).mockResolvedValue({ ...ringingRow, status: 'answered' });
    await app.POST(post({ action: 'end', callId: 'abc', missed: true }));
    expect(app.editRing).not.toHaveBeenCalled();
  });

  it('does not edit a call that was already ended', async () => {
    vi.mocked(app.readCall).mockResolvedValue({ ...ringingRow, status: 'ended' });
    await app.POST(post({ action: 'end', callId: 'abc', missed: true }));
    expect(app.editRing).not.toHaveBeenCalled();
  });

  it('404s an end for a call that does not exist', async () => {
    vi.mocked(app.readCall).mockResolvedValue(null);
    const res = await app.POST(post({ action: 'end', callId: 'nope', missed: true }));
    expect(res.status).toBe(404);
    expect(app.editRing).not.toHaveBeenCalled();
  });

  it('does not edit anything on a normal hang up', async () => {
    vi.mocked(app.readCall).mockResolvedValue(ringingRow);
    await app.POST(post({ action: 'end', callId: 'abc' }));
    expect(app.endCall).toHaveBeenCalledWith('abc', 'ended');
    expect(app.editRing).not.toHaveBeenCalled();
  });

  it('does not edit when the missed call has no message id', async () => {
    vi.mocked(app.readCall).mockResolvedValue({ ...ringingRow, telegram_message_id: null });
    await app.POST(post({ action: 'end', callId: 'abc', missed: true }));
    expect(app.editRing).not.toHaveBeenCalled();
  });

  it('rejects an end without a call id', async () => {
    expect((await app.POST(post({ action: 'end' }))).status).toBe(400);
  });
});

describe('answer', () => {
  it('reports the first answer as taken', async () => {
    const res = await app.POST(post({ action: 'answer', callId: 'abc' }));
    expect(await res.json()).toEqual({ ok: true, alreadyAnswered: false });
  });

  it('reports a second answer as already taken', async () => {
    app.answerCall.mockResolvedValue(false);
    const res = await app.POST(post({ action: 'answer', callId: 'abc' }));
    expect(await res.json()).toEqual({ ok: true, alreadyAnswered: true });
  });

  it('rejects an answer without a call id', async () => {
    expect((await app.POST(post({ action: 'answer' }))).status).toBe(400);
  });
});

// The route mocks lib/callStore, so the compare and set itself is tested
// here against the real module and a stubbed fetch.
describe('answerCall compare and set', () => {
  const fetchMock = vi.fn();

  async function store() {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test');
    vi.stubGlobal('fetch', fetchMock);
    return vi.importActual<typeof import('@/lib/callStore')>('@/lib/callStore');
  }

  function rows(body: unknown[]): Response {
    return new Response(JSON.stringify(body), { status: 200 });
  }

  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('filters on the id and on status=eq.ringing, so the update is conditional', async () => {
    const { answerCall } = await store();
    fetchMock.mockResolvedValue(rows([{ id: 'abc' }]));
    expect(await answerCall('abc')).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('id=eq.abc');
    expect(String(url)).toContain('status=eq.ringing');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(String(init.body)).status).toBe('answered');
  });

  it('asks for the updated rows back, which is how the winner is known', async () => {
    const { answerCall } = await store();
    fetchMock.mockResolvedValue(rows([{ id: 'abc' }]));
    await answerCall('abc');
    expect(fetchMock.mock.calls[0][1].headers.Prefer).toContain('return=representation');
  });

  it('gives exactly one winner when two people answer at once', async () => {
    const { answerCall } = await store();
    // Postgres applies the status filter, so only the first PATCH matches a
    // row. The second comes back empty.
    fetchMock.mockResolvedValueOnce(rows([{ id: 'abc' }])).mockResolvedValueOnce(rows([]));
    const results = await Promise.all([answerCall('abc'), answerCall('abc')]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('is a loss when no row came back', async () => {
    const { answerCall } = await store();
    fetchMock.mockResolvedValue(rows([]));
    expect(await answerCall('abc')).toBe(false);
  });

  it('is a loss when Supabase errors', async () => {
    const { answerCall } = await store();
    fetchMock.mockResolvedValue(new Response('nope', { status: 500 }));
    expect(await answerCall('abc')).toBe(false);
  });

  it('is a loss when the request throws', async () => {
    const { answerCall } = await store();
    fetchMock.mockRejectedValue(new Error('network'));
    expect(await answerCall('abc')).toBe(false);
  });

  it('is a loss when Supabase is unconfigured, and sends nothing', async () => {
    const { answerCall } = await store();
    vi.stubEnv('SUPABASE_URL', '');
    expect(await answerCall('abc')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('monthly spend cap', () => {
  it('refuses to create a room once the cap is reached', async () => {
    const { bumpUsage } = await import('@/lib/usage');
    vi.mocked(bumpUsage).mockResolvedValueOnce(300);
    const res = await app.POST(
      post({ action: 'ring', operatorId: 'rohit', sessionId: SESSION, lastMessage: 'stripe' }),
    );
    expect(res.status).toBe(503);
    expect(app.createAudioRoom).not.toHaveBeenCalled();
  });

  it('allows a ring below the cap', async () => {
    const { bumpUsage } = await import('@/lib/usage');
    vi.mocked(bumpUsage).mockResolvedValueOnce(299);
    const res = await app.POST(
      post({ action: 'ring', operatorId: 'rohit', sessionId: SESSION, lastMessage: 'stripe' }),
    );
    expect(res.status).toBe(200);
  });

  it('does not count a ring when Daily failed to give a room', async () => {
    const { bumpUsage } = await import('@/lib/usage');
    vi.mocked(bumpUsage).mockClear().mockResolvedValue(0);
    vi.mocked(app.createAudioRoom).mockResolvedValueOnce(null);
    await app.POST(
      post({ action: 'ring', operatorId: 'rohit', sessionId: SESSION, lastMessage: 'stripe' }),
    );
    // Only the read (by = 0), never the increment.
    const increments = vi.mocked(bumpUsage).mock.calls.filter((c) => c[1] === undefined);
    expect(increments).toHaveLength(0);
  });
});

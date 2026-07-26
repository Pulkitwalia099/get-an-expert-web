import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/presence', () => ({ setPresence: vi.fn(), readPresence: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ selectRows: vi.fn() }));
vi.mock('@/lib/metrics', () => ({ withMetrics: (_r: string, fn: unknown) => fn }));

import { readPresence, setPresence } from '@/lib/presence';
import { selectRows } from '@/lib/supabase';
import { GET, POST } from '@/app/api/operator/route';
import { GET as RINGING } from '@/app/api/operator/ringing/route';
import type { NextRequest } from 'next/server';

function post(body: object): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

function get(path: string, secret: string | null): NextRequest {
  const url = new URL(`https://midsesh.com${path}`);
  if (secret !== null) url.searchParams.set('secret', secret);
  return { nextUrl: url } as unknown as NextRequest;
}

beforeEach(() => {
  vi.stubEnv('OPERATOR_SECRET', 'let-me-in');
  vi.mocked(readPresence).mockResolvedValue({ pulkit: false, rohit: true });
  vi.mocked(setPresence).mockResolvedValue(undefined);
  vi.mocked(selectRows).mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('POST /api/operator', () => {
  it('flips a switch with the right secret', async () => {
    const res = await POST(post({ secret: 'let-me-in', operatorId: 'pulkit', online: true }));
    expect(res.status).toBe(200);
    expect(setPresence).toHaveBeenCalledWith('pulkit', true);
  });

  it('switches someone off when online is false', async () => {
    await POST(post({ secret: 'let-me-in', operatorId: 'rohit', online: false }));
    expect(setPresence).toHaveBeenCalledWith('rohit', false);
  });

  it('returns the presence map so the page can render', async () => {
    const res = await POST(post({ secret: 'let-me-in', operatorId: 'pulkit', online: true }));
    expect(await res.json()).toMatchObject({ presence: { pulkit: false, rohit: true } });
  });

  it('401s a wrong secret and changes nothing', async () => {
    const res = await POST(post({ secret: 'nope', operatorId: 'pulkit', online: true }));
    expect(res.status).toBe(401);
    expect(setPresence).not.toHaveBeenCalled();
  });

  it('401s a secret that only starts with the right one', async () => {
    const res = await POST(
      post({ secret: 'let-me-in-please', operatorId: 'pulkit', online: true }),
    );
    expect(res.status).toBe(401);
    expect(setPresence).not.toHaveBeenCalled();
  });

  it('401s a non string secret, so true is not a password', async () => {
    const res = await POST(post({ secret: true, operatorId: 'pulkit', online: true }));
    expect(res.status).toBe(401);
    expect(setPresence).not.toHaveBeenCalled();
  });

  it('401s when the secret env var is empty, rather than allowing everyone', async () => {
    vi.stubEnv('OPERATOR_SECRET', '');
    const res = await POST(post({ secret: '', operatorId: 'pulkit', online: true }));
    expect(res.status).toBe(401);
    expect(setPresence).not.toHaveBeenCalled();
  });

  it('401s when the secret env var is unset entirely', async () => {
    vi.stubEnv('OPERATOR_SECRET', undefined);
    for (const secret of ['', 'anything', 'undefined']) {
      const res = await POST(post({ secret, operatorId: 'pulkit', online: true }));
      expect(res.status).toBe(401);
    }
    const missing = await POST(post({ operatorId: 'pulkit', online: true }));
    expect(missing.status).toBe(401);
    expect(setPresence).not.toHaveBeenCalled();
  });

  it('400s an unknown operator', async () => {
    const res = await POST(post({ secret: 'let-me-in', operatorId: 'mallory', online: true }));
    expect(res.status).toBe(400);
    expect(setPresence).not.toHaveBeenCalled();
  });

  it('400s a missing operator id', async () => {
    const res = await POST(post({ secret: 'let-me-in', online: true }));
    expect(res.status).toBe(400);
    expect(setPresence).not.toHaveBeenCalled();
  });

  it('400s a body that is not JSON', async () => {
    const req = {
      json: async () => {
        throw new SyntaxError('bad json');
      },
    } as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(setPresence).not.toHaveBeenCalled();
  });
});

describe('GET /api/operator', () => {
  it('returns the presence map with the right secret', async () => {
    const res = await GET(get('/api/operator', 'let-me-in'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ presence: { pulkit: false, rohit: true } });
  });

  it('401s a wrong secret and reads nothing', async () => {
    const res = await GET(get('/api/operator', 'nope'));
    expect(res.status).toBe(401);
    expect(readPresence).not.toHaveBeenCalled();
  });

  it('401s when the secret env var is unset entirely', async () => {
    vi.stubEnv('OPERATOR_SECRET', undefined);
    expect((await GET(get('/api/operator', ''))).status).toBe(401);
    expect((await GET(get('/api/operator', null))).status).toBe(401);
    expect((await GET(get('/api/operator', 'anything'))).status).toBe(401);
    expect(readPresence).not.toHaveBeenCalled();
  });
});

describe('GET /api/operator/ringing', () => {
  const ROW = {
    id: '3b241101-e2bb-4255-8caf-4136c566a962',
    room_url: 'https://x.daily.co/abc',
    created_at: '2026-07-25T12:00:00Z',
  };

  it('returns the newest ringing call', async () => {
    vi.mocked(selectRows).mockResolvedValue([ROW]);
    const res = await RINGING(get('/api/operator/ringing', 'let-me-in'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      call: { callId: ROW.id, roomUrl: ROW.room_url },
    });
  });

  it('asks only for ringing calls, newest first', async () => {
    await RINGING(get('/api/operator/ringing', 'let-me-in'));
    const [table, query] = vi.mocked(selectRows).mock.calls[0];
    expect(table).toBe('calls');
    expect(query).toContain('status=eq.ringing');
    expect(query).toContain('order=created_at.desc');
    expect(query).toContain('limit=1');
  });

  it('returns no call when nothing is ringing', async () => {
    vi.mocked(selectRows).mockResolvedValue([]);
    expect(await (await RINGING(get('/api/operator/ringing', 'let-me-in'))).json()).toEqual({
      call: null,
    });
  });

  it('returns no call when Supabase fails', async () => {
    vi.mocked(selectRows).mockResolvedValue(null);
    expect(await (await RINGING(get('/api/operator/ringing', 'let-me-in'))).json()).toEqual({
      call: null,
    });
  });

  it('returns no call when the row has no room url', async () => {
    vi.mocked(selectRows).mockResolvedValue([{ ...ROW, room_url: null }]);
    expect(await (await RINGING(get('/api/operator/ringing', 'let-me-in'))).json()).toEqual({
      call: null,
    });
  });

  it('401s a wrong secret and never queries for a join url', async () => {
    const res = await RINGING(get('/api/operator/ringing', 'nope'));
    expect(res.status).toBe(401);
    expect(selectRows).not.toHaveBeenCalled();
  });

  it('401s a missing secret', async () => {
    const res = await RINGING(get('/api/operator/ringing', null));
    expect(res.status).toBe(401);
    expect(selectRows).not.toHaveBeenCalled();
  });

  it('401s when the secret env var is unset entirely, so the join url stays private', async () => {
    vi.stubEnv('OPERATOR_SECRET', undefined);
    expect((await RINGING(get('/api/operator/ringing', ''))).status).toBe(401);
    expect((await RINGING(get('/api/operator/ringing', null))).status).toBe(401);
    expect((await RINGING(get('/api/operator/ringing', 'anything'))).status).toBe(401);
    expect(selectRows).not.toHaveBeenCalled();
  });

  it('401s when the secret env var is empty', async () => {
    vi.stubEnv('OPERATOR_SECRET', '');
    expect((await RINGING(get('/api/operator/ringing', ''))).status).toBe(401);
    expect(selectRows).not.toHaveBeenCalled();
  });
});

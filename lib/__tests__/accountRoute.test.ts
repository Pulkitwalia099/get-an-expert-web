import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

// The boundaries on the two routes that can end an account.
//
// Everything below is about what must be true BEFORE anything is written:
// where the request came from, whether there is a session, and whether the
// confirmation was actually typed. A delete that ran because a field was
// missing, or because another site posted a form, is not recoverable, so each
// of those is its own test rather than a branch inside one.

const currentAccount = vi.fn<(cookie: string | undefined) => Promise<unknown>>();
const eraseAccount = vi.fn(async () => ({ ok: true, steps: {} }));
const setAccountName = vi.fn(async () => true);
const bumpSessionVersion = vi.fn<(sub: string) => Promise<number | null>>(async () => 3);

vi.mock('@/lib/accounts', async () => {
  const { cleanDisplayName, MAX_NAME } = await import('@/lib/account-name');
  return { currentAccount, eraseAccount, setAccountName, bumpSessionVersion, cleanDisplayName, MAX_NAME };
});
vi.mock('@/lib/metrics', () => ({ withMetrics: (_route: string, fn: unknown) => fn }));

const { DELETE, PATCH } = await import('@/app/api/account/route');
const { POST } = await import('@/app/api/account/sessions/route');

const USER = { sub: 'sub-1', email: 'a@b.co', name: 'A', picture: null };

/**
 * A request the routes will accept, unless a test spoils one part of it.
 *
 * The rate limiter is per instance and shared across this file, so every
 * request carries its own client id. Without that, the delete tests would
 * start answering 429 partway down the file for reasons unrelated to the
 * thing being tested.
 */
function req(
  body: unknown,
  opts: { origin?: string | null; client?: string } = {},
): NextRequest {
  const headers = new Headers({ host: 'midsesh.com' });
  if (opts.origin !== null) headers.set('origin', opts.origin ?? 'https://midsesh.com');
  headers.set('x-forwarded-for', opts.client ?? Math.random().toString(36));
  return {
    headers,
    cookies: { get: () => ({ value: 'cookie' }) },
    json: async () => body,
  } as unknown as NextRequest;
}

beforeEach(() => {
  currentAccount.mockReset();
  currentAccount.mockResolvedValue(USER);
  eraseAccount.mockClear();
  eraseAccount.mockResolvedValue({ ok: true, steps: {} });
  setAccountName.mockClear();
  setAccountName.mockResolvedValue(true);
  bumpSessionVersion.mockClear();
  bumpSessionVersion.mockResolvedValue(3);
});

describe('PATCH /api/account', () => {
  it('stores the cleaned name and hands back what it stored', async () => {
    const res = await PATCH(req({ name: '  Pulkit   Walia ' }));
    expect(res.status).toBe(200);
    expect(setAccountName).toHaveBeenCalledWith('sub-1', 'Pulkit Walia');
    expect(await res.json()).toEqual({ ok: true, name: 'Pulkit Walia' });
  });

  it('clears the name when the field is emptied', async () => {
    await PATCH(req({ name: '   ' }));
    expect(setAccountName).toHaveBeenCalledWith('sub-1', null);
  });

  it('answers 401 without a session rather than patching a row for nobody', async () => {
    currentAccount.mockResolvedValue(null);
    const res = await PATCH(req({ name: 'Pulkit' }));
    expect(res.status).toBe(401);
    expect(setAccountName).not.toHaveBeenCalled();
  });

  it('answers 403 to another origin', async () => {
    const res = await PATCH(req({ name: 'Pulkit' }, { origin: 'https://evil.example' }));
    expect(res.status).toBe(403);
    expect(currentAccount).not.toHaveBeenCalled();
  });

  it('answers 400 to a body that will not parse', async () => {
    const bad = {
      headers: new Headers({ host: 'midsesh.com', origin: 'https://midsesh.com' }),
      cookies: { get: () => ({ value: 'cookie' }) },
      json: async () => {
        throw new Error('not json');
      },
    } as unknown as NextRequest;
    expect((await PATCH(bad)).status).toBe(400);
  });

  it('answers 502 rather than claiming a save that did not land', async () => {
    setAccountName.mockResolvedValue(false);
    expect((await PATCH(req({ name: 'Pulkit' }))).status).toBe(502);
  });
});

describe('DELETE /api/account', () => {
  it('erases and clears this browser on the exact confirmation', async () => {
    const res = await DELETE(req({ confirm: 'DELETE' }));
    expect(res.status).toBe(200);
    expect(eraseAccount).toHaveBeenCalledWith('sub-1', 'a@b.co');
    // Signed out on the way out. The account it belonged to no longer exists.
    expect(res.cookies.get('midsesh_session')?.value).toBe('');
  });

  it.each([undefined, '', 'delete', 'DELETE ', 'DELETE MY DATA', true])(
    'answers 400 and erases nothing for a confirm value of %p',
    async (confirm) => {
      const res = await DELETE(req({ confirm }));
      expect(res.status).toBe(400);
      expect(eraseAccount).not.toHaveBeenCalled();
    },
  );

  it('answers 403 to another origin before reading anything', async () => {
    const res = await DELETE(req({ confirm: 'DELETE' }, { origin: 'https://evil.example' }));
    expect(res.status).toBe(403);
    expect(currentAccount).not.toHaveBeenCalled();
    expect(eraseAccount).not.toHaveBeenCalled();
  });

  it('answers 401 without a session', async () => {
    currentAccount.mockResolvedValue(null);
    expect((await DELETE(req({ confirm: 'DELETE' }))).status).toBe(401);
    expect(eraseAccount).not.toHaveBeenCalled();
  });

  it('answers 502 and says nothing is confirmed deleted on a partial run', async () => {
    eraseAccount.mockResolvedValue({ ok: false, steps: { mk_orders: false } });
    const res = await DELETE(req({ confirm: 'DELETE' }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toContain('nothing is confirmed deleted');
  });

  it('stops answering after three attempts from one client', async () => {
    const client = 'one-and-the-same';
    for (let i = 0; i < 3; i += 1) await DELETE(req({ confirm: 'DELETE' }, { client }));
    expect((await DELETE(req({ confirm: 'DELETE' }, { client }))).status).toBe(429);
  });
});

describe('POST /api/account/sessions', () => {
  it('moves the version, then clears this browser', async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(200);
    expect(bumpSessionVersion).toHaveBeenCalledWith('sub-1');
    expect(res.cookies.get('midsesh_session')?.value).toBe('');
  });

  it('answers 502 when the bump did not land, and leaves this browser signed in', async () => {
    // A button that says "signed out everywhere" over a number that did not
    // move is the one outcome worth the extra branch.
    bumpSessionVersion.mockResolvedValue(null);
    const res = await POST(req({}));
    expect(res.status).toBe(502);
    expect(res.cookies.get('midsesh_session')).toBeUndefined();
  });

  it('answers 403 to another origin', async () => {
    expect((await POST(req({}, { origin: 'https://evil.example' }))).status).toBe(403);
    expect(bumpSessionVersion).not.toHaveBeenCalled();
  });

  it('answers 401 without a session', async () => {
    currentAccount.mockResolvedValue(null);
    expect((await POST(req({}))).status).toBe(401);
    expect(bumpSessionVersion).not.toHaveBeenCalled();
  });
});

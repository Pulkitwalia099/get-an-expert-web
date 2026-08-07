import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isAvailable, readPresence, setPresence } from '../presence';

const NOW = new Date('2026-07-25T12:00:00Z');
const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test');
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('isAvailable', () => {
  it('is true when online and the expiry is in the future', () => {
    const row = { id: 'pulkit' as const, online: true, expires_at: '2026-07-25T13:00:00Z' };
    expect(isAvailable(row, NOW)).toBe(true);
  });

  it('is false one second after the expiry', () => {
    const row = { id: 'pulkit' as const, online: true, expires_at: '2026-07-25T11:59:59Z' };
    expect(isAvailable(row, NOW)).toBe(false);
  });

  it('is false when online is false even with a future expiry', () => {
    const row = { id: 'pulkit' as const, online: false, expires_at: '2026-07-25T13:00:00Z' };
    expect(isAvailable(row, NOW)).toBe(false);
  });

  it('is false when the expiry is missing', () => {
    const row = { id: 'pulkit' as const, online: true, expires_at: null };
    expect(isAvailable(row, NOW)).toBe(false);
  });

  it('is false for a missing row', () => {
    expect(isAvailable(null, NOW)).toBe(false);
  });
});

describe('readPresence', () => {
  it('maps rows to availability', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([
          { id: 'pulkit', online: true, expires_at: '2999-01-01T00:00:00Z' },
          { id: 'rohit', online: false, expires_at: null },
        ]),
        { status: 200 },
      ),
    );
    expect(await readPresence()).toEqual({ pulkit: true, rohit: false });
  });

  it('returns everyone offline when Supabase fails', async () => {
    fetchMock.mockResolvedValue(new Response('nope', { status: 500 }));
    expect(await readPresence()).toEqual({ pulkit: false, rohit: false });
  });

  it('returns everyone offline when Supabase is unconfigured', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    expect(await readPresence()).toEqual({ pulkit: false, rohit: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('setPresence', () => {
  it('sends an expiry four hours out when switching on', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await setPresence('rohit', true);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.online).toBe(true);
    expect(body.expires_at).toBe('2026-07-25T16:00:00.000Z');
    vi.useRealTimers();
  });

  it('clears the expiry when switching off', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await setPresence('rohit', false);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body).toMatchObject({ online: false, expires_at: null });
  });
});

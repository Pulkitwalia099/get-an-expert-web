import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bumpUsage, dailyCap, dayKey, durableLimit, minuteKey, monthKey, serpMonthlyCap } from '../usage';

const AT = new Date(Date.UTC(2026, 6, 24, 2, 15));

describe('counter keys', () => {
  it('builds day, month and minute keys in UTC', () => {
    expect(dayKey('chat', AT)).toBe('d:chat:2026-07-24');
    expect(monthKey('serp', AT)).toBe('m:serp:2026-07');
    expect(minuteKey('search', '203.0.113.7', AT)).toBe('r:search:203.0.113.7:202607240215');
  });
});

describe('caps', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('has defaults per route', () => {
    expect(dailyCap('chat')).toBe(500);
    expect(dailyCap('search')).toBe(150);
    expect(dailyCap('intros')).toBe(200);
    expect(dailyCap('unknown')).toBe(500);
    expect(serpMonthlyCap()).toBe(250);
  });

  it('honours env overrides and ignores junk', () => {
    vi.stubEnv('DAILY_CAP_SEARCH', '42');
    vi.stubEnv('SERPAPI_MONTHLY_CAP', '100');
    expect(dailyCap('search')).toBe(42);
    expect(serpMonthlyCap()).toBe(100);
    vi.stubEnv('SERPAPI_MONTHLY_CAP', 'lots');
    expect(serpMonthlyCap()).toBe(250);
  });
});

describe('durableLimit', () => {
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

  function respondWith(counts: Record<string, number>) {
    fetchMock.mockImplementation((url: string, init: RequestInit) => {
      const { counter_key } = JSON.parse(init.body as string) as { counter_key: string };
      const prefix = counter_key.split(':')[0];
      return Promise.resolve(
        new Response(JSON.stringify(counts[prefix] ?? 0), { status: 200 }),
      );
    });
  }

  it('fails open when Supabase is unconfigured', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    expect(await durableLimit('chat', '1.2.3.4', 20)).toBe('ok');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails open when the rpc errors', async () => {
    fetchMock.mockRejectedValue(new Error('down'));
    expect(await durableLimit('chat', '1.2.3.4', 20)).toBe('ok');
  });

  it('passes under both caps', async () => {
    respondWith({ r: 3, d: 40 });
    expect(await durableLimit('chat', '1.2.3.4', 20)).toBe('ok');
  });

  it('blocks an IP over the per-minute limit', async () => {
    respondWith({ r: 21, d: 40 });
    expect(await durableLimit('chat', '1.2.3.4', 20)).toBe('ip');
  });

  it('blocks past the daily cap', async () => {
    respondWith({ r: 1, d: 501 });
    expect(await durableLimit('chat', '1.2.3.4', 20)).toBe('daily');
  });

  it('bumpUsage returns the count from the rpc', async () => {
    fetchMock.mockResolvedValue(new Response('7', { status: 200 }));
    expect(await bumpUsage('m:serp:2026-07', 3)).toBe(7);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://example.supabase.co/rest/v1/rpc/bump_usage');
    expect(JSON.parse(init.body as string)).toEqual({ counter_key: 'm:serp:2026-07', by: 3 });
  });
});

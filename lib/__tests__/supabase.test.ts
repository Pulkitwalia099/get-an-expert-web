import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  hasSupabase,
  recordLead,
  recordMessages,
  recordSearch,
  recordSession,
} from '../supabase';
import type { Brief } from '../types';

const SESSION = '3b241101-e2bb-4255-8caf-4136c566a962';

const BRIEF: Brief = {
  expert_type: 'Compliance expert',
  domain: 'fintech',
  specifics: 'BaFin licence',
  engagement: 'own it',
  budget: '€10k',
  timeline: 'March',
  search_query: 'BaFin compliance consultant',
};

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co/');
  vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test');
  fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 201 }));
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function lastCall(): { url: string; init: RequestInit } {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return { url: url as string, init: init as RequestInit };
}

describe('configuration', () => {
  it('is silently disabled without env keys', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SECRET_KEY', '');
    expect(hasSupabase()).toBe(false);
    await recordSession(SESSION, { userAgent: null, referrer: null });
    await recordMessages(SESSION, [{ role: 'user', content: 'hi', question_no: 0 }]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports enabled when both keys exist', () => {
    expect(hasSupabase()).toBe(true);
  });
});

describe('recordSession', () => {
  it('upserts by id with the secret key, trailing slash trimmed', async () => {
    await recordSession(SESSION, { userAgent: 'UA', referrer: 'https://ref.example' });
    const { url, init } = lastCall();
    expect(url).toBe('https://example.supabase.co/rest/v1/sessions?on_conflict=id');
    const headers = init.headers as Record<string, string>;
    expect(headers.apikey).toBe('sb_secret_test');
    expect(headers.Authorization).toBe('Bearer sb_secret_test');
    expect(headers.Prefer).toContain('resolution=merge-duplicates');
    const row = JSON.parse(init.body as string);
    expect(row.id).toBe(SESSION);
    expect(row.user_agent).toBe('UA');
    expect(row.last_seen).toBeTruthy();
    expect(row).not.toHaveProperty('first_seen');
    expect(row).not.toHaveProperty('completed');
  });

  it('marks completion only when asked', async () => {
    await recordSession(SESSION, { userAgent: null, referrer: null }, { completed: true });
    const row = JSON.parse(lastCall().init.body as string);
    expect(row.completed).toBe(true);
  });

  it('sends the flow column only for the dev funnel', async () => {
    await recordSession(SESSION, { userAgent: null, referrer: null }, { flow: 'main' });
    expect(JSON.parse(lastCall().init.body as string)).not.toHaveProperty('flow');
    await recordSession(SESSION, { userAgent: null, referrer: null }, { flow: 'dev' });
    expect(JSON.parse(lastCall().init.body as string).flow).toBe('dev');
  });

  it('sends the demo column only when the session ran in demo mode', async () => {
    await recordSession(SESSION, { userAgent: null, referrer: null }, { demo: false });
    expect(JSON.parse(lastCall().init.body as string)).not.toHaveProperty('demo');
    await recordSession(SESSION, { userAgent: null, referrer: null }, { demo: true });
    expect(JSON.parse(lastCall().init.body as string).demo).toBe(true);
  });
});

describe('recordMessages', () => {
  it('inserts turns linked to the session', async () => {
    await recordMessages(SESSION, [
      { role: 'user', content: 'Compliance expert', question_no: 0 },
      { role: 'assistant', content: 'Which regulator?', question_no: 1 },
    ]);
    const { url, init } = lastCall();
    expect(url).toBe('https://example.supabase.co/rest/v1/messages');
    const rows = JSON.parse(init.body as string);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ session_id: SESSION, role: 'user', question_no: 0 });
  });

  it('skips the request for an empty batch', async () => {
    await recordMessages(SESSION, []);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('recordSearch', () => {
  it('stores brief, query, counts and latency', async () => {
    await recordSearch(SESSION, {
      brief: BRIEF,
      query: 'BaFin compliance consultant',
      resultCount: 12,
      latencyMs: 830,
      demo: false,
    });
    const { url, init } = lastCall();
    expect(url).toBe('https://example.supabase.co/rest/v1/searches');
    const row = JSON.parse(init.body as string);
    expect(row).toMatchObject({
      session_id: SESSION,
      query: 'BaFin compliance consultant',
      result_count: 12,
      latency_ms: 830,
      demo: false,
    });
    expect(row.brief.expert_type).toBe('Compliance expert');
  });
});

describe('recordLead', () => {
  it('stores the lead with consent, even without a session', async () => {
    await recordLead(null, {
      email: 'a@b.co',
      name: 'Sam',
      kind: 'intros',
      selected: ['Amira Hassan'],
      need: null,
      brief: BRIEF,
      consent: true,
    });
    const { url, init } = lastCall();
    expect(url).toBe('https://example.supabase.co/rest/v1/leads');
    const row = JSON.parse(init.body as string);
    expect(row).toMatchObject({
      session_id: null,
      email: 'a@b.co',
      name: 'Sam',
      kind: 'intros',
      selected: ['Amira Hassan'],
      consent: true,
    });
  });
});

describe('fire and forget', () => {
  it('swallows network failures', async () => {
    fetchMock.mockRejectedValue(new Error('boom'));
    await expect(
      recordSession(SESSION, { userAgent: null, referrer: null }),
    ).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });

  it('swallows non-ok responses', async () => {
    fetchMock.mockResolvedValue(new Response('nope', { status: 500 }));
    await expect(
      recordSearch(SESSION, {
        brief: BRIEF,
        query: 'q',
        resultCount: 0,
        latencyMs: 1,
        demo: true,
      }),
    ).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});

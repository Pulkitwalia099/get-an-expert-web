import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  describeGithub,
  enrichWithGithub,
  parseGithubLogin,
  parseGithubRepos,
} from '../github';
import type { GithubProfile } from '../github';
import type { SerpResult } from '../serp';

// A link already in the results is the only handle this phase trusts. Searching
// GitHub by somebody's name would let us attach a stranger's repos to a real
// named person, which is the worst bug this product could ship.
describe('parseGithubLogin', () => {
  it.each([
    ['a profile url', 'https://github.com/mara-o', 'mara-o'],
    ['a repo url', 'https://github.com/mara-o/rag-pipeline', 'mara-o'],
    ['a deep url', 'https://github.com/mara-o/rag-pipeline/blob/main/README.md', 'mara-o'],
    ['a www host', 'https://www.github.com/mara-o', 'mara-o'],
    ['a gist', 'https://gist.github.com/mara-o/9f2b1c', 'mara-o'],
    ['a trailing slash', 'https://github.com/mara-o/', 'mara-o'],
    ['a query string', 'https://github.com/mara-o?tab=repositories', 'mara-o'],
  ])('reads the login from %s', (_label, link, login) => {
    expect(parseGithubLogin(link)).toBe(login);
  });

  it('lowercases, because GitHub logins are case insensitive', () => {
    expect(parseGithubLogin('https://github.com/Mara-O')).toBe('mara-o');
  });

  // Every one of these is a real page that a site:github.com query returns, and
  // every one of them would become a lookup for a user who does not exist.
  it.each([
    'https://github.com/orgs/vercel/people',
    'https://github.com/topics/rag',
    'https://github.com/search?q=rag',
    'https://github.com/features/copilot',
    'https://github.com/marketplace/actions/checkout',
    'https://github.com/sponsors/mara-o',
    'https://github.com/explore',
    'https://github.com/pricing',
    'https://github.com/settings/profile',
    'https://github.com/login',
    'https://github.com/enterprise',
    'https://github.com/trending/python',
    'https://github.com/collections/ai',
    'https://github.com/readme/stories',
  ])('refuses the reserved path %s', (link) => {
    expect(parseGithubLogin(link)).toBeNull();
  });

  it.each([
    ['another host', 'https://gitlab.com/mara-o'],
    ['a lookalike host', 'https://github.com.evil.io/mara-o'],
    ['plain http', 'http://github.com/mara-o'],
    ['the bare host', 'https://github.com'],
    ['the bare host with a slash', 'https://github.com/'],
    ['a login with illegal characters', 'https://github.com/mara.o'],
    ['a login over 39 characters', `https://github.com/${'a'.repeat(40)}`],
    ['nonsense', 'not a url'],
    ['an empty string', ''],
  ])('refuses %s', (_label, link) => {
    expect(parseGithubLogin(link)).toBeNull();
  });
});

function repo(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'rag-pipeline',
    owner: { login: 'mara-o', type: 'User' },
    fork: false,
    stargazers_count: 100,
    language: 'TypeScript',
    pushed_at: '2026-07-20T09:00:00Z',
    ...extra,
  };
}

describe('parseGithubRepos', () => {
  it('sums stars, ranks languages by repo count and takes the latest push', () => {
    const p = parseGithubRepos([
      repo({ stargazers_count: 300, language: 'Python', pushed_at: '2026-07-20T09:00:00Z' }),
      repo({ stargazers_count: 100, language: 'Python', pushed_at: '2026-05-01T09:00:00Z' }),
      repo({ stargazers_count: 12, language: 'TypeScript', pushed_at: '2026-06-01T09:00:00Z' }),
    ]);
    expect(p).not.toBeNull();
    expect(p?.stars).toBe(412);
    expect(p?.repos).toBe(3);
    expect(p?.languages).toEqual(['Python', 'TypeScript']);
    expect(p?.lastPush).toBe('2026-07-20T09:00:00Z');
  });

  it('takes the canonical login from the API rather than trusting the url', () => {
    expect(parseGithubRepos([repo({ owner: { login: 'Mara-O', type: 'User' } })])?.login).toBe(
      'mara-o',
    );
  });

  // A fork is somebody else's work sitting in their account. Counting its stars
  // would hand the ranking prompt a number that is not theirs, and the whole
  // point of this line is that the model may state it directly.
  it('ignores forks', () => {
    const p = parseGithubRepos([
      repo({ stargazers_count: 5 }),
      repo({ fork: true, stargazers_count: 40_000, language: 'Go' }),
    ]);
    expect(p?.stars).toBe(5);
    expect(p?.repos).toBe(1);
    expect(p?.languages).toEqual(['TypeScript']);
  });

  // The one that matters most. github.com/vercel is an organisation, and
  // crediting its repos to whoever the search result named is exactly the
  // failure the direct-URL rule exists to prevent.
  it('refuses an organisation', () => {
    expect(parseGithubRepos([repo({ owner: { login: 'vercel', type: 'Organization' } })])).toBeNull();
  });

  it('refuses an account with nothing of its own', () => {
    expect(parseGithubRepos([])).toBeNull();
    expect(parseGithubRepos([repo({ fork: true })])).toBeNull();
  });

  it('caps the languages it reports', () => {
    const p = parseGithubRepos(
      ['Go', 'Rust', 'Python', 'TypeScript', 'Ruby'].map((language) => repo({ language })),
    );
    expect(p?.languages).toHaveLength(3);
  });

  it('survives a payload that is not shaped like a response', () => {
    expect(parseGithubRepos(null)).toBeNull();
    expect(parseGithubRepos({ message: 'Not Found' })).toBeNull();
    expect(parseGithubRepos(['junk', null])).toBeNull();
  });

  it('tolerates a repo with no language or no push date', () => {
    const p = parseGithubRepos([repo({ language: null, pushed_at: null })]);
    expect(p?.languages).toEqual([]);
    expect(p?.lastPush).toBeNull();
  });
});

const NOW = Date.UTC(2026, 7, 4);

function profile(extra: Partial<GithubProfile> = {}): GithubProfile {
  return {
    login: 'mara-o',
    languages: ['Python', 'TypeScript'],
    stars: 412,
    repos: 6,
    lastPush: '2026-07-23T09:00:00Z',
    ...extra,
  };
}

describe('describeGithub', () => {
  it('states the figures the ranking prompt is allowed to quote', () => {
    expect(describeGithub(profile(), NOW)).toBe(
      '@mara-o: 6 recent public repos with 412 stars, mostly Python and TypeScript, pushed 12 days ago',
    );
  });

  // "recent" rather than a total, because only the most recently pushed page of
  // repos is read. A count presented as a total would be a number the model is
  // told it may state directly, and it would be wrong.
  it('never claims to know the total repo count', () => {
    expect(describeGithub(profile(), NOW)).toContain('recent public repos');
  });

  it.each([
    ['2026-08-04T00:00:00Z', 'pushed today'],
    ['2026-08-03T00:00:00Z', 'pushed 1 day ago'],
    ['2026-07-06T00:00:00Z', 'pushed 29 days ago'],
    ['2026-05-04T00:00:00Z', 'pushed 3 months ago'],
    ['2024-08-04T00:00:00Z', 'pushed 2 years ago'],
  ])('reads %s as %s', (lastPush, expected) => {
    expect(describeGithub(profile({ lastPush }), NOW)).toContain(expected);
  });

  it('says nothing about recency when there is no push date', () => {
    expect(describeGithub(profile({ lastPush: null }), NOW)).not.toContain('pushed');
  });

  it('says nothing about languages when there are none', () => {
    expect(describeGithub(profile({ languages: [] }), NOW)).not.toContain('mostly');
  });

  it('names three languages readably', () => {
    expect(describeGithub(profile({ languages: ['Go', 'Rust', 'C'] }), NOW)).toContain(
      'mostly Go, Rust and C',
    );
  });
});

function result(link: string, extra: Partial<SerpResult> = {}): SerpResult {
  return {
    title: 'Mara O',
    link,
    snippet: '',
    thumbnail: null,
    source: 'github.com',
    engine: 'serpapi',
    ...extra,
  };
}

function ok(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as Response;
}

describe('enrichWithGithub', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('GITHUB_TOKEN', 'ghp_test');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('attaches a profile to a github result and leaves the others alone', async () => {
    fetchMock.mockResolvedValue(ok([repo()]));
    const out = await enrichWithGithub([
      result('https://github.com/mara-o'),
      result('https://upwork.com/freelancers/~01', { source: 'upwork.com' }),
    ]);
    expect(out[0].github?.login).toBe('mara-o');
    expect(out[1].github).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns new objects rather than mutating the results it was given', async () => {
    fetchMock.mockResolvedValue(ok([repo()]));
    const input = [result('https://github.com/mara-o')];
    const out = await enrichWithGithub(input);
    expect(input[0].github).toBeUndefined();
    expect(out[0]).not.toBe(input[0]);
  });

  it('sends the token and asks for one page of the most recently pushed repos', async () => {
    fetchMock.mockResolvedValue(ok([repo()]));
    await enrichWithGithub([result('https://github.com/mara-o')]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('https://api.github.com/users/mara-o/repos');
    expect(url).toContain('sort=pushed');
    expect(url).toContain('type=owner');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer ghp_test');
  });

  // One round trip per candidate. Two results pointing at the same account is
  // the normal case for a site:github.com query, which returns a profile and
  // several of its repos.
  it('asks once for an account that appears more than once', async () => {
    fetchMock.mockResolvedValue(ok([repo()]));
    const out = await enrichWithGithub([
      result('https://github.com/mara-o'),
      result('https://github.com/mara-o/rag-pipeline'),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(out[0].github?.login).toBe('mara-o');
    expect(out[1].github?.login).toBe('mara-o');
  });

  // Enrichment is a bonus on top of a search that already works. Every failure
  // here has to land as "no badge" rather than as a 502 on the whole search.
  it('degrades to no enrichment when the lookup fails', async () => {
    fetchMock.mockRejectedValue(new Error('network'));
    const out = await enrichWithGithub([result('https://github.com/mara-o')]);
    expect(out[0].github).toBeUndefined();
  });

  it('degrades to no enrichment on a rate limit', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403, json: async () => ({}) } as Response);
    const out = await enrichWithGithub([result('https://github.com/mara-o')]);
    expect(out[0].github).toBeUndefined();
  });

  it('skips the lookup entirely when there is no token', async () => {
    vi.stubEnv('GITHUB_TOKEN', '');
    const input = [result('https://github.com/mara-o')];
    const out = await enrichWithGithub(input);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(out).toBe(input);
  });

  it('leaves an organisation unenriched', async () => {
    fetchMock.mockResolvedValue(ok([repo({ owner: { login: 'vercel', type: 'Organization' } })]));
    const out = await enrichWithGithub([result('https://github.com/vercel/next.js')]);
    expect(out[0].github).toBeUndefined();
  });

  it('bounds how many accounts one search can look up', async () => {
    fetchMock.mockResolvedValue(ok([repo()]));
    const many = Array.from({ length: 40 }, (_, i) => result(`https://github.com/user${i}`));
    await enrichWithGithub(many);
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(12);
  });
});

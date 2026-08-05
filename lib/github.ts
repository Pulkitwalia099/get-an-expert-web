import { githubToken } from '@/lib/env';
import type { SerpResult } from '@/lib/serp';

// The one signal on this site that can be checked rather than read.
//
// Everything else in a match card comes from a page somebody wrote about
// themselves. A GitHub account is different: the repos, the languages and the
// dates are facts an API returns, which is why this is the single documented
// exception to the ranking prompt's "never state a fact that is not in the
// search result" rule.
//
// That exception is only safe because of one hard constraint: a github.com
// link that was already in the search results is the only handle used here.
// Searching GitHub by a person's name is a guess, and attaching a stranger's
// repos to a real named person is the worst bug this product could ship. Name
// resolution waits for the enrichment phase, where there is time to corroborate
// a handle against the person's own site.
//
// The type import is type-only and therefore erased at compile time, so serp.ts
// referring back to this module creates no cycle.

export interface GithubProfile {
  /** Canonical, lowercased, taken from the API rather than from the url. */
  login: string;
  /** Most-used first, capped. Empty when no repo declares one. */
  languages: string[];
  /** Stars across the repos actually read. Forks excluded. */
  stars: number;
  /** How many repos were read. A window, never a total: see describeGithub. */
  repos: number;
  /** ISO timestamp of the most recent push, or null. */
  lastPush: string | null;
}

// Paths that look like a username and are not one. Every entry here is a real
// page a site:github.com query returns, and every one of them would otherwise
// become a lookup for an account that does not exist.
const RESERVED = new Set([
  'about',
  'apps',
  'blog',
  'collections',
  'contact',
  'customer-stories',
  'enterprise',
  'events',
  'explore',
  'features',
  'issues',
  'join',
  'login',
  'marketplace',
  'new',
  'nonprofit',
  'notifications',
  'orgs',
  'pricing',
  'pulls',
  'readme',
  'search',
  'security',
  'settings',
  'signup',
  'site',
  'sponsors',
  'team',
  'topics',
  'trending',
]);

// Exact hosts, never a suffix match. `github.com.evil.io` ends with the string
// "github.com" and is somebody else's domain entirely.
const HOSTS = new Set(['github.com', 'www.github.com', 'gist.github.com']);

// GitHub caps logins at 39 characters of letters, digits and hyphens.
const LOGIN = /^[a-z0-9][a-z0-9-]{0,38}$/i;

/** The account a result link belongs to, or null when it does not name one. */
export function parseGithubLogin(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !HOSTS.has(url.host.toLowerCase())) return null;

  const first = url.pathname.split('/').filter(Boolean)[0];
  if (!first || !LOGIN.test(first)) return null;

  const login = first.toLowerCase();
  return RESERVED.has(login) ? null : login;
}

// Three is enough to characterise somebody without turning the prompt line into
// a list of everything they have ever touched.
const MAX_LANGUAGES = 3;

interface Repo {
  owner: { login: string; type: string };
  fork: boolean;
  stars: number;
  language: string | null;
  pushedAt: string | null;
}

function coerceRepo(raw: unknown): Repo | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const owner = (typeof r.owner === 'object' && r.owner !== null ? r.owner : {}) as Record<
    string,
    unknown
  >;
  if (typeof owner.login !== 'string' || owner.type !== 'User') return null;
  if (r.fork === true) return null;
  return {
    owner: { login: owner.login, type: 'User' },
    fork: false,
    stars: typeof r.stargazers_count === 'number' ? r.stargazers_count : 0,
    language: typeof r.language === 'string' && r.language ? r.language : null,
    pushedAt: typeof r.pushed_at === 'string' ? r.pushed_at : null,
  };
}

/**
 * One repos response, reduced to the figures the ranker may quote.
 *
 * Returns null rather than an empty profile for the two cases that must not
 * earn a badge. An organisation is not a person, and crediting its work to
 * whoever the search result happened to name is the failure the direct-URL rule
 * exists to prevent. An account with nothing of its own is unmeasured, not
 * verified, and "Code verified" has to mean something.
 */
export function parseGithubRepos(json: unknown): GithubProfile | null {
  if (!Array.isArray(json)) return null;

  const repos = json.map(coerceRepo).filter((r): r is Repo => r !== null);
  if (repos.length === 0) return null;

  const counts = new Map<string, number>();
  let stars = 0;
  let lastPush: string | null = null;

  for (const r of repos) {
    stars += r.stars;
    if (r.language) counts.set(r.language, (counts.get(r.language) ?? 0) + 1);
    if (r.pushedAt && (lastPush === null || Date.parse(r.pushedAt) > Date.parse(lastPush))) {
      lastPush = r.pushedAt;
    }
  }

  return {
    login: repos[0].owner.login.toLowerCase(),
    languages: [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_LANGUAGES)
      .map(([name]) => name),
    stars,
    repos: repos.length,
    lastPush,
  };
}

const DAY_MS = 86_400_000;

function recency(lastPush: string, now: number): string | null {
  const at = Date.parse(lastPush);
  if (Number.isNaN(at)) return null;

  // Clamped, because a pushed_at in the future is clock skew rather than news.
  const days = Math.max(0, Math.round((now - at) / DAY_MS));
  if (days === 0) return 'pushed today';
  if (days === 1) return 'pushed 1 day ago';
  if (days < 30) return `pushed ${days} days ago`;
  if (days < 365) {
    const months = Math.max(1, Math.round(days / 30));
    return `pushed ${months} month${months === 1 ? '' : 's'} ago`;
  }
  const years = Math.floor(days / 365);
  return `pushed ${years} year${years === 1 ? '' : 's'} ago`;
}

function list(items: string[]): string {
  if (items.length < 2) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * One profile as a line the ranking prompt may quote directly.
 *
 * "recent public repos", never a total. Only the most recently pushed page is
 * read, so somebody with forty repos is seen as ten. Calling that ten their
 * repo count would hand the model a wrong number in the one place it has been
 * told the numbers are verified, which is worse than saying nothing.
 */
export function describeGithub(p: GithubProfile, now: number = Date.now()): string {
  const parts = [
    `${p.repos} recent public repo${p.repos === 1 ? '' : 's'} with ${p.stars} star${p.stars === 1 ? '' : 's'}`,
  ];
  if (p.languages.length > 0) parts.push(`mostly ${list(p.languages)}`);

  const when = p.lastPush ? recency(p.lastPush, now) : null;
  if (when) parts.push(when);

  return `@${p.login}: ${parts.join(', ')}`;
}

// Unauthenticated REST is 60 requests an hour per IP, which one busy afternoon
// would exhaust. A token buys 5,000.
const API = 'https://api.github.com';
const PER_PAGE = 10;
// Shorter than the 10s the search engines get. This sits between the search and
// the ranking call rather than beside it, so every millisecond here is added to
// a wall clock the chat has already promised is about twenty seconds.
const TIMEOUT_MS = 2_500;
// A pack with a site:github.com query returns at most twelve results from it,
// so this is a ceiling on a runaway rather than a limit anyone reaches.
const MAX_LOOKUPS = 12;

async function fetchProfile(login: string, token: string): Promise<GithubProfile | null> {
  const url = `${API}/users/${encodeURIComponent(login)}/repos?sort=pushed&direction=desc&per_page=${PER_PAGE}&type=owner`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  return parseGithubRepos(await res.json());
}

/**
 * Attach GitHub data to the results that link to an account.
 *
 * Every failure lands as "no badge", never as a failed search. This is a bonus
 * on top of a search that already works: no token, a rate limit, a timeout and
 * an account that turns out to be an organisation all return the results
 * unchanged, and the visitor sees exactly what they saw before this existed.
 */
export async function enrichWithGithub(results: SerpResult[]): Promise<SerpResult[]> {
  const token = githubToken();
  if (!token) return results;

  const logins: string[] = [];
  for (const r of results) {
    const login = parseGithubLogin(r.link);
    // Deduped, because a site:github.com query returns a profile page and
    // several of that person's repos, which is one account and one round trip.
    if (login && !logins.includes(login)) logins.push(login);
    if (logins.length === MAX_LOOKUPS) break;
  }
  if (logins.length === 0) return results;

  const settled = await Promise.allSettled(logins.map((l) => fetchProfile(l, token)));
  const found = new Map<string, GithubProfile>();
  settled.forEach((outcome, i) => {
    if (outcome.status !== 'fulfilled') {
      console.error(`[midsesh:github] lookup failed for ${logins[i]}`, outcome.reason);
      return;
    }
    if (outcome.value) found.set(logins[i], outcome.value);
  });

  return results.map((r) => {
    const login = parseGithubLogin(r.link);
    const profile = login ? found.get(login) : undefined;
    return profile ? { ...r, github: profile } : r;
  });
}

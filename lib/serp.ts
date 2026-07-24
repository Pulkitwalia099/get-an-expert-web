import { serpapiKey } from '@/lib/env';
import { scrubUntrusted } from '@/lib/sanitize';
import type { Brief } from '@/lib/types';

export interface SerpResult {
  title: string;
  link: string;
  snippet: string;
  thumbnail: string | null;
  source: string;
}

interface SerpQuery {
  q: string;
  source: string;
}

const MAX_PER_QUERY = 8;
const MAX_TOTAL = 20;
const MIN_BEFORE_FALLBACK = 5;
const QUERY_TIMEOUT_MS = 10_000;

// Short queries find people; long ones find articles. Prefer the
// model-authored marketplace phrase and never put brief.specifics in a query.
export function primaryKeywords(brief: Brief): string {
  const q = brief.search_query.trim();
  if (q) return q.slice(0, 80);
  return [brief.expert_type, brief.domain]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ')
    .slice(0, 80);
}

export function fallbackKeywords(brief: Brief): string {
  const short = brief.expert_type.trim().split(/\s+/).slice(0, 4).join(' ');
  return short || primaryKeywords(brief);
}

function queriesFor(kw: string): SerpQuery[] {
  return [
    { q: `site:upwork.com/freelancers ${kw}`, source: 'upwork.com' },
    { q: `site:fiverr.com ${kw}`, source: 'fiverr.com' },
    { q: `${kw} freelance consultant profile`, source: 'web' },
  ];
}

export function buildQueries(brief: Brief): SerpQuery[] {
  return queriesFor(primaryKeywords(brief));
}

export function parseSerpResults(json: unknown, source: string): SerpResult[] {
  const organic = (json as { organic_results?: unknown[] })?.organic_results;
  if (!Array.isArray(organic)) return [];
  return organic
    .slice(0, MAX_PER_QUERY)
    .map((raw) => {
      const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
      return {
        title: typeof r.title === 'string' ? scrubUntrusted(r.title) : '',
        link: typeof r.link === 'string' && r.link.startsWith('https://') ? r.link : '',
        snippet: typeof r.snippet === 'string' ? scrubUntrusted(r.snippet) : '',
        thumbnail:
          typeof r.thumbnail === 'string' &&
          (r.thumbnail.startsWith('https://') || r.thumbnail.startsWith('data:image/'))
            ? r.thumbnail
            : null,
        source,
      };
    })
    .filter((r) => r.title.length > 0 && r.link.length > 0);
}

async function runQueries(queries: SerpQuery[], key: string): Promise<SerpResult[]> {
  const settled = await Promise.allSettled(
    queries.map(async ({ q, source }) => {
      const url = `https://serpapi.com/search.json?engine=google&num=10&q=${encodeURIComponent(q)}&api_key=${key}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(QUERY_TIMEOUT_MS) });
      if (!res.ok) throw new Error(`SerpAPI ${res.status}`);
      return parseSerpResults(await res.json(), source);
    }),
  );
  const results: SerpResult[] = [];
  for (const outcome of settled) {
    if (outcome.status !== 'fulfilled') {
      console.error('[midsesh:serp] query failed', outcome.reason);
      continue;
    }
    results.push(...outcome.value);
  }
  return results;
}

function dedupe(results: SerpResult[]): SerpResult[] {
  const seen = new Set<string>();
  const unique: SerpResult[] = [];
  for (const r of results) {
    if (seen.has(r.link)) continue;
    seen.add(r.link);
    unique.push(r);
  }
  return unique;
}

export interface ProfileSearch {
  results: SerpResult[];
  // SerpAPI queries actually issued, for the monthly quota counter.
  queriesRun: number;
}

export async function searchProfiles(brief: Brief): Promise<ProfileSearch> {
  const key = serpapiKey();
  if (!key) return { results: [], queriesRun: 0 };

  const primaryQueries = buildQueries(brief);
  const primary = dedupe(await runQueries(primaryQueries, key));
  if (primary.length >= MIN_BEFORE_FALLBACK) {
    return { results: primary.slice(0, MAX_TOTAL), queriesRun: primaryQueries.length };
  }

  console.log(
    `[midsesh:serp] thin primary results (${primary.length}), broadening to "${fallbackKeywords(brief)}"`,
  );
  const fallbackQueries = queriesFor(fallbackKeywords(brief));
  const broader = await runQueries(fallbackQueries, key);
  return {
    results: dedupe([...primary, ...broader]).slice(0, MAX_TOTAL),
    queriesRun: primaryQueries.length + fallbackQueries.length,
  };
}

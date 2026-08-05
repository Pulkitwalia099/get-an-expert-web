import { serpapiKey } from '@/lib/env';
import { scrubUntrusted } from '@/lib/sanitize';
import { classifyPack, packQueries } from '@/lib/sourcePacks';
import type { SourceQuery } from '@/lib/sourcePacks';
import type { Brief } from '@/lib/types';

export interface SerpResult {
  title: string;
  link: string;
  snippet: string;
  thumbnail: string | null;
  source: string;
  /** Which engine produced this. Only 'serpapi' today; Exa lands next. */
  engine: string;
}

type SerpQuery = SourceQuery;

// Ranking eight people needs a bigger pool than ranking three did. None of
// these numbers costs another SerpAPI call: a search is billed per query, not
// per result, so asking one query for twenty results and parsing twelve of
// them is free where a fourth query would have been a third more spend.
const RESULTS_PER_QUERY = 20;
const MAX_PER_QUERY = 12;
const MAX_TOTAL = 32;
// Raised with the target. Twelve raw results were plenty to pick three from
// and are thin for eight, so the broadening pass now triggers where it used to
// sit out. That second pass is the only place this feature spends more.
const MIN_BEFORE_FALLBACK = 12;
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

export function buildQueries(brief: Brief): SerpQuery[] {
  return packQueries(classifyPack(brief), primaryKeywords(brief));
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
        engine: 'serpapi',
      };
    })
    .filter((r) => r.title.length > 0 && r.link.length > 0);
}

async function runQueries(queries: SerpQuery[], key: string): Promise<SerpResult[]> {
  const settled = await Promise.allSettled(
    queries.map(async ({ q, source }) => {
      const url = `https://serpapi.com/search.json?engine=google&num=${RESULTS_PER_QUERY}&q=${encodeURIComponent(q)}&api_key=${key}`;
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

  const pack = classifyPack(brief);
  const primaryQueries = packQueries(pack, primaryKeywords(brief));
  const primary = dedupe(await runQueries(primaryQueries, key));
  if (primary.length >= MIN_BEFORE_FALLBACK) {
    return { results: primary.slice(0, MAX_TOTAL), queriesRun: primaryQueries.length };
  }

  // Broaden by widening the sources, not just the words. A thin video search
  // means Behance and Vimeo had nothing, and asking them again with a shorter
  // phrase mostly asks the same question twice. The generic pack is a
  // different set of hosts for the same cost in queries, so the second pass
  // drops to it. For a brief with no pack this is exactly today's behaviour.
  console.log(
    `[midsesh:serp] thin primary results (${primary.length}) for pack ${pack ?? 'generic'}, broadening to "${fallbackKeywords(brief)}"`,
  );
  const fallbackQueries = packQueries(null, fallbackKeywords(brief));
  const broader = await runQueries(fallbackQueries, key);
  return {
    results: dedupe([...primary, ...broader]).slice(0, MAX_TOTAL),
    queriesRun: primaryQueries.length + fallbackQueries.length,
  };
}

import { exaKey, serpapiKey } from '@/lib/env';
import { searchExa } from '@/lib/exa';
import { scrubUntrusted } from '@/lib/sanitize';
import { normalizeLink } from '@/lib/experts';
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

/**
 * Collapse the same person found more than once into a single row.
 *
 * More than one engine runs per search, so a good profile is often returned
 * twice. Keeping the first and discarding the second would quietly decide two
 * things it has no business deciding: which engine gets the credit, and which
 * copy of the text the ranker reads.
 *
 * So neither is decided by list order. An overlap is recorded as 'both',
 * because a URL two engines found is evidence about neither of them and
 * crediting whichever happened to be concatenated first would bias the exact
 * comparison the `engine` column exists to run. The longer snippet wins, which
 * in practice means Exa's page text beats a Google snippet rather than losing
 * to it on a coin flip.
 *
 * Matched on the normalised link, so a trailing slash or a capitalised host
 * does not read as two different people. That is the same bug finalizeExperts
 * was already fixed for.
 */
export function mergeResults(results: SerpResult[]): SerpResult[] {
  const byKey = new Map<string, SerpResult>();
  const order: string[] = [];

  for (const r of results) {
    const key = normalizeLink(r.link);
    const seen = byKey.get(key);
    if (!seen) {
      byKey.set(key, r);
      order.push(key);
      continue;
    }
    byKey.set(key, {
      ...seen,
      engine: seen.engine === r.engine ? seen.engine : 'both',
      snippet: r.snippet.length > seen.snippet.length ? r.snippet : seen.snippet,
      thumbnail: seen.thumbnail ?? r.thumbnail,
    });
  }

  return order.map((k) => byKey.get(k) as SerpResult);
}

export interface ProfileSearch {
  results: SerpResult[];
  // SerpAPI queries actually issued, for the monthly quota counter.
  queriesRun: number;
}

/**
 * Both engines, one wall clock.
 *
 * They do not depend on each other, so running them in sequence would pay
 * twice for the same seconds. Either key alone is enough to serve a search:
 * with only SerpAPI this is exactly today's behaviour, and with only Exa the
 * search still works, which is what makes the second engine safe to add to
 * production before anyone has decided whether to keep it.
 */
async function runBothEngines(queries: SerpQuery[]): Promise<SerpResult[]> {
  const serp = serpapiKey();
  const exa = exaKey();
  const [fromSerp, fromExa] = await Promise.all([
    serp ? runQueries(queries, serp) : Promise.resolve<SerpResult[]>([]),
    exa ? searchExa(queries, exa) : Promise.resolve<SerpResult[]>([]),
  ]);
  return mergeResults([...fromSerp, ...fromExa]);
}

export async function searchProfiles(brief: Brief): Promise<ProfileSearch> {
  const key = serpapiKey();
  if (!key && !exaKey()) return { results: [], queriesRun: 0 };

  const pack = classifyPack(brief);
  const primaryQueries = packQueries(pack, primaryKeywords(brief));
  // Only SerpAPI queries count. `queriesRun` feeds the SerpAPI monthly cap in
  // lib/usage.ts, and Exa has its own budget on its own dashboard: folding the
  // two together would trip a quota nobody is actually near.
  const serpQueriesRun = key ? primaryQueries.length : 0;
  const primary = await runBothEngines(primaryQueries);
  if (primary.length >= MIN_BEFORE_FALLBACK) {
    return { results: primary.slice(0, MAX_TOTAL), queriesRun: serpQueriesRun };
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
  const broader = await runBothEngines(fallbackQueries);
  return {
    results: mergeResults([...primary, ...broader]).slice(0, MAX_TOTAL),
    queriesRun: serpQueriesRun + (key ? fallbackQueries.length : 0),
  };
}

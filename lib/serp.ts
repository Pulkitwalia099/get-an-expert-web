import { exaKey, serpapiKey } from '@/lib/env';
import { searchExa, semanticQuery } from '@/lib/exa';
import type { GithubProfile } from '@/lib/github';
import { scrubUntrusted } from '@/lib/sanitize';
import { normalizeLink } from '@/lib/experts';
import { classifyPack, packQueries } from '@/lib/sourcePacks';
import type { PackKey, SourceQuery } from '@/lib/sourcePacks';
import type { Brief } from '@/lib/types';

export interface SerpResult {
  title: string;
  link: string;
  snippet: string;
  thumbnail: string | null;
  source: string;
  /** Which engine found this: 'serpapi', 'exa', or 'both'. */
  engine: string;
  /**
   * Checked GitHub data for the account this result links to.
   *
   * Absent on almost every result, and absent rather than null on purpose: it
   * is added by `enrichWithGithub` after retrieval, so neither parser sets it
   * and nothing downstream may assume it was attempted.
   */
  github?: GithubProfile;
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

/**
 * Every query one search runs: the pack's hosts and the generic hosts.
 *
 * The pack used to replace the generic hosts, and measured on production that
 * meant one host produced the entire set. A video brief came back 7 of 7 from
 * behance.net with vimeo and the open web contributing nothing; a generic brief
 * came back 8 of 8 from fiverr.com with upwork contributing nothing. So a pack
 * was never three sources. It was whichever single host survived ranking, and
 * that host silently decided the whole answer.
 *
 * Running both and letting the ranker choose from the union fixes that without
 * having to be right about which host is best for a given brief, which is the
 * judgement that was wrong in the first place.
 *
 * Deduped by the query string, because the web pack and the generic pack ask
 * upwork.com/freelancers the same question. Issuing it twice is one SerpAPI
 * query paid for twice for one answer.
 */
export function buildQueries(brief: Brief): SerpQuery[] {
  const kw = primaryKeywords(brief);
  const pack = classifyPack(brief);
  const packed = packQueries(pack, kw);
  // No pack means generic already is the search, so there is nothing to add.
  if (pack === null) return packed;

  const seen = new Set(packed.map((q) => q.q));
  return [...packed, ...packQueries(null, kw).filter((q) => !seen.has(q.q))];
}

/**
 * Share the ranker's slots between hosts instead of first come first served.
 *
 * Running the pack beside generic is only half the fix. Behance returning
 * thirty results and Fiverr returning five would still hand Behance every slot
 * under the old `slice`, which reproduces the bug through the back door: the
 * cap, not the retrieval, would decide who the ranker ever sees.
 *
 * Round robin across sources, keeping each host's own order, so a host with
 * more results gets more slots only once every other host has been served.
 */
export function balanceBySource(results: SerpResult[], cap: number): SerpResult[] {
  const bySource = new Map<string, SerpResult[]>();
  for (const r of results) {
    const queue = bySource.get(r.source);
    if (queue) queue.push(r);
    else bySource.set(r.source, [r]);
  }

  const queues = [...bySource.values()];
  const out: SerpResult[] = [];
  for (let round = 0; out.length < cap; round += 1) {
    let took = false;
    for (const queue of queues) {
      if (round >= queue.length) continue;
      out.push(queue[round]);
      took = true;
      if (out.length === cap) return out;
    }
    if (!took) break;
  }
  return out;
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
async function runBothEngines(queries: SerpQuery[], semantic = ''): Promise<SerpResult[]> {
  const serp = serpapiKey();
  const exa = exaKey();
  // Two engines, two question shapes, one set of hosts. SerpAPI keeps the four
  // keyword phrase because a Google query longer than that finds articles.
  // Exa gets the brief as a sentence, because matching on meaning is the only
  // reason it is here and keywords waste it.
  const [fromSerp, fromExa] = await Promise.all([
    serp ? runQueries(queries, serp) : Promise.resolve<SerpResult[]>([]),
    exa ? searchExa(queries, exa, semantic) : Promise.resolve<SerpResult[]>([]),
  ]);
  return mergeResults([...fromSerp, ...fromExa]);
}

export async function searchProfiles(brief: Brief): Promise<ProfileSearch> {
  const key = serpapiKey();
  if (!key && !exaKey()) return { results: [], queriesRun: 0 };

  const pack = classifyPack(brief);
  const primaryQueries = buildQueries(brief);
  // Only SerpAPI queries count. `queriesRun` feeds the SerpAPI monthly cap in
  // lib/usage.ts, and Exa has its own budget on its own dashboard: folding the
  // two together would trip a quota nobody is actually near.
  const serpQueriesRun = key ? primaryQueries.length : 0;
  const primary = await runBothEngines(primaryQueries, semanticQuery(brief));
  logSources(pack, primary);
  if (primary.length >= MIN_BEFORE_FALLBACK) {
    return { results: balanceBySource(primary, MAX_TOTAL), queriesRun: serpQueriesRun };
  }

  // Still thin after both the pack and the generic hosts, so the words are the
  // problem rather than the places. This pass keeps the generic hosts and
  // shortens the phrase, which is the only lever left.
  console.log(
    `[midsesh:serp] thin primary results (${primary.length}) for pack ${pack ?? 'generic'}, broadening to "${fallbackKeywords(brief)}"`,
  );
  const fallbackQueries = packQueries(null, fallbackKeywords(brief));
  const broader = await runBothEngines(fallbackQueries, semanticQuery(brief));
  return {
    results: balanceBySource(mergeResults([...primary, ...broader]), MAX_TOTAL),
    queriesRun: serpQueriesRun + (key ? fallbackQueries.length : 0),
  };
}

/**
 * What each host actually contributed, before ranking sees any of it.
 *
 * Without this the only way to answer "why is every result from Behance" was to
 * run the same search against production twice and diff the sources, which is
 * how the bug was found in the first place. It also separates the two failures
 * that look identical from outside: a host that returned nothing, and a host
 * that returned plenty and then lost every one of them at ranking.
 */
function logSources(pack: PackKey | null, results: SerpResult[]): void {
  if (results.length === 0) return;
  const counts = new Map<string, number>();
  const engines = new Map<string, number>();
  for (const r of results) {
    counts.set(r.source, (counts.get(r.source) ?? 0) + 1);
    engines.set(r.engine, (engines.get(r.engine) ?? 0) + 1);
  }
  const tally = (m: Map<string, number>) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `${k}=${n}`)
      .join(' ');
  // Engines as well as hosts. Exa now gets a different question from SerpAPI,
  // and "did the semantic query survive the domain filter" is not answerable
  // from the response a browser sees, because `engine` is deliberately absent
  // from it. This line is the only place that comparison can be settled.
  console.log(
    `[midsesh:serp] pack ${pack ?? 'generic'} raw ${results.length}: ${tally(counts)} | engines ${tally(engines)}`,
  );
}

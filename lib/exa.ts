import { scrubUntrusted } from '@/lib/sanitize';
import type { SerpResult } from '@/lib/serp';
import type { SourceQuery } from '@/lib/sourcePacks';

// A second retrieval engine, running beside SerpAPI rather than instead of it.
//
// Exa is a neural index: it matches on what a query means rather than which
// words a page contains, which is the difference between finding somebody who
// has shipped RAG in production and finding a page containing "RAG" and
// "production". Whether that is actually better on these briefs is not yet
// known, which is why both engines run and every result carries an `engine`
// tag back to match_profiles for the comparison to be settled with data.
//
// The type import is type-only and therefore erased at compile time, so
// serp.ts importing this module at runtime creates no cycle.

/**
 * How much page text is allowed through per result.
 *
 * Exa returns whole crawled pages, where a SerpAPI result carries about 160
 * characters. That is the upgrade, and it is also the hazard: thirty uncapped
 * pages would be larger than the entire ranking prompt and would push the
 * brief itself out of the model's attention. 800 characters is roughly five
 * times what a Google snippet gives and still leaves the prompt readable.
 */
export const EXA_TEXT_CHARS = 800;

export interface ExaRequest {
  query: string;
  numResults: number;
  contents: { text: { maxCharacters: number } };
  includeDomains?: string[];
}

const RESULTS_PER_QUERY = 20;

// `site:host` or `site:host/path`, only at the very start of the query, which
// is where every pack template puts it.
const SITE_PREFIX = /^site:([a-z0-9.-]+)(?:\/\S*)?\s*/i;

/**
 * Translate a pack query written for Google into an Exa request.
 *
 * The packs speak Google because SerpAPI is a Google wrapper, and Exa has no
 * `site:` operator. Passed through untouched it would treat "site:github.com"
 * as words to find meaning in and return pages *about* GitHub rather than
 * pages *on* it. That failure returns plausible results rather than an error,
 * so it would never surface as a bug: it would just quietly make the ai, video
 * and marketing packs worse on one engine and better on the other, and poison
 * the comparison those packs exist to run.
 */
export function exaRequest(q: string): ExaRequest {
  const match = q.match(SITE_PREFIX);
  const stripped = match ? q.slice(match[0].length).trim() : q.trim();

  // A pack template with nothing but a site: prefix would leave an empty
  // query, which Exa rejects. Falling back to the host keeps the call valid
  // and still means roughly the right thing.
  const query = stripped || match?.[1] || q;

  return {
    query,
    numResults: RESULTS_PER_QUERY,
    contents: { text: { maxCharacters: EXA_TEXT_CHARS } },
    ...(match ? { includeDomains: [match[1]] } : {}),
  };
}

/**
 * Turn one Exa response into the shape the ranker already reads.
 *
 * Mirrors `parseSerpResults` deliberately, including the https-only link rule
 * and the scrub, so a result from either engine is indistinguishable to
 * everything downstream except the `engine` field.
 *
 * The scrub matters more here than it does on the SerpAPI path. A Google
 * snippet is one line chosen by Google; an Exa result is a page chosen and
 * written by the person being ranked, which is a far larger surface for
 * instruction-like text aimed at the model reading it. Capping the length and
 * stripping control characters is what bounds that, alongside the security
 * paragraph already in the ranking prompt.
 */
export function parseExaResults(json: unknown, source: string): SerpResult[] {
  const results = (json as { results?: unknown })?.results;
  if (!Array.isArray(results)) return [];

  return results
    .map((raw) => {
      const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
      return {
        title: typeof r.title === 'string' ? scrubUntrusted(r.title) : '',
        // Exa calls it `url`; everything downstream calls it `link`.
        link: typeof r.url === 'string' && r.url.startsWith('https://') ? r.url : '',
        // Scrub before slicing. Scrubbing can shorten the string, so slicing
        // first would let the cap drift above EXA_TEXT_CHARS.
        snippet:
          typeof r.text === 'string' ? scrubUntrusted(r.text).slice(0, EXA_TEXT_CHARS) : '',
        thumbnail: typeof r.image === 'string' && r.image.startsWith('https://') ? r.image : null,
        source,
        engine: 'exa',
      };
    })
    .filter((r) => r.title.length > 0 && r.link.length > 0);
}

const QUERY_TIMEOUT_MS = 10_000;

/**
 * Run one pack's queries against Exa.
 *
 * `Promise.allSettled` rather than `Promise.all`, matching `runQueries` in
 * serp.ts: one engine having a bad minute must degrade the result set, never
 * fail the search. A rejected query is logged and skipped, so a visitor whose
 * Exa call times out still gets the SerpAPI half rather than an error card.
 */
export async function searchExa(queries: SourceQuery[], key: string): Promise<SerpResult[]> {
  const settled = await Promise.allSettled(
    queries.map(async ({ q, source }) => {
      const res = await fetch('https://api.exa.ai/search', {
        method: 'POST',
        headers: { 'x-api-key': key, 'content-type': 'application/json' },
        body: JSON.stringify(exaRequest(q)),
        signal: AbortSignal.timeout(QUERY_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`Exa ${res.status}`);
      return parseExaResults(await res.json(), source);
    }),
  );

  const results: SerpResult[] = [];
  for (const outcome of settled) {
    if (outcome.status !== 'fulfilled') {
      console.error('[midsesh:exa] query failed', outcome.reason);
      continue;
    }
    results.push(...outcome.value);
  }
  return results;
}

import { scrubUntrusted } from '@/lib/sanitize';
import type { SerpResult } from '@/lib/serp';
import type { SourceQuery } from '@/lib/sourcePacks';
import type { Brief } from '@/lib/types';

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

/**
 * How much of the brief is allowed to become the query.
 *
 * Long enough to carry the constraints that actually decide who can do a job,
 * short enough that one rambling brief cannot turn the request into a wall of
 * text with no centre of gravity.
 */
export const EXA_QUERY_CHARS = 400;

export interface ExaRequest {
  query: string;
  numResults: number;
  contents: { text: { maxCharacters: number } };
  includeDomains?: string[];
}

/**
 * The brief as a sentence, for the engine that reads sentences.
 *
 * SerpAPI is a Google wrapper and wants four keywords, because a long query
 * there finds articles rather than people. Exa is the opposite: it matches on
 * what a description means, which is the entire reason it was added, and it was
 * being handed the same four keywords.
 *
 * Traced on a real production brief, that cost almost everything the visitor
 * said. The chat captured 463 characters across seven fields and retrieval used
 * 26 of them, so Zendesk, customer PII, self hosted, AWS and Postgres never
 * reached an engine, and those were the constraints that decided who could
 * actually do the job.
 *
 * Budget and timeline are deliberately left out. Neither describes the person,
 * and a number in a semantic query drags the match toward pricing pages.
 */
export function semanticQuery(brief: Brief): string {
  const parts = [
    brief.expert_type.trim() ? `Freelance ${brief.expert_type.trim()} available for hire.` : '',
    brief.specifics.trim(),
    brief.domain.trim() ? `Industry: ${brief.domain.trim()}.` : '',
  ].filter(Boolean);

  // Nothing rich to say, so this is a keyword brief after all and the phrase
  // SerpAPI uses is the honest query rather than an empty one.
  if (parts.length === 0) return brief.search_query.trim().slice(0, EXA_QUERY_CHARS);

  // Scrub before slicing, exactly as parseExaResults does. Scrubbing shortens
  // the string, so slicing first would let the cap drift.
  return scrubUntrusted(parts.join(' ')).slice(0, EXA_QUERY_CHARS);
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
export function exaRequest(q: string, semantic = ''): ExaRequest {
  const match = q.match(SITE_PREFIX);
  const stripped = match ? q.slice(match[0].length).trim() : q.trim();

  // A pack template with nothing but a site: prefix would leave an empty
  // query, which Exa rejects. Falling back to the host keeps the call valid
  // and still means roughly the right thing.
  const keywords = stripped || match?.[1] || q;

  // The pack still decides the host. Only the question changes: the `site:`
  // prefix becomes the domain filter as before, and the words after it are
  // replaced by the brief in full where there is a brief to use.
  return {
    query: semantic.trim() || keywords,
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
export async function searchExa(
  queries: SourceQuery[],
  key: string,
  semantic = '',
): Promise<SerpResult[]> {
  const settled = await Promise.allSettled(
    queries.map(async ({ q, source }) => {
      const res = await fetch('https://api.exa.ai/search', {
        method: 'POST',
        headers: { 'x-api-key': key, 'content-type': 'application/json' },
        body: JSON.stringify(exaRequest(q, semantic)),
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

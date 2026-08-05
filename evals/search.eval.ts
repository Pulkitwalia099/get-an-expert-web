import { describe, expect, test } from 'vitest';
import { askClaude } from '@/lib/anthropic';
import type { Brief, Expert } from '@/lib/types';

// The gate the search never had.
//
// The chat has been eval-gated since it shipped, because an LLM feature fails
// in ways unit tests cannot see. Retrieval has exactly the same property and
// had nothing, and it shows: every retrieval bug so far was found by a person
// looking at bad output and reporting it.
//
//   a UGC search returning seven Behance portfolios and no UGC creators
//   one host quietly producing every person in a set, twice
//   an ai brief tying with web on broad words and falling through to generic
//   a named stack, "Bedrock", scoring nothing at all
//
// None of those were plumbing. Every one was about what the engines actually
// returned, which is why this runs against the deployed site rather than
// against mocks:
//
//   EVAL_TARGET=https://midsesh.com npm run eval
//
// Costs real SerpAPI quota. Each probe issues 4 to 6 queries against a monthly
// cap that defaults to 250, so a full run is roughly 30 and there is room for
// about eight runs a month at the default. Raise SERPAPI_MONTHLY_CAP before
// leaning on this in CI. No sessionId is sent, so nothing is written to
// Supabase.

const target = process.env.EVAL_TARGET?.replace(/\/+$/, '');

if (!target) {
  console.warn('[evals] EVAL_TARGET not set, search evals skipped.');
}

interface Probe {
  /** What a visitor wants, in their words. */
  label: string;
  brief: Brief;
  /** Things a person doing this job would plausibly have on their profile. */
  expect: string;
}

function brief(over: Partial<Brief>): Brief {
  return {
    expert_type: '',
    domain: '',
    specifics: '',
    engagement: '',
    budget: '',
    timeline: '',
    search_query: '',
    ...over,
  };
}

// One probe per pack that has ever been wrong, plus the two that carry the
// most traffic. Deliberately small: every entry costs real quota.
const PROBES: Probe[] = [
  {
    label: 'ugc',
    brief: brief({
      expert_type: 'UGC content creator',
      specifics: 'short vertical product videos for paid social ads',
      search_query: 'UGC video creator',
    }),
    expect: 'making user generated content style videos for brands, on camera or with products',
  },
  {
    label: 'video',
    brief: brief({
      expert_type: 'video editor for YouTube',
      specifics: 'long form YouTube edits, two videos a week',
      search_query: 'YouTube video editor',
    }),
    expect: 'editing video, cutting long form YouTube content',
  },
  {
    label: 'ai',
    brief: brief({
      expert_type: 'AI agent engineer',
      specifics:
        'self hosted LLM agent that reads Zendesk tickets and drafts replies, customer PII must stay in our own AWS account, we use Claude via Bedrock',
      search_query: 'AI agent developer Bedrock',
    }),
    expect: 'building LLM agents or AI integrations, ideally with a named stack',
  },
  {
    label: 'design',
    brief: brief({
      expert_type: 'brand identity designer',
      specifics: 'full visual identity and logo for a drinks brand',
      search_query: 'brand identity designer',
    }),
    expect: 'designing logos, brand identities or visual systems',
  },
  {
    label: 'web',
    brief: brief({
      expert_type: 'full stack developer',
      specifics: 'Next.js app with Stripe billing and Postgres',
      search_query: 'Next.js Stripe developer',
    }),
    expect: 'building web applications, front end or back end',
  },
  {
    label: 'professional',
    brief: brief({
      expert_type: 'fractional CFO',
      specifics: 'monthly close, board reporting and a financial model for a SaaS',
      search_query: 'fractional CFO',
    }),
    expect: 'finance leadership, accounting, bookkeeping or financial modelling',
  },
];

interface SearchResponse {
  setId: string | null;
  locked: boolean;
  experts: Expert[];
}

async function search(p: Probe): Promise<SearchResponse> {
  const res = await fetch(`${target}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: target as string },
    body: JSON.stringify({ brief: p.brief }),
  });
  expect(res.status, `POST ${target}/api/search (${p.label})`).toBe(200);
  return (await res.json()) as SearchResponse;
}

const JUDGE_SYSTEM = `You grade whether a set of search results found the right kind of professional.

You get a hiring brief, a description of what the right person would look like, and the text shown to the customer for each person found. Judge only whether these people plausibly do this kind of work. Do not judge how good they are, how they are priced, or how well the text is written.

Be strict about the trade and lenient about everything else. A video editor found for a UGC brief is wrong even though both involve video. A logo designer found for a brand identity brief is right.

Return matched as the number of people who plausibly do this work, and verdict "pass" only when most of them do.`;

const JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    matched: { type: 'integer' },
    verdict: { type: 'string', enum: ['pass', 'fail'] },
    reason: { type: 'string' },
  },
  required: ['matched', 'verdict', 'reason'],
  additionalProperties: false,
};

interface JudgeVerdict {
  matched: number;
  verdict: 'pass' | 'fail';
  reason: string;
}

// A locked card withholds the name, so the judge grades the two text blocks
// and the marketplace, which is exactly what a signed out visitor decides on.
async function judge(p: Probe, experts: Expert[]): Promise<JudgeVerdict> {
  const people = experts
    .map((e, i) => `${i + 1}. [${e.source}] ${e.why}\n   ${e.projected}`)
    .join('\n\n');
  return askClaude<JudgeVerdict>({
    system: JUDGE_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Brief:\n${JSON.stringify(p.brief, null, 2)}\n\nThe right person would be: ${p.expect}\n\nPeople found:\n${people}`,
      },
    ],
    schema: JUDGE_SCHEMA,
    maxTokens: 700,
    model: 'claude-sonnet-5',
  });
}

const MIN_PEOPLE = 3;
const MIN_HOSTS = 2;

// The structural half needs no model and therefore no key. That matters more
// than it looks: production stores its Anthropic key as a Vercel "sensitive"
// variable, which cannot be read back by `vercel env pull`, so a machine with
// no key of its own can still run the checks that caught the host domination
// bug. Only the trade-match judge is skipped.
const canJudge = Boolean(process.env.ANTHROPIC_API_KEY ?? process.env.Anthropic_chat);

describe.skipIf(!target)('search finds the right people, from more than one place', () => {
  for (const p of PROBES) {
    test(
      `${p.label}: returns a usable set from more than one host, and they do the job`,
      { timeout: 240_000 },
      async () => {
        const data = await search(p);
        const hosts = new Set(data.experts.map((e) => e.source));

        // A thin set is a failed search dressed up as a modest one.
        expect(data.experts.length, `${p.label}: people found`).toBeGreaterThanOrEqual(MIN_PEOPLE);

        // The bug that shipped twice. A pack used to replace the generic hosts
        // rather than run beside them, and the result was one host quietly
        // producing every person: 7 of 7 Behance, then 8 of 8 Fiverr. Nothing
        // in the response looks wrong when that happens, which is why it needs
        // asserting rather than eyeballing.
        expect(
          hosts.size,
          `${p.label}: only ${[...hosts].join(', ')} contributed`,
        ).toBeGreaterThanOrEqual(MIN_HOSTS);

        if (!canJudge) {
          console.warn(`[evals] ${p.label}: no Anthropic key, trade match not judged.`);
          return;
        }
        const v = await judge(p, data.experts);
        expect(
          v.verdict,
          `${p.label}: ${v.reason} (${v.matched}/${data.experts.length} matched)`,
        ).toBe('pass');
      },
    );
  }
});

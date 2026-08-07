import { FALLBACK, PACKS, TEMPLATES } from '@/lib/packs';
import type { Pack, PackKey } from '@/lib/packs';
import type { Brief } from '@/lib/types';

export type { PackKey } from '@/lib/packs';

/**
 * Which kind of work a brief is, and therefore where to look for the person.
 *
 * Scored keyword matching rather than a model call, and deliberately the same
 * shape as `matchOperator` in lib/operators.ts: every keyword votes, the
 * highest total takes it, and nothing scoring means no pack. A second LLM round
 * trip to answer "is this a video brief" would cost latency inside the one
 * budget that is already tight, to decide something the words usually settle.
 *
 * Classification reads `expert_type` and `search_query` only. `brief.domain`
 * is the customer's own industry, not the work, so a fintech company hiring an
 * editor has 'fintech' sitting in `domain` and must still route to video.
 * `specifics` is excluded for the same reason it never reaches a query: it is
 * a paragraph of context that drags in words from the whole conversation.
 *
 * The packs themselves live in lib/packs.ts. This file is the scoring.
 */

const STRONG = 2;
const WEAK = 1;

// Word boundaries on both sides, so 'ai' does not fire inside 'email' and
// 'make' does not fire on 'makefile'. Keywords may contain spaces and dots,
// which is why this is a regex rather than a split on whitespace.
function hasKeyword(haystack: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(haystack);
}

function scorePack(pack: Pack, text: string): number {
  const strong = pack.keywords.reduce((t, k) => (hasKeyword(text, k) ? t + STRONG : t), 0);
  const weak = (pack.weak ?? []).reduce((t, k) => (hasKeyword(text, k) ? t + WEAK : t), 0);
  return strong + weak;
}

export interface SourceQuery {
  q: string;
  source: string;
}

// Matches the cap in primaryKeywords. Repeated here rather than imported
// because serp.ts imports this module, and a cycle to share one number is a
// worse trade than one duplicated constant with a comment saying so.
const MAX_KEYWORDS = 80;

/**
 * The queries one pack contributes.
 *
 * Takes the already-trimmed keyword string rather than the brief, so the one
 * rule that matters here is enforced by the signature: a pack cannot reach
 * `brief.specifics` and paste a paragraph of conversation behind a `site:`
 * operator. Short queries find people, long ones find articles.
 */
export function packQueries(pack: PackKey | null, keywords: string): SourceQuery[] {
  const kw = keywords.trim().slice(0, MAX_KEYWORDS);
  const templates = pack === null ? FALLBACK : TEMPLATES[pack];
  return templates.map((t) => ({ q: t.build(kw), source: t.source }));
}

export function classifyPack(brief: Brief): PackKey | null {
  const text = `${brief.expert_type} ${brief.search_query}`.toLowerCase();
  let winner: { key: PackKey; score: number } | null = null;
  let tied = false;

  for (const pack of PACKS) {
    const score = scorePack(pack, text);
    if (score === 0) continue;
    if (winner === null || score > winner.score) {
      winner = { key: pack.key, score };
      tied = false;
    } else if (score === winner.score) {
      tied = true;
    }
  }

  // A tie is not a decision, and it used to be resolved by list order without
  // saying so. Falling through to generic is the honest answer: it means
  // nothing here was decisive, and generic runs on every search now anyway, so
  // a tie costs the extra hosts rather than sending the search somewhere wrong.
  if (tied) return null;
  return winner?.key ?? null;
}

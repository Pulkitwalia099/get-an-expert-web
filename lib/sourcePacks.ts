import type { CategoryKey } from '@/components/flows';
import type { Brief } from '@/lib/types';

/**
 * Which of the site's categories a brief belongs to.
 *
 * Scored keyword matching rather than a model call, and deliberately the same
 * shape as `matchOperator` in lib/operators.ts: every keyword votes, the
 * highest total takes it, and nothing scoring means null. A second LLM round
 * trip to answer "is this a video brief" would cost latency inside the one
 * budget that is already tight, to decide something the words usually settle.
 *
 * Classification reads `expert_type` and `search_query` only. `brief.domain`
 * is the customer's own industry, not the work, so a fintech company hiring an
 * editor has 'fintech' sitting in `domain` and must still route to video.
 * `specifics` is excluded for the same reason it never reaches a query: it is
 * a paragraph of context that drags in words from the whole conversation.
 */
// No longer tied to CategoryKey. A pack answers "where do we look", which is
// not the same question as "what does the site sell": 'ugc' is not a category
// on the homepage and is very much its own place to search, while Security and
// Data are categories with no pack yet. Keeping the two in one union forced
// them to move together, which is how UGC ended up filed under Video.
export type PackKey = 'marketing' | 'ai' | 'ugc' | 'video' | 'web';

interface Pack {
  key: PackKey;
  /** Terms that name this work and little else. Worth two points. */
  keywords: string[];
  /**
   * Terms that point here but are common enough to appear anywhere. One point.
   *
   * This split exists because of a real failed search. "UGC AI content creator"
   * scored 1 for ugc and 1 for ai, tied, and the tie went to whichever pack was
   * listed first. A search for somebody who films product videos was one word
   * away from running against github.com. One broad word must not cancel one
   * precise one.
   */
  weak?: string[];
}

const STRONG = 2;
const WEAK = 1;

const PACKS: Pack[] = [
  {
    key: 'marketing',
    keywords: [
      'gtm',
      'go to market',
      'growth',
      'demand gen',
      'demand generation',
      'outbound',
      'cold email',
      'seo',
      'paid ads',
      'performance marketing',
      'lifecycle',
      'copywriting',
      'copywriter',
      'content marketing',
      'positioning',
      'brand strategy',
      'crm',
      'hubspot',
    ],
    weak: ['growth', 'lifecycle', 'outbound'],
  },
  {
    key: 'ai',
    keywords: [
      'llm',
      'n8n',
      'zapier',
      'make.com',
      'rag',
      'prompt',
      'openai',
      'claude',
      'chatbot',
      'mlops',
      'fine-tune',
      'fine tune',
      'machine learning',
    ],
    // 'ai' is the word half the internet uses about itself now. On its own it
    // says the visitor works in this decade, not that the job is AI
    // engineering, so it must not outweigh a term that names an actual trade.
    weak: ['ai', 'agent', 'automation', 'automate', 'workflow'],
  },
  {
    // Somebody who films themselves holding a product for paid social. Not a
    // post-production job, which is why sharing a pack with Video sent a real
    // search to behance.net and returned seven AI video artists and no UGC.
    key: 'ugc',
    keywords: [
      'ugc',
      'user generated content',
      'user-generated content',
      'testimonial video',
      'spokesperson',
      'influencer',
      'product demo video',
      'unboxing',
    ],
    weak: ['creator', 'testimonial'],
  },
  {
    key: 'video',
    keywords: [
      'youtube',
      'shorts',
      'reel',
      'reels',
      'tiktok',
      'motion graphics',
      'motion design',
      'after effects',
      'premiere',
      'davinci',
      'color grade',
      'color grading',
      'podcast',
      'vfx',
    ],
    weak: ['video', 'editor', 'editing', 'animation'],
  },
  {
    key: 'web',
    keywords: [
      'webhook',
      'stripe',
      'backend',
      'frontend',
      'full stack',
      'fullstack',
      'devops',
      'postgres',
      'supabase',
      'react',
      'next.js',
      'mobile app',
    ],
    weak: ['api', 'apis', 'integration', 'integrations', 'cloud', 'deployment', 'database', 'website'],
  },
];

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

interface Template {
  /** Built from the keyword string only. Never from brief.specifics. */
  build: (kw: string) => string;
  source: string;
}

// Matches the cap in primaryKeywords. Repeated here rather than imported
// because serp.ts imports this module, and a cycle to share one number is a
// worse trade than one duplicated constant with a comment saying so.
const MAX_KEYWORDS = 80;

// Today's queries, unchanged. Every category without a pack still gets exactly
// what it gets now, which is what makes this safe to ship before the other
// four packs exist.
const FALLBACK: Template[] = [
  { build: (kw) => `site:upwork.com/freelancers ${kw}`, source: 'upwork.com' },
  { build: (kw) => `site:fiverr.com ${kw}`, source: 'fiverr.com' },
  { build: (kw) => `${kw} freelance consultant profile`, source: 'web' },
];

const TEMPLATES: Record<PackKey, Template[]> = {
  // GTM people are found by what they published, not by a gig listing. None
  // of the three marketplaces carry the ones worth hiring.
  marketing: [
    { build: (kw) => `site:linkedin.com/in ${kw} freelance consultant`, source: 'linkedin.com' },
    { build: (kw) => `site:substack.com ${kw}`, source: 'substack.com' },
    { build: (kw) => `${kw} freelance consultant case study`, source: 'web' },
  ],
  // The one category where the claim can be checked against the work, which
  // is why github leads and the marketplace is not here at all.
  ai: [
    { build: (kw) => `site:github.com ${kw}`, source: 'github.com' },
    { build: (kw) => `site:huggingface.co ${kw}`, source: 'huggingface.co' },
    { build: (kw) => `${kw} freelance engineer portfolio`, source: 'web' },
  ],
  // Measured, not guessed. On the search that went wrong, the generic pack
  // returned eight real UGC creators from Fiverr ("British male UGC video ads
  // for TikTok", "on camera spokesperson and UGC ad delivery") while the video
  // pack returned seven Behance portfolios and no UGC at all. So this is built
  // on the two marketplaces that worked, plus Instagram, where these creators
  // keep the reel that gets them hired and whose profile pages carry a name.
  ugc: [
    { build: (kw) => `site:fiverr.com ${kw}`, source: 'fiverr.com' },
    { build: (kw) => `site:upwork.com/freelancers ${kw}`, source: 'upwork.com' },
    { build: (kw) => `site:instagram.com ${kw}`, source: 'instagram.com' },
  ],
  // The work is the portfolio, and editors keep theirs in two places.
  video: [
    { build: (kw) => `site:behance.net ${kw}`, source: 'behance.net' },
    { build: (kw) => `site:vimeo.com ${kw}`, source: 'vimeo.com' },
    { build: (kw) => `${kw} showreel portfolio freelance`, source: 'web' },
  ],
  // The one pack that keeps a marketplace query, because Google's index of
  // Upwork developer profiles is genuinely good and this is the category it
  // is good at.
  web: [
    { build: (kw) => `site:upwork.com/freelancers ${kw}`, source: 'upwork.com' },
    { build: (kw) => `site:github.com ${kw}`, source: 'github.com' },
    { build: (kw) => `${kw} freelance developer portfolio`, source: 'web' },
  ],
};

/**
 * The queries to run for one brief.
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

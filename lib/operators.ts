// The roster. Names, credential copy and tags live here rather than in the
// database: they change when copy is rewritten, not when a switch is
// flipped, so they belong in reviewed code.
//
// Order matters twice. MATCH_ORDER decides who gets first refusal on a
// brief, and each operator's tags array is a priority list because the
// first keyword hit wins.

export type OperatorId = 'pulkit' | 'rohit';

export interface OperatorTag {
  label: string;
  keywords: string[];
}

export interface Operator {
  id: OperatorId;
  name: string;
  role: string;
  photo: string;
  location: string;
  linkedin: string;
  companies: { logo: string; label: string }[];
  rating: number;
  fixes: number;
  tags: OperatorTag[];
  fallbackTag: string;
  /** Name of the env var holding this person's Telegram chat id. */
  telegramEnv: string;
  calLink: string;
}

export const CAL_LINK = 'pulkit-walia-plcgb7/15min';

export const OPERATORS: Record<OperatorId, Operator> = {
  rohit: {
    id: 'rohit',
    name: 'Rohit J.',
    role: 'Senior software engineer',
    photo: '/team/rohit.jpg',
    location: 'San Francisco',
    linkedin: 'https://www.linkedin.com/in/rohit-jain-343437187/',
    companies: [
      { logo: '/team/amazon.jpg', label: 'Amazon' },
      { logo: '/team/square.jpg', label: 'Square' },
    ],
    rating: 4.8,
    fixes: 12,
    tags: [
      {
        label: 'Payments & APIs',
        keywords: ['stripe', 'payments', 'billing', 'webhook', 'api', 'integration'],
      },
      {
        label: 'Debugging & deploys',
        keywords: ['bug', 'crash', 'error', 'broken', 'vercel', 'deploy', 'build'],
      },
      {
        label: 'Backend & databases',
        keywords: ['backend', 'server', 'database', 'postgres', 'supabase', 'query'],
      },
      {
        label: 'AI agents & LLM apps',
        keywords: ['agent', 'llm', 'claude', 'openai', 'rag', 'prompt', 'mcp'],
      },
    ],
    fallbackTag: 'Code & engineering',
    telegramEnv: 'TELEGRAM_CHAT_ID_ROHIT',
    calLink: CAL_LINK,
  },
  pulkit: {
    id: 'pulkit',
    name: 'Pulkit W.',
    role: 'Founder, growth & automation',
    photo: '/team/pulkit.jpg',
    location: 'San Francisco',
    linkedin: 'https://www.linkedin.com/in/pulkitwalia/',
    companies: [
      { logo: '/team/uc.jpg', label: 'Urban Company' },
      { logo: '/team/bessemer.jpg', label: 'Bessemer' },
      { logo: '/team/hbs.jpg', label: 'Harvard Business School' },
    ],
    rating: 4.7,
    fixes: 10,
    tags: [
      {
        label: 'Workflow automation',
        keywords: ['n8n', 'zapier', 'make', 'clay', 'hubspot', 'automation', 'workflow', 'scrape'],
      },
      {
        label: 'Outbound & GTM',
        keywords: ['outbound', 'cold email', 'prospect', 'pipeline', 'sales', 'leads'],
      },
      {
        label: 'Landing pages & frontend',
        keywords: ['landing page', 'website', 'copy', 'frontend', 'design', 'conversion'],
      },
      {
        label: 'AI workflows',
        keywords: ['ai workflow', 'agent', 'automate with ai', 'claude', 'gpt'],
      },
    ],
    fallbackTag: 'GTM & automations',
    telegramEnv: 'TELEGRAM_CHAT_ID_PULKIT',
    calLink: CAL_LINK,
  },
};

// Whoever is here gets a copy of every ring, even one meant for someone
// else. Pulkit wants to know when a call is happening whether or not it is
// his, and to be able to step in when it is not answered.
export const ALWAYS_NOTIFY: OperatorId = 'pulkit';

// Rohit is swept first: a technical brief is the more expensive one to
// misroute, and his keywords are the more specific set.
export const MATCH_ORDER: OperatorId[] = ['rohit', 'pulkit'];

// Words that appear in almost any technical conversation. They are real
// signal, but weak: someone describing an n8n workflow will say "error"
// without meaning they need a backend engineer. Naming a specific tool is
// far more informative than describing a symptom, so the two are weighted
// differently rather than treated as equal votes.
const LOW_SIGNAL = new Set([
  'error',
  'bug',
  'crash',
  'broken',
  'build',
  'deploy',
  'api',
  'server',
  'query',
  'design',
  'copy',
  'website',
  'agent',
  'claude',
  'gpt',
  'sales',
  'leads',
  'prompt',
]);

const STRONG_WEIGHT = 3;
const WEAK_WEIGHT = 1;

// Word boundaries on both sides, so 'make' does not fire on 'makefile'.
// Keywords may contain spaces, which is why this is a regex and not a split.
function hasKeyword(haystack: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(haystack);
}

function scoreTag(tag: OperatorTag, text: string): number {
  return tag.keywords.reduce(
    (total, k) =>
      hasKeyword(text, k) ? total + (LOW_SIGNAL.has(k) ? WEAK_WEIGHT : STRONG_WEIGHT) : total,
    0,
  );
}

// The best scoring tag for one person, and what it scored. Ties inside a
// person go to the earlier tag, so list order is still the tiebreak.
function bestTag(op: Operator, text: string): { label: string; score: number } {
  let best = { label: op.fallbackTag, score: 0 };
  for (const tag of op.tags) {
    const score = scoreTag(tag, text);
    if (score > best.score) best = { label: tag.label, score };
  }
  return best;
}

/** The tag for a specific person, falling back to their general one. */
export function tagFor(id: OperatorId, text: string): string {
  return bestTag(OPERATORS[id], text.toLowerCase()).label;
}

/**
 * Who to offer, and which tag their card shows.
 *
 * Scored rather than first match wins. First match made list order decide
 * everything, so a conversation about an n8n workflow that mentioned the
 * word "error" went to the engineer, because his list was swept first and a
 * single weak hit ended the search. Now every keyword votes, specific tools
 * outvote generic symptoms, and the higher total takes it.
 *
 * Returns null when nothing scores. It used to send an unmatched brief to the
 * head of MATCH_ORDER with their fallback tag, which put a senior backend
 * engineer labelled "Code & engineering" in front of a visitor asking for a
 * YouTube video editor, directly under a High confidence badge. Six of the
 * eight categories the home page advertises score zero against this roster,
 * so that was the common path rather than the edge case. No card is honest.
 * A wrong one tells the visitor the matching does not work.
 */
export function matchOperator(text: string): { id: OperatorId; tag: string } | null {
  const lower = text.toLowerCase();
  let winner: { id: OperatorId; tag: string; score: number } | null = null;

  for (const id of MATCH_ORDER) {
    const { label, score } = bestTag(OPERATORS[id], lower);
    // Strictly greater, so an exact tie falls to whoever MATCH_ORDER puts
    // first. A technical brief is the more expensive one to misroute.
    if (score > 0 && (!winner || score > winner.score)) {
      winner = { id, tag: label, score };
    }
  }

  return winner ? { id: winner.id, tag: winner.tag } : null;
}

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

const CAL_LINK = 'pulkit-walia-plcgb7/15min';

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
        keywords: ['n8n', 'zapier', 'make', 'clay', 'automation', 'workflow', 'scrape'],
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

// Rohit is swept first: a technical brief is the more expensive one to
// misroute, and his keywords are the more specific set.
export const MATCH_ORDER: OperatorId[] = ['rohit', 'pulkit'];

// Word boundaries on both sides, so 'make' does not fire on 'makefile'.
// Keywords may contain spaces, which is why this is a regex and not a split.
function hasKeyword(haystack: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(haystack);
}

function findTag(op: Operator, text: string): string | null {
  for (const tag of op.tags) {
    if (tag.keywords.some((k) => hasKeyword(text, k))) return tag.label;
  }
  return null;
}

/** The tag for a specific person, falling back to their general one. */
export function tagFor(id: OperatorId, text: string): string {
  const op = OPERATORS[id];
  return findTag(op, text) ?? op.fallbackTag;
}

/**
 * Who to offer for this brief, and which tag their card shows. Always
 * returns someone: an unmatched brief goes to the head of MATCH_ORDER with
 * their fallback tag rather than showing nothing.
 */
export function matchOperator(text: string): { id: OperatorId; tag: string } {
  const lower = text.toLowerCase();
  for (const id of MATCH_ORDER) {
    const tag = findTag(OPERATORS[id], lower);
    if (tag) return { id, tag };
  }
  const first = MATCH_ORDER[0];
  return { id: first, tag: OPERATORS[first].fallbackTag };
}

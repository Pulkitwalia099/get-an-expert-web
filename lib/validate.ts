import { stripEmDashes } from '@/lib/humanize';
import { scrubUntrusted } from '@/lib/sanitize';
import type { Brief, ChatMessage, ChatReply } from '@/lib/types';

const MAX_MESSAGES = 30;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_MESSAGE_CHARS = 600;
const MAX_CHIPS = 4;
const MAX_CHIP_CHARS = 40;
const MAX_FIELD_CHARS = 300;

// Anonymous session ids are minted client-side, so accept nothing but a
// UUID. Persistence is silently skipped when the id is missing or malformed.
export function parseSessionId(input: unknown): string | null {
  return typeof input === 'string' && UUID_RE.test(input) ? input.toLowerCase() : null;
}

// 'main' is the original expert search, 'dev' is /stuck. Anything else
// collapses to 'main'.
export function parseFlow(input: unknown): 'main' | 'dev' {
  return input === 'dev' ? 'dev' : 'main';
}

export function parseMessages(input: unknown): ChatMessage[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_MESSAGES) {
    return null;
  }
  const messages: ChatMessage[] = [];
  for (const item of input) {
    if (typeof item !== 'object' || item === null) return null;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if (role !== 'user' && role !== 'assistant') return null;
    if (typeof content !== 'string' || content.trim().length === 0) return null;
    messages.push({ role, content: scrubUntrusted(content).slice(0, MAX_MESSAGE_CHARS) });
  }
  if (messages[0].role !== 'user') return null;
  return messages;
}

export function coerceBrief(input: unknown): Brief {
  const source = (typeof input === 'object' && input !== null ? input : {}) as Record<
    string,
    unknown
  >;
  const field = (key: string): string =>
    typeof source[key] === 'string'
      ? scrubUntrusted(source[key] as string).slice(0, MAX_FIELD_CHARS)
      : '';
  return {
    expert_type: field('expert_type'),
    domain: field('domain'),
    specifics: field('specifics'),
    engagement: field('engagement'),
    budget: field('budget'),
    timeline: field('timeline'),
    search_query: field('search_query'),
  };
}

// The assistant replies are always plain prose, so any angle-bracket
// tag-like fragment is model noise, not content. Strip it before it can
// reach the screen, then tidy the whitespace it leaves behind.
function stripReplyTags(text: string): string {
  return text
    .replace(/<[^>\n]{0,40}>/g, '')
    .replace(/ {2,}/g, ' ')
    .trim();
}

export function sanitizeReply(input: unknown): ChatReply {
  const source = (typeof input === 'object' && input !== null ? input : {}) as Record<
    string,
    unknown
  >;
  const reply =
    typeof source.reply === 'string' && source.reply.trim().length > 0
      ? stripReplyTags(stripEmDashes(source.reply.slice(0, MAX_MESSAGE_CHARS)))
      : 'Can you tell me a bit more?';
  const chips = Array.isArray(source.chips)
    ? source.chips
        .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
        .map((c) => stripEmDashes(c.slice(0, MAX_CHIP_CHARS)))
        .slice(0, MAX_CHIPS)
    : [];
  const done = source.done === true;
  const brief = done ? coerceBrief(source.brief) : null;
  return { reply, chips: done ? [] : chips, done, brief };
}

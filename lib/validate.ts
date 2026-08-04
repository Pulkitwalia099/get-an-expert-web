import { stripEmDashes } from '@/lib/humanize';
import { scrubUntrusted } from '@/lib/sanitize';
import { isSetupSlug } from '@/lib/setups';
import type {
  Brief,
  ChatMessage,
  ChatReply,
  ChipMode,
  MatchConfidence,
  PrimaryPath,
} from '@/lib/types';

const MAX_MESSAGES = 30;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Inbound and outbound caps are separate on purpose. A visitor pasting an
// error log needs room, and silently dropping the tail of their message
// defeats the whole point of the intake. Replies stay short regardless.
const MAX_MESSAGE_CHARS = 2_000;
const MAX_REPLY_CHARS = 600;
const MAX_CHIPS = 5;
const MAX_CHIP_CHARS = 40;
const MAX_FIELD_CHARS = 300;
const MAX_MATCH_INTRO_CHARS = 300;

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

// Which setup card the chat was opened from. The catalog is the whole allowed
// set: a slug either names a card or it is nothing. That is the point of
// sending a slug rather than the card's title, because what comes back from
// here is appended to the system prompt.
export function parseSetupSlug(input: unknown): string | null {
  return typeof input === 'string' && isSetupSlug(input) ? input : null;
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

// The assistant replies are always plain prose, so a tag-like fragment is
// model noise, not content. Strip it before it can reach the screen, then
// tidy the whitespace it leaves behind.
//
// The pattern requires a letter or a slash straight after the '<', so it only
// matches things shaped like markup. Matching any '<...>' span ate real prose:
// "latency < 200ms and errors > 1%" came out as "latency 1%", which is exactly
// the sentence a visitor describing a slow app is likely to get back.
function stripReplyTags(text: string): string {
  return text
    .replace(/<\/?[a-zA-Z][^>\n]{0,40}>/g, '')
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
      ? stripReplyTags(stripEmDashes(source.reply.slice(0, MAX_REPLY_CHARS)))
      : 'Can you tell me a bit more?';
  const chips = Array.isArray(source.chips)
    ? source.chips
        .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
        .map((c) => stripEmDashes(c.slice(0, MAX_CHIP_CHARS)))
        .slice(0, MAX_CHIPS)
    : [];
  const done = source.done === true;
  const brief = done ? coerceBrief(source.brief) : null;

  // Multi-select changes what a click does, so it has to be asked for
  // explicitly. Anything unrecognised behaves like today's chips.
  const chip_mode: ChipMode = source.chip_mode === 'multi' ? 'multi' : 'single';
  // This fires when the model omits or garbles the field, which is exactly
  // when it was least sure what the work was. 'email' is the safe guess: it
  // leads with a route anyone can take and still shows the install below,
  // whereas a wrong 'session' opens on a terminal command for someone who has
  // never used one. Matches the prompt, which defaults to email unless the
  // work is clearly code.
  const primary_path: PrimaryPath = source.primary_path === 'session' ? 'session' : 'email';
  const expert_signup = source.expert_signup === true;
  const match_intro =
    done && typeof source.match_intro === 'string'
      ? stripReplyTags(stripEmDashes(source.match_intro.slice(0, MAX_MATCH_INTRO_CHARS)))
      : '';
  const match_confidence: MatchConfidence = !done
    ? ''
    : source.match_confidence === 'medium'
      ? 'medium'
      : 'high';

  return {
    reply,
    chips: done ? [] : chips,
    done,
    brief,
    chip_mode,
    primary_path,
    expert_signup,
    match_intro,
    match_confidence,
  };
}

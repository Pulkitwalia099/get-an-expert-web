import { askClaude } from '@/lib/anthropic';
import { CHAT_SCHEMA } from '@/lib/prompts';
import { sanitizeReply } from '@/lib/validate';
import type { ChatMessage, ChatReply } from '@/lib/types';
import type { Scenario } from './scenarios';

// Runs one scenario end to end: a cheap model role-plays the visitor, the
// production prompt and model play the assistant, then a judge model grades
// the transcript. Deterministic checks catch the objective failures (re-asked
// facts, question caps, dead ends) so the judge only has to grade quality.

const USER_MODEL = process.env.EVAL_USER_MODEL ?? 'claude-sonnet-5';
const JUDGE_MODEL = process.env.EVAL_JUDGE_MODEL ?? 'claude-sonnet-5';

export interface RunResult {
  scenario: Scenario;
  messages: ChatMessage[];
  replies: ChatReply[];
  questionsAsked: number;
  done: boolean;
}

export interface Verdict {
  relevance: number;
  no_repetition: number;
  adaptivity: number;
  tone: number;
  outcome: number;
  pass: boolean;
  worst_moment: string;
  summary: string;
}

// The structured-output API rejects minimum/maximum on integers, so the
// 1-5 range lives in the judge prompt and scores are clamped after parsing.
const score = { type: 'integer', description: 'Score from 1 (broken) to 5 (flawless)' };

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    relevance: score,
    no_repetition: score,
    adaptivity: score,
    tone: score,
    outcome: score,
    pass: { type: 'boolean' },
    worst_moment: {
      type: 'string',
      description: 'The single worst assistant moment, quoted, or "none"',
    },
    summary: { type: 'string', description: 'One or two sentences on the overall experience' },
  },
  required: [
    'relevance',
    'no_repetition',
    'adaptivity',
    'tone',
    'outcome',
    'pass',
    'worst_moment',
    'summary',
  ],
  additionalProperties: false,
} as const;

export function renderTranscript(messages: ChatMessage[], replies: ChatReply[]): string {
  const lines: string[] = [];
  let replyIdx = 0;
  for (const m of messages) {
    if (m.role === 'user') {
      lines.push(`Visitor: ${m.content}`);
    } else {
      const r = replies[replyIdx++];
      const chips = r && r.chips.length > 0 ? ` [chips: ${r.chips.join(' | ')}]` : '';
      const done = r?.done ? ' [handoff]' : '';
      lines.push(`Assistant: ${m.content}${chips}${done}`);
    }
  }
  return lines.join('\n');
}

const SIM_SYSTEM = (s: Scenario): string =>
  `You are role-playing a website visitor talking to an intake chatbot. Stay fully in character.

Persona facts, the only things you know:
${s.facts}

Writing style: ${s.style}

Rules:
- Output only the visitor's next chat message, one or two short sentences.
- Reveal facts only when asked, or when a real person would naturally volunteer them.
- If asked something you already said, react like a real person: short, mildly irritated, do not politely repeat everything.
- If offered quick-reply chips and one fits, you may answer with that chip text.
- Never break character, never mention AI or role-play, never help the assistant.`;

// One extra attempt on top of askClaude's own retry: eval runs make dozens
// of calls in a row, so a single 529 or truncated JSON should not void a
// whole scenario.
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    await new Promise((r) => setTimeout(r, 2_000));
    return fn();
  }
}

async function nextUserMessage(s: Scenario, messages: ChatMessage[], replies: ChatReply[]): Promise<string> {
  const out = await withRetry(() => askClaude<{ message: string }>({
    system: SIM_SYSTEM(s),
    messages: [
      {
        role: 'user',
        content: `Conversation so far:\n${renderTranscript(messages, replies)}\n\nWrite the visitor's next message.`,
      },
    ],
    schema: {
      type: 'object',
      properties: { message: { type: 'string' } },
      required: ['message'],
      additionalProperties: false,
    },
    maxTokens: 500,
    model: USER_MODEL,
  }));
  return out.message.trim();
}

/** Drives the conversation with the system prompt under test. */
export async function runScenario(system: string, s: Scenario): Promise<RunResult> {
  const messages: ChatMessage[] = [{ role: 'user', content: s.opening }];
  const replies: ChatReply[] = [];
  const maxTurns = s.maxTurns ?? (s.expectDone ? 6 : 3);

  for (let turn = 0; turn < maxTurns; turn++) {
    const raw = await withRetry(() =>
      askClaude({
        system,
        messages,
        schema: CHAT_SCHEMA,
        maxTokens: 1_200,
      }),
    );
    const reply = sanitizeReply(raw);
    replies.push(reply);
    messages.push({ role: 'assistant', content: reply.reply });
    if (reply.done) break;
    messages.push({ role: 'user', content: await nextUserMessage(s, messages, replies) });
  }

  const done = replies.length > 0 && replies[replies.length - 1].done;
  const questionsAsked = replies.filter((r) => !r.done).length;
  return { scenario: s, messages, replies, questionsAsked, done };
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(normalize(a).split(' ').filter(Boolean));
  const tb = new Set(normalize(b).split(' ').filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / Math.min(ta.size, tb.size);
}

/** Objective failures. Empty array = clean. */
export function deterministicChecks(run: RunResult): string[] {
  const { scenario: s, replies } = run;
  const failures: string[] = [];
  const asking = replies.filter((r) => !r.done);

  if (run.questionsAsked > s.maxQuestions) {
    failures.push(
      `asked ${run.questionsAsked} questions, scenario allows at most ${s.maxQuestions}`,
    );
  }

  for (const fact of s.knownUpfront ?? []) {
    const hit = asking.find((r) => fact.pattern.test(r.reply));
    if (hit) failures.push(`re-asked "${fact.name}" already given upfront: "${hit.reply}"`);
  }

  for (let i = 0; i < asking.length; i++) {
    for (let j = i + 1; j < asking.length; j++) {
      if (tokenOverlap(asking[i].reply, asking[j].reply) >= 0.8) {
        failures.push(`repeated itself: "${asking[i].reply}" then "${asking[j].reply}"`);
      }
    }
  }

  asking.forEach((r, i) => {
    const isFinal = i === asking.length - 1 && replies[replies.length - 1] === r;
    const redirectAllowed = !s.expectDone && isFinal;
    if (!r.reply.includes('?') && !redirectAllowed) {
      failures.push(`dead-end reply with no question: "${r.reply}"`);
    }
  });

  if (s.expectDone) {
    if (!run.done) {
      failures.push(`never reached done=true within ${replies.length} turns`);
    } else {
      const brief = replies[replies.length - 1].brief;
      if (!brief) {
        failures.push('done=true but brief is null');
      } else {
        if (!brief.search_query.trim()) failures.push('brief.search_query is empty');
        for (const [field, pattern] of Object.entries(s.brief ?? {})) {
          const value = brief[field as keyof typeof brief] ?? '';
          if (!(pattern as RegExp).test(value)) {
            failures.push(`brief.${field} "${value}" does not match ${pattern}`);
          }
        }
      }
    }
  } else if (run.done) {
    failures.push('handed off (done=true) but this visitor should not produce a brief');
  }

  return failures;
}

const JUDGE_SYSTEM = `You grade one conversation between a website intake chatbot and a visitor, for midsesh, a service that matches people with vetted human experts. The 'main' flow scopes any hiring need in at most 3 questions. The 'dev' flow rescues people whose AI coding tool is stuck, in at most 2 questions. Good intake: every question is specific to what this visitor already said, nothing already answered is asked again, curveballs (pricing questions, wrong-page visitors, refusals, other languages, frustration) are handled in stride, and the visitor is never left without a next step.

Score 1-5 on each criterion. 5 = a skilled human concierge, 4 = minor wobble, 3 = a real flaw a visitor would feel, 2 = clearly bad, 1 = broken.
- relevance: were questions specific and pertinent to this visitor's words and situation?
- no_repetition: was anything asked twice, or asked after the visitor already said it?
- adaptivity: did it adjust to the curveball described in the scenario notes, skip what it already knew, and follow the visitor's language and register?
- tone: short, plain, calm, no jargon dumped on non-technical visitors, questions read as questions?
- outcome: did the conversation end where it should (correct handoff and accurate brief, or correct redirect), efficiently?

pass = every score is 4 or 5 AND nothing in the scenario notes marked as a hard failure occurred. Be strict; this gate protects real visitors. Keep worst_moment and summary under 25 words each.`;

const clamp = (n: number): number => Math.min(5, Math.max(1, Math.round(n)));

export async function judgeRun(run: RunResult): Promise<Verdict> {
  const s = run.scenario;
  const brief = run.replies[run.replies.length - 1]?.brief;
  const v = await withRetry(() => askClaude<Verdict>({
    system: JUDGE_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Flow: ${s.flow}
Scenario: ${s.title}
What the visitor actually knew (hidden from the assistant): ${s.facts}
Scenario notes for you, the judge: ${s.judgeNotes}

Transcript:
${renderTranscript(run.messages, run.replies)}

Final brief: ${brief ? JSON.stringify(brief) : 'none'}`,
      },
    ],
    schema: VERDICT_SCHEMA,
    maxTokens: 1_500,
    model: JUDGE_MODEL,
  }));
  return {
    ...v,
    relevance: clamp(v.relevance),
    no_repetition: clamp(v.no_repetition),
    adaptivity: clamp(v.adaptivity),
    tone: clamp(v.tone),
    outcome: clamp(v.outcome),
  };
}

export function verdictScores(v: Verdict): number[] {
  return [v.relevance, v.no_repetition, v.adaptivity, v.tone, v.outcome];
}

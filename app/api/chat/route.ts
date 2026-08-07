import { NextRequest, NextResponse } from 'next/server';
import type { ChatMessage } from '@/lib/types';
import { askClaude, hasAnthropicKey } from '@/lib/anthropic';
import { demoChatReply, demoDevChatReply } from '@/lib/demo';
import { recordInsight } from '@/lib/insights';
import { redact } from '@/lib/redact';
import { withMetrics } from '@/lib/metrics';
import { clientId, rateLimit } from '@/lib/ratelimit';
import { matchesOrigin } from '@/lib/sanitize';
import { recordMessages, recordSession } from '@/lib/supabase';
import { durableLimit } from '@/lib/usage';
import {
  parseFlow,
  parseMessages,
  parseSessionId,
  parseSetupSlug,
  sanitizeReply,
} from '@/lib/validate';
import { schemaFor, setupBrief, systemFor } from '@/lib/prompts';

// The question ceiling is the one rule the prompt could not hold on its own.
// Against a visitor answering "not sure" and "dunno", the model kept rewording
// the same ask and reached eight questions in testing. Counting turns here is
// deterministic in a way a sentence in a prompt is not.
//
// The budget flexes with the visitor. Someone typing real sentences has earned
// a deeper conversation; someone giving one-word answers is telling you the
// intake is not working, and more questions will not fix that. Chip clicks are
// short by design, so length alone cannot be the signal: the test is whether
// they have written something of their own at least twice.
const BASE_QUESTIONS = 4;
const ENGAGED_QUESTIONS = 7;
const SUBSTANTIVE_WORDS = 12;

export function questionBudget(messages: ChatMessage[]): number {
  const substantive = messages.filter(
    (m) => m.role === 'user' && m.content.trim().split(/\s+/).length >= SUBSTANTIVE_WORDS,
  ).length;
  return substantive >= 2 ? ENGAGED_QUESTIONS : BASE_QUESTIONS;
}

export function finalTurnNudge(flow: 'main' | 'dev', asked: number, budget: number): string {
  if (flow !== 'dev' || asked < budget) return '';
  return `\n\nYou have now used all ${budget} of your questions. Do not ask another, in any wording. Either set done=true with the best brief you can build from what they have already said, or, if they have given you nothing to work with, reply with one short line naming the single detail you need and stop asking.`;
}

async function handleChat(req: NextRequest): Promise<NextResponse> {
  if (!matchesOrigin(req.headers.get('origin'), req.headers.get('host'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const ip = clientId(req);
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  // Durable counters shared across serverless instances; the in-memory
  // check above is just the free fast path.
  if ((await durableLimit('chat', ip, 20)) !== 'ok') {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const messages = parseMessages((body as { messages?: unknown })?.messages);
  if (!messages) {
    return NextResponse.json({ error: 'Invalid messages' }, { status: 400 });
  }
  const sessionId = parseSessionId((body as { sessionId?: unknown })?.sessionId);
  const flow = parseFlow((body as { flow?: unknown })?.flow);
  // Null unless they opened the chat from a setup card, which is most of the
  // time. An unknown slug is the same as none rather than an error: the worst
  // case is the conversation the visitor would have had anyway.
  const setup = parseSetupSlug((body as { setup?: unknown })?.setup);

  // Persist the session and the newest user turn right away, so a visitor
  // who types one line and leaves still produces rows. The session upsert
  // must land before the message insert (foreign key), and neither can
  // throw, so the chain runs alongside the model call and is awaited last.
  const asked = messages.filter((m) => m.role === 'assistant').length;
  const newest = messages[messages.length - 1];
  // Without an Anthropic key the chat serves scripted demo replies. Mark the
  // session so real launch traffic and demo traffic never mix in analytics.
  const demo = !hasAnthropicKey();
  const persisted =
    sessionId === null
      ? Promise.resolve()
      : recordSession(
          sessionId,
          {
            userAgent: req.headers.get('user-agent'),
            referrer: req.headers.get('referer'),
          },
          { flow, demo },
        ).then(() =>
          newest.role === 'user'
            ? recordMessages(sessionId, [
                { role: 'user', content: newest.content, question_no: asked },
              ])
            : undefined,
        );

  try {
    const system =
      systemFor(flow) +
      setupBrief(setup) +
      finalTurnNudge(flow, asked, questionBudget(messages));
    const raw = hasAnthropicKey()
      ? await askClaude({ system, messages, schema: schemaFor(flow), maxTokens: 1_200 })
      : flow === 'dev'
        ? demoDevChatReply(messages)
        : demoChatReply(messages);
    const reply = sanitizeReply(raw);
    if (reply.done && reply.brief) {
      await recordInsight('brief', { brief: reply.brief, turns: messages.length });
    }
    await persisted;
    if (sessionId !== null) {
      await recordMessages(sessionId, [
        { role: 'assistant', content: reply.reply, question_no: asked + 1 },
      ]);
    }
    return NextResponse.json(reply);
  } catch (err) {
    console.error('[midsesh:chat]', redact(err));
    return NextResponse.json({ error: 'Chat failed' }, { status: 502 });
  }
}

export const POST = withMetrics('chat', handleChat);

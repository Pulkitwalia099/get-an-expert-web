import { NextRequest, NextResponse } from 'next/server';
import { askClaude, hasAnthropicKey } from '@/lib/anthropic';
import { demoChatReply, demoDevChatReply } from '@/lib/demo';
import { recordInsight } from '@/lib/insights';
import { redact } from '@/lib/redact';
import { withMetrics } from '@/lib/metrics';
import { clientId, rateLimit } from '@/lib/ratelimit';
import { matchesOrigin } from '@/lib/sanitize';
import { recordMessages, recordSession } from '@/lib/supabase';
import { durableLimit } from '@/lib/usage';
import { parseFlow, parseMessages, parseSessionId, sanitizeReply } from '@/lib/validate';
import { CHAT_SCHEMA, systemFor } from '@/lib/prompts';

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
    const system = systemFor(flow);
    const raw = hasAnthropicKey()
      ? await askClaude({ system, messages, schema: CHAT_SCHEMA, maxTokens: 1_200 })
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

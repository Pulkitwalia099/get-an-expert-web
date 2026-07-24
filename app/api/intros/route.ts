import { NextRequest, NextResponse } from 'next/server';
import { isValidEmail } from '@/lib/email';
import { recordInsight } from '@/lib/insights';
import { withMetrics } from '@/lib/metrics';
import { clientId, rateLimit } from '@/lib/ratelimit';
import { matchesOrigin, scrubUntrusted } from '@/lib/sanitize';
import { recordLead, recordSession } from '@/lib/supabase';
import { bumpUsage, dayKey, durableLimit } from '@/lib/usage';
import { coerceBrief, parseFlow, parseSessionId } from '@/lib/validate';

const MAX_SELECTED = 5;
const MAX_NEED_CHARS = 600;

async function handleIntros(req: NextRequest): Promise<NextResponse> {
  if (!matchesOrigin(req.headers.get('origin'), req.headers.get('host'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const ip = clientId(req);
  if (!rateLimit(ip, 10)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  if ((await durableLimit('intros', ip, 10)) !== 'ok') {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const flow = parseFlow(body.flow);
  const sessionId = parseSessionId(body.sessionId);

  // An install click from /stuck: no email, no lead row, just the
  // conversion. It still completes the session, that visitor got what
  // they came for.
  if (body.type === 'install') {
    const tool = typeof body.tool === 'string' ? body.tool.slice(0, 20) : '';
    await recordInsight('install', { flow, tool, brief: coerceBrief(body.brief) });
    await bumpUsage(dayKey('install'));
    if (sessionId !== null) {
      await recordSession(
        sessionId,
        { userAgent: req.headers.get('user-agent'), referrer: req.headers.get('referer') },
        { completed: true, flow },
      );
    }
    return NextResponse.json({ ok: true });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const kind = body.type === 'custom' ? 'custom' : 'intros';
  const selected = Array.isArray(body.selected)
    ? body.selected
        .filter((s): s is string => typeof s === 'string')
        .map((s) => scrubUntrusted(s).slice(0, 80))
        .slice(0, MAX_SELECTED)
    : [];
  const need =
    typeof body.need === 'string'
      ? scrubUntrusted(body.need).slice(0, MAX_NEED_CHARS)
      : undefined;
  const name =
    typeof body.name === 'string' && body.name.trim()
      ? scrubUntrusted(body.name).trim().slice(0, 120)
      : null;

  const brief = coerceBrief(body.brief);
  await recordInsight(kind, { email, name, selected, need, brief, flow });

  // The lead lands in its own table (the only one holding personal data)
  // and the session flips to completed. Submitting an email to request an
  // intro is the consent being recorded. Both writes are fire and forget.
  await recordLead(sessionId, {
    email,
    name,
    kind,
    selected,
    need: need ?? null,
    brief,
    consent: true,
    flow,
  });
  if (sessionId !== null) {
    await recordSession(
      sessionId,
      { userAgent: req.headers.get('user-agent'), referrer: req.headers.get('referer') },
      { completed: true, flow },
    );
  }

  return NextResponse.json({ ok: true });
}

export const POST = withMetrics('intros', handleIntros);

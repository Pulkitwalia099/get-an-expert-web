import { NextRequest, NextResponse } from 'next/server';
import { hasEmailKey, isValidEmail, sendEmail } from '@/lib/email';
import { EMAIL_TOKEN_MAX_AGE, emailAuthConfigured, signEmailToken } from '@/lib/emailAuth';
import { withMetrics } from '@/lib/metrics';
import { clientId, rateLimit } from '@/lib/ratelimit';
import { matchesOrigin } from '@/lib/sanitize';
import { durableLimit } from '@/lib/usage';

// Step one of the email door: somebody types an address, we send a link.
//
// The reply is deliberately the same whether or not that address has ever
// ordered anything. An endpoint that says "no orders for that address" is a
// free tool for checking who our customers are, and it would answer for any
// address anybody cared to try.
//
// It is also the only endpoint here that sends mail on an anonymous request,
// which makes it the one somebody would point at a stranger's inbox. Hence two
// limits rather than one: the in-process limiter catches a burst, and the
// durable one survives the restarts that would otherwise reset it.

const LIMIT_PER_HOUR = 5;

/** Where the link points. Pinned by AUTH_ORIGIN so preview hosts do not leak into mail. */
function origin(req: NextRequest): string {
  return (process.env.AUTH_ORIGIN || req.nextUrl.origin).replace(/\/+$/, '');
}

function body(link: string): string {
  return [
    'Here is your sign in link for midsesh.',
    '',
    link,
    '',
    `It works once you open it and expires in ${EMAIL_TOKEN_MAX_AGE / 60} minutes.`,
    'If you did not ask for this, nothing has happened and you can ignore it.',
  ].join('\n');
}

async function handlePost(req: NextRequest): Promise<NextResponse> {
  if (!matchesOrigin(req.headers.get('origin'), req.headers.get('host'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // Without a session secret there is nothing to sign with, and without an
  // email key there is nothing to send through. Either way the door does not
  // exist, and saying so is better than accepting an address and losing it.
  if (!emailAuthConfigured() || !hasEmailKey()) {
    return NextResponse.json({ error: 'Email sign in is not available' }, { status: 503 });
  }

  const ip = clientId(req);
  if (!rateLimit(`${ip}:email-signin`, LIMIT_PER_HOUR)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'That does not look like an email address' }, { status: 400 });
  }

  // Per address as well as per client. One limit on the IP alone lets a
  // botnet mail one person repeatedly; one on the address alone lets a single
  // machine work through a list. Both are keyed durably so a redeploy does
  // not hand out a fresh allowance.
  const normalised = email.toLowerCase();
  if ((await durableLimit('email-signin-ip', ip, LIMIT_PER_HOUR)) !== 'ok') {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  if ((await durableLimit('email-signin-to', normalised, LIMIT_PER_HOUR)) !== 'ok') {
    // Answered as success on purpose. A 429 keyed on the address tells the
    // sender that somebody else is asking for links to it, which is the one
    // thing this endpoint is not supposed to reveal.
    return NextResponse.json({ ok: true });
  }

  const token = signEmailToken(normalised);
  if (!token) {
    return NextResponse.json({ error: 'Email sign in is not available' }, { status: 503 });
  }

  const link = `${origin(req)}/api/auth/email/callback?t=${encodeURIComponent(token)}`;
  const sent = await sendEmail({
    to: normalised,
    subject: 'Your midsesh sign in link',
    text: body(link),
  });

  // `sent` is reported rather than acted on. A failed send is worth knowing
  // about in the daily report, and it is not worth telling the browser, since
  // the answer has to look identical for every address either way.
  if (!sent) {
    console.error('[midsesh:auth] sign in link send failed');
  }
  return NextResponse.json({ ok: true });
}

export const POST = withMetrics('auth-email', handlePost);

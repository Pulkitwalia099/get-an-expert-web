import { NextRequest, NextResponse } from 'next/server';
import { withMetrics } from '@/lib/metrics';
import {
  OPERATOR_COOKIE,
  OPERATOR_COOKIE_MAX_AGE,
  secretMatches,
  sessionToken,
} from '@/lib/operatorAuth';
import { clientId, rateLimit } from '@/lib/ratelimit';

// Exchange the secret for a session cookie, once, so /operator becomes a
// plain bookmark rather than a link with a credential in it.

async function handlePost(req: NextRequest): Promise<NextResponse> {
  // A password field invites guessing in a way a header never did, so this
  // is the one operator route with its own limiter.
  if (!rateLimit(`op-login:${clientId(req)}`, 8)) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const token = sessionToken();
  if (!secretMatches(body.secret) || !token) {
    return NextResponse.json({ error: 'Wrong secret' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(OPERATOR_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: OPERATOR_COOKIE_MAX_AGE,
  });
  return res;
}

// Signing out matters on a shared or lost device.
async function handleDelete(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OPERATOR_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}

export const POST = withMetrics('operator-login', handlePost);
export const DELETE = withMetrics('operator-login', handleDelete);

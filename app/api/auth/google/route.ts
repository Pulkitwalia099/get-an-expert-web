import { NextRequest, NextResponse } from 'next/server';
import { STATE_COOKIE, STATE_MAX_AGE, authConfigured, authorizeUrl, newState } from '@/lib/auth';
import { withMetrics } from '@/lib/metrics';

// Step one of the sign in: send the browser to Google.
//
// The state value is generated here, put in the URL and in an httpOnly cookie,
// and compared on the way back. Without that pair, anyone could feed a victim
// a callback URL carrying their own code and sign the victim into the
// attacker's account.

async function handleGet(req: NextRequest): Promise<NextResponse> {
  if (!authConfigured()) {
    return NextResponse.json({ error: 'Sign in is not configured' }, { status: 503 });
  }

  const state = newState();
  const url = authorizeUrl(state, req.nextUrl.origin);
  if (!url) {
    return NextResponse.json({ error: 'Sign in is not configured' }, { status: 503 });
  }

  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // Lax, not strict. Google's redirect back is a cross site navigation, and
    // a strict cookie would not be sent with it, so the state check would fail
    // for every honest sign in.
    sameSite: 'lax',
    path: '/',
    maxAge: STATE_MAX_AGE,
  });
  return res;
}

export const GET = withMetrics('auth-google', handleGet);

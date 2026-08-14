import { NextRequest, NextResponse } from 'next/server';
import {
  NEXT_COOKIE,
  STATE_COOKIE,
  STATE_MAX_AGE,
  authConfigured,
  authorizeUrl,
  newState,
  safeNext,
} from '@/lib/auth';
import { withMetrics } from '@/lib/metrics';

// Step one of the sign in: send the browser to Google.
//
// The state value is generated here, put in the URL and in an httpOnly cookie,
// and compared on the way back. Without that pair, anyone could feed a victim
// a callback URL carrying their own code and sign the victim into the
// attacker's account.
//
// A `?next=` is parked in a second cookie rather than folded into the state
// value. The state check is a byte for byte compare against what Google echoes
// back, and it is the whole CSRF defence; making it a compound value that has
// to be split before comparing turns two lines of equality into parsing, in
// the one place that must not have a bug. Two cookies is the cheaper trade,
// and it is the third time this app parks a value across the trip to Google.

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

  // Checked on the way in as well as on the way out. Rejecting it here means
  // nothing unwanted is ever parked on the browser, and checking it again in
  // the callback means a cookie set before this list was last tightened cannot
  // outlive the tightening.
  //
  // Written on every trip, including the trips that ask for nothing, which is
  // the part that is easy to get wrong. Only the callback clears this cookie,
  // and a sign in that is abandoned at Google's account picker never reaches
  // the callback: leaving the old value alone would mean the next, unrelated
  // sign in silently lands on somebody's earlier destination. Setting an empty
  // value with no life is how a start says "no destination" out loud.
  const next = safeNext(req.nextUrl.searchParams.get('next'));
  res.cookies.set(NEXT_COOKIE, next ?? '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // Lax for the same reason as the state cookie above.
    sameSite: 'lax',
    path: '/',
    maxAge: next ? STATE_MAX_AGE : 0,
  });
  return res;
}

export const GET = withMetrics('auth-google', handleGet);

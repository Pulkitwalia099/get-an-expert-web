import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';
import { bumpSessionVersion, currentAccount } from '@/lib/accounts';
import { withMetrics } from '@/lib/metrics';
import { clientId, rateLimit } from '@/lib/ratelimit';
import { matchesOrigin } from '@/lib/sanitize';

// Sign out everywhere.
//
// Sessions are signed cookies with no server side record, so there is nothing
// to go and delete. What there is instead is a generation number on the
// accounts row: moving it forward invalidates every cookie signed against the
// old one, on every device, the next time each is read.
//
// Order matters and is easy to get backwards. The version moves FIRST, then
// this browser's own cookie is cleared on the response. Clear first and a
// failed bump leaves somebody signed out of the one device in front of them
// and still signed in on every other, having just been told the opposite.

async function handlePost(req: NextRequest): Promise<NextResponse> {
  if (!matchesOrigin(req.headers.get('origin'), req.headers.get('host'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!rateLimit(`${clientId(req)}:account-sessions`, 6)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const user = await currentAccount(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });

  const version = await bumpSessionVersion(user.sub);
  if (version === null) {
    // A button that says "signed out everywhere" over a number that did not
    // move is the one outcome worth the extra branch.
    return NextResponse.json(
      { error: 'We could not sign your other devices out. Try again in a moment.' },
      { status: 502 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}

export const POST = withMetrics('account-sessions', handlePost);

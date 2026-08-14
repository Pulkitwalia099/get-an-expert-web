import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_MAX_AGE, safeNext, signSession } from '@/lib/auth';
import { ensureAccount, resolveAccount } from '@/lib/credits';
import { readEmailToken, subForEmail } from '@/lib/emailAuth';
import { withMetrics } from '@/lib/metrics';

// Step two of the email door: they opened the link.
//
// The token is verified and then thrown away. What comes back is a redirect
// that sets the session cookie and lands on /orders with a clean address bar,
// which matters more here than it looks: a URL carrying a live credential ends
// up in browser history, in the Referer header of the next request, and in
// whatever the person pastes when they ask for help.

const LANDING = '/orders';

/**
 * Where to send them after the link works.
 *
 * A status email links to one order, so "you have a sample" should open that
 * sample rather than a list they then have to read. But the destination
 * arrives in a URL, which makes it somebody else's input, and this one is
 * attached to a link that sets a session cookie.
 *
 * The allowlist that decides it now lives in lib/auth, because the Google door
 * needs the same rule and two copies of it would drift.
 */
function destination(raw: string | null): string {
  return safeNext(raw) ?? LANDING;
}

function land(
  req: NextRequest,
  params: Record<string, string> = {},
  to: string = LANDING,
): NextResponse {
  const url = new URL(to, req.nextUrl.origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

async function handleGet(req: NextRequest): Promise<NextResponse> {
  const email = readEmailToken(req.nextUrl.searchParams.get('t') ?? undefined);
  const to = destination(req.nextUrl.searchParams.get('next'));

  // Expired and forged land in the same place, saying the same thing. There is
  // nothing useful to tell apart for the person holding an old link, and
  // telling a forger which of the two they got is a hint they can work with.
  //
  // Always the list, never `to`. A dead link should not drop somebody on an
  // order page that will only 404 them for being signed out.
  if (!email) return land(req, { signin: 'expired' });

  // The derived sub is what this address gets if it has never been here
  // before. If it signed in with Google first, that account already exists and
  // owns the credits, so resolveAccount hands back its id and the session is
  // signed with that instead. One address, one account, whichever door.
  const user = await resolveAccount({
    sub: subForEmail(email),
    email,
    // Nothing is known beyond the address, and inventing a display name from
    // the local part is how somebody ends up greeted as "Accounts Payable".
    name: null,
    picture: null,
  });

  const session = signSession(user);
  if (!session) return land(req, { signin: 'unavailable' });

  // Idempotent, and allowed to fail. Supabase being down must not stop
  // somebody signing in: their orders are read separately and that read has
  // its own error state.
  await ensureAccount(user);

  const res = land(req, { signin: 'ok' }, to);
  res.cookies.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}

export const GET = withMetrics('auth-email-callback', handleGet);

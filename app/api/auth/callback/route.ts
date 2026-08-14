import { NextRequest, NextResponse } from 'next/server';
import {
  NEXT_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  STATE_COOKIE,
  authConfigured,
  exchangeCode,
  safeNext,
  signSession,
  stateMatches,
} from '@/lib/auth';
import { ensureAccount, resolveAccount } from '@/lib/credits';
import { claimMatchSet } from '@/lib/matches';
import { withMetrics } from '@/lib/metrics';
import { INTENT_COOKIE, createQuoteRequest, readIntent } from '@/lib/quotes';

// Step two: Google sends the browser back here with a one time code.
//
// Every failure lands on /signin with a short reason in the query string
// rather than rendering an error page. A sign in that fails on someone's phone
// should put them back in front of both doors, able to try again or to try the
// other one. It used to go to `/`, which is rewritten to the marketplace, a
// separate app that never reads this cookie and has nothing to say about a
// failed sign in: no error, no 404, no log line.

function land(req: NextRequest, path: string, params: Record<string, string> = {}): NextResponse {
  const url = new URL(path, req.nextUrl.origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = NextResponse.redirect(url);
  // The state cookie has done its job either way, so it never outlives the
  // request that consumed it. The intent cookie is cleared here too: it is
  // acted on below, and one left behind would be replayed on the next sign in.
  // The destination cookie goes with them, on failures as well as successes,
  // because a stale one would silently redirect a later, unrelated sign in.
  res.cookies.set(STATE_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  res.cookies.set(INTENT_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  res.cookies.set(NEXT_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}

/**
 * Where a failed sign in goes. Never the parked destination: those pages all
 * require a session, so a failure would arrive somewhere that bounces them
 * straight back out with nothing said. This is the email callback's rule too.
 */
function retry(req: NextRequest, params: Record<string, string> = {}): NextResponse {
  return land(req, '/signin', params);
}

async function handleGet(req: NextRequest): Promise<NextResponse> {
  if (!authConfigured()) return retry(req, { signin: 'unavailable' });

  // Google reports a refusal here rather than by failing the exchange, and a
  // person who pressed cancel is not an error to report.
  if (req.nextUrl.searchParams.get('error')) return retry(req);

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state') ?? undefined;
  const cookie = req.cookies.get(STATE_COOKIE)?.value;

  if (!stateMatches(state, cookie)) return retry(req, { signin: 'stale' });
  if (!code) return retry(req, { signin: 'failed' });

  const identity = await exchangeCode(code, req.nextUrl.origin);
  if (!identity) return retry(req, { signin: 'failed' });

  // Google's subject id is only the id of the door they came through. If this
  // address already signed in by email link, that account is the one they own,
  // and everything below has to be keyed on it: the cookie, the credit grant,
  // the match set they are about to claim.
  const user = await resolveAccount(identity);

  const session = signSession(user);
  if (!session) return retry(req, { signin: 'unavailable' });

  // The account row and the welcome credit. Both are idempotent, and both are
  // allowed to fail: Supabase being down must not stop somebody signing in,
  // it only means their balance reads as unknown until it is back.
  await ensureAccount(user);

  // Somebody who picked profiles before signing in gets their request placed
  // here, so they come back to a request that already exists rather than to a
  // page that has to ask them to choose all over again.
  //
  // Every step is allowed to fail without failing the sign in. Being signed in
  // is what they asked for; the request is what they asked for a moment
  // earlier, and losing it costs one button press rather than the session.
  const intent = readIntent(req.cookies.get(INTENT_COOKIE)?.value);
  let placed = false;
  if (intent) {
    const owned = await claimMatchSet(intent.setId, user.sub);
    if (owned) {
      placed = await createQuoteRequest({
        setId: intent.setId,
        slots: intent.slots,
        sub: user.sub,
        email: user.email,
        name: user.name,
      });
    }
  }

  // Where they asked to go before they were sent to Google, if it survived and
  // still passes the allowlist. Checked again on the way out, so a cookie set
  // before this list was last tightened cannot outlive the tightening.
  const next = safeNext(req.cookies.get(NEXT_COOKIE)?.value);

  const res = placed
    ? // Ignores `next` on purpose. `?placed=1` is the confirmation that the
      // request was saved, and /dashboard is the only page that reads it, so
      // honouring a parked destination here would drop that confirmation and
      // land somebody on a page that never mentions the request they just
      // made. The request would exist and they would have no evidence of it.
      land(req, '/dashboard', { placed: '1' })
    : intent
      ? // The selection was there and could not be honoured. Landing on an
        // account page with nothing on it would read as the request vanishing,
        // so they go home and can ask again with their cards still in front of
        // them. Ignores `next` for the same reason as the branch above: what
        // they need is on the page they started from.
        land(req, '/', { signin: 'ok', quotes: 'retry' })
      : // Not `/`. That is rewritten to the marketplace, a separate Vercel
        // project that never reads this cookie and never calls /api/me, so it
        // renders its ordinary signed out page. Sign in worked every time and
        // looked like it had failed every time.
        //
        // /orders, because orders are what this business takes now. Requests
        // still exist and still have their own page; /orders links to it when
        // there are any, and nobody lands on an empty one by default.
        land(req, next ?? '/orders', { signin: 'ok' });
  res.cookies.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}

export const GET = withMetrics('auth-callback', handleGet);

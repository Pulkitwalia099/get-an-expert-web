import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  STATE_COOKIE,
  authConfigured,
  exchangeCode,
  signSession,
  stateMatches,
} from '@/lib/auth';
import { ensureAccount } from '@/lib/credits';
import { claimMatchSet } from '@/lib/matches';
import { withMetrics } from '@/lib/metrics';
import { INTENT_COOKIE, createQuoteRequest, readIntent } from '@/lib/quotes';

// Step two: Google sends the browser back here with a one time code.
//
// Every failure goes home with a short reason in the query string rather than
// rendering an error page. A sign in that fails on someone's phone should put
// them back on the site able to try again, not at a dead end.

function land(req: NextRequest, path: string, params: Record<string, string> = {}): NextResponse {
  const url = new URL(path, req.nextUrl.origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = NextResponse.redirect(url);
  // The state cookie has done its job either way, so it never outlives the
  // request that consumed it. The intent cookie is cleared here too: it is
  // acted on below, and one left behind would be replayed on the next sign in.
  res.cookies.set(STATE_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  res.cookies.set(INTENT_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}

function home(req: NextRequest, params: Record<string, string> = {}): NextResponse {
  return land(req, '/', params);
}

async function handleGet(req: NextRequest): Promise<NextResponse> {
  if (!authConfigured()) return home(req, { signin: 'unavailable' });

  // Google reports a refusal here rather than by failing the exchange, and a
  // person who pressed cancel is not an error to report.
  if (req.nextUrl.searchParams.get('error')) return home(req);

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state') ?? undefined;
  const cookie = req.cookies.get(STATE_COOKIE)?.value;

  if (!stateMatches(state, cookie)) return home(req, { signin: 'expired' });
  if (!code) return home(req, { signin: 'failed' });

  const user = await exchangeCode(code, req.nextUrl.origin);
  if (!user) return home(req, { signin: 'failed' });

  const session = signSession(user);
  if (!session) return home(req, { signin: 'unavailable' });

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

  const res = placed
    ? land(req, '/dashboard', { placed: '1' })
    : intent
      ? // The selection was there and could not be honoured. Landing on the
        // dashboard with nothing on it would read as the request vanishing, so
        // they go home and can ask again with their cards still in front of them.
        home(req, { signin: 'ok', quotes: 'retry' })
      : home(req, { signin: 'ok' });
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

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
import { withMetrics } from '@/lib/metrics';

// Step two: Google sends the browser back here with a one time code.
//
// Every failure goes home with a short reason in the query string rather than
// rendering an error page. A sign in that fails on someone's phone should put
// them back on the site able to try again, not at a dead end.

function home(req: NextRequest, params: Record<string, string> = {}): NextResponse {
  const url = new URL('/', req.nextUrl.origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = NextResponse.redirect(url);
  // The state cookie has done its job either way, so it never outlives the
  // request that consumed it.
  res.cookies.set(STATE_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
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

  const res = home(req, { signin: 'ok' });
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

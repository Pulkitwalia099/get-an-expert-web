import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';
import { withMetrics } from '@/lib/metrics';

// Signing out matters on a shared or borrowed laptop. POST rather than GET, so
// no image tag or prefetch can sign somebody out by accident.
//
// Two callers, two shapes of answer. AccountLink fetches this and re-renders
// itself, so it wants JSON. The control on /orders is a plain form, because a
// page that tells somebody to sign out and try another address should not need
// JavaScript to do it, and a form submit that lands on {"ok":true} is not a
// sign out anybody would call finished.
//
// The two are told apart by Accept, which a form navigation sets to text/html
// and fetch() does not. Nothing else changes: it is still POST only, and the
// cookie is cleared identically either way.

async function handlePost(req: NextRequest): Promise<NextResponse> {
  const wantsPage = (req.headers.get('accept') ?? '').includes('text/html');

  const res = wantsPage
    ? NextResponse.redirect(new URL('/orders', req.nextUrl.origin), {
        // 303, not the default 307. A 307 preserves the method, so the browser
        // would POST to /orders and get a 405. 303 is the one that means "your
        // POST worked, now GET this instead".
        status: 303,
      })
    : NextResponse.json({ ok: true });

  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}

export const POST = withMetrics('auth-signout', handlePost);

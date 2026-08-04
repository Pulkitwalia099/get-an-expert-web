import { NextRequest, NextResponse } from 'next/server';
import { parseSetId } from '@/lib/matches';
import { withMetrics } from '@/lib/metrics';
import { INTENT_COOKIE, INTENT_MAX_AGE, parseSlots, signIntent } from '@/lib/quotes';
import { matchesOrigin } from '@/lib/sanitize';

// The selection, parked for the length of a sign in.
//
// Somebody picks who they want while every name is still withheld, then gets
// sent to Google. Without this the trip back would land on a page that has
// forgotten what they chose and would ask them to choose again, which is the
// worst possible moment to make somebody repeat themselves.
//
// A cookie rather than sessionStorage or a query string: it is signed, so the
// value cannot be edited into a different set on the way; it is httpOnly, so
// no script on the page can read it; and the auth callback can act on it
// server side, which is what lets the request already exist by the time they
// see the dashboard.

async function handlePost(req: NextRequest): Promise<NextResponse> {
  if (!matchesOrigin(req.headers.get('origin'), req.headers.get('host'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const setId = parseSetId((body as { setId?: unknown })?.setId);
  const slots = parseSlots((body as { slots?: unknown })?.slots);
  if (!setId || slots.length === 0) {
    return NextResponse.json({ error: 'Nothing selected' }, { status: 400 });
  }

  const value = signIntent({ setId, slots });
  // No SESSION_SECRET means no sign in either, so there is nothing to park.
  // Answered as a plain 503 rather than an error the visitor has to read.
  if (!value) return NextResponse.json({ error: 'Unavailable' }, { status: 503 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(INTENT_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // 'lax' and not 'strict': the browser arrives back here on a redirect from
    // Google, and a strict cookie would not be sent on that navigation.
    sameSite: 'lax',
    path: '/',
    maxAge: INTENT_MAX_AGE,
  });
  return res;
}

export const POST = withMetrics('quotes-intent', handlePost);

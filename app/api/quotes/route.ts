import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';
import { currentAccount } from '@/lib/accounts';
import { isValidEmail } from '@/lib/email';
import { redactExperts } from '@/lib/experts';
import { recordInsight } from '@/lib/insights';
import { canReveal, claimMatchSet, parseSetId, readMatchSet } from '@/lib/matches';
import { withMetrics } from '@/lib/metrics';
import { createQuoteRequest, listQuoteRequests, parseSlots } from '@/lib/quotes';
import { clientId, rateLimit } from '@/lib/ratelimit';
import { matchesOrigin } from '@/lib/sanitize';
import { recordLead } from '@/lib/supabase';

// Requests for quotes: making one, and reading yours back.
//
// Two ways in. Signed in, the account owns the set and the request, and the
// dashboard is where the answer lands. Signed out with an email address, the
// request is still made and the quotes still arrive, there is just no
// dashboard to read them in. The second path exists because turning away
// everyone who will not use a Google account is a strange way to run a
// marketplace, and it is the same trade the site made before the gate: an
// email address for a set of names.

async function handlePost(req: NextRequest): Promise<NextResponse> {
  if (!matchesOrigin(req.headers.get('origin'), req.headers.get('host'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!rateLimit(`${clientId(req)}:quotes`, 10)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const input = (body ?? {}) as Record<string, unknown>;

  const setId = parseSetId(input.setId);
  const slots = parseSlots(input.slots);
  if (!setId || slots.length === 0) {
    return NextResponse.json({ error: 'Pick at least one person.' }, { status: 400 });
  }

  const set = await readMatchSet(setId);
  if (!set) return NextResponse.json({ error: 'That search has expired.' }, { status: 404 });

  const user = await currentAccount(req.cookies.get(SESSION_COOKIE)?.value);

  // Signed in: the set becomes theirs, and refusing to claim means it already
  // belongs to somebody else.
  if (user) {
    const owned = await claimMatchSet(setId, user.sub);
    if (!owned || !canReveal({ ...set, sub: user.sub }, user.sub)) {
      return NextResponse.json({ error: 'That search has expired.' }, { status: 404 });
    }
    const ok = await createQuoteRequest({
      setId,
      slots,
      sub: user.sub,
      email: user.email,
      name: user.name,
    });
    if (!ok) return NextResponse.json({ error: 'Could not save that. Try again.' }, { status: 502 });

    await recordInsight('intros', { kind: 'quotes', count: slots.length, brief: set.brief });
    return NextResponse.json({
      ok: true,
      dashboard: true,
      experts: redactExperts(set.records, false),
    });
  }

  // Signed out: an address instead. The name is optional, exactly as it was on
  // the intro form this path replaces.
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  const name = typeof input.name === 'string' ? input.name.trim().slice(0, 80) : '';
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'That email does not look right.' }, { status: 400 });
  }

  const ok = await createQuoteRequest({ setId, slots, sub: null, email, name });
  if (!ok) return NextResponse.json({ error: 'Could not save that. Try again.' }, { status: 502 });

  // Still written to leads. That table is the one place personal data lives
  // and the one thing the daily report counts, and a request that skipped it
  // would be invisible in both.
  await recordLead(null, {
    email,
    name: name || null,
    kind: 'intros',
    selected: set.records.filter((r) => slots.includes(r.slot)).map((r) => r.name),
    need: null,
    brief: set.brief,
    consent: true,
  });
  await recordInsight('intros', { kind: 'quotes_email', count: slots.length, brief: set.brief });

  return NextResponse.json({
    ok: true,
    dashboard: false,
    experts: redactExperts(set.records, false),
  });
}

async function handleGet(req: NextRequest): Promise<NextResponse> {
  const user = await currentAccount(req.cookies.get(SESSION_COOKIE)?.value);
  // Signed out is a 200 with an empty list, matching /api/me: being signed out
  // is the normal state of this site, not an error worth a red line in the
  // console on every first load.
  if (!user) return NextResponse.json({ signedIn: false, requests: [] });

  const requests = await listQuoteRequests(user.sub);
  return NextResponse.json({
    signedIn: true,
    requests: requests.map((r) => ({
      id: r.id,
      setId: r.setId,
      slots: r.slots,
      status: r.status,
      createdAt: r.createdAt,
      brief: r.brief,
      query: r.query,
      experts: redactExperts(r.experts, false),
    })),
  });
}

export const POST = withMetrics('quotes', handlePost);
export const GET = withMetrics('quotes', handleGet);

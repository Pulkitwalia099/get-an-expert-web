import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';
import { currentAccount } from '@/lib/accounts';
import { withMetrics } from '@/lib/metrics';
import { chooseCandidate, publishChosenSample } from '@/lib/orderCandidates';
import { getOrderForEmail } from '@/lib/orderTracking';
import { clientId, rateLimit } from '@/lib/ratelimit';
import { matchesOrigin } from '@/lib/sanitize';

// Which of the cuts they are taking forward.
//
// Its own route rather than a third action on ../route.ts, because that one
// answers "approve or change this sample" and this answers "which sample".
// They run at different points in the order and share no branch: folding this
// in would put a third meaning behind the same 409 about nothing to review yet.
//
// Deliberately sends no email. A choice is not a status move anybody needs to
// be told about, the order is already sitting at `sample_sent`, and the round
// that does matter is the change request that follows.

async function handlePost(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!matchesOrigin(req.headers.get('origin'), req.headers.get('host'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // Looser than the 10 on the review route. Choosing is reversible in the
  // customer's mind if not in the data, and somebody comparing two cuts may
  // legitimately tap about before settling.
  if (!rateLimit(`${clientId(req)}:order-choose`, 20)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const user = await currentAccount(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });

  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const slug = payload.slug;
  if (typeof slug !== 'string') {
    return NextResponse.json({ error: 'Pick one of the cuts' }, { status: 400 });
  }

  const { id } = await ctx.params;
  const order = await getOrderForEmail(id, user.email);
  // Not yours, not real, or Supabase is down. All three answer 404, so a 403
  // never confirms that this id names somebody's order.
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // A stale tab whose page still shows the cards after the order moved on.
  if (order.status !== 'sample_sent') {
    return NextResponse.json({ error: 'There is nothing to choose yet' }, { status: 409 });
  }

  const result = await chooseCandidate(id, slug);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  // Not awaited into the response's success. The choice is recorded and the
  // page reads it back from the candidate either way; this only saves every
  // downstream reader from having to know candidates exist. Logged rather than
  // surfaced, because there is nothing the customer could do about it.
  const published = await publishChosenSample(id, result.candidate, user.email);
  if (!published) {
    console.error('[midsesh:choose] chose but could not publish the sample', id, result.candidate.slug);
  }

  return NextResponse.json({ ok: true, slug: result.candidate.slug });
}

export const POST = withMetrics('marketplace-choose', handlePost);

import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, readSession } from '@/lib/auth';
import { CONTACT_EMAIL } from '@/lib/contact';
import { sendEmail } from '@/lib/email';
import { withMetrics } from '@/lib/metrics';
import { MAX_COMMENT, isOrderAction } from '@/lib/order-status';
import { appendCustomerEvent, getOrderForEmail } from '@/lib/orderTracking';
import { clientId, rateLimit } from '@/lib/ratelimit';
import { matchesOrigin, scrubUntrusted } from '@/lib/sanitize';

// The customer's two answers: approve, or ask for changes.
//
// Under /api/marketplace rather than /api/orders, which already exists and
// belongs to the setups product. Those two things are both called an order,
// neither is the other, and a reader opening one folder to find both is how
// the wrong one gets edited.
//
// Ownership is checked by reading the order back for this session's address
// before anything is written. The read filters on email in the query, so there
// is no version of this where the write happens against an order the check
// did not cover.

const NOTIFY = process.env.BOOKING_NOTIFY_EMAIL || CONTACT_EMAIL;

async function handlePost(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!matchesOrigin(req.headers.get('origin'), req.headers.get('host'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!rateLimit(`${clientId(req)}:order-action`, 10)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const user = readSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });

  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const action = payload.action;
  if (!isOrderAction(action)) {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const raw = typeof payload.comment === 'string' ? scrubUntrusted(payload.comment).trim() : '';
  // Asking for changes without saying what to change is not a request, it is a
  // round trip that costs the customer another day. Approving needs no words.
  if (action === 'changes' && !raw) {
    return NextResponse.json({ error: 'Tell us what to change' }, { status: 400 });
  }
  const comment = raw ? raw.slice(0, MAX_COMMENT) : null;

  const { id } = await ctx.params;
  const order = await getOrderForEmail(id, user.email);
  // Not yours, not real, or Supabase is down. All three answer 404: a 403
  // would confirm that this id names somebody's order.
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Already approved. Answered as success rather than as an error, because a
  // double tap on a slow connection is not a mistake the customer made, and a
  // second `approved` event would put a duplicate in the trail for nothing.
  if (order.status === 'approved' || order.status === 'delivered') {
    return NextResponse.json({ ok: true, status: order.status });
  }
  // Nothing to answer yet. Guards against a stale tab whose page still shows
  // the buttons after the order moved on.
  if (order.status !== 'sample_sent') {
    return NextResponse.json({ error: 'There is nothing to review yet' }, { status: 409 });
  }

  const written = await appendCustomerEvent(id, action, user.email, comment);
  if (!written) {
    return NextResponse.json({ error: 'That did not save. Try again.' }, { status: 502 });
  }

  // The email is what actually reaches a human. It is awaited so a failure is
  // visible in the daily report, and it is not allowed to fail the request:
  // the event is recorded, which is the part that must not be lost.
  const sent = await sendEmail({
    to: NOTIFY,
    subject:
      action === 'approve'
        ? `Approved: ${order.serviceName || 'order'} from ${user.email}`
        : `Changes asked: ${order.serviceName || 'order'} from ${user.email}`,
    text: [
      `Order: ${id}`,
      `Service: ${order.serviceName || 'unknown'}`,
      `From: ${user.email}`,
      '',
      action === 'approve' ? 'Approved. Send the clean file.' : `Changes asked for:\n${comment}`,
    ].join('\n'),
  });
  if (!sent) console.error('[midsesh:orders] action notification failed', id, action);

  return NextResponse.json({ ok: true, status: action === 'approve' ? 'approved' : 'working' });
}

export const POST = withMetrics('order-action', handlePost);

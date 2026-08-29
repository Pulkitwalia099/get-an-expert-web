import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';
import { currentAccount } from '@/lib/accounts';
import { CONTACT_EMAIL } from '@/lib/contact';
import { MAX_DRAFT, deliveryFor } from '@/lib/delivery';
import { operatorRecipients, sendEmail } from '@/lib/email';
import { withMetrics } from '@/lib/metrics';
import { appendComment, appendDraft } from '@/lib/orderDrafts';
import { getOrderForEmail } from '@/lib/orderTracking';
import { clientId, rateLimit } from '@/lib/ratelimit';
import { matchesOrigin, scrubUntrusted } from '@/lib/sanitize';

// The two things a customer can do to a draft: rewrite it, or say something
// about it.
//
// Beside ../route.ts rather than inside it. That route answers the review with
// approve or changes, both of which move the order's status and email a
// receipt. Neither of these does: an edit adds a version, a comment adds a
// line, the order stays exactly where it was, and folding four verbs with two
// different meanings into one handler is how the wrong one ends up sending an
// email.
//
// Ownership is checked by reading the order back for this session's address,
// with the filter in the query, so there is no version of this where the write
// lands on an order the check did not cover.

const NOTIFY = operatorRecipients(CONTACT_EMAIL);

async function handlePost(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!matchesOrigin(req.headers.get('origin'), req.headers.get('host'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!rateLimit(`${clientId(req)}:order-draft`, 30)) {
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

  const action = payload.action;
  if (action !== 'edit' && action !== 'comment') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const body = typeof payload.body === 'string' ? scrubUntrusted(payload.body).trim() : '';
  if (!body) {
    return NextResponse.json(
      { error: action === 'edit' ? 'There is nothing to save' : 'There is nothing to send' },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  const order = await getOrderForEmail(id, user.email);
  // Not yours, not real, or Supabase is down. All three answer 404: a 403
  // would confirm that this id names somebody's order.
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // A video order has no draft to edit. Checked from the service rather than
  // from whether a draft happens to exist, so the answer is the same before
  // and after somebody writes one.
  if (deliveryFor(order.serviceSlug) !== 'text') {
    return NextResponse.json({ error: 'This order has nothing to edit' }, { status: 409 });
  }

  // Closed orders are read only. Editing a post after it was handed over would
  // change what we delivered without anybody being told, and the trail would
  // still say delivered.
  if (order.status === 'declined' || order.status === 'refunded') {
    return NextResponse.json({ error: 'This order is closed' }, { status: 409 });
  }

  const actor = `customer:${user.email.trim().toLowerCase()}`;
  const written =
    action === 'edit'
      ? await appendDraft(id, body.slice(0, MAX_DRAFT), actor)
      : await appendComment(id, body, actor);

  if (!written.ok) {
    // "The same as the current version" is the customer's own doing and reads
    // as an error they can act on. Everything else is ours and is a 502.
    const theirs = written.error?.startsWith('That is the same');
    return NextResponse.json(
      { error: written.error ?? 'That did not save. Try again.' },
      { status: theirs ? 400 : 502 },
    );
  }

  // Nobody is watching the table, so this is the only thing that says a
  // customer touched their draft. Awaited so a failure shows in the daily
  // report, and not allowed to fail the request: the write is the part that
  // must not be lost.
  const sent = await sendEmail({
    to: NOTIFY,
    subject:
      action === 'edit'
        ? `Draft edited: ${order.serviceName || 'order'} by ${user.email}`
        : `Draft comment: ${order.serviceName || 'order'} from ${user.email}`,
    text: [
      `Order: ${id}`,
      `Service: ${order.serviceName || 'unknown'}`,
      `From: ${user.email}`,
      '',
      action === 'edit' ? 'They saved their own version:' : 'They said:',
      body,
    ].join('\n'),
  });
  if (!sent) console.error('[midsesh:orders] draft notification failed', id, action);

  return NextResponse.json({ ok: true });
}

export const POST = withMetrics('order-draft', handlePost);

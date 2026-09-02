import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';
import { currentAccount } from '@/lib/accounts';
import { CONTACT_EMAIL } from '@/lib/contact';
import { operatorRecipients, sendEmail } from '@/lib/email';
import { withMetrics } from '@/lib/metrics';
import { MAX_COMMENT, isOrderAction } from '@/lib/order-status';
import { MAX_NOTES, compileNotes, isFrameNote } from '@/lib/frames';
import { candidatesFor, chosen } from '@/lib/orderCandidates';
import { appendCustomerEvent, assetsFor, getOrderForEmail } from '@/lib/orderTracking';
import { clientId, rateLimit } from '@/lib/ratelimit';
import { notifyCustomer } from '@/lib/orderMail';
import { revisionsFor } from '@/lib/orderRevisions';
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

const NOTIFY = operatorRecipients(CONTACT_EMAIL);

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

  const user = await currentAccount(req.cookies.get(SESSION_COOKIE)?.value);
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

  // Notes tagged to a frame, or the one free text box that came before them.
  // Both end up as the same block of plain text, because that is what the
  // editor reads, what the alert email carries and what the trail stores.
  //
  // The headings are written here from the frame list on the sample, never from
  // what the browser sent. A tab left open across a recut would otherwise label
  // this round of feedback with the previous cut's shot names, which is worse
  // than no names at all.
  let comment: string | null = null;
  let structured: { frame: number | null; text: string }[] | null = null;
  if (Array.isArray(payload.notes)) {
    const notes = payload.notes.filter(isFrameNote).slice(0, MAX_NOTES);
    if (notes.length > 0) {
      const { frames } = await assetsFor(id);
      const scrubbed = notes.map((note) => ({
        frame: note.frame,
        text: scrubUntrusted(note.text).trim(),
      }));
      const block = compileNotes(scrubbed, frames ?? []);
      comment = block ? block.slice(0, MAX_COMMENT) : null;
      // Kept alongside the prose, scrubbed the same way, so the trail holds the
      // structure as well as the sentence. A frame number naming no frame is
      // stored as written: the compiled block already fell back to the whole
      // video for it, and rewriting the data to match the prose would lose the
      // fact that a stale tab sent it.
      structured = scrubbed.filter((n) => n.text.length > 0);
    }
  } else if (typeof payload.comment === 'string') {
    const raw = scrubUntrusted(payload.comment).trim();
    comment = raw ? raw.slice(0, MAX_COMMENT) : null;
  }

  // Asking for changes without saying what to change is not a request, it is a
  // round trip that costs the customer another day. Approving needs no words.
  if (action === 'changes' && !comment) {
    return NextResponse.json({ error: 'Tell us what to change' }, { status: 400 });
  }
  if (action === 'approve') {
    comment = null;
    structured = null;
  }

  const written = await appendCustomerEvent(id, action, user.email, comment, structured);
  if (!written) {
    return NextResponse.json({ error: 'That did not save. Try again.' }, { status: 502 });
  }

  // The email is what actually reaches a human. It is awaited so a failure is
  // visible in the daily report, and it is not allowed to fail the request:
  // the event is recorded, which is the part that must not be lost.
  // Which cut this is about, when the order offered a choice. On a one cut
  // order this is null and the email reads exactly as it always did. On a
  // multi team order it is the difference between knowing somebody wants
  // changes and knowing which team has to make them.
  const picked = chosen(await candidatesFor(id));
  const cut = picked ? (picked.label ? `${picked.label}: ${picked.title}` : picked.title) : null;

  // Whether they were looking at a recut rather than a first cut.
  //
  // The page calls the second button Reject once the round it answers is
  // closed, and the action it posts is still `changes`, because the machinery
  // is the same. Only the wording differs, and it differs in both directions:
  // an alert saying "Changes asked" for somebody who pressed Reject reads as a
  // revision request, and a receipt promising a new version promises work
  // nobody agreed to.
  const trail = await revisionsFor(id);
  const onRecut = Boolean(trail[trail.length - 1]?.after);

  const sent = await sendEmail({
    to: NOTIFY,
    subject:
      (action === 'approve' ? 'Approved' : onRecut ? 'Rejected' : 'Changes asked') +
      (cut ? ` on ${cut}` : '') +
      `: ${order.serviceName || 'order'} from ${user.email}`,
    text: [
      `Order: ${id}`,
      `Service: ${order.serviceName || 'unknown'}`,
      `From: ${user.email}`,
      cut ? `Cut: ${cut}` : '',
      picked?.ledBy ? `Made by: ${picked.ledBy}` : '',
      '',
      action === 'approve'
        ? 'Approved. Send the clean file.'
        : `${onRecut ? 'Rejected. Reason' : 'Changes asked for'}:\n${comment}`,
      '',
      `Order page: https://midsesh.com/orders/${id}`,
    ]
      .filter(Boolean)
      .join('\n'),
  });
  if (!sent) console.error('[midsesh:orders] action notification failed', id, action);

  // And the customer's own receipt. Called directly rather than through
  // /api/operator/order-mail because that route exists to let the orders repo
  // reach this code, and we are already inside it.
  //
  // `afterChanges` is why this is not left to a generic status hook. A
  // `working` event from us means we started; the same event from them means
  // they asked for a recut, and only one of those is worth an email. The
  // difference lives in who wrote it, which only this route knows.
  const told = await notifyCustomer({
    orderId: id,
    email: user.email,
    status: action === 'approve' ? 'approved' : 'working',
    serviceName: order.serviceName,
    // What they wrote on the order first, and the name on their Google account
    // second. The order is the more deliberate of the two.
    name: order.name ?? user.name,
    afterChanges: action === 'changes',
    rejected: action === 'changes' && onRecut,
  });
  if (told === 'failed') console.error('[midsesh:orders] customer receipt failed', id, action);

  return NextResponse.json({ ok: true, status: action === 'approve' ? 'approved' : 'working' });
}

export const POST = withMetrics('order-action', handlePost);

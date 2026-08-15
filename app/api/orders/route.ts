import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';
import { currentAccount } from '@/lib/accounts';
import { formatCents } from '@/lib/credits';
import { sendEmail } from '@/lib/email';
import { recordInsight } from '@/lib/insights';
import { withMetrics } from '@/lib/metrics';
import { placeOrder } from '@/lib/orders';
import { clientId, rateLimit } from '@/lib/ratelimit';
import { matchesOrigin } from '@/lib/sanitize';
import { CONTACT_EMAIL } from '@/lib/contact';
import { getSetup } from '@/lib/setups';

// Placing an order. No card, no processor, nothing charged.
//
// The booking sheet promises "$0 to pay today, you pay once the setup is
// running", and that promise survives this route unchanged. An order is a
// request with a price agreed on it, so the only money that moves is credit,
// which is ours to give.
//
// Everything is written before the confirmation is returned, and the response
// says plainly what did and did not land. A button that says "ordered" over an
// order that was never written is the one outcome worth writing extra code to
// avoid.

const NOTIFY = process.env.BOOKING_NOTIFY_EMAIL || CONTACT_EMAIL;

async function handlePost(req: NextRequest): Promise<NextResponse> {
  if (!matchesOrigin(req.headers.get('origin'), req.headers.get('host'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const user = await currentAccount(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  }

  if (!rateLimit(`orders:${clientId(req)}`, 12)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const setup = typeof body.slug === 'string' ? getSetup(body.slug) : undefined;
  if (!setup) {
    return NextResponse.json({ error: 'Unknown setup' }, { status: 400 });
  }

  // The browser sends a fresh key per attempt, so a retry after a dropped
  // connection settles onto the same order rather than opening a second one.
  // A missing key is not fatal, it only means that request is not retryable.
  const key = typeof body.key === 'string' && body.key.length >= 8 ? body.key.slice(0, 64) : null;
  const ref = `order:${key ?? `${Date.now()}`}`;

  const placed = await placeOrder({ sub: user.sub, setup, ref });
  const { priceCents, creditCents, dueCents } = placed;

  await recordInsight('order', {
    email: user.email,
    slug: setup.slug,
    priceCents,
    creditCents,
    dueCents,
    stored: placed.stored,
    from: 'web',
  });

  // The email is what actually reaches a human, so it is awaited and its
  // result reported. While the tables are still unmigrated this is the only
  // record an order has, which is exactly why it is not fire and forget.
  const notified = await sendEmail({
    to: NOTIFY,
    subject: `Order: ${setup.title} from ${user.name || user.email}`,
    text: [
      `Setup: ${setup.title} (${setup.slug})`,
      `Name: ${user.name ?? 'not given'}`,
      `Email: ${user.email}`,
      `Price: ${formatCents(priceCents)}`,
      `Credit applied: ${formatCents(creditCents)}`,
      `Due after delivery: ${formatCents(dueCents)}`,
      placed.stored ? '' : 'NOT STORED: the orders table rejected this write.',
    ]
      .filter(Boolean)
      .join('\n'),
  });

  return NextResponse.json({
    ok: true,
    stored: placed.stored,
    notified,
    price: formatCents(priceCents),
    credit: formatCents(creditCents),
    due: formatCents(dueCents),
    dueCents,
  });
}

export const POST = withMetrics('orders', handlePost);

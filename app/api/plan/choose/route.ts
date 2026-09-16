import { NextRequest, NextResponse } from 'next/server';
import { currentAccount } from '@/lib/accounts';
import { SESSION_COOKIE } from '@/lib/auth';
import { CONTACT_EMAIL } from '@/lib/contact';
import { operatorRecipients, sendEmail } from '@/lib/email';
import { signEmailToken } from '@/lib/emailAuth';
import { withMetrics } from '@/lib/metrics';
import { OPERATOR_COOKIE, operatorCookieValid } from '@/lib/operatorAuth';
import { labelFor, parseStartOn } from '@/lib/plan-dates';
import { recordChoice } from '@/lib/planChoices';
import { ownsPlan, planBySlug } from '@/lib/plans';
import { clientId, rateLimit } from '@/lib/ratelimit';
import { matchesOrigin } from '@/lib/sanitize';

// The customer confirms a cadence and a start date.
//
// Nothing is charged. A confirmation is one row and two emails: one to us,
// so the choice is seen the minute it is made, and one to them, so the page
// they just read has a copy in their inbox with the way back to it.
//
// Who pressed the button decides what the row says and who gets mail. The
// signed in owner of the plan is the real thing and gets the confirmation.
// An operator, or anyone on a preview deploy, is us checking the page: the
// row is filed under the customer with `actor` saying so, we get the alert
// marked as a test, and the customer hears nothing.

const NOTIFY = operatorRecipients(CONTACT_EMAIL);

function origin(): string {
  return (process.env.AUTH_ORIGIN || 'https://midsesh.com').replace(/\/+$/, '');
}

async function handlePost(req: NextRequest): Promise<NextResponse> {
  if (!matchesOrigin(req.headers.get('origin'), req.headers.get('host'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!rateLimit(`${clientId(req)}:plan-choose`, 20)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const plan = typeof payload.slug === 'string' ? planBySlug(payload.slug) : null;
  if (!plan) return NextResponse.json({ error: 'No such plan' }, { status: 404 });

  // Only a cadence the plan offers, read from the catalogue and never from
  // the request. A number that arrives in a payload is a number the sender
  // chose.
  const tier = plan.tiers.find((t) => t.videos === payload.videos);
  if (!tier) return NextResponse.json({ error: 'Pick a cadence from the plan' }, { status: 400 });

  const startOn = parseStartOn(payload.startOn);
  if (!startOn) return NextResponse.json({ error: 'Pick a start date from the list' }, { status: 400 });

  // Who is this. The owner first, then us.
  let actor: string | null = null;
  let customer = false;
  const user = await currentAccount(req.cookies.get(SESSION_COOKIE)?.value);
  if (user && ownsPlan(plan, user.email)) {
    actor = `customer:${plan.email}`;
    customer = true;
  } else if (operatorCookieValid(req.cookies.get(OPERATOR_COOKIE)?.value)) {
    actor = 'operator';
  } else if (process.env.VERCEL_ENV === 'preview') {
    actor = 'preview';
  }
  if (!actor) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });

  const stored = await recordChoice({
    planSlug: plan.slug,
    email: plan.email,
    cadence: tier.videos,
    startOn,
    actor,
  });

  const when = labelFor(startOn);
  const line = `${plan.brand}: ${tier.videos} videos a month, starting ${when}.`;

  // Us first. The row not landing is exactly the case we most need to hear
  // about, so the alert goes out either way and says which it was.
  const alerted = await sendEmail({
    to: NOTIFY,
    subject: `${customer ? '' : '[test] '}${plan.brand} chose ${tier.videos} videos a month from ${when}`,
    text: [
      line,
      '',
      `Chosen by: ${actor}`,
      `Recorded in plan_choices: ${stored ? 'yes' : 'NO, the write failed'}`,
      '',
      `Plan page: ${origin()}/account/plan/${plan.slug}`,
    ].join('\n'),
  });

  let confirmed = false;
  if (customer) {
    const token = signEmailToken(plan.email);
    const link = token
      ? `${origin()}/api/auth/email/callback?t=${encodeURIComponent(token)}&next=${encodeURIComponent(`/account/plan/${plan.slug}`)}`
      : `${origin()}/account/plan/${plan.slug}`;
    confirmed = await sendEmail({
      to: plan.email,
      subject: `Your ${plan.brand} plan: ${tier.videos} videos a month from ${when}`,
      text: [
        `You chose ${tier.videos} videos a month for ${plan.brand}, starting ${when}.`,
        '',
        'WHAT HAPPENS NEXT',
        'We send you the first video type we recommend, with the script. From there we get going.',
        'Nothing is charged now. You pay once the month’s videos are delivered.',
        '',
        `Your plan: ${link}`,
        '',
        'That link signs you in and opens the plan. It expires in 30 minutes; ask for a new one any time at',
        `${origin()}/signin with this address.`,
        '',
        'If anything is unclear, just reply here.',
        '',
        'midsesh team',
        'midsesh.com',
      ].join('\n'),
    });
  }

  return NextResponse.json({ ok: true, stored, alerted, confirmed, cadence: tier.videos, startOn });
}

export const POST = withMetrics('plan-choose', handlePost);

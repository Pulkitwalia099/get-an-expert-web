import { hasEmailKey, sendEmail } from '@/lib/email';
import { EMAIL_TOKEN_MAX_AGE, signEmailToken } from '@/lib/emailAuth';
import type { OrderStatus } from '@/lib/order-status';

// What the customer is told when their order moves, and when to say nothing.
//
// Every status change in the business goes through advance() in
// ~/Programs/get-an-expert-orders, so that is the one place a notification can
// hook without missing cases. It calls this app rather than sending directly,
// because the mail has to carry a sign in link and that link is signed with
// SESSION_SECRET. Spreading a signing secret to a second repo to save one HTTP
// call is a bad trade.
//
// The link is the point of the whole thing. "Your ad is ready" with a Sign in
// button is a chore; the same sentence with a link that opens the ad is not.

if (typeof window !== 'undefined') {
  throw new Error('lib/orderMail is server-only and must never reach the client');
}

interface Copy {
  subject: string;
  lead: string;
  cta: string;
}

/**
 * What each status is worth an email for. Null means say nothing.
 *
 * `new` is silent on purpose: the intake form already confirms the order in
 * the same minute, and a second "we got it" teaches people that our mail is
 * noise, which is exactly what you cannot afford when `sample_sent` lands.
 *
 * `working` is silent for the same reason on a first pass. It is only worth an
 * email when it follows a change request, which the caller signals rather than
 * this module guessing, because the difference is in the trail and not in the
 * status.
 */
function copyFor(status: OrderStatus, service: string, afterChanges: boolean): Copy | null {
  switch (status) {
    case 'sample_sent':
      return {
        subject: `Your ${service} ad is ready to watch`,
        lead: 'Your ad is ready. Watch it, then either approve it or tell us what to change. One revision is included.',
        cta: 'Watch it',
      };
    case 'approved':
      return {
        subject: 'Approved, the clean file is on its way',
        lead: 'Thanks. We are preparing the clean file without the watermark and it will appear on your order page.',
        cta: 'See your order',
      };
    case 'delivered':
      return {
        subject: `Your ${service} ad, clean file`,
        lead: 'The clean file is ready, with full usage rights. No watermark.',
        cta: 'Download it',
      };
    case 'declined':
      return {
        subject: 'About your order',
        lead: 'We are not taking this one on, and we would rather say so than sit on it. Nothing has been charged.',
        cta: 'See your order',
      };
    case 'refunded':
      return {
        subject: 'Your order was refunded',
        lead: 'This order has been refunded. It should be back with you within a few working days.',
        cta: 'See your order',
      };
    case 'working':
      return afterChanges
        ? {
            subject: 'We are on your notes',
            lead: 'Got your notes. We are recutting now and will send the new version to this address.',
            cta: 'See your order',
          }
        : null;
    case 'new':
      return null;
  }
}

function origin(): string {
  return (process.env.AUTH_ORIGIN || 'https://midsesh.com').replace(/\/+$/, '');
}

function body(copy: Copy, link: string): string {
  return [
    copy.lead,
    '',
    `${copy.cta}: ${link}`,
    '',
    'That link signs you in, so there is no password to remember. It is good',
    `for ${EMAIL_TOKEN_MAX_AGE / 60} minutes. After that, go to ${origin()}/orders and`,
    'ask for a new one with this address.',
  ].join('\n');
}

export interface OrderMailInput {
  orderId: string;
  email: string;
  status: OrderStatus;
  serviceName: string | null;
  /** True when this `working` event came from the customer asking for changes. */
  afterChanges?: boolean;
}

export type OrderMailResult = 'sent' | 'skipped' | 'failed' | 'unavailable';

/**
 * Tell the customer their order moved.
 *
 * Returns what happened rather than throwing, because the caller has already
 * written the status event by the time this runs. A failed email must never
 * roll back a status change that is true.
 */
export async function notifyCustomer(input: OrderMailInput): Promise<OrderMailResult> {
  if (!hasEmailKey()) return 'unavailable';

  const service = input.serviceName?.replace(/\s*·.*$/, '').trim() || 'your';
  const copy = copyFor(input.status, service, input.afterChanges === true);
  if (!copy) return 'skipped';

  const token = signEmailToken(input.email);
  if (!token) return 'unavailable';

  // Deep link to the order, not the list. `next` is matched against an
  // allowlist in the callback, so this cannot become an open redirect.
  const link =
    `${origin()}/api/auth/email/callback` +
    `?t=${encodeURIComponent(token)}` +
    `&next=${encodeURIComponent(`/orders/${input.orderId}`)}`;

  const ok = await sendEmail({
    to: input.email,
    subject: copy.subject,
    text: body(copy, link),
  });
  return ok ? 'sent' : 'failed';
}

import { hasEmailKey, sendEmail } from '@/lib/email';
import { EMAIL_TOKEN_MAX_AGE, signEmailToken } from '@/lib/emailAuth';
import { firstName, greeting } from '@/lib/initials';
import { selectRows } from '@/lib/supabase';
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
//
// No email here mentions money. Nothing is charged automatically and a price
// is agreed before an order exists, so a figure in a status email is either
// repeating what they already agreed or contradicting it.

if (typeof window !== 'undefined') {
  throw new Error('lib/orderMail is server-only and must never reach the client');
}

interface Copy {
  subject: string;
  /** Everything above the link. An empty string is a blank line. */
  lines: string[];
  cta: string;
}

/**
 * Whether the thing being delivered is watched or read.
 *
 * Orders arrive from five services and counting, so the copy cannot say "ad".
 * A LinkedIn order reading "Your LinkedIn Growth Engine ad is ready to watch"
 * is the kind of mistake that tells somebody their order was handled by a
 * template. Matched on the service name the order carries, with the neutral
 * wording as the default, because a new service nobody has told this file
 * about must still produce a sentence that is true.
 */
function isWatchable(service: string): boolean {
  return /\b(video|videos|ugc|ad|ads|reel|reels|explainer|clip|clips|cut)\b/i.test(service);
}

/** The brief, short enough to sit in an email without becoming the email. */
function briefLines(brief: string | null | undefined): string[] {
  const clean = brief?.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  return [clean.length > 240 ? `${clean.slice(0, 240).trimEnd()}...` : clean];
}

/**
 * What each status is worth an email for. Null means say nothing.
 *
 * `new` used to be silent, on the argument that the intake form already says
 * "we got it" in the same minute and a second one teaches people this mail is
 * noise. That argument holds for a bare acknowledgement and not for this one:
 * what goes out now is what they ordered, what happens next, and what one
 * revision and full usage rights actually mean. It is the only email that
 * arrives before there is anything to look at, so it is the only chance to set
 * expectations before the sample lands.
 *
 * `working` stays silent on a first pass. "We have started" is not news. It
 * earns an email only when it follows a change request, which the caller
 * signals rather than this module guessing, because the difference is in the
 * trail and not in the status.
 */
function copyFor(
  status: OrderStatus,
  service: string,
  afterChanges: boolean,
  brief: string | null | undefined,
  firstOrder: boolean,
): Copy | null {
  const watch = isWatchable(service);

  switch (status) {
    case 'new':
      return {
        subject: `We have your ${service} order`,
        lines: [
          'Thanks for your order. Here is what we have.',
          '',
          'WHAT YOU ORDERED',
          service,
          ...briefLines(brief),
          '',
          'WHAT HAPPENS NEXT',
          'We are starting on it now. When the first version is ready, you',
          'will get an email with a link that opens it. There is no password',
          'to remember and no account to set up.',
          '',
          // Asking for a call reads as a delay unless the reason is given, so
          // the reason is given. It is also the honest description of how this
          // actually goes: a thin brief costs a revision round, and ten
          // minutes on a call costs less than that for everybody.
          'If anything in your brief leaves us guessing, we will write to you',
          'and ask for a short call before we start. Ten minutes on a call is',
          'better than sending you something you did not ask for.',
          '',
          'WHAT IS INCLUDED',
          'You get one round of changes once you have seen the first version.',
          ...(watch
            ? ['The final file has no watermark, and the usage rights are yours.']
            : ['The finished work is yours to use, with full rights.']),
          '',
          'WORTH KNOWING',
          'Nothing is charged automatically, and nothing is final until you',
          'approve it. If we cannot take the job on, we will tell you quickly',
          'rather than sit on it.',
          // Only on a first order, and only because it is true. On the fourth
          // one it would read as a form letter that cannot count.
          ...(firstOrder
            ? [
                '',
                'This is your first order with us, and we know that takes some',
                'trust. Thank you for it. If anything is unclear at any point,',
                'reply to this email and we will answer.',
              ]
            : []),
        ],
        cta: 'Your order',
      };
    case 'sample_sent':
      return {
        subject: `Your ${service} is ready to ${watch ? 'watch' : 'review'}`,
        lines: [
          `Your ${service} is ready. Take a look, then either approve it or`,
          'tell us what to change. One round of changes is included.',
        ],
        cta: watch ? 'Watch it' : 'Open it',
      };
    case 'working':
      return afterChanges
        ? {
            subject: 'We are on your notes',
            lines: [
              'Got your notes. We are working on the new version now and will',
              'send it to this address.',
            ],
            cta: 'Your order',
          }
        : null;
    case 'approved':
      return {
        subject: watch ? 'Approved. The final file is next' : 'Approved. The finished work is next',
        lines: watch
          ? [
              'Thanks for approving. We are preparing the final file with no',
              'watermark, and it will appear on your order page. You will get',
              'an email the moment it is there.',
            ]
          : [
              'Thanks for approving. We are finishing it now and it will appear',
              'on your order page. You will get an email the moment it is there.',
            ],
        cta: 'Your order',
      };
    case 'delivered':
      return {
        subject: watch
          ? `Your ${service} is ready to download`
          : `Your ${service} is ready`,
        lines: watch
          ? ['The final file is ready. No watermark, and the usage rights are', 'yours.']
          : ['The finished work is ready, and the usage rights are yours.'],
        cta: watch ? 'Download it' : 'Open it',
      };
    case 'declined':
      // Vague on purpose. "We are not taking your order" is a subject line
      // read on a phone, in public, with no way to answer it. The reason
      // belongs in the first line, where they are already reading.
      return {
        subject: 'About your order',
        lines: [
          'We are not taking this one on. We would rather say so now than sit',
          'on it for a week. Nothing has been charged.',
          '',
          'If the brief could change, or you would like a second look, reply',
          'to this email.',
        ],
        cta: 'Your order',
      };
    case 'refunded':
      return {
        subject: 'Your refund is on the way',
        lines: [
          'This order has been refunded. The money should be back with you',
          'within a few working days, depending on your bank.',
        ],
        cta: 'Your order',
      };
  }
}

/**
 * The name on the account with this address, or null.
 *
 * Null for every reason, including Supabase being unreachable. A greeting is
 * the smallest thing in the email, so anything that goes wrong here falls back
 * to "Hi," rather than holding up a message somebody is waiting on.
 */
async function accountName(email: string): Promise<string | null> {
  const address = email.trim().toLowerCase();
  if (!address) return null;
  const rows = await selectRows<{ name: string | null }>(
    'accounts',
    `select=name&email=eq.${encodeURIComponent(address)}&limit=1`,
  );
  return rows?.[0]?.name ?? null;
}

function origin(): string {
  return (process.env.AUTH_ORIGIN || 'https://midsesh.com').replace(/\/+$/, '');
}

function body(copy: Copy, link: string, name: string | null | undefined): string {
  return [
    // Their first name when the field holds one, and a bare "Hi," when it does
    // not. `greeting` refuses anything doubtful, because an email opening "Hi
    // TEST SUBMISSION," is worse than one that opens with no name at all.
    greeting(name),
    '',
    ...copy.lines,
    '',
    `${copy.cta}: ${link}`,
    '',
    `That link signs you in and opens this order. It expires in ${EMAIL_TOKEN_MAX_AGE / 60} minutes,`,
    `and everything stays on your order page. Ask for a new link any time at`,
    `${origin()}/signin with this address.`,
    '',
    'Just reply to this email if you need anything.',
    '',
    'midsesh team',
    `${origin().replace(/^https?:\/\//, '')}`,
  ].join('\n');
}

export interface OrderMailInput {
  orderId: string;
  email: string;
  status: OrderStatus;
  serviceName: string | null;
  /** Whatever they typed in the name field. Free text, and often not a name. */
  name?: string | null;
  /** What they asked for, shown back to them on the confirmation. */
  brief?: string | null;
  /** True when this `working` event came from the customer asking for changes. */
  afterChanges?: boolean;
  /**
   * True when this is the first order this address has ever placed. Unknown
   * counts as false: a returning customer told they are new is worse than a
   * new one who is not thanked.
   */
  firstOrder?: boolean;
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

  // The order usually has no name on it. `public/services/intake.js` posts
  // `name: ''` because the form asks for an email address and nothing else, so
  // every real row in mk_orders has a null name and the greeting would never
  // fire on the strength of the order alone.
  //
  // An account is the other place a name exists, put there by Google at sign
  // in, and it is keyed by the same address the mail is going to. So somebody
  // who has signed in once gets greeted by name from then on, including on
  // orders they placed before they had an account.
  const name = firstName(input.name) ? input.name : await accountName(input.email);

  // The stored name can carry a trailing qualifier after a dot separator, and
  // 'order' is the fallback so a row with no service still produces a sentence
  // rather than "Your  is ready".
  const service = input.serviceName?.replace(/\s*·.*$/, '').trim() || 'order';
  const copy = copyFor(
    input.status,
    service,
    input.afterChanges === true,
    input.brief,
    input.firstOrder === true,
  );
  if (!copy) return 'skipped';

  const token = signEmailToken(input.email);
  if (!token) return 'unavailable';

  // Deep link to the order, not the list. `next` is matched against an
  // allowlist in lib/auth, so this cannot become an open redirect.
  const link =
    `${origin()}/api/auth/email/callback` +
    `?t=${encodeURIComponent(token)}` +
    `&next=${encodeURIComponent(`/orders/${input.orderId}`)}`;

  const ok = await sendEmail({
    to: input.email,
    subject: copy.subject,
    text: body(copy, link, name),
  });
  return ok ? 'sent' : 'failed';
}

// What an order's status is called, and which of the four boxes it lights up.
//
// Split out of lib/orderTracking.ts for the same reason lib/quote-status.ts is
// split out of lib/quotes.ts: that module is server-only and throws on sight of
// a browser, and the actions on the order page are a client component that
// needs these labels. This file carries no secrets and touches nothing.
//
// The stored values never reach a visitor. `sample_sent` is a database string
// and "Sample ready" is what a person reads.

export type OrderStatus =
  | 'new'
  | 'working'
  | 'sample_sent'
  | 'approved'
  | 'delivered'
  | 'declined'
  | 'refunded';

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'new',
  'working',
  'sample_sent',
  'approved',
  'delivered',
  'declined',
  'refunded',
];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value);
}

/**
 * The four steps, in order.
 *
 * Four rather than seven because a status page answers one question, which is
 * whose turn it is. Seven boxes answers a different question that only we have.
 */
export const STEPS = ['Received', 'In progress', 'Sample ready', 'Done'] as const;

/**
 * Which step a status sits on, or null for the two that end the ladder early.
 *
 * `approved` and `delivered` share the last step on purpose. From the
 * customer's side the review is over in both cases, and the difference, which
 * is whether we have sent the clean file yet, is what the note says rather
 * than a fifth box.
 */
export function stepFor(status: OrderStatus): number | null {
  switch (status) {
    case 'new':
      return 0;
    case 'working':
      return 1;
    case 'sample_sent':
      return 2;
    case 'approved':
    case 'delivered':
      return 3;
    case 'declined':
    case 'refunded':
      return null;
  }
}

/** The headline on the order page. */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Received',
  working: 'In progress',
  sample_sent: 'Your sample is ready',
  approved: 'Approved',
  delivered: 'Ready to download',
  declined: 'Not going ahead',
  refunded: 'Refunded',
};

/** The line under it. Says whose turn it is, in every case. */
export const STATUS_NOTES: Record<OrderStatus, string> = {
  new: 'We have your brief. Work starts within a few hours.',
  working: 'Being made now. Your sample lands within 24 hours of a complete brief.',
  sample_sent: 'Watch it below, then either approve it or tell us what to change.',
  approved: 'Thanks. We are preparing the clean file and it will appear here.',
  delivered: 'The clean file is yours, with full usage rights.',
  declined: 'We are not taking this one on. Check your email for why.',
  refunded: 'This order was refunded.',
};

/** True when the customer has something to do. Drives the two buttons. */
export function awaitingCustomer(status: OrderStatus): boolean {
  return status === 'sample_sent';
}

/** The two things a customer can do, as the API accepts them. */
export type OrderAction = 'approve' | 'changes';

export function isOrderAction(value: unknown): value is OrderAction {
  return value === 'approve' || value === 'changes';
}

/** Longest comment we store. Anything past this is kept, not rejected. */
export const MAX_COMMENT = 2_000;

/**
 * How long ago, in the roughest useful unit.
 *
 * Lifted from components/RequestList.tsx rather than imported from it, because
 * that one is a client component and this file is imported by a server one.
 * Precision past "3 days ago" is noise on a page whose promise is in days.
 */
export function ago(iso: string | null): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

import { STATUS_LABELS as ORDER_LABELS, type OrderStatus } from '@/lib/order-status';
import { STATUS_LABELS as QUOTE_LABELS, type QuoteStatus } from '@/lib/quote-status';

// Two vocabularies, one list.
//
// /orders talks about orders and /dashboard talks about requests, and both are
// right on their own page. /account is the one place a person sees everything
// they have with us, so the two have to collapse into rows that sort against
// each other. This is the only part of that page with logic, which is why it
// is a module rather than a loop inside the page.
//
// Browser safe and pure. The input shapes are declared here structurally
// rather than imported from lib/orderTracking and lib/quotes, both of which
// are server-only and throw on sight of a browser: TypeScript matches them by
// shape, so the page passes CustomerOrder[] and QuoteRequest[] straight in and
// this file never names one of those modules even in a type position.

export type TimelineKind = 'order' | 'request';

export interface TimelineItem {
  kind: TimelineKind;
  id: string;
  /** ISO. What the list is sorted on. */
  at: string;
  /** The service for an order, the brief line for a request. */
  title: string;
  /** The label already written for that vocabulary, never a stored value. */
  state: string;
  /** Where the row goes. Orders keep their own page; requests keep theirs. */
  href: string;
}

interface TimelineOrder {
  id: string;
  createdAt: string;
  serviceName: string | null;
  status: OrderStatus;
}

interface TimelineRequest {
  id: string;
  createdAt: string;
  status: QuoteStatus;
}

/**
 * Newest first.
 *
 * An unparseable date sorts to the end rather than throwing. `created_at`
 * comes back through mk_orders_current, a view this repo does not own, and a
 * page that renders nothing at all because one row has a bad timestamp is a
 * worse outcome than a row in the wrong place.
 */
function at(iso: string): number {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : -Infinity;
}

/**
 * One time ordered list.
 *
 * `titleFor` is passed in rather than imported, because writing a request's
 * title means calling briefLine in lib/quotes, and that module is server-only.
 * The page already has the brief, so it hands over the sentence.
 *
 * Generic over the request, so the callback is handed the caller's own richer
 * object rather than the four fields this module cares about. Without that,
 * the page would have to look each request back up by id to reach its brief.
 */
export function mergeTimeline<R extends TimelineRequest>(
  orders: readonly TimelineOrder[],
  requests: readonly R[],
  titleFor: (request: R) => string,
): TimelineItem[] {
  const items: TimelineItem[] = [
    ...orders.map((o) => ({
      kind: 'order' as const,
      id: o.id,
      at: o.createdAt,
      title: o.serviceName || 'Order',
      state: ORDER_LABELS[o.status] ?? 'In progress',
      // The order's own page, which is what every status email links to. The
      // merged view must never become the only way to reach one.
      href: `/orders/${o.id}`,
    })),
    ...requests.map((r) => ({
      kind: 'request' as const,
      id: r.id,
      at: r.createdAt,
      title: titleFor(r),
      state: QUOTE_LABELS[r.status] ?? 'Reaching out',
      // /dashboard is where a request's people and their links live. There is
      // no per request page to send anybody to.
      href: '/dashboard',
    })),
  ];
  // Sorted on a copy, because the caller's arrays are not ours to reorder.
  return items.sort((a, b) => at(b.at) - at(a.at));
}

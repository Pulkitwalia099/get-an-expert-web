// What a request's status is called, and nothing else.
//
// Split out of lib/quotes.ts because that module is server-only: it holds the
// Supabase writes and the intent signing, and it throws if it ever reaches a
// browser. The dashboard renders these labels in a client component, which is
// the one thing that module could not be asked for.
//
// This is the same split as lib/credit-math.ts against lib/credits.ts, and it
// exists for the same reason: a value both sides need, sitting in a file that
// carries no secrets and touches nothing.

export type QuoteStatus = 'open' | 'contacting' | 'quotes_ready' | 'closed';

/** What a visitor is told each status means. The stored values never appear. */
export const STATUS_LABELS: Record<QuoteStatus, string> = {
  open: 'Reaching out',
  contacting: 'Waiting on replies',
  quotes_ready: 'Quotes sent to you',
  closed: 'Closed',
};

export const STATUS_NOTES: Record<QuoteStatus, string> = {
  open: 'We have your request and are contacting these people now.',
  contacting: 'Messages are out. We email you as soon as prices come back.',
  quotes_ready: 'Check your inbox. Every quote we got back is in there.',
  closed: 'This one is finished.',
};

/**
 * The same four statuses, named for us rather than for a visitor.
 *
 * The labels above are written to be read by somebody waiting: "Quotes sent to
 * you", "Reaching out". In an operator picker those read as instructions to
 * the wrong person, and "to you" points at the operator. Same values, plainer
 * words.
 */
export const QUEUE_LABELS: Record<QuoteStatus, string> = {
  open: 'Open',
  contacting: 'Contacting',
  quotes_ready: 'Quotes sent',
  closed: 'Closed',
};

export function isQuoteStatus(value: unknown): value is QuoteStatus {
  return typeof value === 'string' && value in QUEUE_LABELS;
}

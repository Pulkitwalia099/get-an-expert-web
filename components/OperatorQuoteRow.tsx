'use client';

import type { Promised } from '@/lib/promise-clock';
import { QUEUE_LABELS, type QuoteStatus } from '@/lib/quote-status';

// One quote request in the queue.
//
// Not a link. There is no request detail page and there does not need to be:
// everything about a request is its search, who asked, how many people they
// picked and how long it has been. The only thing to do with one is move it,
// so the move is on the row.
//
// A native select rather than three buttons, because this is worked one handed
// on a phone: the OS picker is one tap and three pills beside a heading would
// not fit at all.

export interface QuoteRow {
  id: string;
  email: string;
  status: QuoteStatus;
  slots: number[];
  title: string;
  createdAt: string;
}

const ORDER: QuoteStatus[] = ['open', 'contacting', 'quotes_ready', 'closed'];

export default function OperatorQuoteRow({
  quote,
  promise,
  busy,
  onMove,
}: {
  quote: QuoteRow;
  promise: Promised;
  busy: boolean;
  onMove: (id: string, status: QuoteStatus) => void;
}) {
  const people = quote.slots.length;
  return (
    <div className="opq-quote">
      <span className="opq-row-top">
        <span className="opq-service">{quote.title}</span>
        {promise.label && (
          <span className={`opq-clock opq-clock-${promise.heat}`}>{promise.label}</span>
        )}
      </span>
      <span className="opq-row-meta">
        {quote.email} · {people} {people === 1 ? 'person' : 'people'}
        {promise.age ? ` · waiting ${promise.age}` : ''}
      </span>
      <label className="opq-quote-move">
        <span>Status</span>
        <select
          value={quote.status}
          disabled={busy}
          onChange={(e) => onMove(quote.id, e.target.value as QuoteStatus)}
        >
          {ORDER.map((s) => (
            <option key={s} value={s}>
              {QUEUE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

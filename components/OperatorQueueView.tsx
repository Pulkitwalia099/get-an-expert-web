'use client';

import { useEffect, useMemo, useState } from 'react';
import OperatorQuoteRow, { type QuoteRow } from '@/components/OperatorQuoteRow';
import OperatorTiles from '@/components/OperatorTiles';
import {
  ORDER_QUEUE_LABELS,
  board,
  rowsFor,
  type Placed,
  type Tile,
} from '@/lib/operator-lanes';
import type { OrderStatus } from '@/lib/order-status';
import type { Promised } from '@/lib/promise-clock';
import type { QuoteStatus } from '@/lib/quote-status';

// The queue, grouped by whose turn it is.
//
// It used to be one list, newest first, mixing orders somebody has been
// waiting six days for with a sample sent an hour ago. Newest first is the
// wrong order for a queue: the row most at risk of somebody giving up is the
// oldest one, and it was at the bottom.
//
// Split out of app/operator/orders/page.tsx, which was already over the 400
// line rule before any of this. Everything about picking a lane and a colour
// is in lib/operator-lanes and lib/promise-clock, so this file is markup.

export interface OrderRow {
  id: string;
  email: string;
  status: OrderStatus;
  serviceName: string | null;
  brief: string | null;
  createdAt: string;
  statusAt: string | null;
}

// How often the pills catch up with the clock. A minute, because the coarsest
// thing on screen changes by the hour and a tab left open overnight would
// otherwise still be painting yesterday green.
const TICK_MS = 60_000;

export default function OperatorQueueView({
  orders,
  closed,
  quotes,
  quotesError,
  busyQuote,
  onOpen,
  onMoveQuote,
}: {
  orders: OrderRow[];
  closed: OrderRow[];
  quotes: QuoteRow[];
  quotesError: string;
  busyQuote: string;
  onOpen: (id: string) => void;
  onMoveQuote: (id: string, status: QuoteStatus) => void;
}) {
  const [filter, setFilter] = useState<Tile | null>(null);

  // Zero until the browser has mounted, and nothing clock-shaped renders
  // before then. Reading Date.now() during a render is a value the server pass
  // and the client pass disagree about, which is a hydration error on a page
  // that has no business having one.
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const lanes = useMemo(
    () => board<OrderRow, QuoteRow>([...orders, ...closed], quotes, now),
    [orders, closed, quotes, now],
  );

  if (now === 0) return <p className="opq-sub">Loading.</p>;

  const row = (p: Placed<OrderRow, QuoteRow>, i: number) => (
    <li key={p.kind === 'order' ? p.order.id : p.quote.id} style={stagger(i)}>
      {p.kind === 'order' ? (
        <OrderCard order={p.order} promise={p.promise} onOpen={onOpen} />
      ) : (
        <OperatorQuoteRow
          quote={p.quote}
          promise={p.promise}
          busy={busyQuote === p.quote.id}
          onMove={onMoveQuote}
        />
      )}
    </li>
  );

  const group = (title: string, rows: Placed<OrderRow, QuoteRow>[]) =>
    rows.length === 0 ? null : (
      <section className="opq-group" key={title}>
        <h2 className="opq-group-h">
          {title} <span>{rows.length}</span>
        </h2>
        <ul className="opq-list">{rows.map(row)}</ul>
      </section>
    );

  return (
    <>
      <OperatorTiles counts={lanes.counts} active={filter} onPick={setFilter} />

      {quotesError && <p className="opq-error">{quotesError}</p>}

      {filter ? (
        // One unheaded list while a tile is held down. The tile is the heading.
        <ul className="opq-list">{rowsFor(lanes, filter).map(row)}</ul>
      ) : (
        <>
          {group('Late', lanes.late)}
          {group('Your turn', lanes.yours)}
          {group('Waiting on them', lanes.theirs)}
          {group('Quote requests', lanes.quotes)}
          {lanes.closed.length > 0 && (
            <details className="opq-closed">
              <summary>Closed, last {lanes.closed.length}</summary>
              <ul className="opq-list">{lanes.closed.map(row)}</ul>
            </details>
          )}
        </>
      )}

      {lanes.late.length +
        lanes.yours.length +
        lanes.theirs.length +
        lanes.quotes.length ===
        0 && <p className="opq-sub">Nothing waiting. Everything is delivered or closed.</p>}
    </>
  );
}

/** The entrance, capped so the ninth row is not a second behind the first. */
function stagger(i: number) {
  return { animationDelay: `${Math.min(i, 8) * 40}ms` };
}

function OrderCard({
  order,
  promise,
  onOpen,
}: {
  order: OrderRow;
  promise: Promised;
  onOpen: (id: string) => void;
}) {
  // Closed orders draw no clock. There is no promise left to keep on one, and
  // a red pill on something finished a week ago is noise in the only section
  // that is allowed to be quiet.
  const done =
    order.status === 'delivered' || order.status === 'declined' || order.status === 'refunded';
  return (
    <button className="opq-row" onClick={() => onOpen(order.id)}>
      <span className="opq-row-top">
        <span className="opq-service">{order.serviceName ?? 'Order'}</span>
        <span className={`opq-pill opq-${order.status}`}>{ORDER_QUEUE_LABELS[order.status]}</span>
      </span>
      <span className="opq-row-meta">
        {!done && <span className={`opq-clock opq-clock-${promise.heat}`}>{promise.label}</span>}
        {order.email}
        {promise.age ? ` · waiting ${promise.age}` : ''}
      </span>
      {order.brief && <span className="opq-row-brief">{order.brief}</span>}
    </button>
  );
}

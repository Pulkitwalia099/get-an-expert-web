import { describe, expect, it } from 'vitest';
import { board, rowsFor, type OrderInput, type QuoteInput } from '@/lib/operator-lanes';

// The grouping, the sort and the four counts.
//
// Every case below is a row that is really in the database, read at the moment
// the cockpit was built, because the failures this prevents are all of the
// same kind: the list looks completely normal and is in the wrong order or
// missing a number.

const NOW = Date.parse('2026-08-14T15:30:00Z');

const order = (o: Partial<OrderInput> & { id: string }): OrderInput => ({
  status: 'new',
  createdAt: '2026-08-14T12:00:00Z',
  statusAt: null,
  ...o,
});

const quote = (q: Partial<QuoteInput> & { id: string }): QuoteInput => ({
  status: 'open',
  createdAt: '2026-08-04T19:11:02Z',
  ...q,
});

// The four orders on the dashboard the day this was written.
const REAL_ORDERS: OrderInput[] = [
  order({ id: 'stanford', status: 'new', createdAt: '2026-08-08T01:42:12Z', statusAt: null }),
  order({ id: 'nonzero', status: 'new', createdAt: '2026-08-13T08:43:51Z', statusAt: null }),
  order({
    id: 'kroslo',
    status: 'sample_sent',
    createdAt: '2026-08-11T07:01:45Z',
    statusAt: '2026-08-14T10:14:40Z',
  }),
  order({
    id: 'mine',
    status: 'sample_sent',
    createdAt: '2026-08-14T10:17:30Z',
    statusAt: '2026-08-14T10:17:36Z',
  }),
];

// All seven quote_requests, all still open, oldest 4 Aug.
const REAL_QUOTES: QuoteInput[] = [
  '2026-08-04T19:11:02Z',
  '2026-08-04T19:36:59Z',
  '2026-08-04T19:38:33Z',
  '2026-08-04T22:25:15Z',
  '2026-08-05T05:08:47Z',
  '2026-08-05T05:13:32Z',
  '2026-08-05T05:25:13Z',
].map((createdAt, i) => quote({ id: `q${i}`, createdAt }));

const ids = (rows: { kind: string; order?: OrderInput; quote?: QuoteInput }[]) =>
  rows.map((r) => (r.kind === 'order' ? r.order!.id : r.quote!.id));

describe('board', () => {
  it('never renders a delivered order above one that has waited three days', () => {
    // The failure the grouping exists for. Newest first put an order finished
    // an hour ago at the top of a list whose oldest row was the one at risk.
    const rows = board(
      [
        order({ id: 'done', status: 'delivered', createdAt: '2026-08-14T14:30:00Z', statusAt: '2026-08-14T14:30:00Z' }),
        order({ id: 'waiting', status: 'new', createdAt: '2026-08-11T15:30:00Z', statusAt: null }),
      ],
      [],
      NOW,
    );
    expect(ids(rows.closed)).toEqual(['done']);
    expect(ids(rows.late)).toEqual(['waiting']);
  });

  it('finds the two orders that really are late, and does not invent a third', () => {
    const rows = board(REAL_ORDERS, [], NOW);
    expect(ids(rows.late)).toEqual(['stanford', 'nonzero']);
    expect(ids(rows.theirs)).toEqual(['kroslo', 'mine']);
    expect(rows.yours).toEqual([]);
  });

  it('does not blame the operator for the customer being quiet', () => {
    // A sample sent eight days ago and never approved is somebody not
    // replying. Counting it as late puts a permanent red number on a tile
    // nobody can act on, and then the tile means nothing on the day it does.
    const rows = board(
      [order({ id: 'silent', status: 'sample_sent', createdAt: '2026-08-01T00:00:00Z', statusAt: '2026-08-06T00:00:00Z' })],
      [],
      NOW,
    );
    expect(ids(rows.theirs)).toEqual(['silent']);
    expect(rows.late).toEqual([]);
    expect(rows.counts.late).toBe(0);
  });

  it('keeps an approved order on our side, where it can go late', () => {
    // We still owe the clean file at that point: STATUS_NOTES.approved says
    // so, and Deliver is the next tap. Filed under "waiting on them" it would
    // sit there being nobody's job.
    const rows = board(
      [order({ id: 'ok', status: 'approved', createdAt: '2026-08-10T00:00:00Z', statusAt: '2026-08-10T00:00:00Z' })],
      [],
      NOW,
    );
    expect(ids(rows.late)).toEqual(['ok']);
    expect(rows.theirs).toEqual([]);
  });

  it('will not let the Late tile read 2 while nine things are past their promise', () => {
    const rows = board(REAL_ORDERS, REAL_QUOTES, NOW);
    expect(rows.counts.late).toBe(9);
    expect(rows.quotes).toEqual([]);
    expect(ids(rows.late).filter((id) => id.startsWith('q'))).toHaveLength(7);
  });

  it('keeps the Quotes tile agreeing with the table it counts', () => {
    // Wherever they were placed. "How many requests are live" has to keep
    // answering 7 while all seven of them are also sitting in Late, which is
    // why these four tiles are four questions rather than four buckets.
    const rows = board(REAL_ORDERS, REAL_QUOTES, NOW);
    expect(rows.counts.quotes).toBe(7);
  });

  it('works the oldest first everywhere except the archive', () => {
    const rows = board(REAL_ORDERS, REAL_QUOTES, NOW);
    expect(ids(rows.late)).toEqual(['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'stanford', 'nonzero']);

    const closed = board(
      [
        order({ id: 'old', status: 'delivered', createdAt: '2026-08-01T00:00:00Z', statusAt: '2026-08-02T00:00:00Z' }),
        order({ id: 'new', status: 'refunded', createdAt: '2026-08-12T00:00:00Z', statusAt: '2026-08-13T00:00:00Z' }),
      ],
      [],
      NOW,
    );
    expect(ids(closed.closed)).toEqual(['new', 'old']);
  });

  it('puts every row in exactly one lane, so nothing vanishes or is counted twice', () => {
    const rows = board(REAL_ORDERS, REAL_QUOTES, NOW);
    const everywhere = [
      ...ids(rows.late),
      ...ids(rows.yours),
      ...ids(rows.theirs),
      ...ids(rows.quotes),
      ...ids(rows.closed),
    ];
    expect(everywhere).toHaveLength(REAL_ORDERS.length + REAL_QUOTES.length);
    expect(new Set(everywhere).size).toBe(everywhere.length);
  });

  it('does not reorder the arrays it was handed', () => {
    // Sorting in place would rearrange the caller's React state behind its
    // back, and the queue is re-sorted every minute as the clock ticks.
    const orders = [...REAL_ORDERS];
    const quotes = [...REAL_QUOTES];
    board(orders, quotes, NOW);
    expect(orders.map((o) => o.id)).toEqual(REAL_ORDERS.map((o) => o.id));
    expect(quotes.map((q) => q.id)).toEqual(REAL_QUOTES.map((q) => q.id));
  });
});

describe('rowsFor', () => {
  it('shows every live request when the Quotes tile is held down', () => {
    // Including the ones that have been promoted to Late, or tapping the tile
    // that reads 7 would show an empty list.
    const rows = board(REAL_ORDERS, REAL_QUOTES, NOW);
    expect(rowsFor(rows, 'quotes')).toHaveLength(7);
    expect(rowsFor(rows, 'quotes').every((r) => r.kind === 'quote')).toBe(true);
  });

  it('filters to exactly what the Late tile counts', () => {
    const rows = board(REAL_ORDERS, REAL_QUOTES, NOW);
    expect(rowsFor(rows, 'late')).toHaveLength(rows.counts.late);
  });
});

// Added at merge, after review found the tile and the pill disagreeing on the
// same row. Both of these are about one rule holding in two places at once.
describe('one answer per row', () => {
  const at = (iso: string) => new Date(iso).getTime();
  const NOW = at('2026-08-15T12:00:00Z');

  it('never paints a late clock on a row the Late tile does not count', () => {
    // A sample sent two days ago. promote() keeps it out of Late on purpose,
    // because a quiet customer is not the operator being slow, and before this
    // promiseFor still handed the card a red "1d late" nobody could act on.
    const b = board(
      [{ id: 'o1', status: 'sample_sent' as const, createdAt: '2026-08-10T12:00:00Z', statusAt: '2026-08-13T12:00:00Z' }],
      [],
      NOW,
    );
    expect(b.counts.late).toBe(0);
    expect(b.theirs).toHaveLength(1);
    expect(b.theirs[0].promise.late).toBe(false);
    expect(b.theirs[0].promise.label).toBe('');
    // The age survives, because how long they have been quiet is still worth
    // knowing. It is a duration, not a deadline.
    expect(b.theirs[0].promise.age).not.toBe('');
  });

  it('leaves an archived row with neither a clock nor a wait', () => {
    const b = board(
      [{ id: 'o2', status: 'delivered' as const, createdAt: '2026-08-01T12:00:00Z', statusAt: '2026-08-14T12:00:00Z' }],
      [],
      NOW,
    );
    expect(b.closed[0].promise.label).toBe('');
    expect(b.closed[0].promise.age).toBe('');
  });

  it('counts on the Quotes tile exactly what tapping it opens', () => {
    // A tile reading 3 that opens 2 rows is a tile people stop believing.
    const quotes = [
      { id: 'q1', status: 'open' as const, createdAt: '2026-08-04T12:00:00Z' },
      { id: 'q2', status: 'contacting' as const, createdAt: '2026-08-15T11:00:00Z' },
      { id: 'q3', status: 'closed' as const, createdAt: '2026-08-02T12:00:00Z' },
    ];
    const b = board([], quotes, NOW);
    expect(b.counts.quotes).toBe(rowsFor(b, 'quotes').length);
    expect(b.counts.quotes).toBe(2);
  });
});

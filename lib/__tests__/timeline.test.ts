import { describe, expect, it } from 'vitest';
import { mergeTimeline } from '@/lib/timeline';

// One account, two vocabularies, one list.
//
// The acceptance criterion for /account is that an order and a request for
// quotes appear together, sorted against each other. That is checkable here
// rather than by a person squinting at a page, so it is checked here.

const ORDER = {
  id: 'b1029c04-c43d-422b-9000-ff79632847a6',
  createdAt: '2026-08-10T09:00:00.000Z',
  serviceName: 'UGC ad',
  status: 'sample_sent' as const,
};

const REQUEST = {
  id: '2b8f6b1e-1111-4444-8888-aaaaaaaaaaaa',
  createdAt: '2026-08-12T09:00:00.000Z',
  status: 'open' as const,
};

const title = () => 'Compliance consultant · fintech';

describe('mergeTimeline', () => {
  it('puts an order and a request in one list, newest first', () => {
    const items = mergeTimeline([ORDER], [REQUEST], title);
    expect(items.map((i) => i.kind)).toEqual(['request', 'order']);
    expect(items[0].title).toBe('Compliance consultant · fintech');
    expect(items[1].title).toBe('UGC ad');
  });

  // The deep link in every status email points at /orders/<id>. If the merged
  // view ever became the only way to reach an order, that link would be the
  // thing that broke, and nothing else would look wrong.
  it('sends an order to its own page and a request to the dashboard', () => {
    const items = mergeTimeline([ORDER], [REQUEST], title);
    expect(items.find((i) => i.kind === 'order')?.href).toBe(`/orders/${ORDER.id}`);
    expect(items.find((i) => i.kind === 'request')?.href).toBe('/dashboard');
  });

  // The stored values never reach a visitor on either page, and must not start
  // reaching one because two lists were merged.
  it('prints the written label for each vocabulary, never the stored value', () => {
    const items = mergeTimeline([ORDER], [REQUEST], title);
    expect(items.map((i) => i.state)).toEqual(['Reaching out', 'Your sample is ready']);
  });

  // mk_orders_current is a view this repo does not own. A page that renders
  // nothing because one row has a bad timestamp is worse than a row sitting
  // in the wrong place.
  it('sorts an unparseable date last instead of throwing', () => {
    const broken = { ...ORDER, id: 'broken', createdAt: 'not a date' };
    const items = mergeTimeline([ORDER, broken], [REQUEST], title);
    expect(items.at(-1)?.id).toBe('broken');
    expect(items).toHaveLength(3);
  });

  it('names an order with no service rather than printing a blank row', () => {
    const [item] = mergeTimeline([{ ...ORDER, serviceName: null }], [], title);
    expect(item.title).toBe('Order');
  });

  it('does not reorder the arrays it was handed', () => {
    const orders = [ORDER, { ...ORDER, id: 'later', createdAt: '2026-08-14T09:00:00.000Z' }];
    mergeTimeline(orders, [], title);
    expect(orders[0].id).toBe(ORDER.id);
  });

  it('is an empty list for an account with nothing on it', () => {
    expect(mergeTimeline([], [], title)).toEqual([]);
  });
});

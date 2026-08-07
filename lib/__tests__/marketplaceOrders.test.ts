import { beforeEach, describe, expect, it, vi } from 'vitest';

// The `mk_` schema is owned by ~/Programs/get-an-expert-orders and written by
// this repo, so its shape is stated in two places that can drift. These tests
// pin the half stated here: the column names that go over the wire, and the
// idempotency key, which is the one that fails silently. A ref computed
// differently on the two sides does not error, it just writes a duplicate
// order, and you find out from a customer.

const insertRows = vi.fn(async () => ({ ok: true, status: 201 }));
vi.mock('@/lib/supabase', () => ({ insertRows }));

const { recordMarketplaceOrder, refFor } = await import('@/lib/marketplaceOrders');

/** The djb2 in get-an-expert-orders/lib/orders.ts, restated independently. */
function expectedRef(kind: string, email: string, body: string): string {
  const normalised = `${kind}|${email.trim().toLowerCase()}|${body.trim()}`;
  let hash = 5381;
  for (let i = 0; i < normalised.length; i += 1) {
    hash = ((hash << 5) + hash + normalised.charCodeAt(i)) >>> 0;
  }
  return `${kind}-${hash.toString(36)}`;
}

beforeEach(() => {
  insertRows.mockClear();
});

describe('refFor', () => {
  it('matches the hash the orders repo computes', () => {
    expect(refFor('order', 'a@b.com', 'hello')).toBe(expectedRef('order', 'a@b.com', 'hello'));
  });

  it('ignores casing and surrounding space, so a retype is not a second order', () => {
    expect(refFor('order', '  A@B.com ', ' hello ')).toBe(refFor('order', 'a@b.com', 'hello'));
  });

  it('separates two different briefs from one person', () => {
    expect(refFor('order', 'a@b.com', 'one')).not.toBe(refFor('order', 'a@b.com', 'two'));
  });

  it('separates the same brief submitted under different kinds', () => {
    expect(refFor('order', 'a@b.com', 'x')).not.toBe(refFor('notify', 'a@b.com', 'x'));
  });
});

describe('recordMarketplaceOrder', () => {
  it('writes exactly the columns the migration declares', async () => {
    await recordMarketplaceOrder({
      kind: 'order',
      email: 'Buyer@Example.com',
      name: 'Buyer',
      serviceSlug: 'ugc-ads',
      serviceName: 'AI UGC Campaign Engine',
      brief: 'Objective: sales',
      fields: { Objective: 'sales' },
      priceCents: 2900,
      referrer: 'https://midsesh.com/',
      userAgent: 'test',
    });

    const [table, row, opts] = insertRows.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(table).toBe('mk_orders');
    expect(Object.keys(row).sort()).toEqual(
      [
        'brief',
        'email',
        'fields',
        'kind',
        'name',
        'price_cents',
        'ref',
        'referrer',
        'service_name',
        'service_slug',
        'user_agent',
      ].sort(),
    );
    // The unique index is what makes a retried fetch a no-op instead of a
    // second order, so the write has to actually opt into it.
    expect(opts).toEqual({ ignoreDuplicatesOn: 'ref' });
  });

  it('lowercases the address, so one person is one person', async () => {
    await recordMarketplaceOrder({ kind: 'notify', email: 'Mixed@Case.COM', brief: 'x' });
    const row = insertRows.mock.calls[0][1] as Record<string, unknown>;
    expect(row.email).toBe('mixed@case.com');
  });

  it('never throws when the write fails, because the email already went', async () => {
    insertRows.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(
      recordMarketplaceOrder({ kind: 'order', email: 'a@b.com', brief: 'x' }),
    ).resolves.toMatchObject({ ok: false });
  });

  it('writes no second row, so a duplicate cannot orphan an event', async () => {
    await recordMarketplaceOrder({ kind: 'order', email: 'a@b.com', brief: 'x' });
    expect(insertRows).toHaveBeenCalledTimes(1);
  });

  it('caps a long brief instead of letting the insert be rejected whole', async () => {
    await recordMarketplaceOrder({ kind: 'order', email: 'a@b.com', brief: 'x'.repeat(20_000) });
    const row = insertRows.mock.calls[0][1] as Record<string, string>;
    expect(row.brief).toHaveLength(8_000);
  });

  it('drops empty fields rather than storing blanks to query around', async () => {
    await recordMarketplaceOrder({
      kind: 'order',
      email: 'a@b.com',
      brief: 'x',
      fields: { Kept: 'yes', Dropped: '   ' },
    });
    const row = insertRows.mock.calls[0][1] as Record<string, unknown>;
    expect(row.fields).toEqual({ Kept: 'yes' });
  });
});

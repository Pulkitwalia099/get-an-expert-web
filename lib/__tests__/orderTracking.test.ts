import { beforeEach, describe, expect, it, vi } from 'vitest';

// One customer reading another customer's brief is the worst thing this
// feature can do, and it is the kind of bug that never throws. These tests pin
// the two things standing in the way: the ownership filter is in the query
// rather than applied afterwards, and the column list matches the schema in
// ~/Programs/get-an-expert-orders, which this repo writes but does not own.

const selectRows = vi.fn<(table: string, query: string) => Promise<unknown[] | null>>(
  async () => [],
);
const insertRows = vi.fn(async () => ({ ok: true, status: 201 }));
vi.mock('@/lib/supabase', () => ({ selectRows, insertRows }));

const { listOrdersForEmail, getOrderForEmail, appendCustomerEvent, assetsFor, revisionsUsed } = await import(
  '@/lib/orderTracking'
);

const ID = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
const OTHER = '9c858901-8a57-4791-81fe-4c455b099bc9';

function row(over: Record<string, unknown> = {}) {
  return {
    id: ID,
    status: 'sample_sent',
    status_at: '2026-08-13T10:00:00Z',
    status_note: null,
    service_name: 'AI UGC Campaign Engine',
    service_slug: 'ugc-ads',
    brief: 'A UGC ad for my app',
    price_cents: 2900,
    created_at: '2026-08-12T10:00:00Z',
    ...over,
  };
}

beforeEach(() => {
  selectRows.mockClear();
  insertRows.mockClear();
  selectRows.mockResolvedValue([]);
});

describe('listOrdersForEmail', () => {
  it('filters on the address in the query, not after the read', async () => {
    await listOrdersForEmail('pranav@example.com');
    const [table, query] = selectRows.mock.calls[0];
    expect(table).toBe('mk_orders_current');
    expect(query).toContain('email=eq.pranav%40example.com');
  });

  it('lowercases the address, so a mixed case session still finds the order', async () => {
    await listOrdersForEmail('  Pranav@Example.COM  ');
    expect(selectRows.mock.calls[0][1]).toContain('email=eq.pranav%40example.com');
  });

  it('asks only for real orders, never waitlist rows or contact messages', async () => {
    await listOrdersForEmail('pranav@example.com');
    expect(selectRows.mock.calls[0][1]).toContain('kind=eq.order');
  });

  it('tells an outage apart from an honest empty list', async () => {
    selectRows.mockResolvedValue(null);
    expect(await listOrdersForEmail('pranav@example.com')).toBeNull();
    selectRows.mockResolvedValue([]);
    expect(await listOrdersForEmail('pranav@example.com')).toEqual([]);
  });

  it('reads nothing at all for a blank address', async () => {
    expect(await listOrdersForEmail('   ')).toEqual([]);
    expect(selectRows).not.toHaveBeenCalled();
  });
});

describe('getOrderForEmail', () => {
  it('names both the id and the address in the filter', async () => {
    selectRows.mockResolvedValue([row()]);
    const order = await getOrderForEmail(ID, 'pranav@example.com');
    expect(order?.id).toBe(ID);
    const query = selectRows.mock.calls[0][1];
    expect(query).toContain(`id=eq.${ID}`);
    expect(query).toContain('email=eq.pranav%40example.com');
  });

  it('returns nothing when the row belongs to somebody else', async () => {
    // What PostgREST answers when the email filter excludes the row: an empty
    // set, not a row this code then has to remember to reject.
    selectRows.mockResolvedValue([]);
    expect(await getOrderForEmail(ID, 'attacker@example.com')).toBeNull();
  });

  it('refuses an id that is not a uuid without querying at all', async () => {
    for (const bad of ['', 'x', `${ID} or 1=1`, '*', '../../etc', `eq.${ID}`]) {
      expect(await getOrderForEmail(bad, 'pranav@example.com')).toBeNull();
    }
    expect(selectRows).not.toHaveBeenCalled();
  });

  it('shows an unrecognised status as in progress rather than as a raw string', async () => {
    // This repo does not own the mk_ tables. A status added over there and not
    // here must not put a database value in front of a customer.
    selectRows.mockResolvedValue([row({ status: 'awaiting_legal' })]);
    expect((await getOrderForEmail(ID, 'pranav@example.com'))?.status).toBe('working');
  });
});

describe('assetsFor', () => {
  it('reads the derived view rather than working the files out here', async () => {
    selectRows.mockResolvedValue([{ sample_url: 'https://a/s.mp4', final_url: null }]);
    expect(await assetsFor(ID)).toEqual({
      sampleUrl: 'https://a/s.mp4',
      finalUrl: null,
      frames: null,
      // A view that has not learned the columns yet answers with neither, and
      // one shape for "there is nothing here" is what keeps every caller's
      // null check honest.
      deliveredCut: null,
      deliveredDiff: null,
    });
    expect(selectRows.mock.calls[0][0]).toBe('mk_order_assets');
  });

  it('carries the shot list and what was published with the sample', async () => {
    selectRows.mockResolvedValue([
      {
        sample_url: 'https://a/s.mp4',
        final_url: null,
        frames: [{ t: 0, d: 0.6, name: 'Black, and one sound' }],
        delivered_cut: '23 seconds, 9:16.',
        delivered_diff: 'Their reference is a crockery set.',
      },
    ]);
    const assets = await assetsFor(ID);
    expect(assets.frames).toEqual([{ n: 1, t: 0, d: 0.6, name: 'Black, and one sound' }]);
    expect(assets.deliveredDiff).toBe('Their reference is a crockery set.');
  });

  // The mk_ tables belong to the orders repo. A junk list must render no
  // picker rather than throw on a page somebody is waiting on.
  it('drops a frame list it cannot read, and keeps the sample', async () => {
    selectRows.mockResolvedValue([
      { sample_url: 'https://a/s.mp4', final_url: null, frames: 'not a list' },
    ]);
    const assets = await assetsFor(ID);
    expect(assets.frames).toBeNull();
    expect(assets.sampleUrl).toBe('https://a/s.mp4');
  });

  it('refuses a bad id without querying', async () => {
    expect(await assetsFor('nope')).toEqual({
      sampleUrl: null,
      finalUrl: null,
      frames: null,
      deliveredCut: null,
      deliveredDiff: null,
    });
    expect(selectRows).not.toHaveBeenCalled();
  });
});

describe('appendCustomerEvent', () => {
  it('writes the columns mk_order_events actually has', async () => {
    await appendCustomerEvent(ID, 'approve', 'pranav@example.com', null);
    const [table, payload] = insertRows.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ];
    expect(table).toBe('mk_order_events');
    expect(Object.keys(payload).sort()).toEqual(['actor', 'note', 'order_id', 'status']);
  });

  it('records approval as approved', async () => {
    await appendCustomerEvent(ID, 'approve', 'pranav@example.com', null);
    expect((insertRows.mock.calls[0] as never as [string, { status: string }])[1].status).toBe(
      'approved',
    );
  });

  it('records a change request as working, so it returns to the queue by itself', async () => {
    await appendCustomerEvent(ID, 'changes', 'pranav@example.com', 'cut the last line');
    const payload = (insertRows.mock.calls[0] as never as [string, Record<string, string>])[1];
    expect(payload.status).toBe('working');
    expect(payload.note).toBe('cut the last line');
  });

  it('names the customer in the actor, so our approval and theirs are distinguishable', async () => {
    await appendCustomerEvent(ID, 'approve', '  Pranav@Example.COM ', null);
    expect((insertRows.mock.calls[0] as never as [string, { actor: string }])[1].actor).toBe(
      'customer:pranav@example.com',
    );
  });

  it('keeps the first 2,000 characters of a long comment rather than rejecting it', async () => {
    await appendCustomerEvent(ID, 'changes', 'a@b.com', 'x'.repeat(5_000));
    const payload = (insertRows.mock.calls[0] as never as [string, { note: string }])[1];
    expect(payload.note).toHaveLength(2_000);
  });

  it('refuses to write against an id that is not a uuid', async () => {
    expect(await appendCustomerEvent(OTHER.replace(/-/g, ''), 'approve', 'a@b.com', null)).toBe(
      false,
    );
    expect(insertRows).not.toHaveBeenCalled();
  });
});

describe('revisionsUsed', () => {
  it('counts only the working events a customer wrote, never ours', async () => {
    await revisionsUsed(ID);
    const [table, query] = selectRows.mock.calls[0];
    expect(table).toBe('mk_order_events');
    expect(query).toContain('status=eq.working');
    expect(query).toContain('actor=like.customer:*');
    expect(query).toContain(`order_id=eq.${ID}`);
  });

  it('reports null when the count cannot be read, so no warning is guessed', async () => {
    selectRows.mockResolvedValue(null);
    expect(await revisionsUsed(ID)).toBeNull();
  });

  it('counts what came back', async () => {
    selectRows.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    expect(await revisionsUsed(ID)).toBe(2);
  });

  it('refuses a bad id without querying', async () => {
    expect(await revisionsUsed('nope')).toBeNull();
    expect(selectRows).not.toHaveBeenCalled();
  });
});

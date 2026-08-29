import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The guard on looking at somebody else's order.
//
// Preview reads any order with no ownership check, which makes it the one
// place in this codebase where the filter that protects a customer is
// deliberately absent. Everything standing between that and a stranger is the
// operator cookie, so the cookie check is what these tests pin.
//
// The failure this guards against is quiet. A comparison that accidentally
// accepts an empty string, or a check that passes when OPERATOR_SECRET is
// unset, shows one customer another customer's brief and throws nothing.

const selectRows = vi.fn<(table: string, query: string) => Promise<unknown[] | null>>(
  async () => [],
);
vi.mock('@/lib/supabase', () => ({ selectRows, insertRows: vi.fn(async () => ({ ok: true })) }));

const OLD = { ...process.env };
const ID = '01dd1d17-fcdb-4518-bd81-96c557f90758';

beforeEach(() => {
  selectRows.mockClear();
  selectRows.mockResolvedValue([]);
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...OLD };
});

async function auth() {
  return import('@/lib/operatorAuth');
}

describe('operatorCookieValid', () => {
  it('accepts the token the login actually sets', async () => {
    process.env.OPERATOR_SECRET = 'a-real-secret';
    const { operatorCookieValid, tokenForSecret } = await auth();
    expect(operatorCookieValid(tokenForSecret('a-real-secret'))).toBe(true);
  });

  it('refuses a wrong token, the raw secret, and anything empty', async () => {
    process.env.OPERATOR_SECRET = 'a-real-secret';
    const { operatorCookieValid } = await auth();
    expect(operatorCookieValid('nope')).toBe(false);
    // The cookie holds a hash, never the secret. Accepting the secret here
    // would make a leaked cookie and a leaked secret the same thing.
    expect(operatorCookieValid('a-real-secret')).toBe(false);
    expect(operatorCookieValid('')).toBe(false);
    expect(operatorCookieValid(undefined)).toBe(false);
    expect(operatorCookieValid(null)).toBe(false);
  });

  it('denies everyone when no secret is configured', async () => {
    delete process.env.OPERATOR_SECRET;
    const { operatorCookieValid, tokenForSecret } = await auth();
    expect(tokenForSecret('anything')).toBeNull();
    expect(operatorCookieValid('anything')).toBe(false);
    // The dangerous case: no operators configured means the loop matches
    // nothing, and a check written as `token === cookie` would pass for a
    // null cookie against a null token.
    expect(operatorCookieValid(null)).toBe(false);
    expect(operatorCookieValid(undefined)).toBe(false);
  });
});

describe('getOrderUnchecked', () => {
  it('reads by id with no email filter, which is the whole point of the name', async () => {
    const { getOrderUnchecked } = await import('@/lib/orderTracking');
    await getOrderUnchecked(ID);
    const [table, query] = selectRows.mock.calls[0] as unknown as [string, string];
    expect(table).toBe('mk_orders_current');
    expect(query).toContain(`id=eq.${ID}`);
    expect(query).not.toContain('email=eq.');
  });

  it('still refuses anything that is not a uuid, so a URL cannot shape the query', async () => {
    const { getOrderUnchecked } = await import('@/lib/orderTracking');
    expect(await getOrderUnchecked('not-a-uuid')).toBeNull();
    expect(await getOrderUnchecked(`${ID}&email=eq.someone@example.com`)).toBeNull();
    expect(await getOrderUnchecked('*')).toBeNull();
    expect(selectRows).not.toHaveBeenCalled();
  });

  it('carries the owner address, so preview can say whose order it is', async () => {
    selectRows.mockResolvedValue([
      {
        id: ID,
        email: 'avpuri@gmail.com',
        status: 'sample_sent',
        status_at: null,
        status_note: null,
        name: null,
        service_name: 'AI UGC Campaign Engine',
        service_slug: null,
        brief: 'b',
        price_cents: null,
        created_at: '2026-08-25T18:02:06Z',
      },
    ]);
    const { getOrderUnchecked } = await import('@/lib/orderTracking');
    const order = await getOrderUnchecked(ID);
    expect(order?.email).toBe('avpuri@gmail.com');
  });
});

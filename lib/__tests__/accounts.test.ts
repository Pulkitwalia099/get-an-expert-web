import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The account row: revoking every session on it, renaming it, and erasing it.
//
// Two of these are the riskiest things in the codebase. Sign out everywhere is
// a check that runs on every authenticated request and fails open, so its
// failure mode is silence in both directions: too strict and the whole site
// signs out during a Supabase blip, too loose and a revoked session goes on
// working. Erasing is five calls with no transaction between them, so what is
// asserted here is the order and the filters, because those are the only
// things standing between a partial failure and somebody stranded.

const selectRows = vi.fn<(table: string, query: string) => Promise<unknown[] | null>>(
  async () => [],
);
const deleteRows = vi.fn<
  (table: string, filter: string) => Promise<{ ok: boolean; status: number | null }>
>(async () => ({ ok: true, status: 204 }));
const patchRows = vi.fn<
  (table: string, filter: string, patch: Record<string, unknown>) => Promise<boolean>
>(async () => true);

vi.mock('@/lib/supabase', () => ({ selectRows, deleteRows, patchRows }));

const { bumpSessionVersion, currentAccount, eraseAccount, readAccount, setAccountName, ERASED_EMAIL } =
  await import('@/lib/accounts');
const { signSession } = await import('@/lib/auth');

const USER = { sub: 'sub-1', email: 'Pulkit@Example.com', name: 'Pulkit', picture: null };

beforeEach(() => {
  vi.stubEnv('SESSION_SECRET', 'session-secret');
  selectRows.mockReset();
  selectRows.mockResolvedValue([]);
  deleteRows.mockReset();
  deleteRows.mockResolvedValue({ ok: true, status: 204 });
  patchRows.mockReset();
  patchRows.mockResolvedValue(true);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/** What sessionVersionFor will read back. Null stands for a failed read. */
function storedVersion(value: number | null) {
  selectRows.mockResolvedValue(value === null ? [] : [{ session_version: value }]);
}

describe('currentAccount', () => {
  it('accepts a cookie carrying no version at all', async () => {
    // Every session minted before this shipped is one of these. Rejecting them
    // would sign out every customer on the site on the day it deployed, which
    // is the one thing the brief said must not happen.
    const cookie = signSession(USER)!;
    storedVersion(4);
    expect(await currentAccount(cookie)).toMatchObject({ sub: 'sub-1' });
  });

  it('rejects a session older than the stored version', async () => {
    // This is sign out everywhere actually working.
    const cookie = signSession(USER, Date.now(), 1)!;
    storedVersion(2);
    expect(await currentAccount(cookie)).toBeNull();
  });

  it('keeps a session at the stored version', async () => {
    // The browser that pressed the button and then signed back in.
    const cookie = signSession(USER, Date.now(), 2)!;
    storedVersion(2);
    expect(await currentAccount(cookie)).toMatchObject({ sub: 'sub-1' });
  });

  it('keeps a session ahead of the stored version', async () => {
    const cookie = signSession(USER, Date.now(), 3)!;
    storedVersion(1);
    expect(await currentAccount(cookie)).not.toBeNull();
  });

  it('keeps the session when the stored version cannot be read', async () => {
    // Fails open on purpose. Signing out every customer during a Supabase
    // outage is a far worse failure than one revoked session surviving it.
    const cookie = signSession(USER, Date.now(), 1)!;
    selectRows.mockResolvedValue(null);
    expect(await currentAccount(cookie)).not.toBeNull();
  });

  it('never asks the database about a cookie that is not valid anyway', async () => {
    expect(await currentAccount(undefined)).toBeNull();
    expect(await currentAccount('nonsense')).toBeNull();
    expect(selectRows).not.toHaveBeenCalled();
  });
});

describe('setAccountName', () => {
  it('writes the name and the lock in one patch', async () => {
    // Two patches would leave a window where the name looks saved and the next
    // Google sign in silently puts its own version back.
    await setAccountName('sub-1', 'Mo');
    expect(patchRows).toHaveBeenCalledTimes(1);
    const [table, filter, patch] = patchRows.mock.calls[0];
    expect(table).toBe('accounts');
    expect(filter).toBe('sub=eq.sub-1');
    expect(patch).toEqual({ name: 'Mo', name_locked: true });
  });

  it('stores null rather than a blank string when the field is cleared', async () => {
    await setAccountName('sub-1', null);
    expect(patchRows.mock.calls[0][2]).toEqual({ name: null, name_locked: true });
  });

  it('does not patch on an empty sub, which would carry an empty filter', async () => {
    expect(await setAccountName('', 'Mo')).toBe(false);
    expect(patchRows).not.toHaveBeenCalled();
  });
});

describe('bumpSessionVersion', () => {
  it('moves the stored number up by one', async () => {
    storedVersion(2);
    expect(await bumpSessionVersion('sub-1')).toBe(3);
    expect(patchRows.mock.calls[0][2]).toEqual({ session_version: 3 });
  });

  it('writes nothing when the current version cannot be read', async () => {
    // A guessed number either revokes nothing while claiming it revoked
    // everything, or overwrites a version that was already higher.
    selectRows.mockResolvedValue(null);
    expect(await bumpSessionVersion('sub-1')).toBeNull();
    expect(patchRows).not.toHaveBeenCalled();
  });

  it('reports null when the patch does not land', async () => {
    storedVersion(0);
    patchRows.mockResolvedValue(false);
    expect(await bumpSessionVersion('sub-1')).toBeNull();
  });
});

describe('readAccount', () => {
  it('reads a row written before the migration as version zero and unlocked', async () => {
    selectRows.mockResolvedValue([
      { sub: 'sub-1', email: 'a@b.co', name: null, session_version: null, name_locked: null },
    ]);
    expect(await readAccount('sub-1')).toEqual({
      sub: 'sub-1',
      email: 'a@b.co',
      name: null,
      sessionVersion: 0,
      nameLocked: false,
    });
  });
});

describe('eraseAccount', () => {
  it('deletes the accounts row last, so a failure leaves a way back in', async () => {
    // The ordering is the only mitigation there is: five PostgREST calls with
    // no transaction between them. Deleted first, a failure at the orders step
    // leaves somebody with no account, no way to sign in and try again, and
    // their address still on order rows.
    await eraseAccount('sub-1', USER.email);
    expect(deleteRows.mock.calls.at(-1)?.[0]).toBe('accounts');
  });

  it('takes the requests placed through the signed out path, which carry no sub', async () => {
    await eraseAccount('sub-1', USER.email);
    const quotes = deleteRows.mock.calls.filter((c) => c[0] === 'quote_requests');
    expect(quotes.some((c) => c[1] === 'sub=eq.sub-1')).toBe(true);
    expect(quotes.some((c) => c[1] === 'email=eq.pulkit%40example.com')).toBe(true);
  });

  it('deletes on both spellings of an address, because two tables store it as typed', async () => {
    await eraseAccount('sub-1', USER.email);
    const leads = deleteRows.mock.calls.filter((c) => c[0] === 'leads').map((c) => c[1]);
    expect(leads).toContain('email=eq.pulkit%40example.com');
    expect(leads).toContain('email=eq.Pulkit%40Example.com');
  });

  it('patches orders to a marker address rather than deleting them', async () => {
    await eraseAccount('sub-1', USER.email);
    const orders = patchRows.mock.calls.filter((c) => c[0] === 'mk_orders');
    expect(orders.length).toBeGreaterThan(0);
    // The name goes with the address. A name identifies a person as well as an
    // address does, and the point is a row that stops naming anybody.
    expect(orders[0][2]).toEqual({ email: ERASED_EMAIL, name: null });
    expect(deleteRows.mock.calls.some((c) => c[0] === 'mk_orders')).toBe(false);
  });

  it('uses an address that can never resolve, so nothing can mail it later', () => {
    expect(ERASED_EMAIL.endsWith('.invalid')).toBe(true);
  });

  it('never issues a delete with an empty filter', async () => {
    // PostgREST empties an entire table when it is handed none.
    await eraseAccount('sub-1', USER.email);
    for (const [, filter] of deleteRows.mock.calls) expect(filter.trim()).not.toBe('');
  });

  it('does not name credit_entries or match_profiles, which cascade', async () => {
    // Both carry `on delete cascade`. A second delete here would be a second
    // definition of the same rule, and the two would drift.
    await eraseAccount('sub-1', USER.email);
    const tables = deleteRows.mock.calls.map((c) => c[0]);
    expect(tables).not.toContain('credit_entries');
    expect(tables).not.toContain('match_profiles');
    expect(tables).toContain('match_sets');
  });

  it('reports not ok when any single step fails', async () => {
    // The route must never be able to tell somebody their data is gone when
    // some of it is still there.
    patchRows.mockResolvedValue(false);
    expect((await eraseAccount('sub-1', USER.email)).ok).toBe(false);
  });

  it('reports ok when every step lands', async () => {
    const report = await eraseAccount('sub-1', USER.email);
    expect(report.ok).toBe(true);
    expect(Object.values(report.steps).every(Boolean)).toBe(true);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

// One address, one account, whichever door it came through.
//
// The bug these pin is invisible from the outside: two sign in doors mint two
// different subs for one person, both sign ins work, both dashboards render,
// and the only symptom is a credit balance that is half of what it should be.
// Nothing throws, so nothing but a test is going to catch it coming back.

type Insert = (
  table: string,
  rows: Record<string, unknown>,
  opts?: Record<string, string>,
) => Promise<{ ok: boolean; status: number }>;

const selectRows = vi.fn<(table: string, query: string) => Promise<unknown[] | null>>(
  async () => [],
);
const insertRows = vi.fn<Insert>(async () => ({ ok: true, status: 201 }));
const patchRows = vi.fn<
  (table: string, filter: string, patch: Record<string, unknown>) => Promise<boolean>
>(async () => true);
vi.mock('@/lib/supabase', () => ({ selectRows, insertRows, patchRows }));

const { accountByEmail, ensureAccount, resolveAccount } = await import('@/lib/credits');

const GOOGLE = {
  sub: '104729384756102938475',
  email: 'pulkit@example.com',
  name: 'Pulkit',
  picture: 'https://lh3.googleusercontent.com/a/x',
};

const EMAIL_DOOR = {
  sub: 'email:pulkit@example.com',
  email: 'pulkit@example.com',
  name: null,
  picture: null,
};

beforeEach(() => {
  selectRows.mockReset();
  selectRows.mockResolvedValue([]);
  insertRows.mockClear();
  patchRows.mockClear();
});

describe('accountByEmail', () => {
  it('asks for the oldest row, not whichever one comes back first', async () => {
    await accountByEmail('Pulkit@Example.com');
    const query = selectRows.mock.calls[0][1];
    expect(query).toContain('order=created_at.asc');
    expect(query).toContain('limit=1');
    // Lowercased on the way in, because that is how the row is stored.
    expect(query).toContain('email=eq.pulkit%40example.com');
  });

  it('does not go to the database for an empty address', async () => {
    expect(await accountByEmail('  ')).toBeNull();
    expect(selectRows).not.toHaveBeenCalled();
  });
});

describe('resolveAccount', () => {
  it('hands a Google sign in the account the email door already made', async () => {
    selectRows.mockResolvedValue([{ sub: 'email:pulkit@example.com' }]);
    const user = await resolveAccount(GOOGLE);
    expect(user.sub).toBe('email:pulkit@example.com');
    // Only the id is adopted. The name and photo are this sign in's.
    expect(user.name).toBe('Pulkit');
    expect(user.picture).toBe(GOOGLE.picture);
  });

  it('hands an email sign in the account Google already made', async () => {
    selectRows.mockResolvedValue([{ sub: '104729384756102938475' }]);
    const user = await resolveAccount(EMAIL_DOOR);
    expect(user.sub).toBe('104729384756102938475');
  });

  it('keeps the door’s own sub when the address has no account yet', async () => {
    selectRows.mockResolvedValue([]);
    expect((await resolveAccount(EMAIL_DOOR)).sub).toBe('email:pulkit@example.com');
  });

  it('keeps the door’s own sub when the lookup fails', async () => {
    // Supabase unset or unreachable. Signing in still has to work, and the
    // cost is the split this fixes rather than a dead sign in.
    selectRows.mockResolvedValue(null);
    expect((await resolveAccount(GOOGLE)).sub).toBe(GOOGLE.sub);
  });

  it('returns the same object when there is nothing to change', async () => {
    selectRows.mockResolvedValue([{ sub: GOOGLE.sub }]);
    expect(await resolveAccount(GOOGLE)).toBe(GOOGLE);
  });
});

describe('ensureAccount', () => {
  it('does not blank a name and photo that a later sign in does not know', async () => {
    // The email door knows the address and nothing else. The upsert merges
    // whatever columns it is handed, so sending nulls here would wipe what
    // Google filled in on the same row.
    await ensureAccount(EMAIL_DOOR);
    const row = insertRows.mock.calls[0][1];
    expect(row).not.toHaveProperty('name');
    expect(row).not.toHaveProperty('picture');
    expect(row.sub).toBe('email:pulkit@example.com');
    expect(row.email).toBe('pulkit@example.com');
  });

  it('still writes a photo when it has one', async () => {
    await ensureAccount(GOOGLE);
    expect(insertRows.mock.calls[0][1].picture).toBe(GOOGLE.picture);
  });

  // The bug the settings page would otherwise have shipped with. The upsert
  // merges whatever columns it is handed, so a name sent here overwrites
  // accounts.name on every single sign in: somebody edits their name, the next
  // order email greets them correctly, and a week later signing in silently
  // puts Google's version back. Nothing throws and nothing looks broken.
  it('never sends the name in the upsert, so an edited one cannot be merged over', async () => {
    await ensureAccount(GOOGLE);
    expect(insertRows.mock.calls[0][1]).not.toHaveProperty('name');
  });

  it('patches the name only onto an account nobody has edited', async () => {
    await ensureAccount(GOOGLE);
    const [table, filter, patch] = patchRows.mock.calls[0];
    expect(table).toBe('accounts');
    expect(filter).toContain('name_locked=is.false');
    expect(filter).toContain(`sub=eq.${GOOGLE.sub}`);
    expect(patch).toEqual({ name: 'Pulkit' });
  });

  it('does not patch a name it does not have', async () => {
    await ensureAccount(EMAIL_DOOR);
    expect(patchRows).not.toHaveBeenCalled();
  });

  it('grants the welcome credit once, by ref rather than by checking first', async () => {
    await ensureAccount(GOOGLE);
    expect(insertRows.mock.calls[1][0]).toBe('credit_entries');
    expect(insertRows.mock.calls[1][2]).toEqual({ ignoreDuplicatesOn: 'sub,ref' });
  });
});

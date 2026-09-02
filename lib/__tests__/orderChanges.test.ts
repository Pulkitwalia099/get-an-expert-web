import { beforeEach, describe, expect, it, vi } from 'vitest';

// The tick list is us marking our own work in front of the person who paid for
// it, so the two things that matter are that a list cannot claim a version it
// does not belong to, and that "not done" survives the read. A parser that
// coerced everything to done would quietly turn an honest list into a lie.

const selectRows = vi.fn<(table: string, query: string) => Promise<unknown[] | null>>(
  async () => [],
);
vi.mock('@/lib/supabase', () => ({
  selectRows,
  patchRows: vi.fn(),
  insertRows: vi.fn(),
  deleteRows: vi.fn(),
}));

const { changesFor } = await import('@/lib/orderChanges');

const ID = '01dd1d17-fcdb-4518-bd81-96c557f90758';

function row(over: Record<string, unknown> = {}) {
  return { version: 2, text: 'Call to action added', done: true, note: null, position: 0, ...over };
}

beforeEach(() => {
  selectRows.mockClear();
  selectRows.mockResolvedValue([]);
});

describe('changesFor', () => {
  it('keys each list to the version that answered', async () => {
    selectRows.mockResolvedValue([
      row({ version: 2, position: 0, text: 'CTA added' }),
      row({ version: 2, position: 1, text: 'More English' }),
      row({ version: 3, position: 0, text: 'New end card' }),
    ]);
    const out = await changesFor(ID);
    expect(out.get(2)?.map((c) => c.text)).toEqual(['CTA added', 'More English']);
    expect(out.get(3)?.map((c) => c.text)).toEqual(['New end card']);
  });

  it('keeps an item that was not done, and why', async () => {
    selectRows.mockResolvedValue([
      row({ done: false, note: 'The stock shot does not exist yet.' }),
    ]);
    expect(await changesFor(ID).then((m) => m.get(2))).toEqual([
      { text: 'Call to action added', done: false, note: 'The stock shot does not exist yet.' },
    ]);
  });

  it('drops the why once something is done', async () => {
    // A leftover reason under a tick reads as a caveat on work that landed.
    selectRows.mockResolvedValue([row({ done: true, note: 'stale reason' })]);
    expect((await changesFor(ID)).get(2)?.[0].note).toBeNull();
  });

  it('treats anything but an explicit false as done', async () => {
    selectRows.mockResolvedValue([row({ done: undefined })]);
    expect((await changesFor(ID)).get(2)?.[0].done).toBe(true);
  });

  it('drops a blank line and a junk version', async () => {
    selectRows.mockResolvedValue([
      row({ text: '   ' }),
      row({ version: 0, position: 1 }),
      row({ version: 'two', position: 2 }),
    ]);
    expect((await changesFor(ID)).size).toBe(0);
  });

  it('refuses an id that is not a uuid, without querying', async () => {
    expect((await changesFor('../../etc')).size).toBe(0);
    expect(selectRows).not.toHaveBeenCalled();
  });

  it('renders nothing rather than throwing when Supabase is unreachable', async () => {
    selectRows.mockResolvedValue(null as unknown as unknown[]);
    expect((await changesFor(ID)).size).toBe(0);
  });
});

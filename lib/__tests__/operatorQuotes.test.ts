import { beforeEach, describe, expect, it, vi } from 'vitest';

// The operator's read of quote_requests, and the one write it allows.
//
// Two things are pinned here that had already gone wrong once each in the
// route this replaced: a failed read coming back as an empty list, which draws
// "nothing to work" on the page whose job is to say there are seven; and an id
// off the wire going straight into a PostgREST filter.

const selectRows = vi.fn();
const patchRows = vi.fn();

vi.mock('@/lib/supabase', () => ({
  selectRows: (...args: unknown[]) => selectRows(...args),
  insertRows: vi.fn(async () => ({ ok: true, status: 201 })),
}));
vi.mock('@/lib/matches', () => ({
  patchRows: (...args: unknown[]) => patchRows(...args),
  readMatchSet: vi.fn(async () => null),
}));

const { moveQuote, quoteQueue } = await import('@/lib/operatorQuotes');

const SET_A = '84146f84-65bd-457a-bf3e-7ca5fd7cb0a8';
const SET_B = '22b80b01-f204-4e4e-9951-c4e3ee5bcf2e';
const REQ = '5e6de175-6ea9-4d3a-b0f9-4a846f232f9a';

function request(id: string, setId: string) {
  return {
    id,
    set_id: setId,
    email: 'launchcheck+claude@midsesh.com',
    slots: [1, 3],
    status: 'open',
    created_at: '2026-08-04T19:11:02Z',
    updated_at: null,
  };
}

beforeEach(() => {
  selectRows.mockReset();
  patchRows.mockReset();
});

describe('quoteQueue', () => {
  it('says it could not read rather than that there is nothing to work', () => {
    // selectRows returns null on a timeout or a bad response. The route this
    // replaced did `rows ?? []`, so a Supabase blip rendered an empty queue on
    // the one page whose entire job is to show that seven people are waiting.
    selectRows.mockResolvedValue(null);
    return expect(quoteQueue()).resolves.toBeNull();
  });

  it('reads every account request, oldest first, with no sub filter', () => {
    // lib/quotes.ts scopes its reader to one account. An operator queue that
    // quietly did the same would show one person's requests and look fine.
    selectRows.mockResolvedValueOnce([]);
    return quoteQueue().then(() => {
      const [table, query] = selectRows.mock.calls[0] as [string, string];
      expect(table).toBe('quote_requests');
      expect(query).toContain('status=in.(open,contacting)');
      expect(query).toContain('order=created_at.asc');
      expect(query).not.toContain('sub=');
    });
  });

  it('does not spend two round trips per row to draw the headings', async () => {
    // readMatchSet also reads the profiles, so a fifty row queue would be a
    // hundred calls. The headings only need the brief.
    selectRows
      .mockResolvedValueOnce([
        request('a', SET_A),
        request('b', SET_A),
        request('c', SET_B),
      ])
      .mockResolvedValueOnce([
        { id: SET_A, brief: { expert_type: 'UGC creator', domain: 'skincare' }, query: 'ugc' },
        { id: SET_B, brief: null, query: 'rust engineers' },
      ]);

    const rows = await quoteQueue();
    expect(selectRows).toHaveBeenCalledTimes(2);
    expect((selectRows.mock.calls[1] as [string, string])[1]).toContain(`id=in.(${SET_A},${SET_B})`);
    expect(rows?.map((r) => r.title)).toEqual([
      'UGC creator · skincare',
      'UGC creator · skincare',
      'rust engineers',
    ]);
  });

  it('keeps a request whose match set has gone, because somebody is still waiting', async () => {
    selectRows.mockResolvedValueOnce([request(REQ, SET_A)]).mockResolvedValueOnce([]);
    const rows = await quoteQueue();
    expect(rows).toHaveLength(1);
    expect(rows?.[0].title).toBe('launchcheck+claude@midsesh.com');
  });
});

describe('moveQuote', () => {
  it('never lets an id off the wire become a PostgREST filter', async () => {
    for (const id of ['not-a-uuid', `${REQ} or true`, '', 42, null]) {
      const res = await moveQuote(id, 'closed');
      expect(res.ok).toBe(false);
    }
    expect(patchRows).not.toHaveBeenCalled();
  });

  it('refuses a status the ladder does not have', async () => {
    for (const status of ['done', 'quotes_sent', '', undefined]) {
      expect((await moveQuote(REQ, status)).ok).toBe(false);
    }
    expect(patchRows).not.toHaveBeenCalled();
  });

  it('writes the status and stamps it, and reports a storage failure as one', async () => {
    patchRows.mockResolvedValueOnce(true);
    expect(await moveQuote(REQ, 'contacting')).toEqual({ ok: true });
    const [table, filter, patch] = patchRows.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(table).toBe('quote_requests');
    expect(filter).toBe(`id=eq.${REQ}`);
    expect(patch.status).toBe('contacting');
    expect(typeof patch.updated_at).toBe('string');

    // Told apart from a bad request, because only one of the two is worth
    // trying again.
    patchRows.mockResolvedValueOnce(false);
    expect(await moveQuote(REQ, 'closed')).toEqual({
      ok: false,
      reason: 'storage',
      error: 'That did not save.',
    });
  });
});

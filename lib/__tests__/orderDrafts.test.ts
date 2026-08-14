import { beforeEach, describe, expect, it, vi } from 'vitest';

// The draft on a LinkedIn order. Two things matter here and neither throws
// when it is wrong: the history has to stay append only, so a customer's edit
// can never remove the version it replaced, and a version that changes nothing
// must not enter the history, or "3 versions" stops meaning three changes.

const selectRows = vi.fn<(table: string, query: string) => Promise<unknown[] | null>>(
  async () => [],
);
const insertRows = vi.fn(async () => ({ ok: true, status: 201 }));
vi.mock('@/lib/supabase', () => ({ selectRows, insertRows }));

const { appendComment, appendDraft, currentDraft, draftThread } = await import(
  '@/lib/orderDrafts'
);

const ID = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';

function version(over: Record<string, unknown> = {}) {
  return {
    id: 7,
    body: 'The post as it stands.',
    actor: 'operator',
    created_at: '2026-08-14T10:00:00Z',
    ...over,
  };
}

beforeEach(() => {
  selectRows.mockReset();
  selectRows.mockResolvedValue([]);
  insertRows.mockReset();
  insertRows.mockResolvedValue({ ok: true, status: 201 });
});

describe('reading', () => {
  it('asks for the newest first, so the current draft is the first row', async () => {
    selectRows.mockResolvedValue([version()]);
    await draftThread(ID);
    for (const [, query] of selectRows.mock.calls) {
      expect(query).toContain('order=created_at.desc,id.desc');
      expect(query).toContain(`order_id=eq.${ID}`);
    }
  });

  it('reads drafts and comments from their own tables', async () => {
    await draftThread(ID);
    expect(selectRows.mock.calls.map(([table]) => table).sort()).toEqual([
      'mk_order_comments',
      'mk_order_drafts',
    ]);
  });

  it('never puts an id from the URL into a filter unchecked', async () => {
    // selectRows takes a raw query string, so an id straight off the address
    // bar is somebody else's input landing in our query.
    expect(await currentDraft('not-a-uuid')).toBeNull();
    expect(await draftThread('1; drop table mk_orders')).toEqual({ versions: [], comments: [] });
    expect(selectRows).not.toHaveBeenCalled();
  });

  it('renders an unreadable draft as an order with nothing written yet', async () => {
    selectRows.mockResolvedValue(null);
    expect(await draftThread(ID)).toEqual({ versions: [], comments: [] });
  });
});

describe('appendDraft', () => {
  it('writes a new row rather than updating the last one', async () => {
    selectRows.mockResolvedValue([version()]);
    const result = await appendDraft(ID, 'Something different', 'customer:a@b.com');
    expect(result.ok).toBe(true);
    expect(insertRows).toHaveBeenCalledWith('mk_order_drafts', {
      order_id: ID,
      body: 'Something different',
      actor: 'customer:a@b.com',
    });
  });

  it('refuses a version identical to the current one', async () => {
    selectRows.mockResolvedValue([version({ body: 'Same words' })]);
    const result = await appendDraft(ID, '  Same words  ', 'customer:a@b.com');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('same as the current version');
    expect(insertRows).not.toHaveBeenCalled();
  });

  it('refuses an empty one', async () => {
    expect((await appendDraft(ID, '   \n  ', 'operator')).ok).toBe(false);
    expect(insertRows).not.toHaveBeenCalled();
  });

  it('cuts an enormous draft rather than rejecting it', async () => {
    await appendDraft(ID, 'x'.repeat(30_000), 'operator');
    const [, row] = insertRows.mock.calls[0] as unknown as [string, { body: string }];
    expect(row.body.length).toBe(20_000);
  });

  it('records who wrote it, which is what makes the history worth keeping', async () => {
    selectRows.mockResolvedValue([version()]);
    await appendDraft(ID, 'Theirs', 'customer:a@b.com');
    await appendDraft(ID, 'Ours', 'operator');
    const actors = (insertRows.mock.calls as unknown as [string, { actor: string }][]).map(
      ([, row]) => row.actor,
    );
    expect(actors).toEqual(['customer:a@b.com', 'operator']);
  });
});

describe('appendComment', () => {
  it('writes to the comments table and never touches the draft', async () => {
    const result = await appendComment(ID, 'Can the hook be punchier', 'customer:a@b.com');
    expect(result.ok).toBe(true);
    expect(insertRows).toHaveBeenCalledTimes(1);
    expect((insertRows.mock.calls as unknown as [string][])[0][0]).toBe('mk_order_comments');
  });

  it('allows the same comment twice, unlike a draft', async () => {
    // Two people can reasonably say "still not sure" a day apart. The dedupe
    // on drafts exists to keep the version count honest, and a comment has no
    // version count.
    await appendComment(ID, 'Still not sure', 'customer:a@b.com');
    await appendComment(ID, 'Still not sure', 'customer:a@b.com');
    expect(insertRows).toHaveBeenCalledTimes(2);
  });

  it('says so when the write fails rather than reporting success', async () => {
    insertRows.mockResolvedValue({ ok: false, status: 500 });
    expect((await appendComment(ID, 'Anything', 'operator')).ok).toBe(false);
  });
});

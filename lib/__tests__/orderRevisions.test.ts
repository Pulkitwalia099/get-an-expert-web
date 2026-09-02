import { beforeEach, describe, expect, it, vi } from 'vitest';

// The trail is derived, not stored, so every bug in it is a counting bug and
// none of them throws.
//
// Three are worth pinning. Counting a `sample_sent` row rather than a distinct
// file numbers the cut somebody chose as version two before anybody changed
// anything, because the choice writes a third row carrying the same file the
// candidate already had. Counting our own `working` rows shows a customer a
// round of feedback they never gave. And attaching feedback to the newest cut
// rather than the one that was on screen when they wrote it puts their notes
// next to the video that answered them.

const selectRows = vi.fn<(table: string, query: string) => Promise<unknown[] | null>>(
  async () => [],
);
vi.mock('@/lib/supabase', () => ({ selectRows, patchRows: vi.fn(), insertRows: vi.fn() }));

const { revisionsFor } = await import('@/lib/orderRevisions');

const ID = '01dd1d17-fcdb-4518-bd81-96c557f90758';
const V1 = 'https://x.public.blob.vercel-storage.com/team-b.mp4';
const V2 = 'https://x.public.blob.vercel-storage.com/team-b-v2.mp4';

function sent(url: string, at: string, over: Record<string, unknown> = {}) {
  return {
    status: 'sample_sent',
    note: null,
    notes: null,
    actor: 'operator',
    asset_url: url,
    frames: null,
    created_at: at,
    ...over,
  };
}

function asked(text: string, at: string, over: Record<string, unknown> = {}) {
  return {
    status: 'working',
    note: text,
    notes: [{ frame: null, text }],
    actor: 'customer:avpuri@gmail.com',
    asset_url: null,
    frames: null,
    created_at: at,
    ...over,
  };
}

beforeEach(() => {
  selectRows.mockClear();
  selectRows.mockResolvedValue([]);
});

describe('revisionsFor', () => {
  it('is empty until somebody asks for changes', async () => {
    selectRows.mockResolvedValue([sent(V1, '2026-08-29T21:45:00Z')]);
    expect(await revisionsFor(ID)).toEqual([]);
  });

  it('pairs the cut on screen with the notes written against it', async () => {
    selectRows.mockResolvedValue([
      sent(V1, '2026-08-29T21:45:00Z'),
      asked('More English please', '2026-08-30T05:26:00Z'),
      sent(V2, '2026-09-01T09:00:00Z'),
    ]);

    const [round] = await revisionsFor(ID);
    expect(round.round).toBe(1);
    expect(round.before.url).toBe(V1);
    expect(round.before.version).toBe(1);
    expect(round.after?.url).toBe(V2);
    expect(round.after?.version).toBe(2);
    expect(round.feedback.lines).toEqual([{ frame: null, text: 'More English please' }]);
  });

  it('leaves the round open while the answering cut is still being made', async () => {
    selectRows.mockResolvedValue([
      sent(V1, '2026-08-29T21:45:00Z'),
      asked('More English please', '2026-08-30T05:26:00Z'),
    ]);

    const [round] = await revisionsFor(ID);
    expect(round.after).toBeNull();
    expect(round.before.url).toBe(V1);
  });

  it('counts one version when the same file is sent twice', async () => {
    // Two cuts go up, the customer prefers one, and that choice writes a
    // second row carrying the file the candidate already held. Numbering rows
    // rather than files would call it version two before anything changed.
    selectRows.mockResolvedValue([
      sent(V1, '2026-08-29T21:45:00Z', { note: 'Two cuts up for review' }),
      sent(V1, '2026-08-30T05:21:00Z', {
        note: 'Chose Ghar Aake Bra Utaar Ke Phenkna',
        actor: 'customer:avpuri@gmail.com',
      }),
      asked('More English please', '2026-08-30T05:26:00Z'),
      sent(V2, '2026-09-01T09:00:00Z'),
    ]);

    const [round] = await revisionsFor(ID);
    expect(round.before.version).toBe(1);
    expect(round.after?.version).toBe(2);
  });

  it('ignores our own working rows', async () => {
    selectRows.mockResolvedValue([
      sent(V1, '2026-08-29T21:45:00Z'),
      {
        status: 'working',
        note: 'back in the queue',
        notes: null,
        actor: 'operator',
        asset_url: null,
        frames: null,
        created_at: '2026-08-30T01:00:00Z',
      },
    ]);
    expect(await revisionsFor(ID)).toEqual([]);
  });

  it('ignores feedback written before anything was sent', async () => {
    selectRows.mockResolvedValue([asked('hurry up', '2026-08-28T10:00:00Z')]);
    expect(await revisionsFor(ID)).toEqual([]);
  });

  it('falls back to the compiled note when the structured rows are junk', async () => {
    selectRows.mockResolvedValue([
      sent(V1, '2026-08-29T21:45:00Z'),
      asked('More English please', '2026-08-30T05:26:00Z', { notes: ['nope', 42] }),
    ]);
    const [round] = await revisionsFor(ID);
    expect(round.feedback.lines).toEqual([{ frame: null, text: 'More English please' }]);
  });

  it('carries a second round against the cut that answered the first', async () => {
    const V3 = 'https://x.public.blob.vercel-storage.com/team-b-v3.mp4';
    selectRows.mockResolvedValue([
      sent(V1, '2026-08-29T21:45:00Z'),
      asked('More English', '2026-08-30T05:26:00Z'),
      sent(V2, '2026-09-01T09:00:00Z'),
      asked('Now the end card', '2026-09-02T09:00:00Z'),
      sent(V3, '2026-09-03T09:00:00Z'),
    ]);

    const rounds = await revisionsFor(ID);
    expect(rounds).toHaveLength(2);
    expect(rounds[1].before.url).toBe(V2);
    expect(rounds[1].after?.url).toBe(V3);
    expect(rounds[1].round).toBe(2);
  });

  it('refuses an id that is not a uuid, without querying', async () => {
    expect(await revisionsFor('../../etc')).toEqual([]);
    expect(selectRows).not.toHaveBeenCalled();
  });

  it('renders nothing rather than throwing when Supabase is unreachable', async () => {
    selectRows.mockResolvedValue(null as unknown as unknown[]);
    expect(await revisionsFor(ID)).toEqual([]);
  });
});

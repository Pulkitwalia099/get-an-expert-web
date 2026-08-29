import { beforeEach, describe, expect, it, vi } from 'vitest';

// Two things here can hurt a real customer and neither of them throws.
//
// The first is telling two tabs they both won the choice. `patchRows` reports
// success for a PATCH that matched no rows, so the only honest answer is to
// read back who actually holds the choice. These tests pin that read-back,
// because deleting it leaves every test that only checks the happy path green.
//
// The second is the editorial split. `story` and `beats` are held to what the
// script says and `reads` is our read of the work. They are separate fields so
// the page can label ours as ours, and a parser that quietly merged or dropped
// one would put our reasoning in a named expert's mouth.

const selectRows = vi.fn<(table: string, query: string) => Promise<unknown[] | null>>(
  async () => [],
);
const patchRows = vi.fn(async () => true);
const insertRows = vi.fn(async () => ({ ok: true, status: 201 }));
vi.mock('@/lib/supabase', () => ({ selectRows, patchRows, insertRows }));

const {
  candidatesFor,
  chooseCandidate,
  chosen,
  awaitingChoice,
  parseDetail,
  publishChosenSample,
} = await import('@/lib/orderCandidates');

const ID = '01dd1d17-fcdb-4518-bd81-96c557f90758';

function row(over: Record<string, unknown> = {}) {
  return {
    slug: 'a',
    label: 'Team A',
    title: 'The Mirror',
    kind: 'Cinematic · 34 seconds',
    led_by: 'Stella Soribe',
    sample_url: 'https://example.public.blob.vercel-storage.com/a.mp4',
    frames: null,
    detail: null,
    position: 0,
    chosen_at: null,
    ...over,
  };
}

beforeEach(() => {
  selectRows.mockClear();
  patchRows.mockClear();
  insertRows.mockClear();
  selectRows.mockResolvedValue([]);
  patchRows.mockResolvedValue(true);
});

describe('candidatesFor', () => {
  it('filters on the order in the query and asks for display order', async () => {
    await candidatesFor(ID);
    const [table, query] = selectRows.mock.calls[0]!;
    expect(table).toBe('mk_order_candidates');
    expect(query).toContain(`order_id=eq.${ID}`);
    expect(query).toContain('order=position.asc');
  });

  it('never puts an id from a URL into a filter unchecked', async () => {
    expect(await candidatesFor('not-a-uuid')).toEqual([]);
    expect(await candidatesFor(`${ID}&select=*`)).toEqual([]);
    expect(selectRows).not.toHaveBeenCalled();
  });

  it('reads a failed lookup as no choice rather than as an error', async () => {
    selectRows.mockResolvedValue(null as unknown as unknown[]);
    expect(await candidatesFor(ID)).toEqual([]);
    expect(awaitingChoice(await candidatesFor(ID))).toBe(false);
  });
});

describe('awaitingChoice', () => {
  it('is false for an order with no cuts, so every existing order is untouched', () => {
    expect(awaitingChoice([])).toBe(false);
  });

  it('is true only while nobody has picked', async () => {
    selectRows.mockResolvedValue([row(), row({ slug: 'b', position: 1 })]);
    expect(awaitingChoice(await candidatesFor(ID))).toBe(true);

    selectRows.mockResolvedValue([
      row({ chosen_at: '2026-08-30T10:00:00Z' }),
      row({ slug: 'b', position: 1 }),
    ]);
    const after = await candidatesFor(ID);
    expect(awaitingChoice(after)).toBe(false);
    expect(chosen(after)?.slug).toBe('a');
  });
});

describe('chooseCandidate', () => {
  it('puts chosen_at=is.null in the filter so a second write overwrites nothing', async () => {
    selectRows
      .mockResolvedValueOnce([row(), row({ slug: 'b', position: 1 })])
      .mockResolvedValueOnce([row({ chosen_at: '2026-08-30T10:00:00Z' }), row({ slug: 'b', position: 1 })]);

    const result = await chooseCandidate(ID, 'a');
    expect(result.ok).toBe(true);
    const [table, filter] = patchRows.mock.calls[0]!;
    expect(table).toBe('mk_order_candidates');
    expect(filter).toContain('chosen_at=is.null');
    expect(filter).toContain(`order_id=eq.${ID}`);
  });

  it('believes the read-back, not the patch, about who won', async () => {
    // The patch says it worked. It matched nothing, because the other tab got
    // there first. Trusting the boolean here is the bug this test exists for.
    selectRows
      .mockResolvedValueOnce([row(), row({ slug: 'b', position: 1 })])
      .mockResolvedValueOnce([
        row(),
        row({ slug: 'b', position: 1, title: 'Ghar Aake Bra Utaar Ke Phenkna', chosen_at: '2026-08-30T10:00:00Z' }),
      ]);
    patchRows.mockResolvedValue(true);

    const result = await chooseCandidate(ID, 'a');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Ghar Aake Bra Utaar Ke Phenkna');
  });

  it('treats choosing the same cut twice as success, not as an error', async () => {
    selectRows.mockResolvedValue([
      row({ chosen_at: '2026-08-30T10:00:00Z' }),
      row({ slug: 'b', position: 1 }),
    ]);
    const result = await chooseCandidate(ID, 'a');
    expect(result.ok).toBe(true);
    // Already settled, so nothing is written a second time.
    expect(patchRows).not.toHaveBeenCalled();
  });

  it('names the cut they already picked when they tap the other one', async () => {
    selectRows.mockResolvedValue([
      row({ chosen_at: '2026-08-30T10:00:00Z' }),
      row({ slug: 'b', position: 1 }),
    ]);
    const result = await chooseCandidate(ID, 'b');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('The Mirror');
    expect(patchRows).not.toHaveBeenCalled();
  });

  it('refuses a slug that is not on this order', async () => {
    selectRows.mockResolvedValue([row()]);
    const result = await chooseCandidate(ID, 'zzz');
    expect(result.ok).toBe(false);
    expect(patchRows).not.toHaveBeenCalled();
  });

  it('never lets a slug from a browser reach a filter unchecked', async () => {
    const result = await chooseCandidate(ID, 'a&chosen_at=not.is.null');
    expect(result.ok).toBe(false);
    expect(selectRows).not.toHaveBeenCalled();
    expect(patchRows).not.toHaveBeenCalled();
  });

  it('reports failure when nothing ended up chosen', async () => {
    selectRows.mockResolvedValue([row(), row({ slug: 'b', position: 1 })]);
    const result = await chooseCandidate(ID, 'a');
    expect(result.ok).toBe(false);
  });
});

describe('publishChosenSample', () => {
  it('writes the chosen cut in as an ordinary sample so nothing downstream changes', async () => {
    selectRows.mockResolvedValue([row()]);
    const [candidate] = await candidatesFor(ID);
    await publishChosenSample(ID, candidate!, 'Avpuri@Gmail.com ');

    const written = insertRows.mock.calls[0]![1] as Record<string, unknown>;
    expect(insertRows.mock.calls[0]![0]).toBe('mk_order_events');
    expect(written.status).toBe('sample_sent');
    expect(written.asset_url).toBe(candidate!.sampleUrl);
    // Normalised, so the trail matches every other customer event on the order.
    expect(written.actor).toBe('customer:avpuri@gmail.com');
  });

  it('is not a working event, so it cannot eat the included revision', async () => {
    selectRows.mockResolvedValue([row()]);
    const [candidate] = await candidatesFor(ID);
    await publishChosenSample(ID, candidate!, 'avpuri@gmail.com');
    const written = insertRows.mock.calls[0]![1] as Record<string, unknown>;
    expect(written.status).not.toBe('working');
  });
});

describe('parseDetail', () => {
  it('keeps the script and our read as separate fields', () => {
    const detail = parseDetail({
      story: 'She is at her bedroom mirror.',
      reads: ['It moves the blame.', 'It ends on an instruction.'],
      trade: 'The payoff lands at 18 seconds.',
      beats: [{ t: 10, d: 'The bedroom becomes a fitting room.' }, { t: 0, d: 'She tugs a strap.' }],
      built: 'Three sets and the casting.',
    });
    expect(detail?.story).toBe('She is at her bedroom mirror.');
    expect(detail?.reads).toHaveLength(2);
    expect(detail?.trade).toContain('18 seconds');
    // Sorted by time, because the page renders them as a timeline.
    expect(detail?.beats.map((b) => b.t)).toEqual([0, 10]);
  });

  it('renders less rather than throwing on a junk row', () => {
    expect(parseDetail(null)).toBeNull();
    expect(parseDetail('a string')).toBeNull();
    expect(parseDetail([])).toBeNull();
    expect(parseDetail({})).toBeNull();
    expect(parseDetail({ reads: 'not an array', beats: 42 })).toBeNull();
  });

  it('drops a beat with no time or no words rather than the whole list', () => {
    const detail = parseDetail({
      beats: [{ t: 0, d: 'Good' }, { t: 'x', d: 'No time' }, { t: 5, d: '   ' }],
    });
    expect(detail?.beats).toEqual([{ t: 0, d: 'Good' }]);
  });
});

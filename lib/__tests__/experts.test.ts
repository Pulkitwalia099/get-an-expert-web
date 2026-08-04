import { describe, expect, it } from 'vitest';
import { MAX_EXPERTS, finalizeExperts, redactExpert, redactExperts } from '../experts';
import type { SerpResult } from '../serp';

function rawResult(n: number): SerpResult {
  return {
    title: `Person ${n}`,
    link: `https://upwork.com/${n}`,
    snippet: '',
    thumbnail: `https://img/${n}.jpg`,
    source: 'upwork.com',
  };
}

const RAW: SerpResult[] = [rawResult(1)];

function pick(n: number, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: `Person ${n}`,
    why: 'Listing is built around this work.',
    projected: 'The hard part here is scoping.',
    link: `https://upwork.com/${n}`,
    source: 'upwork.com',
    ...extra,
  };
}

describe('finalizeExperts', () => {
  it('shapes valid picks and attaches thumbnails by link', () => {
    const records = finalizeExperts(
      [
        pick(1, {
          country: 'Berlin, DE',
          flag: '🇩🇪',
          rating: 4.9,
          reviews: 127,
          price: '$90/hr',
          top_match: true,
        }),
      ],
      RAW,
    );
    expect(records).toHaveLength(1);
    expect(records[0].photo).toBe('https://img/1.jpg');
    expect(records[0].slot).toBe(1);
    expect(records[0].link).toBe('https://upwork.com/1');
    expect(records[0].projected).toBe('The hard part here is scoping.');
  });

  it('drops entries without a name or why', () => {
    const records = finalizeExperts(
      [{ name: '', why: 'x' }, { name: 'B', why: '' }, null, 'junk'],
      RAW,
    );
    expect(records).toEqual([]);
  });

  // The model is told to copy a link back verbatim. Anything it returns that
  // was not in the raw results was invented, and an invented link is a person
  // the dashboard would send somebody to and never find.
  it('drops picks whose link was not in the search results', () => {
    const records = finalizeExperts([pick(1, { link: 'https://upwork.com/made-up' })], RAW);
    expect(records).toEqual([]);
  });

  it('drops a second pick that reuses the same link', () => {
    const records = finalizeExperts([pick(1), pick(1)], RAW);
    expect(records).toHaveLength(1);
  });

  it('caps at eight and forces exactly one top match', () => {
    const raw = Array.from({ length: 12 }, (_, i) => rawResult(i));
    const many = Array.from({ length: 12 }, (_, i) => pick(i, { top_match: true }));
    const records = finalizeExperts(many, raw);
    expect(records).toHaveLength(MAX_EXPERTS);
    expect(records.filter((r) => r.top_match)).toHaveLength(1);
    expect(records.map((r) => r.slot)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('nulls out invalid ratings and prices', () => {
    const records = finalizeExperts([pick(1, { rating: 9, reviews: -2, price: '   ' })], RAW);
    expect(records[0].rating).toBeNull();
    expect(records[0].reviews).toBeNull();
    expect(records[0].price).toBeNull();
  });
});

describe('redactExpert', () => {
  const [record] = finalizeExperts(
    [pick(1, { country: 'Berlin, DE', rating: 4.9, price: '$90/hr' })],
    RAW,
  );

  it('withholds name, photo and link when locked', () => {
    const card = redactExpert(record, true);
    expect(card.name).toBeNull();
    expect(card.photo).toBeNull();
    expect(card.link).toBeNull();
    expect(card.locked).toBe(true);
  });

  // What is left has to be enough to choose on, or the locked card is a wall
  // rather than an offer.
  it('keeps everything a visitor chooses on', () => {
    const card = redactExpert(record, true);
    expect(card.why).toBe(record.why);
    expect(card.projected).toBe(record.projected);
    expect(card.country).toBe('Berlin, DE');
    expect(card.rating).toBe(4.9);
    expect(card.price).toBe('$90/hr');
    expect(card.source).toBe('upwork.com');
    expect(card.slot).toBe(1);
  });

  it('restores the withheld fields when unlocked', () => {
    const card = redactExpert(record, false);
    expect(card.name).toBe('Person 1');
    expect(card.photo).toBe('https://img/1.jpg');
    expect(card.link).toBe('https://upwork.com/1');
    expect(card.locked).toBe(false);
  });

  // The gate is only real if the withheld values are absent from the payload
  // itself. A blurred copy still in the JSON is a blur anyone removes.
  it('leaves no trace of a withheld value anywhere in the serialised payload', () => {
    const json = JSON.stringify(redactExperts([record], true));
    expect(json).not.toContain('Person 1');
    expect(json).not.toContain('https://upwork.com/1');
    expect(json).not.toContain('https://img/1.jpg');
  });
});

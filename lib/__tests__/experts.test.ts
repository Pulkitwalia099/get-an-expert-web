import { describe, expect, it } from 'vitest';
import { finalizeExperts } from '../experts';
import type { SerpResult } from '../serp';

const RAW: SerpResult[] = [
  {
    title: 'Amira H.',
    link: 'https://upwork.com/a',
    snippet: '',
    thumbnail: 'https://img/a.jpg',
    source: 'upwork.com',
  },
];

describe('finalizeExperts', () => {
  it('shapes valid picks and attaches thumbnails by link', () => {
    const experts = finalizeExperts(
      [
        {
          name: 'Amira H.',
          country: 'Berlin, DE',
          flag: '🇩🇪',
          rating: 4.9,
          reviews: 127,
          price: '$90/hr',
          why: 'Took two fintechs through BaFin.',
          link: 'https://upwork.com/a',
          source: 'upwork.com',
          top_match: true,
        },
      ],
      RAW,
    );
    expect(experts).toHaveLength(1);
    expect(experts[0].photo).toBe('https://img/a.jpg');
    expect(experts[0].id).toBe('e1');
  });

  it('drops entries without a name or why', () => {
    const experts = finalizeExperts(
      [{ name: '', why: 'x' }, { name: 'B', why: '' }, null, 'junk'],
      [],
    );
    expect(experts).toEqual([]);
  });

  it('caps at three and forces exactly one top match', () => {
    const many = Array.from({ length: 5 }, (_, i) => ({
      name: `Person ${i}`,
      why: 'Fits the brief.',
      top_match: true,
    }));
    const experts = finalizeExperts(many, []);
    expect(experts).toHaveLength(3);
    expect(experts.filter((e) => e.top_match)).toHaveLength(1);
  });

  it('nulls out invalid ratings and prices', () => {
    const experts = finalizeExperts(
      [{ name: 'A', why: 'w', rating: 9, reviews: -2, price: '   ' }],
      [],
    );
    expect(experts[0].rating).toBeNull();
    expect(experts[0].reviews).toBeNull();
    expect(experts[0].price).toBeNull();
  });
});

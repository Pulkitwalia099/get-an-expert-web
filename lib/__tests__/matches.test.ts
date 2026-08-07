import { describe, expect, it } from 'vitest';
import { canReveal, parseSetId, type MatchSet } from '../matches';
import type { Brief } from '../types';

const BRIEF: Brief = {
  expert_type: 'compliance consultant',
  domain: 'fintech',
  specifics: '',
  engagement: '',
  budget: '',
  timeline: '',
  search_query: 'BaFin compliance consultant',
};

function set(sub: string | null): MatchSet {
  return {
    id: '11111111-2222-3333-4444-555555555555',
    sub,
    brief: BRIEF,
    query: 'BaFin compliance consultant',
    createdAt: '2026-08-04T00:00:00.000Z',
    records: [],
  };
}

describe('parseSetId', () => {
  it('accepts a uuid and lowercases it', () => {
    expect(parseSetId('AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE')).toBe(
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    );
  });

  it('rejects anything that is not a bare uuid', () => {
    for (const bad of [
      '',
      'not-a-uuid',
      // A filter fragment. The id is interpolated into a PostgREST query, so
      // the only shape allowed through is the one that cannot carry an operator.
      '11111111-2222-3333-4444-555555555555&sub=is.null',
      "1' or '1'='1",
      null,
      42,
      undefined,
    ]) {
      expect(parseSetId(bad)).toBeNull();
    }
  });
});

describe('canReveal', () => {
  // Whoever holds the id of an unclaimed set just ran that search and is on
  // their way to signing in, so signing in is the whole of the check.
  it('lets any signed in account reveal an unclaimed set', () => {
    expect(canReveal(set(null), 'google-sub-1')).toBe(true);
  });

  it('refuses a signed out browser, claimed or not', () => {
    expect(canReveal(set(null), null)).toBe(false);
    expect(canReveal(set('google-sub-1'), null)).toBe(false);
  });

  it('refuses a different account once the set has an owner', () => {
    expect(canReveal(set('google-sub-1'), 'google-sub-2')).toBe(false);
  });

  it('lets the owner back in', () => {
    expect(canReveal(set('google-sub-1'), 'google-sub-1')).toBe(true);
  });
});

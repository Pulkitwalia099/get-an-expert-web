import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { briefLine, parseSlots, readIntent, refFor, signIntent } from '../quotes';
import type { Brief } from '../types';

const SET = '11111111-2222-3333-4444-555555555555';

beforeEach(() => {
  process.env.SESSION_SECRET = 'test-secret-for-intents';
});

afterEach(() => {
  delete process.env.SESSION_SECRET;
});

describe('parseSlots', () => {
  it('sorts, deduplicates and drops anything out of range', () => {
    expect(parseSlots([3, 1, 3, 0, 9, -2, 2])).toEqual([1, 2, 3]);
  });

  it('rejects fractions and non-numeric junk', () => {
    expect(parseSlots([1.5, 'x', null, {}, NaN])).toEqual([]);
  });

  it('returns empty for anything that is not an array', () => {
    expect(parseSlots('1,2,3')).toEqual([]);
    expect(parseSlots(undefined)).toEqual([]);
  });
});

describe('refFor', () => {
  // The ref is the idempotency key against a unique index. Picking 3 then 1
  // and picking 1 then 3 are the same request, so they have to key the same
  // way or the second one writes a second round of outreach.
  it('is stable regardless of the order slots were ticked in', () => {
    expect(refFor(parseSlots([3, 1]))).toBe(refFor(parseSlots([1, 3])));
  });

  it('differs for a different selection', () => {
    expect(refFor([1, 2])).not.toBe(refFor([1, 2, 3]));
  });
});

describe('signIntent and readIntent', () => {
  it('round trips a selection', () => {
    const cookie = signIntent({ setId: SET, slots: [1, 4] });
    expect(readIntent(cookie!)).toEqual({ setId: SET, slots: [1, 4] });
  });

  // This is the point of signing it. Without the signature somebody could
  // rewrite the cookie to another set id and claim a search that is not theirs
  // the moment they sign in.
  it('rejects a payload edited to point at another set', () => {
    const cookie = signIntent({ setId: SET, slots: [1] })!;
    const [body, sig] = cookie.split('.');
    const tampered = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(body, 'base64url').toString()),
        setId: '99999999-9999-9999-9999-999999999999',
      }),
    ).toString('base64url');
    expect(readIntent(`${tampered}.${sig}`)).toBeNull();
  });

  it('rejects an expired cookie', () => {
    const cookie = signIntent({ setId: SET, slots: [1] }, 0);
    expect(readIntent(cookie!, Date.now())).toBeNull();
  });

  it('rejects garbage and an empty selection', () => {
    expect(readIntent(undefined)).toBeNull();
    expect(readIntent('')).toBeNull();
    expect(readIntent('nodot')).toBeNull();
    expect(readIntent(signIntent({ setId: SET, slots: [] })!)).toBeNull();
  });

  // Rotating the secret has to invalidate parked intents the same way it
  // invalidates sessions, or a stale cookie outlives the key that signed it.
  it('rejects a cookie signed with a different secret', () => {
    const cookie = signIntent({ setId: SET, slots: [1] })!;
    process.env.SESSION_SECRET = 'a-different-secret';
    expect(readIntent(cookie)).toBeNull();
  });

  it('returns null when no secret is configured', () => {
    delete process.env.SESSION_SECRET;
    expect(signIntent({ setId: SET, slots: [1] })).toBeNull();
  });
});

describe('briefLine', () => {
  const brief: Brief = {
    expert_type: 'compliance consultant',
    domain: 'fintech',
    specifics: 'BaFin licence application, Berlin',
    engagement: '',
    budget: '',
    timeline: '',
    search_query: 'BaFin compliance',
  };

  it('reads back as a sentence rather than an object', () => {
    expect(briefLine(brief, 'x')).toBe(
      'compliance consultant · fintech. BaFin licence application, Berlin',
    );
  });

  it('falls back to the query when there is no brief', () => {
    expect(briefLine(null, 'BaFin compliance')).toBe('BaFin compliance');
  });

  it('never renders an empty line', () => {
    const empty = { ...brief, expert_type: '', domain: '', specifics: '' };
    expect(briefLine(empty, '')).toBe('Your search');
  });
});

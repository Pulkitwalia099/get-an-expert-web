import { describe, expect, it } from 'vitest';
import { stripEmDashes } from '../humanize';

describe('stripEmDashes', () => {
  it('replaces em dashes with commas', () => {
    expect(stripEmDashes('Strong on filings — slightly over budget')).toBe(
      'Strong on filings, slightly over budget',
    );
    expect(stripEmDashes('Done—check your inbox')).toBe('Done, check your inbox');
  });

  it('replaces spaced en dashes but keeps ranges', () => {
    expect(stripEmDashes('Fast – reliable')).toBe('Fast, reliable');
    expect(stripEmDashes('€5–15k')).toBe('€5–15k');
  });

  it('leaves clean text alone', () => {
    expect(stripEmDashes('Which market first?')).toBe('Which market first?');
  });
});

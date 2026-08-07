import { describe, expect, it } from 'vitest';
import { buildSummary } from '../callSummary';
import type { Brief } from '../types';

const BRIEF: Brief = {
  expert_type: 'Backend engineer',
  domain: 'fintech',
  specifics: 'Stripe webhooks dropping events under load',
  engagement: 'one off fix',
  budget: '$500',
  timeline: 'this week',
  search_query: 'stripe webhook reliability engineer',
};

describe('buildSummary', () => {
  it('leads with the need and the specifics', () => {
    const out = buildSummary(BRIEF, 'it started yesterday');
    expect(out).toContain('Backend engineer');
    expect(out).toContain('Stripe webhooks dropping events under load');
  });

  it('includes the last message', () => {
    expect(buildSummary(BRIEF, 'it started yesterday')).toContain('it started yesterday');
  });

  it('is two lines', () => {
    expect(buildSummary(BRIEF, 'it started yesterday').split('\n')).toHaveLength(2);
  });

  it('falls back to the message alone when there is no brief', () => {
    expect(buildSummary(null, 'my build is broken')).toBe('No brief yet.\nmy build is broken');
  });

  it('truncates a very long message', () => {
    const out = buildSummary(BRIEF, 'x'.repeat(500));
    expect(out.length).toBeLessThan(500);
    expect(out).toContain('…');
  });

  it('never emits an em dash', () => {
    expect(buildSummary(BRIEF, 'a — b')).not.toContain('—');
  });
});

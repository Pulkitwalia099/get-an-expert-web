import { describe, expect, it } from 'vitest';
import { buildCalPrefill } from '../calLink';
import type { Brief } from '../types';

const BRIEF: Brief = {
  expert_type: 'Backend engineer',
  domain: 'fintech',
  specifics: 'Stripe webhooks dropping events',
  engagement: 'one off fix',
  budget: '$500',
  timeline: 'this week',
  search_query: 'stripe webhook engineer',
};

describe('buildCalPrefill', () => {
  it('uses the operator cal link', () => {
    const out = buildCalPrefill('rohit', BRIEF, 'help', {});
    expect(out.calLink).toBe('pulkit-walia-plcgb7/15min');
  });

  it('passes name and email through when present', () => {
    const out = buildCalPrefill('rohit', BRIEF, 'help', { name: 'Ada', email: 'a@b.co' });
    expect(out.name).toBe('Ada');
    expect(out.email).toBe('a@b.co');
  });

  it('leaves name and email null when absent', () => {
    const out = buildCalPrefill('rohit', BRIEF, 'help', {});
    expect(out.name).toBeNull();
    expect(out.email).toBeNull();
  });

  it('puts the summary in the notes', () => {
    const out = buildCalPrefill('rohit', BRIEF, 'it broke today', {});
    expect(out.notes).toContain('Stripe webhooks dropping events');
    expect(out.notes).toContain('it broke today');
  });

  it('never emits an em dash', () => {
    const out = buildCalPrefill('rohit', BRIEF, 'a — b', { name: 'x — y' });
    expect(JSON.stringify(out)).not.toContain('—');
  });
});

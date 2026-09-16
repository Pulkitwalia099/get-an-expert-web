import { describe, expect, it } from 'vitest';
import { START_OPTIONS, START_STEP_DAYS, labelFor, parseStartOn, startOptions } from '@/lib/plan-dates';

describe('plan start dates', () => {
  const now = new Date('2026-09-15T22:30:00Z');

  it('offers four days, three apart, starting three days out', () => {
    const opts = startOptions(now);
    expect(opts.map((o) => o.iso)).toEqual(['2026-09-18', '2026-09-21', '2026-09-24', '2026-09-27']);
    expect(opts).toHaveLength(START_OPTIONS);
    expect(START_STEP_DAYS).toBe(3);
    expect(opts[0].label).toBe('Fri 18 Sep');
  });

  it('accepts every option it offered, with a day of slack at each end', () => {
    for (const o of startOptions(now)) expect(parseStartOn(o.iso, now)).toBe(o.iso);
    // A browser a time zone ahead may offer the first date a day early.
    expect(parseStartOn('2026-09-17', now)).toBe('2026-09-17');
    expect(parseStartOn('2026-09-28', now)).toBe('2026-09-28');
  });

  it('refuses dates outside the window and strings that are not dates', () => {
    expect(parseStartOn('2026-09-16', now)).toBeNull();
    expect(parseStartOn('2026-09-29', now)).toBeNull();
    expect(parseStartOn('2026-02-30', now)).toBeNull();
    expect(parseStartOn('tomorrow', now)).toBeNull();
    expect(parseStartOn(20260918, now)).toBeNull();
    expect(parseStartOn(null, now)).toBeNull();
  });

  it('labels a day without the year and survives junk', () => {
    expect(labelFor('2026-12-25')).toBe('Fri 25 Dec');
    expect(labelFor('nope')).toBe('nope');
  });
});

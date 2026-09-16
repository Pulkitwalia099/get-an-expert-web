import { describe, expect, it } from 'vitest';
import { START_OPTIONS, START_STEP_DAYS, labelFor, parseStartOn, startOptions } from '@/lib/plan-dates';
import { PLANS } from '@/lib/plans';

describe('plan start dates', () => {
  const from = '2026-09-22';

  it('offers four days, three apart, from the date the plan names', () => {
    const opts = startOptions(from);
    expect(opts.map((o) => o.iso)).toEqual(['2026-09-22', '2026-09-25', '2026-09-28', '2026-10-01']);
    expect(opts).toHaveLength(START_OPTIONS);
    expect(START_STEP_DAYS).toBe(3);
    expect(opts[0].label).toBe('Tue 22 Sep');
    expect(opts[3].label).toBe('Thu 1 Oct');
  });

  it('accepts exactly the options it offered', () => {
    for (const o of startOptions(from)) expect(parseStartOn(o.iso, from)).toBe(o.iso);
    expect(parseStartOn('2026-09-23', from)).toBeNull();
    expect(parseStartOn('2026-10-04', from)).toBeNull();
    expect(parseStartOn('tomorrow', from)).toBeNull();
    expect(parseStartOn(20260922, from)).toBeNull();
    expect(parseStartOn(null, from)).toBeNull();
  });

  it('offers nothing from a date that is not a date', () => {
    expect(startOptions('2026-02-30')).toEqual([]);
    expect(startOptions('soon')).toEqual([]);
  });

  it('labels a day without the year and survives junk', () => {
    expect(labelFor('2026-12-25')).toBe('Fri 25 Dec');
    expect(labelFor('nope')).toBe('nope');
  });

  it('every plan names a first date the picker can use', () => {
    for (const plan of PLANS) expect(startOptions(plan.startFrom)).toHaveLength(START_OPTIONS);
  });
});

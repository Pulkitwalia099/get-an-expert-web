import { describe, expect, it } from 'vitest';
import { consultSlots, monthGrid } from '@/lib/slots';

describe('consultSlots', () => {
  const slots = consultSlots();

  it('runs from 10:00 AM to 11:30 PM in half hour steps', () => {
    expect(slots[0]).toBe('10:00 AM');
    expect(slots[slots.length - 1]).toBe('11:30 PM');
    expect(slots).toHaveLength(28);
  });

  it('formats noon and afternoon correctly', () => {
    expect(slots).toContain('12:00 PM');
    expect(slots).toContain('12:30 PM');
    expect(slots).toContain('1:00 PM');
    expect(slots).not.toContain('0:00 PM');
  });

  it('returns a fresh array each call', () => {
    const again = consultSlots();
    expect(again).toEqual(slots);
    expect(again).not.toBe(slots);
  });
});

describe('monthGrid', () => {
  // July 2026: the 1st is a Wednesday, 31 days.
  const grid = monthGrid(2026, 6);

  it('labels the month', () => {
    expect(grid.label).toBe('July 2026');
  });

  it('pads leading weekdays with nulls', () => {
    expect(grid.cells.slice(0, 3)).toEqual([null, null, null]);
    expect(grid.cells[3]).toBe(1);
  });

  it('ends on the last day of the month', () => {
    const days = grid.cells.filter((c): c is number => c !== null);
    expect(days).toHaveLength(31);
    expect(days[days.length - 1]).toBe(31);
  });

  it('handles February in a leap year', () => {
    const feb = monthGrid(2028, 1);
    const days = feb.cells.filter((c): c is number => c !== null);
    expect(days).toHaveLength(29);
  });
});

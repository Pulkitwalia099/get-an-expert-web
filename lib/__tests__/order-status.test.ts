import { describe, expect, it } from 'vitest';
import { CHOICE_STEPS, choiceStepFor, stepFor } from '@/lib/order-status';

// The rail told a client they were back at the beginning.
//
// Asking for changes writes `working`, and `working` mapped to step 0, so an
// order where somebody had already watched two cuts, picked one and written
// three paragraphs of notes rendered "Two cuts ready, you are here". Pulkit
// caught it on Anant's live order on 1 Sep. Picking cannot be undone, so the
// only honest place to hold is the review step.

describe('choiceStepFor', () => {
  it('holds at the review step while we recut', () => {
    expect(choiceStepFor('working', true)).toBe(2);
    expect(CHOICE_STEPS[2]).toBe('Approve or give feedback');
  });

  it('still starts at the beginning before any cut exists', () => {
    expect(choiceStepFor('working', false)).toBe(0);
    expect(choiceStepFor('new', false)).toBe(0);
  });

  it('never moves backwards once a cut is chosen', () => {
    // The order of a real journey: two cuts up, one preferred, notes sent,
    // recut sent, approved. No step may be lower than the one before it.
    const journey: Array<[Parameters<typeof choiceStepFor>[0], boolean]> = [
      ['sample_sent', false],
      ['sample_sent', true],
      ['working', true],
      ['sample_sent', true],
      ['approved', true],
      ['delivered', true],
    ];
    const steps = journey.map(([status, chosen]) => choiceStepFor(status, chosen));
    expect(steps).toEqual([1, 2, 2, 2, 3, 3]);
    for (let i = 1; i < steps.length; i += 1) {
      expect(steps[i]!).toBeGreaterThanOrEqual(steps[i - 1]!);
    }
  });

  it('leaves the rail off for an order that ended early', () => {
    expect(choiceStepFor('declined', true)).toBeNull();
    expect(choiceStepFor('refunded', true)).toBeNull();
  });

  it('leaves the four-step rail alone', () => {
    // Only the choice rail learned about revisions. An ordinary order still
    // reads `working` as "In progress", which is correct for it.
    expect(stepFor('working')).toBe(1);
  });
});

import { describe, expect, it } from 'vitest';
import { REVISION_LABELS, REVISION_NOTES } from '@/lib/order-status';

// Reject and Request changes post the same action and write the same `working`
// row, because the machinery is the same. Only the words differ, and they
// differ in both directions: an alert reading "Changes asked" for somebody who
// pressed Reject reads as a revision request we are about to start on, and a
// receipt promising a new version promises work nobody agreed to.
//
// The wording lives in two files and the flag that picks it comes from the
// trail, so this pins the flag's meaning rather than the sentences.

describe('the second round says what it is', () => {
  it('has a headline for each side of a recut', () => {
    expect(REVISION_LABELS.working).toBe('We are on your changes');
    expect(REVISION_LABELS.ready).toBe('Your changes are in');
  });

  it('never tells somebody on a recut how many rounds they have left', () => {
    const said = [
      REVISION_LABELS.ready,
      REVISION_LABELS.working,
      REVISION_NOTES.ready,
      REVISION_NOTES.working,
    ].join(' ');
    expect(said).not.toMatch(/round|included|revision/i);
  });

  it('never opens with whose turn it is', () => {
    // The old copy's whole job, and the wrong question on a screen that exists
    // to show somebody their own notes answered.
    expect(REVISION_LABELS.ready).not.toMatch(/your turn/i);
    expect(REVISION_LABELS.working).not.toMatch(/your turn/i);
  });
});

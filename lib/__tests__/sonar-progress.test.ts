import { describe, expect, it } from 'vitest';

// The two pure functions behind the search loader, restated here.
//
// They live inside components/Sonar.tsx, which is a client component this
// suite cannot import. The behaviour is worth pinning anyway: a bar that
// reaches the end early, or a stage list that wraps, both tell a visitor the
// search has stalled when it has not, and that is the moment they leave.
const EXPECTED_MS = 24_000;
const CEILING = 0.92;

const stageAt = (elapsed: number, count: number): number =>
  Math.min(count - 1, Math.floor(elapsed / (EXPECTED_MS / count)));

const progressAt = (elapsed: number): number =>
  CEILING * (1 - Math.exp(-2.2 * (elapsed / EXPECTED_MS)));

describe('search loader stages', () => {
  it('walks the stages in order across the expected wait', () => {
    expect(stageAt(0, 4)).toBe(0);
    expect(stageAt(7_000, 4)).toBe(1);
    expect(stageAt(13_000, 4)).toBe(2);
    expect(stageAt(19_000, 4)).toBe(3);
  });

  // The old loader cycled every two seconds, so a visitor read the same three
  // lines four times over a twenty-five second search.
  it('holds on the last stage instead of wrapping', () => {
    expect(stageAt(60_000, 4)).toBe(3);
    expect(stageAt(600_000, 4)).toBe(3);
  });

  it('never repeats a stage it has already left', () => {
    const seen = [];
    for (let t = 0; t <= EXPECTED_MS; t += 500) seen.push(stageAt(t, 4));
    // Monotonic: once it advances it never goes back.
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
  });
});

describe('search loader progress', () => {
  it('starts empty and moves immediately', () => {
    expect(progressAt(0)).toBe(0);
    expect(progressAt(1_000)).toBeGreaterThan(0.02);
  });

  // A bar sitting at 100% while nothing has arrived is the exact thing that
  // reads as broken, so it is capped short of full and only arrival fills it.
  it('never reaches full on its own, however long it waits', () => {
    for (const t of [EXPECTED_MS, EXPECTED_MS * 5, EXPECTED_MS * 100]) {
      // Approaches the ceiling and stops there. Full is reserved for results
      // actually arriving, so the bar can never be the thing that lies.
      expect(progressAt(t)).toBeLessThanOrEqual(CEILING);
      expect(progressAt(t)).toBeLessThan(1);
    }
  });

  it('decelerates, so the first half moves more than the second', () => {
    const first = progressAt(EXPECTED_MS / 2) - progressAt(0);
    const second = progressAt(EXPECTED_MS) - progressAt(EXPECTED_MS / 2);
    expect(first).toBeGreaterThan(second);
  });

  it('is past halfway by the time the wait is half done', () => {
    expect(progressAt(EXPECTED_MS / 2)).toBeGreaterThan(0.5);
  });
});

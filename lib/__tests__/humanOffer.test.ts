import { describe, expect, it } from 'vitest';
import { OFFER_AFTER_TURNS, shouldOfferHuman, soundsStuck } from '../humanOffer';

const at = (text: string, userTurns: number, alreadyOffered = false) =>
  shouldOfferHuman({ text, userTurns, alreadyOffered });

describe('soundsStuck', () => {
  it('catches plain distress', () => {
    expect(soundsStuck('I am completely stuck on this')).toBe(true);
    expect(soundsStuck('it is still broken')).toBe(true);
    expect(soundsStuck('we are losing money every hour')).toBe(true);
  });

  it('catches it regardless of case', () => {
    expect(soundsStuck('NOTHING WORKS')).toBe(true);
  });

  it('leaves ordinary description alone', () => {
    expect(soundsStuck('I need a video editor for a launch film')).toBe(false);
    expect(soundsStuck('we use Clay and n8n')).toBe(false);
  });
});

describe('shouldOfferHuman', () => {
  it('offers immediately when they sound stuck, even on turn one', () => {
    expect(at('our production is down and I am stuck', 1)).toBe(true);
  });

  it('waits for the third turn otherwise', () => {
    expect(at('I need a backend engineer', 1)).toBe(false);
    expect(at('for a fintech product', 2)).toBe(false);
    expect(at('budget is around 5k', 3)).toBe(true);
  });

  it('never offers twice', () => {
    expect(at('I am stuck', 5, true)).toBe(false);
    expect(at('anything', 9, true)).toBe(false);
  });

  it('agrees with its own threshold', () => {
    expect(at('x', OFFER_AFTER_TURNS)).toBe(true);
    expect(at('x', OFFER_AFTER_TURNS - 1)).toBe(false);
  });
});

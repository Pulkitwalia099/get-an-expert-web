import { describe, expect, it } from 'vitest';
import { finalTurnNudge, questionBudget } from '@/app/api/chat/route';
import type { ChatMessage } from '@/lib/types';

const u = (content: string): ChatMessage => ({ role: 'user', content });
const a = (content: string): ChatMessage => ({ role: 'assistant', content });

describe('questionBudget', () => {
  it('stays tight for one-word answers', () => {
    expect(questionBudget([u('hi'), a('?'), u('not sure'), a('?'), u('dunno')])).toBe(4);
  });

  it('does not count chip clicks as engagement', () => {
    // Chips are short by design, so a visitor who only ever taps them has not
    // told us any more than a one-word answer would.
    const chips = [u('Own it end to end'), u('Within a month'), u('Stripe')];
    expect(questionBudget(chips)).toBe(4);
  });

  it('opens up once they have written real sentences twice', () => {
    const long = u('Our checkout page freezes when the card form loads and we are losing about fifteen orders a week');
    expect(questionBudget([long])).toBe(4);
    expect(questionBudget([long, a('?'), long])).toBe(7);
  });

  it('ignores what the assistant wrote', () => {
    const wordy = a('This is a very long assistant message that easily clears the substantive word threshold set above');
    expect(questionBudget([wordy, wordy, wordy])).toBe(4);
  });
});

describe('finalTurnNudge', () => {
  it('stays silent while questions remain', () => {
    expect(finalTurnNudge('dev', 3, 4)).toBe('');
  });

  it('fires at the budget and after it', () => {
    expect(finalTurnNudge('dev', 4, 4)).toContain('Do not ask another');
    expect(finalTurnNudge('dev', 9, 7)).toContain('Do not ask another');
  });

  it('quotes the budget it is actually enforcing', () => {
    expect(finalTurnNudge('dev', 7, 7)).toContain('all 7 of your questions');
  });

  it('never applies to the expert search flow', () => {
    expect(finalTurnNudge('main', 9, 4)).toBe('');
  });
});

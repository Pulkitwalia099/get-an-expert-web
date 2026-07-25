import { describe, expect, it } from 'vitest';
import { MAX_API_MESSAGES, trimHistory } from '../history';
import type { ChatMessage } from '../types';

const user = (n: number): ChatMessage => ({ role: 'user', content: `u${n}` });
const ai = (n: number): ChatMessage => ({ role: 'assistant', content: `a${n}` });

describe('trimHistory', () => {
  it('leaves a short history alone', () => {
    const msgs = [user(1), ai(1), user(2)];
    expect(trimHistory(msgs)).toEqual(msgs);
  });

  it('keeps the newest turns and never more than the cap', () => {
    const msgs = Array.from({ length: 60 }, (_, i) => (i % 2 === 0 ? user(i) : ai(i)));
    const kept = trimHistory(msgs);
    expect(kept.length).toBeLessThanOrEqual(MAX_API_MESSAGES);
    expect(kept[kept.length - 1]).toEqual(msgs[msgs.length - 1]);
  });

  it('starts on a user turn after the cap lands on an assistant turn', () => {
    // One unpaired assistant turn flips the parity, so the cut falls on the
    // assistant. This is the shape that used to 400 the chat request.
    const msgs = [user(0), ...Array.from({ length: 30 }, (_, i) => (i % 2 === 0 ? ai(i) : user(i)))];
    expect(msgs.slice(-MAX_API_MESSAGES)[0].role).toBe('assistant');
    expect(trimHistory(msgs)[0].role).toBe('user');
  });

  it('drops an opener the interface asked before any visitor turn', () => {
    const kept = trimHistory([ai(1), user(1)]);
    expect(kept).toEqual([user(1)]);
  });

  it('returns an empty history unchanged', () => {
    expect(trimHistory([])).toEqual([]);
  });
});

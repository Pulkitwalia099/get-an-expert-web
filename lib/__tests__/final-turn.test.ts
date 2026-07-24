import { describe, expect, it } from 'vitest';
import { finalTurnNudge } from '@/app/api/chat/route';

describe('finalTurnNudge', () => {
  it('stays silent while questions remain', () => {
    for (const asked of [0, 1, 2, 3, 4]) {
      expect(finalTurnNudge('dev', asked)).toBe('');
    }
  });

  it('fires on the sixth turn and every turn after', () => {
    expect(finalTurnNudge('dev', 5)).toContain('Do not ask another');
    expect(finalTurnNudge('dev', 9)).toContain('Do not ask another');
  });

  it('never applies to the expert search flow, which has its own budget', () => {
    expect(finalTurnNudge('main', 9)).toBe('');
  });
});

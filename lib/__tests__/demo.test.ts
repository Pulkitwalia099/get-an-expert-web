import { describe, expect, it } from 'vitest';
import { demoChatReply, demoDevChatReply, demoExperts } from '../demo';

describe('demoChatReply', () => {
  it('asks two questions then finishes with a brief', () => {
    const first = demoChatReply([{ role: 'user', content: 'Compliance expert for fintech' }]);
    expect(first.done).toBe(false);
    expect(first.reply.length).toBeGreaterThan(0);

    const second = demoChatReply([
      { role: 'user', content: 'Compliance expert for fintech' },
      { role: 'assistant', content: first.reply },
      { role: 'user', content: 'BaFin licence by March' },
    ]);
    expect(second.done).toBe(false);
    expect(second.chips.length).toBeGreaterThan(0);

    const third = demoChatReply([
      { role: 'user', content: 'Compliance expert for fintech' },
      { role: 'assistant', content: first.reply },
      { role: 'user', content: 'BaFin licence by March' },
      { role: 'assistant', content: second.reply },
      { role: 'user', content: '€10k' },
    ]);
    expect(third.done).toBe(true);
    expect(third.brief?.expert_type).toContain('Compliance');
    expect(third.brief?.budget).toBe('€10k');
  });
});

describe('demoDevChatReply', () => {
  it('asks tool then urgency, then hands off with a dev brief', () => {
    const first = demoDevChatReply([
      { role: 'user', content: 'Claude Code keeps rewriting my middleware' },
    ]);
    expect(first.done).toBe(false);
    expect(first.chips).toContain('Claude Code');

    const second = demoDevChatReply([
      { role: 'user', content: 'Claude Code keeps rewriting my middleware' },
      { role: 'assistant', content: first.reply },
      { role: 'user', content: 'Claude Code' },
    ]);
    expect(second.done).toBe(false);
    expect(second.chips).toContain('Right now');

    const third = demoDevChatReply([
      { role: 'user', content: 'Claude Code keeps rewriting my middleware' },
      { role: 'assistant', content: first.reply },
      { role: 'user', content: 'Claude Code' },
      { role: 'assistant', content: second.reply },
      { role: 'user', content: 'Right now' },
    ]);
    expect(third.done).toBe(true);
    expect(third.brief?.expert_type).toBe('AI pair programmer');
    expect(third.brief?.domain).toBe('Claude Code');
    expect(third.brief?.specifics).toContain('middleware');
    expect(third.brief?.engagement).toBe('Right now');
  });
});

describe('demoExperts', () => {
  it('returns three profiles with exactly one top match', () => {
    const experts = demoExperts();
    expect(experts).toHaveLength(3);
    expect(experts.filter((e) => e.top_match)).toHaveLength(1);
    expect(experts.every((e) => e.photo?.startsWith('/avatars/'))).toBe(true);
  });
});

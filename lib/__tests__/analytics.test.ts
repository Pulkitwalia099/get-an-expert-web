import { describe, expect, it, vi } from 'vitest';
import { capturePageview, track } from '@/lib/analytics';

// posthog-js is never touched until initAnalytics() succeeds, which needs a
// browser and a key. In this node test neither exists, so every call must be a
// silent no-op. That contract is what keeps track() calls safe to sprinkle
// through the chat without guarding each one.
describe('analytics before init', () => {
  it('track does nothing and never throws', () => {
    expect(() => track('matches_shown', { flow: 'main' })).not.toThrow();
  });

  it('capturePageview does nothing and never throws', () => {
    expect(() => capturePageview('https://midsesh.com/')).not.toThrow();
  });

  it('does not reach console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    track('first_message_sent', { flow: 'dev' });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

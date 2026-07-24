import { describe, expect, it } from 'vitest';
import { redact } from '@/lib/redact';

describe('redact', () => {
  it('masks an Anthropic key inside an error message', () => {
    const err = new TypeError(
      'Headers.append: "sk-ant-api03-3xZgSLYflcUGGn4YdHbkLUgHcmIV1yw2L5MwwmZXby6HfzJM" is an invalid header value.',
    );
    const out = redact(err);
    expect(out).not.toContain('sk-ant-');
    expect(out).toContain('[redacted]');
    expect(out).toContain('TypeError');
  });

  it('masks a Supabase secret and a 64-char SerpAPI key', () => {
    const serp = 'a'.repeat(64);
    const out = redact(`SUPABASE_SECRET_KEY=sb_secret_kEtlEJdNycw8gPhP5QptoQ SERPAPI_KEY=${serp}`);
    expect(out).not.toContain('sb_secret_');
    expect(out).not.toContain(serp);
  });

  it('leaves clean text untouched', () => {
    expect(redact('Chat failed: upstream timeout')).toBe('Chat failed: upstream timeout');
  });
});

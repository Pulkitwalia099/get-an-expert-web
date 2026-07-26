import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { OPERATOR_COOKIE, isAuthorised, secretMatches, sessionToken } from '../operatorAuth';

function req({ header, cookie }: { header?: string; cookie?: string }): NextRequest {
  return {
    headers: new Headers(header === undefined ? {} : { 'x-operator-secret': header }),
    cookies: { get: (n: string) => (n === OPERATOR_COOKIE && cookie ? { value: cookie } : undefined) },
  } as unknown as NextRequest;
}

beforeEach(() => vi.stubEnv('OPERATOR_SECRET', 'let-me-in'));
afterEach(() => vi.unstubAllEnvs());

describe('secretMatches', () => {
  it('accepts the configured secret', () => {
    expect(secretMatches('let-me-in')).toBe(true);
  });

  it('rejects a wrong one, a prefix, and a non string', () => {
    expect(secretMatches('nope')).toBe(false);
    expect(secretMatches('let-me-in-please')).toBe(false);
    expect(secretMatches(true)).toBe(false);
  });

  it('rejects everything when the secret is unset, including empty', () => {
    vi.stubEnv('OPERATOR_SECRET', '');
    expect(secretMatches('')).toBe(false);
    expect(secretMatches('anything')).toBe(false);
  });

  it('handles a secret containing a plus sign', () => {
    vi.stubEnv('OPERATOR_SECRET', 'aB3+xY9/qLm2==');
    expect(secretMatches('aB3+xY9/qLm2==')).toBe(true);
    expect(secretMatches('aB3 xY9/qLm2==')).toBe(false);
  });
});

describe('sessionToken', () => {
  it('is a sha256 hex digest, not the secret', () => {
    const t = sessionToken();
    expect(t).toMatch(/^[0-9a-f]{64}$/);
    expect(t).not.toContain('let-me-in');
  });

  it('is stable for the same secret and different for another', () => {
    const a = sessionToken();
    vi.stubEnv('OPERATOR_SECRET', 'something-else');
    expect(sessionToken()).not.toBe(a);
  });

  it('is null when no secret is configured', () => {
    vi.stubEnv('OPERATOR_SECRET', '');
    expect(sessionToken()).toBeNull();
  });
});

describe('isAuthorised', () => {
  it('accepts the header', () => {
    expect(isAuthorised(req({ header: 'let-me-in' }))).toBe(true);
  });

  it('accepts a cookie holding the derived token', () => {
    expect(isAuthorised(req({ cookie: sessionToken()! }))).toBe(true);
  });

  it('rejects a cookie holding the raw secret, which is not the token', () => {
    expect(isAuthorised(req({ cookie: 'let-me-in' }))).toBe(false);
  });

  it('rejects no credentials at all', () => {
    expect(isAuthorised(req({}))).toBe(false);
  });

  it('rejects everything when the secret is unset', () => {
    const token = sessionToken()!;
    vi.stubEnv('OPERATOR_SECRET', '');
    expect(isAuthorised(req({ cookie: token }))).toBe(false);
    expect(isAuthorised(req({ header: '' }))).toBe(false);
  });
});

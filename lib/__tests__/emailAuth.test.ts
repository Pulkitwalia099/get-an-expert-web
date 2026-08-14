import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// Every one of these is a way somebody gets into an account that is not
// theirs, and not one of them would fail loudly in production. That is the
// whole reason this file exists.

const SECRET = 'test-session-secret-value';

let signEmailToken: typeof import('@/lib/emailAuth').signEmailToken;
let readEmailToken: typeof import('@/lib/emailAuth').readEmailToken;
let EMAIL_TOKEN_MAX_AGE: typeof import('@/lib/emailAuth').EMAIL_TOKEN_MAX_AGE;

beforeEach(async () => {
  process.env.SESSION_SECRET = SECRET;
  const mod = await import('@/lib/emailAuth');
  signEmailToken = mod.signEmailToken;
  readEmailToken = mod.readEmailToken;
  EMAIL_TOKEN_MAX_AGE = mod.EMAIL_TOKEN_MAX_AGE;
});

afterEach(() => {
  delete process.env.SESSION_SECRET;
});

describe('signEmailToken', () => {
  it('round trips the address it was signed for', () => {
    const token = signEmailToken('pranav@example.com');
    expect(readEmailToken(token)).toBe('pranav@example.com');
  });

  it('lowercases and trims, so the address matches an order however it was typed', () => {
    const token = signEmailToken('  Pranav@Example.COM  ');
    expect(readEmailToken(token)).toBe('pranav@example.com');
  });

  it('returns null without a secret rather than signing with a fixed one', () => {
    delete process.env.SESSION_SECRET;
    expect(signEmailToken('a@b.com')).toBeNull();
  });
});

describe('readEmailToken', () => {
  it('refuses a token whose address was swapped after signing', () => {
    const token = signEmailToken('pranav@example.com')!;
    const [body, sig] = token.split('.');
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    payload.email = 'attacker@example.com';
    const forged = `${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${sig}`;
    expect(readEmailToken(forged)).toBeNull();
  });

  it('refuses a token whose expiry was pushed out after signing', () => {
    const issued = Date.now();
    const token = signEmailToken('pranav@example.com', issued)!;
    const [body, sig] = token.split('.');
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    payload.exp += 60 * 60 * 24 * 365;
    const forged = `${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${sig}`;
    // Read it well past the real expiry. A tampered expiry must not buy time.
    expect(readEmailToken(forged, issued + EMAIL_TOKEN_MAX_AGE * 1000 + 1)).toBeNull();
  });

  it('expires on its own, without anything being tampered with', () => {
    // Pinned to a whole second. `exp` is stored in seconds, so a token issued
    // part way through one expires at the top of the second it was issued in,
    // up to 999ms early. That is the design, not a bug, and asserting to the
    // millisecond off an arbitrary clock reads as flakiness instead.
    const issued = Math.floor(Date.now() / 1000) * 1000;
    const token = signEmailToken('pranav@example.com', issued)!;
    expect(readEmailToken(token, issued + EMAIL_TOKEN_MAX_AGE * 1000 - 1)).toBe(
      'pranav@example.com',
    );
    expect(readEmailToken(token, issued + EMAIL_TOKEN_MAX_AGE * 1000 + 1)).toBeNull();
  });

  it('refuses a token signed with a different secret, so rotating invalidates them', () => {
    const token = signEmailToken('pranav@example.com')!;
    process.env.SESSION_SECRET = 'a-different-secret';
    expect(readEmailToken(token)).toBeNull();
  });

  it('refuses a session cookie presented as a sign in link', async () => {
    // Both are signed with SESSION_SECRET. Without domain separation in the
    // HMAC input, a stolen session cookie would verify here and vice versa.
    const { signSession } = await import('@/lib/auth');
    const cookie = signSession({
      sub: 'google-123',
      email: 'pranav@example.com',
      name: null,
      picture: null,
    });
    expect(cookie).toBeTruthy();
    expect(readEmailToken(cookie!)).toBeNull();
  });

  it('refuses rubbish rather than throwing', () => {
    for (const bad of ['', 'nodot', '.', 'a.b', '....', 'x'.repeat(5000)]) {
      expect(readEmailToken(bad)).toBeNull();
    }
  });

  it('refuses a payload that is valid JSON but not an address', () => {
    const body = Buffer.from(JSON.stringify({ email: '', exp: 99999999999 })).toString('base64url');
    expect(readEmailToken(`${body}.whatever`)).toBeNull();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// More than one person holding the operator tools.
//
// Three properties matter and none of them is visible from the outside, which
// is why they are pinned here:
//
//   - a bare secret still works, so deploying this cannot lock production out
//     in the window before OPERATOR_SECRET is updated
//   - deleting somebody from the list kills the cookie they already hold,
//     which is what makes revoking immediate rather than a ninety day wait
//   - one person's secret never mints another person's cookie

const OLD = { ...process.env };

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...OLD };
});

async function auth(secret: string | undefined) {
  if (secret === undefined) delete process.env.OPERATOR_SECRET;
  else process.env.OPERATOR_SECRET = secret;
  vi.resetModules();
  return import('@/lib/operatorAuth');
}

const NAMED = 'pulkit:pulkit-long-secret,rohit:rohit-long-secret';

describe('a bare secret, the shape that is live today', () => {
  it('still authorises, so shipping this locks nobody out', async () => {
    const a = await auth('midsesh.admin');
    expect(a.secretMatches('midsesh.admin')).toBe(true);
    expect(a.operatorForSecret('midsesh.admin')).toBe('operator');
    const token = a.tokenForSecret('midsesh.admin');
    expect(token).not.toBeNull();
    expect(a.operatorCookieValid(token)).toBe(true);
  });

  it('writes the actor exactly as every existing row already reads', async () => {
    const a = await auth('midsesh.admin');
    const req = { headers: { get: () => 'midsesh.admin' }, cookies: { get: () => undefined } };
    expect(a.operatorActor(req as never)).toBe('operator');
  });
});

describe('a named list', () => {
  it('tells the two of us apart', async () => {
    const a = await auth(NAMED);
    expect(a.operatorForSecret('pulkit-long-secret')).toBe('pulkit');
    expect(a.operatorForSecret('rohit-long-secret')).toBe('rohit');
    expect(a.operatorForSecret('neither')).toBeNull();
  });

  it('gives each person their own cookie, and one will not pass as the other', async () => {
    const a = await auth(NAMED);
    const pulkit = a.tokenForSecret('pulkit-long-secret')!;
    const rohit = a.tokenForSecret('rohit-long-secret')!;
    expect(pulkit).not.toBe(rohit);
    expect(a.operatorFromCookie(pulkit)).toBe('pulkit');
    expect(a.operatorFromCookie(rohit)).toBe('rohit');
  });

  it('names who moved an order', async () => {
    const a = await auth(NAMED);
    const req = {
      headers: { get: () => 'rohit-long-secret' },
      cookies: { get: () => undefined },
    };
    expect(a.operatorActor(req as never)).toBe('operator:rohit');
  });

  it('accepts a colon inside a secret, splitting on the first one only', async () => {
    const a = await auth('rohit:a:b:c');
    expect(a.operatorForSecret('a:b:c')).toBe('rohit');
  });

  it('tolerates spacing around entries, because a pasted variable has it', async () => {
    // `pulkit: one-secret` with a space after the colon is how a person writes
    // this, and the space must not become part of the secret.
    const a = await auth('  pulkit : one-secret ,  rohit:two-secret  ');
    expect(a.operatorForSecret('one-secret')).toBe('pulkit');
    expect(a.operatorForSecret('two-secret')).toBe('rohit');
    expect(a.operatorForSecret(' one-secret')).toBeNull();
  });
});

describe('revoking somebody', () => {
  it('kills the cookie they are already holding, not just their next login', async () => {
    const before = await auth(NAMED);
    const rohit = before.tokenForSecret('rohit-long-secret')!;
    expect(before.operatorCookieValid(rohit)).toBe(true);

    // Rohit's entry deleted. The cookie in his browser is unchanged.
    const after = await auth('pulkit:pulkit-long-secret');
    expect(after.operatorCookieValid(rohit)).toBe(false);
    expect(after.operatorForSecret('rohit-long-secret')).toBeNull();
    // And the other operator is untouched, which is the point of not rotating.
    expect(after.operatorCookieValid(after.tokenForSecret('pulkit-long-secret'))).toBe(true);
  });
});

describe('nothing configured', () => {
  it('denies everyone rather than letting anyone in', async () => {
    const a = await auth(undefined);
    expect(a.secretMatches('anything')).toBe(false);
    expect(a.tokenForSecret('anything')).toBeNull();
    expect(a.operatorCookieValid('anything')).toBe(false);
    expect(a.operatorCookieValid(null)).toBe(false);
    expect(a.operatorFromCookie(undefined)).toBeNull();
  });

  it('denies an empty string secret, which is what an unset variable reads as', async () => {
    const a = await auth('');
    expect(a.secretMatches('')).toBe(false);
    expect(a.operatorCookieValid('')).toBe(false);
  });
});

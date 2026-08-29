import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

// Who is allowed to flip a presence switch.
//
// Two ways in, both checking the same OPERATOR_SECRET:
//   - an x-operator-secret header, used by the page's own fetches
//   - a session cookie holding a token derived from the secret
//
// The cookie holds sha256(secret + salt) rather than the secret, so a leaked
// cookie cannot be replayed as the secret anywhere else. It is httpOnly, so
// no script on the page can read it either.

if (typeof window !== 'undefined') {
  throw new Error('lib/operatorAuth is server-only and must never reach the client');
}

export const OPERATOR_COOKIE = 'midsesh_operator';

// Ninety days. Long enough that logging in feels like a one-off, short
// enough that a lost phone stops working within a quarter.
export const OPERATOR_COOKIE_MAX_AGE = 90 * 24 * 60 * 60;

const SALT = 'midsesh-operator-session-v1';

function expected(): string | null {
  return process.env.OPERATOR_SECRET || null;
}

/** The value stored in the cookie. Null when no secret is configured. */
export function sessionToken(): string | null {
  const secret = expected();
  if (!secret) return null;
  return createHash('sha256').update(`${secret}:${SALT}`).digest('hex');
}

// Constant time compare, so a wrong guess cannot be narrowed down by timing.
// Length mismatch short circuits, which leaks only the length.
function sameValue(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** A supplied secret matches the configured one. An unset secret denies everyone. */
export function secretMatches(supplied: unknown): boolean {
  const want = expected();
  if (!want || typeof supplied !== 'string' || supplied.length === 0) return false;
  return sameValue(supplied, want);
}

/**
 * A cookie value on its own is a valid operator session.
 *
 * The same check `isAuthorised` makes, minus the header, because a server
 * component has no NextRequest to hand it. `cookies()` gives a value and
 * nothing else, and the alternative was reading the cookie in a page and
 * comparing it there, which is how the constant time compare gets left out.
 *
 * No header path on purpose. A header is something a page's own fetch sends;
 * a page render has none, and accepting one here would be inventing a way in
 * that nothing uses.
 */
export function operatorCookieValid(value: string | undefined | null): boolean {
  if (!expected()) return false;
  const token = sessionToken();
  return Boolean(token && value && sameValue(value, token));
}

/**
 * The request carries a valid session, by header or by cookie. An unset
 * OPERATOR_SECRET denies everyone: an unguarded switch is worse than an
 * unreachable one.
 */
export function isAuthorised(req: NextRequest): boolean {
  if (!expected()) return false;
  if (secretMatches(req.headers.get('x-operator-secret'))) return true;

  const token = sessionToken();
  const cookie = req.cookies.get(OPERATOR_COOKIE)?.value;
  return Boolean(token && cookie && sameValue(cookie, token));
}

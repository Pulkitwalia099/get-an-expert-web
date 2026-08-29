import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

// Who is allowed to work the operator tools, and which of them it was.
//
// Two ways in, both checking the same OPERATOR_SECRET:
//   - an x-operator-secret header, used by the page's own fetches
//   - a session cookie holding a token derived from the secret
//
// The cookie holds a sha256 rather than the secret, so a leaked cookie cannot
// be replayed as the secret anywhere else. It is httpOnly, so no script on the
// page can read it either.
//
// OPERATOR_SECRET is a list, because there is more than one of us now:
//
//   OPERATOR_SECRET=pulkit:<secret>,rohit:<secret>
//
// That buys two things a single shared string could not. Revoking one person
// is deleting their entry rather than rotating a credential everybody uses,
// and the trail can say `operator:rohit` instead of `operator`, which is the
// question you actually ask when something went out wrong.
//
// A bare value with no colon is still accepted and means one unnamed operator.
// That is not politeness towards old config: it is what stops a deploy of this
// file from locking everybody out of production in the window before the
// variable is updated.

if (typeof window !== 'undefined') {
  throw new Error('lib/operatorAuth is server-only and must never reach the client');
}

export const OPERATOR_COOKIE = 'midsesh_operator';

// Ninety days. Long enough that logging in feels like a one-off, short
// enough that a lost phone stops working within a quarter.
export const OPERATOR_COOKIE_MAX_AGE = 90 * 24 * 60 * 60;

const SALT = 'midsesh-operator-session-v1';

/** The name used when the variable holds a bare secret with nobody attached. */
const ANON = 'operator';

interface Operator {
  name: string;
  secret: string;
}

/**
 * The configured operators, in the order they are listed.
 *
 * Entries are comma separated and each is `name:secret`. The split is on the
 * first colon only, so a secret may contain colons. A secret may not contain a
 * comma, and may not begin or end with a space, both of which are worth
 * knowing when generating one.
 */
function operators(): Operator[] {
  const raw = process.env.OPERATOR_SECRET || '';
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const at = entry.indexOf(':');
      // Both halves trimmed. `pulkit: secret` with a space after the colon is
      // the obvious way to write this and would otherwise store a secret with
      // a leading space that nobody can see in a Vercel variable. The same
      // invisible whitespace already cost this codebase a broken email send.
      if (at < 0) return { name: ANON, secret: entry };
      return { name: entry.slice(0, at).trim() || ANON, secret: entry.slice(at + 1).trim() };
    })
    .filter((op) => op.secret.length > 0);
}

/**
 * The cookie value for one operator.
 *
 * The name is inside the hash, so two people cannot end up with the same token
 * and the token cannot be pointed at a different name than the one it was
 * minted for.
 */
function tokenFor(op: Operator): string {
  return createHash('sha256').update(`${op.name}:${op.secret}:${SALT}`).digest('hex');
}

// Constant time compare, so a wrong guess cannot be narrowed down by timing.
// Length mismatch short circuits, which leaks only the length.
function sameValue(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Which operator a supplied secret belongs to, or null.
 *
 * Every configured entry is compared even after a match, so the time taken
 * does not reveal how far down the list somebody's guess landed.
 */
export function operatorForSecret(supplied: unknown): string | null {
  if (typeof supplied !== 'string' || supplied.length === 0) return null;
  let found: string | null = null;
  for (const op of operators()) {
    if (sameValue(supplied, op.secret)) found = op.name;
  }
  return found;
}

/** The cookie to set for a correct secret, or null if it matches nobody. */
export function tokenForSecret(supplied: unknown): string | null {
  if (typeof supplied !== 'string' || supplied.length === 0) return null;
  let token: string | null = null;
  for (const op of operators()) {
    if (sameValue(supplied, op.secret)) token = tokenFor(op);
  }
  return token;
}

/** A supplied secret matches somebody. An unset variable denies everyone. */
export function secretMatches(supplied: unknown): boolean {
  return operatorForSecret(supplied) !== null;
}

/**
 * Which operator a cookie belongs to, or null.
 *
 * Compared against every configured operator's token rather than looked up, so
 * deleting somebody's entry from the variable invalidates the cookie they are
 * already holding. That is what makes revocation immediate rather than a wait
 * for the ninety day expiry.
 */
export function operatorFromCookie(value: string | undefined | null): string | null {
  if (!value) return null;
  let found: string | null = null;
  for (const op of operators()) {
    if (sameValue(value, tokenFor(op))) found = op.name;
  }
  return found;
}

/**
 * A cookie value on its own is a valid operator session.
 *
 * The same check `isAuthorised` makes, minus the header, because a server
 * component has no NextRequest to hand it. `cookies()` gives a value and
 * nothing else, and the alternative was comparing the cookie inside a page,
 * which is how the constant time compare gets left out.
 */
export function operatorCookieValid(value: string | undefined | null): boolean {
  return operatorFromCookie(value) !== null;
}

/**
 * Who is making this request, by header or by cookie, or null for nobody.
 *
 * The header wins, because it is what the operator page's own fetches send and
 * it is checked against the live list on every call.
 */
export function operatorFor(req: NextRequest): string | null {
  const byHeader = operatorForSecret(req.headers.get('x-operator-secret'));
  if (byHeader) return byHeader;
  return operatorFromCookie(req.cookies.get(OPERATOR_COOKIE)?.value);
}

/**
 * The request carries a valid session. An unset OPERATOR_SECRET denies
 * everyone: an unguarded switch is worse than an unreachable one.
 */
export function isAuthorised(req: NextRequest): boolean {
  return operatorFor(req) !== null;
}

/**
 * What to write in an event's `actor` for this request.
 *
 * `operator:rohit` when the list is named, and plain `operator` when it is a
 * single bare secret, which keeps the trail on an unmigrated deploy reading
 * exactly as every existing row already does.
 */
export function operatorActor(req: NextRequest): string {
  const name = operatorFor(req);
  return !name || name === ANON ? 'operator' : `operator:${name}`;
}

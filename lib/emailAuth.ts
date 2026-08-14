import { createHmac, timingSafeEqual } from 'node:crypto';

// Sign in with an email address and no password.
//
// Google sign in turns away everybody without a Google account, which is a
// strange way to run a marketplace when the thing being looked up is an order
// placed with a plain email address. This is the second door.
//
// It proves one thing, and it is the right thing: that somebody controls the
// address the order was placed under. A password would prove they know a
// secret, which then has to be tied back to an address by emailing them a
// link anyway. So the link is the whole mechanism rather than a step in a
// longer one, and nothing is stored: no hash, no table, no reset flow, and
// nothing to leak. The trade is written down in the plan. A link forwarded
// inside its window works for whoever opens it, because single use would need
// a table to remember spent tokens.
//
// This is the same construction as the session cookie in lib/auth.ts, on
// purpose, down to the base64url helpers. Two hand rolled token formats in one
// codebase is one more than anybody can keep straight.

if (typeof window !== 'undefined') {
  throw new Error('lib/emailAuth is server-only and must never reach the client');
}

/**
 * Thirty minutes. Long enough to switch to a phone, find the mail and get
 * through a slow inbox, short enough that a link sitting in a forwarded thread
 * stops working. It is the only bound on replay, since nothing records that a
 * token was spent: single use was considered on 14 Aug and deliberately not
 * built, because the window is narrow and nothing expensive sits behind it.
 *
 * Every piece of copy that quotes a number reads this rather than saying
 * fifteen in six places, which is how it was wrong in four of them.
 */
export const EMAIL_TOKEN_MAX_AGE = 30 * 60;

// Prefixed into the HMAC input so a sign in token and a session cookie can
// never verify as each other. Both are signed with SESSION_SECRET and both are
// `body.sig`, so without this a stolen cookie would open the callback and a
// captured link would pass as a session. There is a test for exactly that.
const PURPOSE = 'email-signin.v1';

function secret(): string | null {
  return process.env.SESSION_SECRET || null;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromB64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function sameValue(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

interface TokenPayload {
  email: string;
  /** Seconds since the epoch. Inside the signature, so it cannot be extended. */
  exp: number;
}

/** Is the email door available at all? Same shape as authConfigured(). */
export function emailAuthConfigured(): boolean {
  return secret() !== null;
}

/**
 * A signed link token for one address.
 *
 * The address is normalised before signing rather than at the point of use.
 * `mk_orders.email` is stored lowercased, the account row is stored
 * lowercased, and a token carrying `Pranav@Example.com` would otherwise match
 * neither and produce an empty orders page for somebody whose order is right
 * there.
 */
export function signEmailToken(email: string, now = Date.now()): string | null {
  const key = secret();
  if (!key) return null;
  const normalised = email.trim().toLowerCase();
  if (!normalised) return null;

  const payload: TokenPayload = {
    email: normalised,
    exp: Math.floor(now / 1000) + EMAIL_TOKEN_MAX_AGE,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac('sha256', key).update(`${PURPOSE}.${body}`).digest());
  return `${body}.${sig}`;
}

/**
 * The address this token proves, or null.
 *
 * Null for anything tampered with, expired, signed with a secret we no longer
 * hold, or not a sign in token at all. The signature is checked before the
 * payload is parsed, so a forged expiry never gets read.
 */
export function readEmailToken(token: string | undefined, now = Date.now()): string | null {
  const key = secret();
  if (!key || !token) return null;

  const cut = token.lastIndexOf('.');
  if (cut <= 0) return null;
  const body = token.slice(0, cut);
  const sig = token.slice(cut + 1);

  const want = b64url(createHmac('sha256', key).update(`${PURPOSE}.${body}`).digest());
  if (!sameValue(sig, want)) return null;

  let payload: TokenPayload;
  try {
    payload = JSON.parse(fromB64url(body).toString('utf8')) as TokenPayload;
  } catch {
    return null;
  }
  if (!payload.exp || payload.exp * 1000 <= now) return null;
  if (!payload.email || typeof payload.email !== 'string') return null;

  return payload.email;
}

/**
 * The account id for somebody who signed in by email.
 *
 * `accounts.sub` holds Google's numeric subject id, so a prefixed address
 * cannot collide with one. Deriving it from the address rather than generating
 * it means signing in twice from two devices lands on one account without a
 * lookup, and it stays stable if the row is ever rebuilt.
 *
 * One person signing in both ways gets two rows, and that is fine here:
 * orders are found by email, not by sub, so both see the same list. Credits
 * are the only thing that hangs off sub, and marketplace orders never touch
 * them.
 */
export function subForEmail(email: string): string {
  return `email:${email.trim().toLowerCase()}`;
}

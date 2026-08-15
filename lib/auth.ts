import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// Google sign in, by hand, with no SDK.
//
// This repo talks to Supabase over raw fetch to PostgREST and has six runtime
// dependencies. Adding @supabase/ssr and @supabase/supabase-js to get a login
// button would have been the largest dependency change in the project, and it
// would have tied signing in to a Supabase project whose schema is currently
// rejecting writes. The authorization code flow is a redirect, a POST and a
// cookie, so it is written out here instead.
//
// Two secrets, both optional like every other key in this app: with them the
// button works, without them it is not rendered and every route says so
// politely rather than crashing.

if (typeof window !== 'undefined') {
  throw new Error('lib/auth is server-only and must never reach the client');
}

export const SESSION_COOKIE = 'midsesh_session';
export const STATE_COOKIE = 'midsesh_oauth_state';
/** Where to send somebody after they sign in, parked across the trip to Google. */
export const NEXT_COOKIE = 'midsesh_next';

// Thirty days. Long enough that a returning visitor is still signed in, short
// enough that a shared laptop forgets.
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

// Five minutes is a generous ceiling on how long a human takes to click
// through Google's consent screen, and a short life limits how long a stolen
// state value is worth anything.
export const STATE_MAX_AGE = 5 * 60;

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

const TIMEOUT_MS = 8_000;

export interface SessionUser {
  /** Google's stable subject id. The primary key everywhere else. */
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
}

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
}

function oauth(): OAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

// The session cookie is signed with its own secret rather than the OAuth
// client secret, so rotating one does not silently invalidate the other.
function sessionSecret(): string | null {
  return process.env.SESSION_SECRET || null;
}

/** Sign in is offered only when every piece of it is configured. */
export function authConfigured(): boolean {
  return oauth() !== null && sessionSecret() !== null;
}

/**
 * Where Google sends the browser back. Google matches this string exactly
 * against the console, so a preview deploy on a generated hostname cannot
 * complete a sign in unless that exact URL is registered too. Set
 * AUTH_ORIGIN to pin every environment at the one registered origin.
 */
export function callbackUrl(requestOrigin: string): string {
  const origin = (process.env.AUTH_ORIGIN || requestOrigin).replace(/\/+$/, '');
  return `${origin}/api/auth/callback`;
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

/**
 * Where a sign in is allowed to land, matched rather than sanitised.
 *
 * A destination arrives in a URL, which makes it somebody else's input, and
 * the response that carries the redirect is the response that sets a thirty
 * day session cookie. `new URL(path, origin)` ignores the origin entirely when
 * the path is absolute, so an unchecked `https://evil.example` or a protocol
 * relative `//evil.example` hands a freshly signed in person to somebody
 * else's page at the moment they have most reason to trust what is on screen.
 *
 * Anchored at both ends and matching literal path words, so nothing can be
 * prefixed or appended and the only variable part is a hex uuid. A "must start
 * with a slash" check famously admits `//evil.example`; this does not.
 *
 * One copy, deliberately. This began in the email callback, and the Google
 * door needed the same rule: two allowlists would drift, and the weaker copy
 * is the one an attacker finds. Adding a destination means editing this line
 * and having a reason.
 *
 * `/account` is the fourth, added with the settings page. It redirects a
 * signed out visitor to `/signin?next=/account`, and without it here that
 * destination is silently dropped and somebody who asked for their settings
 * lands on the dashboard instead.
 */
// The uuid belongs to /orders/<id> and to nothing else, so it is spelled
// inside that one alternative rather than bolted onto every branch.
//
// Case sensitive on the path words and case insensitive only on the uuid,
// which is the only part that legitimately varies. Next routes case
// sensitively, so a blanket /i flag here would admit /Dashboard and then land
// somebody on a 404 with a fresh session cookie and no idea what happened.
const SAFE_NEXT =
  /^\/(account|dashboard|orders|orders\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;

/** The destination if it is one we allow, otherwise null so callers pick their own default. */
export function safeNext(raw: string | null | undefined): string | null {
  return raw && SAFE_NEXT.test(raw) ? raw : null;
}

/** A fresh, unguessable CSRF value for the state parameter. */
export function newState(): string {
  return randomBytes(16).toString('hex');
}

export function stateMatches(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  return sameValue(a, b);
}

/** The consent screen URL. Null when sign in is not configured. */
export function authorizeUrl(state: string, requestOrigin: string): string | null {
  const cfg = oauth();
  if (!cfg) return null;
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: callbackUrl(requestOrigin),
    response_type: 'code',
    // Identity only. No Gmail, no Drive, nothing that would make the consent
    // screen ask for something we have no use for.
    scope: 'openid email profile',
    state,
    // Ask for an account choice every time. Silently reusing whichever Google
    // account the browser happens to hold is how people sign in as the wrong
    // person on a shared machine.
    prompt: 'select_account',
  });
  return `${GOOGLE_AUTH}?${params.toString()}`;
}

interface IdTokenClaims {
  iss?: string;
  aud?: string;
  exp?: number;
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

// The payload of a JWT, read without verifying the signature. Safe only for a
// token this server just fetched itself over TLS; see exchangeCode.
function decodeClaims(idToken: string): IdTokenClaims | null {
  const parts = idToken.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(fromB64url(parts[1]).toString('utf8')) as IdTokenClaims;
  } catch {
    return null;
  }
}

/**
 * Trade the one time code for the user's identity.
 *
 * The ID token's signature is deliberately not verified here. This server
 * fetched it directly from Google's token endpoint over TLS, authenticating
 * itself with the client secret, so there is no untrusted party in between to
 * forge it. OpenID Connect Core 3.1.3.7 makes signature checking optional in
 * exactly this case. The claims that still matter are checked below, because
 * those guard against a token that is genuine but not ours or not current.
 */
export async function exchangeCode(
  code: string,
  requestOrigin: string,
): Promise<SessionUser | null> {
  const cfg = oauth();
  if (!cfg) return null;

  let claims: IdTokenClaims | null = null;
  try {
    const res = await fetch(GOOGLE_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: callbackUrl(requestOrigin),
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error('[midsesh:auth] token exchange failed', res.status);
      return null;
    }
    const body = (await res.json()) as { id_token?: string };
    if (!body.id_token) return null;
    claims = decodeClaims(body.id_token);
  } catch (err) {
    console.error('[midsesh:auth] token exchange failed', err);
    return null;
  }

  if (!claims) return null;
  // Ours, current, from Google, and an address Google has confirmed. An
  // unverified email would let someone claim a mailbox they do not own.
  if (!claims.iss || !GOOGLE_ISSUERS.includes(claims.iss)) return null;
  if (claims.aud !== cfg.clientId) return null;
  if (!claims.exp || claims.exp * 1000 <= Date.now()) return null;
  if (!claims.sub || !claims.email || claims.email_verified !== true) return null;

  return {
    sub: claims.sub,
    email: claims.email,
    name: claims.name ?? null,
    picture: claims.picture ?? null,
  };
}

interface SessionPayload extends SessionUser {
  /** Seconds since the epoch. Checked on every read. */
  exp: number;
  /**
   * Which generation of this account's sessions the cookie belongs to.
   *
   * Optional, and that is the point. Every cookie minted before "sign out
   * everywhere" existed carries no `ver`, and lib/accounts.ts reads a missing
   * one as unknown and accepts it, so deploying the check signs nobody out.
   */
  ver?: number;
}

/**
 * The signed cookie value. Null when no session secret is configured.
 *
 * `version` is a third positional argument rather than an options object so
 * every existing caller and test keeps compiling. Passing undefined omits the
 * claim entirely instead of writing 0, and that distinction is load bearing: a
 * version read that failed at sign in time must not mint a cookie claiming
 * generation 0 against a stored 3, which is a cookie rejected on its very next
 * use and a sign in loop with no way out.
 */
export function signSession(
  user: SessionUser,
  now = Date.now(),
  version?: number,
): string | null {
  const secret = sessionSecret();
  if (!secret) return null;
  const payload: SessionPayload = {
    ...user,
    exp: Math.floor(now / 1000) + SESSION_MAX_AGE,
  };
  if (typeof version === 'number' && Number.isFinite(version)) payload.ver = version;
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac('sha256', secret).update(body).digest());
  return `${body}.${sig}`;
}

/**
 * The verified payload, or null. Private, because everything outside this file
 * wants one of the two narrower answers below and neither should have to know
 * what else is in the cookie.
 */
function verify(cookie: string | undefined, now: number): SessionPayload | null {
  const secret = sessionSecret();
  if (!secret || !cookie) return null;

  const cut = cookie.lastIndexOf('.');
  if (cut <= 0) return null;
  const body = cookie.slice(0, cut);
  const sig = cookie.slice(cut + 1);

  const want = b64url(createHmac('sha256', secret).update(body).digest());
  if (!sameValue(sig, want)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(fromB64url(body).toString('utf8')) as SessionPayload;
  } catch {
    return null;
  }
  if (!payload.exp || payload.exp * 1000 <= now) return null;
  if (!payload.sub || !payload.email) return null;
  return payload;
}

/**
 * Who the cookie says this is, or null. Returns null for anything tampered
 * with, expired, or signed with a secret we no longer hold, so rotating
 * SESSION_SECRET signs everybody out rather than trusting old cookies.
 *
 * Still synchronous and still says nothing about revocation. The version check
 * needs a database read, so it lives in `currentAccount` in lib/accounts.ts,
 * and this stays the pure half that a test can call without a Supabase.
 */
export function readSession(cookie: string | undefined, now = Date.now()): SessionUser | null {
  const payload = verify(cookie, now);
  if (!payload) return null;

  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name ?? null,
    picture: payload.picture ?? null,
  };
}

/**
 * The generation this cookie was signed for, or null when it claims none.
 *
 * Null means two different things that are the same thing to the caller: the
 * cookie is not valid at all, or it predates versioning. Both are handled by
 * `currentAccount`, which has already established validity by then.
 */
export function sessionVersionOf(cookie: string | undefined, now = Date.now()): number | null {
  const payload = verify(cookie, now);
  if (!payload || typeof payload.ver !== 'number') return null;
  return payload.ver;
}

import { insertRows, selectRows } from '@/lib/supabase';
import type { SessionUser } from '@/lib/auth';

// The credit ledger: the writes, and the reads that need the secret key.
//
// The arithmetic lives in lib/credit-math.ts, because the setup cards have to
// show what credit does to a price and this module must never reach a browser.
// Re-exported here so a server caller has one import rather than two.
//
// Balance is never stored. It is the sum of the entries, so the number and its
// history cannot disagree.

if (typeof window !== 'undefined') {
  throw new Error('lib/credits is server-only and must never reach the client');
}

import { SIGNUP_CREDIT_CENTS } from '@/lib/credit-math';

export {
  MAX_CREDIT_SHARE,
  SIGNUP_CREDIT_CENTS,
  formatCents,
  splitPrice,
  type Split,
} from '@/lib/credit-math';

export interface Balance {
  cents: number;
  /** False when Supabase is unset or unreachable, so callers can say so. */
  known: boolean;
}

/** What this account has left. Unknown reads as zero, never as free credit. */
export async function balanceFor(sub: string): Promise<Balance> {
  const rows = await selectRows<{ balance_cents: number }>(
    'credit_balances',
    `?sub=eq.${encodeURIComponent(sub)}&select=balance_cents`,
  );
  if (rows === null) return { cents: 0, known: false };
  return { cents: rows[0]?.balance_cents ?? 0, known: true };
}

/**
 * The account behind an email address, or null.
 *
 * Used by the Cal webhook, which knows who booked only by the address they
 * typed into Cal. A booking from an address nobody has signed up with simply
 * gets no order and no credit, which is correct: there is no account to spend
 * from and no way to be sure it is the same person.
 *
 * Oldest first, and that is not decoration. Until the merge migration has run
 * an address can still hold two rows, and an unordered `limit=1` would hand
 * back whichever one Postgres reached first. Two callers disagreeing about
 * which row is the account is the split this is here to stop.
 */
export async function accountByEmail(email: string): Promise<{ sub: string } | null> {
  const clean = email.trim().toLowerCase();
  if (!clean) return null;
  const rows = await selectRows<{ sub: string }>(
    'accounts',
    `?email=eq.${encodeURIComponent(clean)}&select=sub&order=created_at.asc&limit=1`,
  );
  return rows?.[0] ?? null;
}

/**
 * The same person, keyed on the account they already have.
 *
 * The two doors mint different ids for one human: Google hands back its
 * numeric subject id, and the email link derives `email:<address>`. Left
 * alone, somebody who used both holds two `accounts` rows, and since credits
 * hang off `sub` their balance splits in half without anything looking broken.
 *
 * So the address is looked up before the session is signed, and an account
 * that already exists wins. It has to happen here rather than inside
 * ensureAccount, because the cookie carries the sub: a session signed with the
 * other id would go on reading the wrong balance for thirty days.
 *
 * Falls back to the sub the door produced when Supabase is unset or the read
 * fails. A lookup that could not run must not stop somebody signing in, and
 * the worst it costs is the split the migration cleans up.
 */
export async function resolveAccount(user: SessionUser): Promise<SessionUser> {
  const existing = await accountByEmail(user.email);
  if (!existing || existing.sub === user.sub) return user;
  return { ...user, sub: existing.sub };
}

/**
 * Record the account, then grant the welcome credit.
 *
 * Both are safe to call on every single sign in. The account upserts on `sub`,
 * and the grant carries the fixed ref 'signup' against a unique index on
 * (sub, ref), so the second attempt is rejected by Postgres rather than by a
 * check in here that two requests could race past.
 */
export async function ensureAccount(user: SessionUser): Promise<void> {
  const row: Record<string, unknown> = {
    sub: user.sub,
    // Stored lowercased because accountByEmail looks it up lowercased. A
    // mixed case address stored as typed would make the Cal webhook find
    // nobody and quietly skip the order.
    email: user.email.trim().toLowerCase(),
    last_seen_at: new Date().toISOString(),
  };
  // Sent only when there is something to send. The upsert merges whatever
  // columns it is given, so an email link sign in, which knows nothing but the
  // address, would otherwise blank the name and photo Google filled in the
  // last time the same person came through the other door.
  if (user.name) row.name = user.name;
  if (user.picture) row.picture = user.picture;

  await insertRows('accounts', row, { resolveOn: 'sub' });

  await insertRows(
    'credit_entries',
    {
      sub: user.sub,
      delta_cents: SIGNUP_CREDIT_CENTS,
      reason: 'signup',
      ref: 'signup',
      note: 'Welcome credit',
    },
    { ignoreDuplicatesOn: 'sub,ref' },
  );
}

/**
 * Spend credit against an order.
 *
 * The ref is the order's own idempotency key, so a retry of the same order
 * cannot spend twice. Returns false when the entry did not land, and the
 * caller must then not pretend the credit was taken.
 */
export async function spendCredit(
  sub: string,
  cents: number,
  ref: string,
): Promise<boolean> {
  if (cents <= 0) return true;
  const res = await insertRows(
    'credit_entries',
    { sub, delta_cents: -cents, reason: 'spend', ref, note: 'Applied to an order' },
    { ignoreDuplicatesOn: 'sub,ref' },
  );
  return res.ok;
}

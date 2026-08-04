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
 */
export async function accountByEmail(email: string): Promise<{ sub: string } | null> {
  const clean = email.trim().toLowerCase();
  if (!clean) return null;
  const rows = await selectRows<{ sub: string }>(
    'accounts',
    `?email=eq.${encodeURIComponent(clean)}&select=sub&limit=1`,
  );
  return rows?.[0] ?? null;
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
  await insertRows(
    'accounts',
    {
      sub: user.sub,
      // Stored lowercased because accountByEmail looks it up lowercased. A
      // mixed case address stored as typed would make the Cal webhook find
      // nobody and quietly skip the order.
      email: user.email.trim().toLowerCase(),
      name: user.name,
      picture: user.picture,
      last_seen_at: new Date().toISOString(),
    },
    { resolveOn: 'sub' },
  );

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

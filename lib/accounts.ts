import { readSession, sessionVersionOf, type SessionUser } from '@/lib/auth';
import { deleteRows, patchRows, selectRows } from '@/lib/supabase';

// The accounts row after sign in: reading it, editing it, revoking every
// session on it, and erasing it.
//
// Separate from lib/credits.ts on purpose. That file is the sign in path and
// the credit ledger, and it is where accountByEmail, resolveAccount and
// ensureAccount belong. This is everything a signed in person does to their
// own row afterwards, which is a different set of stakes: the two riskiest
// operations in the codebase are both in here.

if (typeof window !== 'undefined') {
  throw new Error('lib/accounts is server-only and must never reach the client');
}

export { MAX_NAME, cleanDisplayName } from '@/lib/account-name';

/**
 * Where a deleted account's orders end up.
 *
 * mk_orders.email is `not null`, so the address has to become a string rather
 * than nothing. `.invalid` is reserved by RFC 2606 and can never resolve, so
 * no code path in this repo or in get-an-expert-orders can accidentally send
 * mail to it later. That is the property being bought here, not the wording.
 */
export const ERASED_EMAIL = 'deleted@midsesh.invalid';

export interface Account {
  sub: string;
  email: string;
  name: string | null;
  sessionVersion: number;
  /** True once the person has edited their own name. See ensureAccount. */
  nameLocked: boolean;
}

interface AccountRow {
  sub: string;
  email: string;
  name: string | null;
  session_version: number | null;
  name_locked: boolean | null;
}

function filterSub(sub: string): string {
  return `sub=eq.${encodeURIComponent(sub)}`;
}

/**
 * Both spellings of an address, so a delete keyed on it cannot miss a row.
 *
 * accounts and quote_requests store the lowercased form. leads and mk_orders
 * store what was typed into a form. A LIKE based match would cover both in one
 * filter and is not an option: an email local part may legally contain `_`,
 * which LIKE reads as a wildcard, and an over-matching filter on a DELETE
 * takes somebody else's row with it.
 */
function addressesFor(email: string): string[] {
  const raw = email.trim();
  const lower = raw.toLowerCase();
  return raw && raw !== lower ? [lower, raw] : lower ? [lower] : [];
}

/** The row, or null when it does not exist or Supabase could not be reached. */
export async function readAccount(sub: string): Promise<Account | null> {
  if (!sub) return null;
  const rows = await selectRows<AccountRow>(
    'accounts',
    `${filterSub(sub)}&select=sub,email,name,session_version,name_locked&limit=1`,
  );
  const row = rows?.[0];
  if (!row) return null;
  return {
    sub: row.sub,
    email: row.email,
    name: row.name,
    // Both columns arrive from the migration with a default, so a null here
    // means a row written before it was applied rather than a real value.
    sessionVersion: row.session_version ?? 0,
    nameLocked: row.name_locked === true,
  };
}

/**
 * The generation this account's sessions have to be at least at.
 *
 * Null means it could not be read: Supabase unset, unreachable, or the
 * migration not applied yet. Null is not zero, and the difference is the whole
 * safety property of `currentAccount` below.
 */
export async function sessionVersionFor(sub: string): Promise<number | null> {
  if (!sub) return null;
  const rows = await selectRows<{ session_version: number | null }>(
    'accounts',
    `${filterSub(sub)}&select=session_version&limit=1`,
  );
  if (rows === null) return null;
  const value = rows[0]?.session_version;
  return typeof value === 'number' ? value : null;
}

/**
 * Who is asking, with revocation honoured. The async replacement for
 * readSession at every call site that can afford a round trip.
 *
 * Four cases, and three of them accept:
 *
 *   cookie ver | stored version        | outcome
 *   -----------|-----------------------|----------------------------
 *   absent     | anything              | accept, grandfathered
 *   present    | unreadable            | accept, fail open
 *   n          | m, m > n              | reject
 *   n          | m, m <= n             | accept
 *
 * Failing open on an unreadable version is deliberate. The alternative signs
 * out every customer on the site during a Supabase blip, which is a far worse
 * failure than one revoked session surviving an outage. Revocation here is
 * best effort, and the thing that makes that acceptable is that the cookie
 * still expires on its own at SESSION_MAX_AGE.
 *
 * Grandfathering is the direct cost of the requirement that deploying this
 * signs nobody out. A cookie minted before this shipped carries no version and
 * there is nothing on the row to compare it against, so it survives a revoke
 * until that browser signs in again.
 */
export async function currentAccount(cookie: string | undefined): Promise<SessionUser | null> {
  const user = readSession(cookie);
  if (!user) return null;

  const ver = sessionVersionOf(cookie);
  if (ver === null) return user;

  const stored = await sessionVersionFor(user.sub);
  if (stored === null) return user;

  return stored > ver ? null : user;
}

/**
 * Store the name this person typed, and stop the next sign in reverting it.
 *
 * name_locked goes with it in the same patch rather than in a second call.
 * Written separately, a failure between the two would leave a name that looks
 * saved and is silently overwritten the next time they sign in with Google,
 * which is the bug this whole flag exists to prevent.
 */
export async function setAccountName(sub: string, name: string | null): Promise<boolean> {
  if (!sub) return false;
  return patchRows('accounts', filterSub(sub), { name, name_locked: true });
}

/**
 * Move this account to a new session generation. Returns the new number, or
 * null when it did not land.
 *
 * Read then patch, rather than a blind patch to a guessed value. A guess that
 * is too low revokes nothing while telling somebody it revoked everything, and
 * a route that cannot read the current number has to say so rather than write
 * one. There is no read-modify-write race worth guarding here: two people
 * pressing this on the same account both want the number higher than it was,
 * and the worst a lost update costs is one more press.
 */
export async function bumpSessionVersion(sub: string): Promise<number | null> {
  const current = await sessionVersionFor(sub);
  if (current === null) return null;
  const next = current + 1;
  const ok = await patchRows('accounts', filterSub(sub), { session_version: next });
  return ok ? next : null;
}

export interface EraseReport {
  ok: boolean;
  /** Which step did what, for the log. Never shown to anybody. */
  steps: Record<string, boolean>;
}

/**
 * Erase the person, keep the business record.
 *
 * Five PostgREST calls with no transaction between them, so the ordering is
 * the only mitigation there is and it is chosen deliberately. The accounts row
 * goes LAST, because it is the anchor a session keys on: if an earlier step
 * fails, the person can still sign in and press the button again. Deleted
 * first, a failure at step four would leave them with no account, no way back
 * in, and their address still sitting on order rows.
 *
 * Every step is idempotent. A repeated delete matches nothing and a repeated
 * patch finds no row at the old address, so pressing it twice is free.
 *
 * What is not deleted, and why:
 *
 * - mk_orders rows survive with the address replaced. They are the record of
 *   work done and paid for. This repo does not own that table, but it already
 *   writes it through lib/marketplaceOrders.ts, which is what makes updating
 *   it legitimate rather than reaching into somebody else's schema.
 * - credit_entries is not named at all. It carries `references accounts (sub)
 *   on delete cascade`, so step five takes the whole ledger with it and the
 *   person drops out of the credit_balances view. Deleting it here as well
 *   would be a second definition of the same rule.
 * - match_profiles is not named either, for the same reason: it cascades from
 *   match_sets.
 * - `searches` cannot be attributed to a person. The table holds session_id,
 *   brief, query and timings, and no sub and no email. The searches that can
 *   be deleted are the match_sets, which is what step two does.
 */
export async function eraseAccount(sub: string, email: string): Promise<EraseReport> {
  const steps: Record<string, boolean> = {};
  const addresses = addressesFor(email);

  // Requests first, and by address as well as by sub. The signed out quote
  // path in app/api/quotes/route.ts writes `sub: null` with only an email, so
  // a sub-only delete leaves exactly the rows a person is most surprised to
  // find still there.
  const byOwner = await deleteRows('quote_requests', filterSub(sub));
  const byAddress = await Promise.all(
    addresses.map((a) => deleteRows('quote_requests', `email=eq.${encodeURIComponent(a)}`)),
  );
  steps.quote_requests = byOwner.ok && byAddress.every((r) => r.ok);

  // Takes match_profiles with it through the cascade, and any quote_requests
  // row still pointing at one of these sets.
  steps.match_sets = (await deleteRows('match_sets', filterSub(sub))).ok;

  // The privacy page calls leads the one place personal data lives, and it
  // carries an address, a name and a brief for every signed out request. An
  // erase that skipped it would leave the address in the table the daily
  // report counts.
  const leads = await Promise.all(
    addresses.map((a) => deleteRows('leads', `email=eq.${encodeURIComponent(a)}`)),
  );
  steps.leads = leads.every((r) => r.ok);

  // The one patch. The name goes with the address because a name identifies a
  // person as well as an address does, and the point is a row that stops
  // naming anybody rather than a row that stops being reachable.
  const orders = await Promise.all(
    addresses.map((a) =>
      patchRows('mk_orders', `email=eq.${encodeURIComponent(a)}`, {
        email: ERASED_EMAIL,
        name: null,
      }),
    ),
  );
  steps.mk_orders = orders.every(Boolean);

  // Last, and only ever last.
  steps.accounts = (await deleteRows('accounts', filterSub(sub))).ok;

  return { ok: Object.values(steps).every(Boolean), steps };
}

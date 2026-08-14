import { safeNext } from '@/lib/auth';

// Where the back control on /signin goes, and what it may honestly say.
//
// The obvious version is `href={next}`, and it ships a control that visibly
// does nothing. Everybody looking at /signin is signed out by construction,
// because app/signin/page.tsx redirects anyone who is not, and both
// destinations this site ever parks in `next` send a signed out browser
// straight back here: app/dashboard/page.tsx and app/orders/[id]/page.tsx both
// redirect to /signin with themselves in the query. A back control that
// returns you to the page you are trying to leave is worse than no back
// control, so the href has to be somewhere that renders without a session.
//
// /orders is the one guarded page that does render signed out, which is why an
// order id lands on the list rather than on the order. /dashboard has no such
// page, so it goes where everything else goes.
//
// The label names the href, never the request. Deriving it from `next` would
// promise "Back to your order" and then not deliver one, and the whole point
// of this control is that the way out is obvious rather than approximate.

export interface BackTo {
  /** Where the control goes. Always a page that renders without a session. */
  href: string;
  /** What it reads. Describes the href, so it cannot claim more than it does. */
  label: string;
}

// Shared between every caller and every request in the process, so frozen:
// a stray assignment would rewrite the copy for everybody after it.
const MARKETPLACE: BackTo = Object.freeze({ href: '/', label: 'Back to midsesh' });
const ORDERS: BackTo = Object.freeze({ href: '/orders', label: 'Back to your orders' });

/**
 * The way out of the sign in page for a given `?next=`.
 *
 * Takes the raw query value and runs the allowlist itself rather than trusting
 * a caller to have done it. This value becomes an href on the response that
 * sets a thirty day session cookie, and lib/auth keeps exactly one copy of
 * that rule on purpose, so this asks that copy instead of guessing.
 */
export function backTo(raw: string | null | undefined): BackTo {
  const to = safeNext(raw);
  if (!to) return MARKETPLACE;
  if (to === '/orders' || to.startsWith('/orders/')) return ORDERS;
  // /dashboard lands here, and so would a fourth allowlist entry added later.
  // An unmapped destination degrades to a true label rather than a wrong one.
  return MARKETPLACE;
}

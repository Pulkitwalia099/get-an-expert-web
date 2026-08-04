// The credit arithmetic, and nothing else.
//
// Split out of lib/credits.ts because that module is server-only: it holds the
// Supabase writes and throws if it ever reaches the browser. The setup cards
// need to tell a visitor what their credit would do to a price, which is this
// arithmetic and no secrets, so it lives here where both sides can read it.
//
// Every amount is integer cents. Money in floating point rounds in ways that
// only show up once the numbers are real.

/** What a new account is given, once. */
export const SIGNUP_CREDIT_CENTS = 5_000;

/**
 * The most of any single order that credit may cover.
 *
 * This was 0.5 while the launch price was on, because $50 against a setup
 * listed at $11 bought four of them and collected nothing. With the sale gone
 * and real prices back, the cap is lifted on purpose: the first cohort is
 * being bought, not sold to. The point of these orders is to watch people go
 * through the flow and learn from them, and a $17.50 toll on that is a filter
 * against exactly the people worth talking to.
 *
 * Two things keep it bounded. Nothing is fulfilled automatically, since every
 * setup is a live call somebody schedules and can decline, so a bogus free
 * order costs a calendar slot rather than money. And the grant is one
 * constant: set SIGNUP_CREDIT_CENTS to 0 and new accounts stop receiving it,
 * without touching anyone's existing balance.
 */
export const MAX_CREDIT_SHARE = 1;

export interface Split {
  priceCents: number;
  creditCents: number;
  dueCents: number;
}

/** How an order divides between credit and what is still owed. Pure. */
export function splitPrice(priceCents: number, balanceCents: number): Split {
  const price = Math.max(0, Math.round(priceCents));
  const available = Math.max(0, Math.round(balanceCents));
  const ceiling = Math.floor(price * MAX_CREDIT_SHARE);
  const creditCents = Math.min(available, ceiling);
  return { priceCents: price, creditCents, dueCents: price - creditCents };
}

/** Cents to the string a person reads. 5000 becomes "$50", 2500 "$25". */
export function formatCents(cents: number): string {
  const whole = cents / 100;
  return Number.isInteger(whole) ? `$${whole}` : `$${whole.toFixed(2)}`;
}

/**
 * What the welcome credit does to one price, for a brand new account.
 *
 * Written for a card that does not know who is reading it, so it describes the
 * offer rather than anybody's balance. Takes whole dollars, because that is
 * what the setup catalog stores.
 */
export function firstOrderLabel(priceDollars: number): string {
  const { dueCents } = splitPrice(priceDollars * 100, SIGNUP_CREDIT_CENTS);
  return dueCents === 0 ? 'Free on your first' : `${formatCents(dueCents)} on your first`;
}

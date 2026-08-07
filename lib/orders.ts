import { balanceFor, splitPrice, spendCredit } from '@/lib/credits';
import { currentPrice, type Setup } from '@/lib/setups';
import { insertRows } from '@/lib/supabase';

// Placing an order, in one place, because two callers do it and they must not
// drift: the browser route for a signed in visitor, and the Cal webhook when a
// booking is confirmed. The webhook is the honest commitment point, since Cal
// runs in a cross-origin iframe and the page never learns a time was picked.
//
// Nothing here charges anything. Money is still collected by hand after the
// setup is running, so the only balance that moves is credit.

if (typeof window !== 'undefined') {
  throw new Error('lib/orders is server-only and must never reach the client');
}

export interface PlacedOrder {
  stored: boolean;
  priceCents: number;
  creditCents: number;
  dueCents: number;
}

/**
 * Apply credit, then write the order.
 *
 * `ref` is the idempotency key and is shared by the order row and the credit
 * entry, both of which sit behind a unique index on (sub, ref). A retry of the
 * same ref therefore spends nothing twice and creates nothing twice, which is
 * the property that matters when Cal redelivers a webhook.
 *
 * Credit is taken before the order is written on purpose. If the debit lands
 * and the order does not, a customer has lost credit and can be given it back;
 * if the order lands and the debit does not, we have quietly given away money
 * and nothing in the data says so.
 */
export async function placeOrder(opts: {
  sub: string;
  setup: Setup;
  ref: string;
}): Promise<PlacedOrder> {
  const { sub, setup, ref } = opts;

  // Read from the catalog, never from a request. A price that arrives in a
  // payload is a price the sender chose.
  const priceCents = currentPrice(setup) * 100;
  const balance = await balanceFor(sub);
  const split = splitPrice(priceCents, balance.cents);

  let creditCents = split.creditCents;
  if (creditCents > 0) {
    const spent = await spendCredit(sub, creditCents, ref);
    if (!spent) creditCents = 0;
  }
  const dueCents = split.priceCents - creditCents;

  const written = await insertRows(
    'orders',
    {
      sub,
      ref,
      setup_slug: setup.slug,
      setup_title: setup.title,
      price_cents: split.priceCents,
      credit_applied_cents: creditCents,
      due_cents: dueCents,
      status: 'placed',
    },
    { ignoreDuplicatesOn: 'sub,ref' },
  );

  return { stored: written.ok, priceCents: split.priceCents, creditCents, dueCents };
}

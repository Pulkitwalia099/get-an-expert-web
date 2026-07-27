import { currentPrice, getSetup, isSetupSlug } from '@/lib/setups';

export const MAX_CART_ITEMS = 10;

// The cart is a plain array of setup slugs. Every operation returns a new
// array; nothing mutates. Unknown slugs are dropped at the door so a forged
// or stale localStorage value can never corrupt state.
export function addToCart(cart: readonly string[], slug: string): string[] {
  if (!isSetupSlug(slug)) return [...cart];
  if (cart.includes(slug) || cart.length >= MAX_CART_ITEMS) return [...cart];
  return [...cart, slug];
}

export function removeFromCart(cart: readonly string[], slug: string): string[] {
  return cart.filter((item) => item !== slug);
}

// Totals use the live price, which is the sale price while the sale runs.
export function cartTotal(cart: readonly string[]): number {
  return cart.reduce((sum, slug) => {
    const setup = getSetup(slug);
    return sum + (setup ? currentPrice(setup) : 0);
  }, 0);
}

import { describe, expect, it } from 'vitest';
import { addToCart, removeFromCart, cartTotal, MAX_CART_ITEMS } from '@/lib/cart';

// Acceptance specs for the cart, written as scenarios. The cart is a plain
// array of setup slugs; every operation returns a new array.

describe('Feature: adding setups to the cart', () => {
  it('Given an empty cart, When I add openclaw, Then the cart holds openclaw', () => {
    expect(addToCart([], 'openclaw')).toEqual(['openclaw']);
  });

  it('Given openclaw is already in the cart, When I add it again, Then nothing duplicates', () => {
    expect(addToCart(['openclaw'], 'openclaw')).toEqual(['openclaw']);
  });

  it('Given a junk slug, When I try to add it, Then the cart is unchanged', () => {
    expect(addToCart(['openclaw'], 'not-a-setup')).toEqual(['openclaw']);
    expect(addToCart(['openclaw'], '<script>alert(1)</script>')).toEqual(['openclaw']);
  });

  it('Given a full cart, When I add one more, Then the cart stays at the cap', () => {
    const full = Array.from({ length: MAX_CART_ITEMS }, (_, i) => `slug-${i}`);
    const result = addToCart(full, 'openclaw');
    expect(result).toHaveLength(MAX_CART_ITEMS);
    expect(result).not.toContain('openclaw');
  });

  it('never mutates the original cart', () => {
    const original = ['openclaw'];
    addToCart(original, 'ollama');
    removeFromCart(original, 'openclaw');
    expect(original).toEqual(['openclaw']);
  });
});

describe('Feature: removing setups from the cart', () => {
  it('Given two setups, When I remove one, Then only the other remains', () => {
    expect(removeFromCart(['openclaw', 'ollama'], 'openclaw')).toEqual(['ollama']);
  });

  it('Given a slug that is not in the cart, When I remove it, Then nothing changes', () => {
    expect(removeFromCart(['openclaw'], 'ollama')).toEqual(['openclaw']);
    expect(removeFromCart([], 'openclaw')).toEqual([]);
  });
});

describe('Feature: cart total during the $11 sale', () => {
  it('Given openclaw and ollama in the cart, Then the total is $22', () => {
    expect(cartTotal(['openclaw', 'ollama'])).toBe(22);
  });

  it('Given an empty cart, Then the total is $0', () => {
    expect(cartTotal([])).toBe(0);
  });

  it('Given an unknown slug snuck into storage, Then it counts as $0 instead of crashing', () => {
    expect(cartTotal(['openclaw', 'ghost-entry'])).toBe(11);
  });
});

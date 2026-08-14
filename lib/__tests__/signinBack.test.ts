import { describe, expect, it } from 'vitest';
import { backTo } from '../signinBack';

// The back control on /signin, which had to exist before anybody could leave
// that page without the browser button.
//
// Every case here is a pair, the href and the label together, because the
// failure this guards against is not a broken link. It is a working link under
// words that describe somewhere else.

const UUID = 'b1029c04-c43d-422b-9000-ff79632847a6';

describe('backTo', () => {
  it('sends an order id to the list, because the order itself bounces a signed out browser', () => {
    // app/orders/[id]/page.tsx redirects to /signin?next=/orders/<id>, so an
    // href of the order returns somebody to the page they just left. /orders
    // is the one guarded page that renders without a session.
    expect(backTo(`/orders/${UUID}`)).toEqual({
      href: '/orders',
      label: 'Back to your orders',
    });
  });

  it('sends the dashboard to the marketplace, for the same bounce', () => {
    // app/dashboard/page.tsx redirects to /signin?next=/dashboard. There is no
    // signed out dashboard to offer, so the honest exit is the marketplace.
    expect(backTo('/dashboard')).toEqual({ href: '/', label: 'Back to midsesh' });
  });

  it('keeps /orders where it is', () => {
    expect(backTo('/orders')).toEqual({ href: '/orders', label: 'Back to your orders' });
  });

  it('offers the marketplace on a bare /signin, which is the case nobody checks', () => {
    // Somebody who landed here by accident has no `next` at all, and they are
    // exactly the person the control was added for.
    expect(backTo(undefined)).toEqual({ href: '/', label: 'Back to midsesh' });
    expect(backTo(null)).toEqual({ href: '/', label: 'Back to midsesh' });
    expect(backTo('')).toEqual({ href: '/', label: 'Back to midsesh' });
  });

  it('refuses a destination we do not own, because this is a back button over an open redirect', () => {
    // The page that renders this href is the page that sets a thirty day
    // session cookie, so a hostile destination reaches somebody at the moment
    // they have most reason to trust what is on screen.
    for (const hostile of [
      'https://evil.example/orders',
      '//evil.example',
      '/orders/../admin',
      ' /orders',
      '/ordersomething',
      '/orders?x=1',
    ]) {
      expect(backTo(hostile)).toEqual({ href: '/', label: 'Back to midsesh' });
    }
  });

  it('treats an order id that is not a uuid as no destination at all', () => {
    // The allowlist in lib/auth wants a full hex uuid. Answering /orders here
    // would mean two rules about what an order id is, and the weaker one wins.
    expect(backTo('/orders/abc')).toEqual({ href: '/', label: 'Back to midsesh' });
    expect(backTo('/orders/b1029c04')).toEqual({ href: '/', label: 'Back to midsesh' });
  });

  it('hands back an object a caller cannot edit for everybody after them', () => {
    // The results are shared module constants. A caller retitling one would
    // retitle it for every later request in the same process.
    const back = backTo('/orders');
    expect(() => {
      (back as { label: string }).label = 'Somewhere else';
    }).toThrow();
    expect(backTo('/orders').label).toBe('Back to your orders');
  });
});

import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import SignInDoors from '@/components/SignInDoors';
import { SESSION_COOKIE, authConfigured, readSession } from '@/lib/auth';
import { CONTACT_EMAIL } from '@/lib/contact';
import { hasEmailKey } from '@/lib/email';
import { EMAIL_TOKEN_MAX_AGE, emailAuthConfigured } from '@/lib/emailAuth';
import { STATUS_LABELS, ago, stepFor } from '@/lib/order-status';
import { listOrdersForEmail } from '@/lib/orderTracking';

// Everything somebody has ordered from the marketplace, and where each one
// has got to.
//
// A server component rather than a page that fetches on mount, for the same
// reason /dashboard is one: the session cookie has to be read on the server
// anyway, and rendering an empty page first reads as the order not being
// saved to somebody who has just signed in to check on it.

export const metadata: Metadata = {
  title: 'Your orders · midsesh',
  description: 'What you have ordered, where it has got to, and the files when they are ready.',
};

// Nothing here may be cached or prerendered: every row belongs to one person.
export const dynamic = 'force-dynamic';

export default async function Orders({
  searchParams,
}: {
  searchParams: Promise<{ signin?: string }>;
}) {
  const store = await cookies();
  const user = readSession(store.get(SESSION_COOKIE)?.value);
  const signin = (await searchParams).signin;
  // Both halves have to be true for the email door to work at all: a secret to
  // sign the link with, and a key to send it through. Checked once here so the
  // form and the note explaining its absence can never disagree.
  const emailDoor = emailAuthConfigured() && hasEmailKey();

  // Signed out is not an error. It is the front door of this page, so it is
  // rendered here rather than redirected somewhere that has to explain itself.
  if (!user) {
    return (
      <main className="ord">
        <header className="ord-bar">
          <Link href="/" className="ord-back">
            midsesh
          </Link>
        </header>
        <h1>Your orders</h1>
        <p className="ord-lede">
          Sign in with the email you ordered with and your work is here, with its status.
        </p>
        {signin === 'expired' && (
          <p className="ord-flash" role="status">
            That link has expired or was already changed. Ask for a new one below.
          </p>
        )}
        {signin === 'unavailable' && (
          <p className="ord-flash" role="status">
            Sign in is not available right now. Try again shortly.
          </p>
        )}
        <SignInDoors
          google={authConfigured()}
          email={emailDoor}
          minutes={EMAIL_TOKEN_MAX_AGE / 60}
        />
        {!emailDoor && (
          <p className="ord-note">
            {authConfigured()
              ? 'Email sign in is turned off on this deployment. Use Google, or write to '
              : 'Sign in is not configured on this deployment. Write to '}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will send your order
            straight to you.
          </p>
        )}
      </main>
    );
  }

  const orders = await listOrdersForEmail(user.email);

  return (
    <main className="ord">
      <header className="ord-bar">
        <Link href="/" className="ord-back">
          midsesh
        </Link>
        <span className="ord-who">
          {user.email}
          {/* A form, not a link: the route is POST only so a prefetch cannot
              sign anybody out. The empty state below tells people to sign out
              and try another address, which it had no business saying while
              there was no way to do it. */}
          <form action="/api/auth/signout" method="post">
            <button className="ord-signout" type="submit">
              Sign out
            </button>
          </form>
        </span>
      </header>

      <h1>Your orders</h1>

      {orders === null ? (
        <p className="ord-empty">
          We cannot reach your orders right now. This is us, not you. Try again in a minute, or
          write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      ) : orders.length === 0 ? (
        <p className="ord-empty">
          Nothing here under <strong>{user.email}</strong>. If you ordered with a different
          address, sign out and sign in with that one. If you think this is wrong, write to{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will find it.
        </p>
      ) : (
        <ul className="ord-list">
          {orders.map((order) => {
            const step = stepFor(order.status);
            return (
              <li key={order.id}>
                <Link href={`/orders/${order.id}`} className="ord-card">
                  <span className="ord-card-top">
                    <span className="ord-service">{order.serviceName || 'Order'}</span>
                    <span className="ord-when">{ago(order.createdAt)}</span>
                  </span>
                  <span className={`ord-status ord-status-${order.status}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                  {step !== null && (
                    <span className="ord-pips" aria-hidden="true">
                      {[0, 1, 2, 3].map((i) => (
                        <span key={i} className={i <= step ? 'ord-pip ord-pip-on' : 'ord-pip'} />
                      ))}
                    </span>
                  )}
                  {order.brief && <span className="ord-brief">{order.brief}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

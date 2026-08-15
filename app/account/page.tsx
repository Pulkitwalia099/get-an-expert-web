import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import AccountSettings from '@/components/AccountSettings';
import AccountTimeline from '@/components/AccountTimeline';
import Mark from '@/components/Mark';
import { inter } from '@/app/fonts';
import { SESSION_COOKIE } from '@/lib/auth';
import { currentAccount, readAccount } from '@/lib/accounts';
import { CONTACT_EMAIL } from '@/lib/contact';
import { balanceFor, formatCents } from '@/lib/credits';
import { listOrdersForEmail } from '@/lib/orderTracking';
import { briefLine, listQuoteRequests } from '@/lib/quotes';
import { mergeTimeline } from '@/lib/timeline';

// One page for one account.
//
// /orders and /dashboard keep their own URLs, their own copy and their own
// reads, untouched. Customer emails link straight at both, including deep
// links to /orders/<id>, and a page that folded them in would have to redirect
// those, which is how a working link starts landing somewhere that has to
// explain itself. This sits beside them and links back out to each.
//
// A server component, like both of them, and for the same reason: the session
// cookie has to be read on the server anyway, and an empty page that fills in
// a moment later reads as your things not being saved.

export const metadata: Metadata = {
  title: 'Your account · midsesh',
  description: 'Your orders and requests in one place, and the settings behind them.',
  // Nothing here is for a search engine, and every row on it is one person's.
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function Account() {
  const store = await cookies();
  const user = await currentAccount(store.get(SESSION_COOKIE)?.value);
  // Signed out is not an error page, and `/` is the marketplace, a different
  // app that cannot bring them back here. /signin carries both doors and
  // returns them to this page, which is why /account is on the safeNext list.
  if (!user) redirect('/signin?next=/account');

  // Four reads at once. A request lookup that fails must not cost somebody
  // sight of their orders, and the reverse, so none of these is allowed to
  // block another.
  const [orders, requests, balance, account] = await Promise.all([
    listOrdersForEmail(user.email),
    listQuoteRequests(user.sub, 20),
    balanceFor(user.sub),
    readAccount(user.sub),
  ]);

  // Null means Supabase could not be reached, which the settings copy has to
  // tell apart from an honest zero.
  const orderCount = orders === null ? null : orders.length;
  const items = mergeTimeline(orders ?? [], requests, (r) => briefLine(r.brief, r.query));

  return (
    // `ord` as well as `acct`, and that is the whole reason this page needs so
    // little CSS of its own. The block at the bottom of globals.css repoints
    // .ord and .dash at the marketplace's paper ground, violet accent and pill
    // controls, so wearing that class is what makes /account, /orders and
    // /dashboard read as one product rather than as three.
    <main className={`ord acct ${inter.className}`}>
      <div className="paper" aria-hidden="true" />
      <header className="ord-bar">
        <Mark />
        {/* Where you can go. `/` is the marketplace, which is the front door
            of the business and the only way off this page that is not another
            corner of the same account. */}
        <Link href="/" className="ord-back">
          Back to midsesh
        </Link>
        <span className="ord-who acct-who">
          {user.email}
          {balance.known && <span className="acct-credit">{formatCents(balance.cents)} credit</span>}
        </span>
      </header>

      <h1>Your account</h1>
      <p className="ord-lede">
        Everything you have ordered and every set of quotes you have asked for, newest first.
      </p>

      {orders === null && (
        <p className="acct-warn" role="status">
          We cannot reach your orders right now. This is us, not you. Anything below is only your
          requests until it comes back.
        </p>
      )}

      {items.length === 0 ? (
        <div className="acct-empty">
          <p className="acct-empty-h">Nothing here yet.</p>
          <p>
            Order something from the marketplace, or tell us what you need and we will find people
            who have done it before.
          </p>
          <Link href="/ask" className="oa-btn oa-solid">
            Start a search
          </Link>
        </div>
      ) : (
        <AccountTimeline items={items} />
      )}

      <p className="acct-jump">
        <Link href="/orders">All your orders</Link>
        <Link href="/dashboard">All your requests</Link>
      </p>

      <AccountSettings
        email={user.email}
        // The stored name, not the one in the session cookie. A cookie signed
        // a week ago still carries whatever Google held then, so rendering it
        // would show an edited name reverting on every page load.
        name={account?.name ?? null}
        orderCount={orderCount}
        creditLabel={balance.known ? formatCents(balance.cents) : null}
      />

      <p className="acct-foot">
        Something here wrong? Write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and
        we will sort it.
      </p>
    </main>
  );
}

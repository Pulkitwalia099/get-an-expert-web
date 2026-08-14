import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import RequestList from '@/components/RequestList';
import { SESSION_COOKIE, readSession } from '@/lib/auth';
import { balanceFor, formatCents } from '@/lib/credits';
import { redactExperts } from '@/lib/experts';
import { briefLine, listQuoteRequests } from '@/lib/quotes';

// Where a request lives after the conversation that made it is gone.
//
// A server component rather than a page that fetches on mount, because
// everything here is already behind a session cookie the server has to read
// anyway. Fetching from the client would mean rendering an empty dashboard
// first and filling it in a moment later, which for somebody who has just
// signed in reads as their request not having been saved.

export const metadata: Metadata = {
  title: 'Your requests · midsesh',
  description: 'The searches you have run, who you asked about, and where each request has got to.',
};

// Nothing here may be cached or prerendered: every row belongs to one account.
export const dynamic = 'force-dynamic';

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ placed?: string }>;
}) {
  const store = await cookies();
  const user = readSession(store.get(SESSION_COOKIE)?.value);
  // Signed out is not an error page, and `/` is the marketplace, a different
  // app that cannot bring them back here afterwards. /signin carries both
  // doors and returns them to this page.
  if (!user) redirect('/signin?next=/dashboard');

  const [requests, balance] = await Promise.all([
    listQuoteRequests(user.sub),
    balanceFor(user.sub),
  ]);
  const justPlaced = (await searchParams).placed === '1';

  return (
    <main className="dash">
      <header className="dash-bar">
        <Link href="/" className="dash-back">
          midsesh
        </Link>
        {/* The two things a signed in person owns live on two pages, and this
            one is the older of them. Without this link the marketplace orders
            page can only be reached by typing the URL or from an email. */}
        <Link href="/orders" className="dash-back dash-other">
          Your orders
        </Link>
        <span className="dash-who">
          {user.email}
          {balance.known && <span className="dash-credit">{formatCents(balance.cents)} credit</span>}
        </span>
      </header>

      <h1>Your requests</h1>

      {justPlaced && (
        <p className="dash-flash" role="status">
          Request received. Our agents are contacting them now, and prices land in your inbox
          within 24 hours.
        </p>
      )}

      {requests.length === 0 ? (
        <div className="dash-empty">
          <p>Nothing here yet.</p>
          <p className="dash-empty-sub">
            Tell us what you need and we will find people who have done it before.
          </p>
          {/* Points at /ask, not /chat. Both asked the same opening question,
              and /chat was archived on 2026-08-14 as the one nobody reached. */}
          <Link href="/ask" className="cta">
            Start a search
          </Link>
        </div>
      ) : (
        <RequestList
          requests={requests.map((r) => ({
            id: r.id,
            status: r.status,
            createdAt: r.createdAt,
            slots: r.slots,
            title: briefLine(r.brief, r.query),
            // Unlocked without a second thought: this account owns the set, and
            // owning it is the entire question the gate asks.
            experts: redactExperts(r.experts, false),
          }))}
        />
      )}
    </main>
  );
}

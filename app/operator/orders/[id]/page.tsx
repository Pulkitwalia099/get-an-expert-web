import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import OperatorRound from '@/components/OperatorRound';
import { avatarsFor } from '@/lib/orderAvatars';
import { changesFor } from '@/lib/orderChanges';
import { revisionsFor } from '@/lib/orderRevisions';
import { getOrderUnchecked } from '@/lib/orderTracking';
import { OPERATOR_COOKIE, operatorCookieValid } from '@/lib/operatorAuth';

// One round of changes, put together in one place.
//
// Split from the queue on purpose. `/operator/orders` answers whose turn it is
// across every order at once, and it is right that it does: it is a board. This
// answers a different question, which is what goes on one customer's page next,
// and the two do not belong on one screen.
//
// Guarded on the server rather than by the client lock the queue uses. That lock
// exists because the queue is a client component that has to render something
// while it asks; this one has nothing to show a stranger, so it 404s instead.

export const metadata: Metadata = {
  title: 'Round · operator',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function Round({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await cookies();

  // No cookie means they have not signed in on this device. The queue is where
  // that happens, so they are sent there rather than shown a second password
  // form that would have to keep its own copy of the flow.
  if (!operatorCookieValid(store.get(OPERATOR_COOKIE)?.value)) {
    redirect('/operator/orders');
  }

  const order = await getOrderUnchecked(id);
  if (!order) notFound();

  const [rounds, faces, changes] = await Promise.all([
    revisionsFor(id),
    avatarsFor(id),
    changesFor(id),
  ]);

  const latest = rounds.length > 0 ? rounds[rounds.length - 1] : null;
  // Which version this round publishes.
  //
  // An open round publishes the one after the cut they gave notes on. A round
  // already answered is being edited rather than made, so it keeps its own
  // number instead of claiming a version nobody has seen.
  const version = latest
    ? (latest.after?.version ?? latest.before.version + 1)
    : 1;

  return (
    <main className="opq opq-one">
      <header className="rnd-bar">
        <Link href="/operator/orders" className="ord-back">
          Queue
        </Link>
        <span className="ord-who">{order.email}</span>
      </header>

      <p className="ord-eyebrow">{order.serviceName || 'Order'}</p>
      <h1>Version {version}</h1>
      <p className="rnd-lede">
        {latest
          ? 'They asked for changes. Put the new cut together here, look at it as them, then send it.'
          : 'No round of changes on this order yet. Anything saved here shows up the moment there is one.'}
      </p>

      {latest && (
        <section className="rnd-block">
          <h2>What they asked for</h2>
          <ul className="rv-notes">
            {latest.feedback.lines.map((line, i) => (
              <li key={i}>
                {line.frame !== null && <span className="rv-frame">Shot {line.frame}</span>}
                <span className="rv-said">{line.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <OperatorRound
        id={order.id}
        email={order.email}
        version={version}
        sampleUrl={latest?.after?.url ?? null}
        avatars={faces}
        changes={changes.get(version) ?? []}
      />
    </main>
  );
}

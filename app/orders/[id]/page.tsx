import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import OrderActions from '@/components/OrderActions';
import { SESSION_COOKIE, readSession } from '@/lib/auth';
import { CONTACT_EMAIL } from '@/lib/contact';
import {
  STATUS_LABELS,
  STATUS_NOTES,
  STEPS,
  ago,
  awaitingCustomer,
  stepFor,
} from '@/lib/order-status';
import { assetsFor, getOrderForEmail } from '@/lib/orderTracking';

// One order: where it is, the sample when there is one, and the two answers.

export const metadata: Metadata = {
  title: 'Your order · midsesh',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function Order({ params }: { params: Promise<{ id: string }> }) {
  const store = await cookies();
  const user = readSession(store.get(SESSION_COOKIE)?.value);
  if (!user) redirect('/orders');

  const { id } = await params;
  const order = await getOrderForEmail(id, user.email);
  // Somebody else's order, a bad id, and Supabase being down all end here.
  // A 403 on the first would confirm the id names a real order.
  if (!order) notFound();

  const step = stepFor(order.status);
  // Nothing has been made yet at `new`, so the lookup is skipped rather than
  // run to find two nulls.
  const assets = order.status === 'new' ? null : await assetsFor(id);
  const showSample = Boolean(assets?.sampleUrl);
  const showDownload = order.status === 'delivered' && Boolean(assets?.finalUrl);

  return (
    <main className="ord ord-one">
      <header className="ord-bar">
        <Link href="/orders" className="ord-back">
          All orders
        </Link>
        <span className="ord-who">{user.email}</span>
      </header>

      <p className="ord-eyebrow">{order.serviceName || 'Order'}</p>
      <h1>{STATUS_LABELS[order.status]}</h1>
      <p className="ord-lede">{STATUS_NOTES[order.status]}</p>

      {step !== null ? (
        <ol className="ord-rail">
          {STEPS.map((label, i) => (
            <li key={label} className={i <= step ? 'ord-step ord-step-on' : 'ord-step'}>
              <span className="ord-step-n">{String(i + 1).padStart(2, '0')}</span>
              <span className="ord-step-label">{label}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="ord-ended">
          This order is closed. If that is not what you expected, write to{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      )}

      {order.statusAt && <p className="ord-when-line">Last update {ago(order.statusAt)}</p>}

      {showSample && (
        <section className="ord-sample">
          <h2>{showDownload ? 'Your sample' : 'Your sample, watermarked'}</h2>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={assets!.sampleUrl!} controls playsInline preload="metadata" />
          <p className="ord-sample-note">
            Trouble playing it?{' '}
            <a href={assets!.sampleUrl!} target="_blank" rel="noreferrer noopener">
              Open it directly
            </a>
            .
          </p>
        </section>
      )}

      {awaitingCustomer(order.status) && <OrderActions id={order.id} />}

      {showDownload && (
        <p className="ord-download">
          <a className="oa-btn oa-solid" href={assets!.finalUrl!} target="_blank" rel="noreferrer noopener">
            Download the clean file
          </a>
        </p>
      )}

      {order.brief && (
        <section className="ord-brief-block">
          <h2>What you asked for</h2>
          <p>{order.brief}</p>
        </section>
      )}

      {order.statusNote && order.status !== 'sample_sent' && (
        <section className="ord-brief-block">
          <h2>Latest note</h2>
          <p>{order.statusNote}</p>
        </section>
      )}
    </main>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import OrderActions from '@/components/OrderActions';
import OrderDraft from '@/components/OrderDraft';
import OrderReferences from '@/components/OrderReferences';
import CutChoice from '@/components/CutChoice';
import SampleReview from '@/components/SampleReview';
import { briefProse, parseReferences } from '@/lib/references';
import { SESSION_COOKIE } from '@/lib/auth';
import { currentAccount } from '@/lib/accounts';
import { CONTACT_EMAIL } from '@/lib/contact';
import { TEXT_LABELS, TEXT_NOTES, deliveryFor } from '@/lib/delivery';
import { awaitingChoice, candidatesFor, chosen } from '@/lib/orderCandidates';
import { draftThread } from '@/lib/orderDrafts';
import {
  STATUS_LABELS,
  STATUS_NOTES,
  STEPS,
  ago,
  awaitingCustomer,
  stepFor,
} from '@/lib/order-status';
import { OPERATOR_COOKIE, operatorCookieValid } from '@/lib/operatorAuth';
import { assetsFor, getOrderForEmail, getOrderUnchecked, revisionsUsed } from '@/lib/orderTracking';

// One order: where it is, the sample when there is one, and the two answers.

export const metadata: Metadata = {
  title: 'Your order · midsesh',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function Order({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const store = await cookies();

  // Operator preview: any order, exactly as its owner sees it, and nothing a
  // click does is written down.
  //
  // Two conditions, both required. The flag alone does nothing without a valid
  // operator cookie, so a customer adding ?preview=1 to their own URL gets the
  // ordinary page, and a link to a preview forwarded to anybody else is just a
  // link to an order they cannot open.
  const query = await searchParams;
  const wants = query.preview;
  const preview =
    (wants === '1' || wants === 'true') &&
    operatorCookieValid(store.get(OPERATOR_COOKIE)?.value);
  // Which cut to pretend they picked, in preview only.
  //
  // A URL parameter rather than component state, because the page decides
  // between the choice screen and the review screen on the server. Carrying
  // the pretend choice in the URL means the review screen renders through
  // exactly the same code a real one does, frames and all, instead of a
  // second copy of it living inside the chooser for preview's benefit.
  const pretend = preview && typeof query.as === 'string' ? query.as : null;
  // The session guard is the only thing on this page that changed for the
  // account work. Every status email links straight here, so the deep link and
  // everything it renders stay exactly as they were.
  const user = await currentAccount(store.get(SESSION_COOKIE)?.value);
  // Signed in, they come straight back to this order rather than to the list,
  // which is the whole point of carrying a destination through. The id goes
  // through the same allowlist on the way back, so a junk one in the URL ends
  // up on /orders rather than anywhere it should not.
  //
  // Preview skips the sign in entirely. An operator looking at somebody else's
  // order has no reason to hold a customer session, and requiring one would
  // push them towards signing in as the customer, which is the thing this
  // exists to make unnecessary.
  if (!user && !preview) redirect(`/signin?next=/orders/${id}`);

  const order = preview
    ? await getOrderUnchecked(id)
    : await getOrderForEmail(id, user!.email);
  // Somebody else's order, a bad id, and Supabase being down all end here.
  // A 403 on the first would confirm the id names a real order.
  if (!order) notFound();

  const step = stepFor(order.status);
  // What this order hands over. A LinkedIn post has no file at any point, so
  // the whole file half of this page is skipped rather than rendered empty.
  const text = deliveryFor(order.serviceSlug) === 'text';
  // Nothing has been made yet at `new`, so the lookup is skipped rather than
  // run to find two nulls.
  const assets = text || order.status === 'new' ? null : await assetsFor(id);
  const thread = text && order.status !== 'new' ? await draftThread(id) : null;
  // Only an order that is actually offering a choice has rows here, and the
  // lookup is skipped for the two cases that can never have one: a written
  // deliverable, and an order nothing has been made for yet.
  const realCuts = text || order.status === 'new' ? [] : await candidatesFor(id);
  // In preview a pretend choice is applied in memory. Nothing is written and
  // the next request forgets it, which is the whole point.
  const cuts =
    pretend && realCuts.some((c) => c.slug === pretend)
      ? realCuts.map((c) => (c.slug === pretend ? { ...c, chosenAt: 'preview' } : c))
      : realCuts;
  const choosing = awaitingChoice(cuts);
  const picked = chosen(cuts);
  // The chosen cut is written in as an ordinary `sample_sent` event, so this
  // normally resolves from `assets` like any other order. The candidate is the
  // fallback for the one case that write can fail in: the choice is recorded
  // and the event is not. Losing somebody's decision is the thing worth
  // avoiding; showing them the cut they picked from a second source is cheap.
  // A pretend choice has written no event, so the candidate leads in preview.
  // On a real order the event is the source and the candidate is the fallback.
  const sampleUrl = pretend
    ? (picked?.sampleUrl ?? assets?.sampleUrl ?? null)
    : (assets?.sampleUrl ?? picked?.sampleUrl ?? null);
  const sampleFrames = pretend
    ? (picked?.frames ?? assets?.frames ?? null)
    : (assets?.frames ?? picked?.frames ?? null);
  const showSample = !choosing && Boolean(sampleUrl);
  const showDownload = order.status === 'delivered' && Boolean(assets?.finalUrl);
  // Only asked for when the buttons are about to render. Every other status
  // would be a query whose answer nothing on the page uses.
  const used = awaitingCustomer(order.status) ? await revisionsUsed(id) : null;

  // The links out of the brief, and the prose around them kept as written. A
  // line reading "Reference video:" is the customer labelling their own link
  // and is worth more than our guess at what sits behind it.
  const refs = parseReferences(order.brief);
  const prose = briefProse(order.brief);

  // What they asked for, then what we made of it. Built here and handed to
  // SampleReview so the order can follow what somebody is doing: above the two
  // buttons while there is a decision, below the box once they are writing in
  // it. Rendered at the foot of the page when there is no sample at all.
  const brief = (order.brief || assets?.deliveredCut || assets?.deliveredDiff) && (
    <>
      {order.brief && (
        <section className="ord-brief-block">
          <h2>What you asked for</h2>
          {prose && <p>{prose}</p>}
          {refs.length > 0 && <OrderReferences refs={refs} />}
          {/* A brief whose links we could not read is still their brief, so it
              is printed rather than dropped. */}
          {refs.length === 0 && !prose && <p>{order.brief}</p>}
        </section>
      )}

      {(assets?.deliveredCut || assets?.deliveredDiff) && (
        <section className="ord-brief-block">
          <h2>What we delivered</h2>
          {assets.deliveredCut && (
            <>
              <span className="ord-sub">The cut</span>
              <p>{assets.deliveredCut}</p>
            </>
          )}
          {assets.deliveredDiff && (
            <>
              <span className="ord-sub">Where it differs from your brief, and why</span>
              <p>{assets.deliveredDiff}</p>
            </>
          )}
        </section>
      )}
    </>
  );

  return (
    <main className="ord ord-one">
      <header className="ord-bar">
        <Link href="/orders" className="ord-back">
          All orders
        </Link>
        <span className="ord-who">{preview ? order.email ?? 'preview' : user!.email}</span>
      </header>

      {preview && (
        <div className="ord-preview" role="status">
          <p>
            <b>Preview</b> You are looking at {order.email}&apos;s order. Click anything you like.
            Nothing here is saved, no email is sent, and a reload starts it over.
          </p>
          {pretend && (
            <Link className="ord-preview-back" href={`/orders/${id}?preview=1`}>
              Back to the choice
            </Link>
          )}
        </div>
      )}

      <p className="ord-eyebrow">{order.serviceName || 'Order'}</p>
      <h1>{(text && TEXT_LABELS[order.status]) || STATUS_LABELS[order.status]}</h1>
      <p className="ord-lede">{(text && TEXT_NOTES[order.status]) || STATUS_NOTES[order.status]}</p>

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

      {choosing && (
        <CutChoice
          id={order.id}
          preview={preview}
          cuts={cuts.map((c) => ({
            slug: c.slug,
            label: c.label,
            title: c.title,
            kind: c.kind,
            ledBy: c.ledBy,
            sampleUrl: c.sampleUrl,
            detail: c.detail,
          }))}
        />
      )}

      {showSample && (
        <SampleReview
          id={order.id}
          preview={preview}
          sampleUrl={sampleUrl!}
          frames={sampleFrames}
          used={used}
          awaiting={awaitingCustomer(order.status)}
          heading={showDownload ? 'Your sample' : 'Your sample, watermarked'}
          context={brief}
        />
      )}

      {thread && thread.versions.length > 0 && (
        <OrderDraft
          id={order.id}
          versions={thread.versions}
          comments={thread.comments}
          when={ago}
          final={order.status === 'delivered'}
        />
      )}

      {/* Only when the sample is not carrying them. SampleReview owns the two
          buttons on a video order so that tapping a frame can move the player,
          and a LinkedIn draft or an order with no sample yet still needs them. */}
      {awaitingCustomer(order.status) && !showSample && !choosing && (
        <OrderActions id={order.id} used={used} />
      )}

      {showDownload && (
        <p className="ord-download">
          <a className="oa-btn oa-solid" href={assets!.finalUrl!} target="_blank" rel="noreferrer noopener">
            Download the clean file
          </a>
        </p>
      )}

      {/* The brief only renders here when there is no sample above to carry it.
          The moment there is one, it belongs next to the thing it was used to
          make, above the decision rather than under it. */}
      {!showSample && !choosing && brief}
    </main>
  );
}

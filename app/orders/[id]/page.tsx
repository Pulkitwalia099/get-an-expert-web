import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import OrderActions from '@/components/OrderActions';
import OrderDraft from '@/components/OrderDraft';
import OrderReferences from '@/components/OrderReferences';
import CutChoice from '@/components/CutChoice';
import SampleReview from '@/components/SampleReview';
import RevisionTrail from '@/components/RevisionTrail';
import AvatarLineup from '@/components/AvatarLineup';
import { brandFromBrief, briefProse, parseReferences } from '@/lib/references';
import { SESSION_COOKIE } from '@/lib/auth';
import { currentAccount } from '@/lib/accounts';
import { CONTACT_EMAIL } from '@/lib/contact';
import { TEXT_LABELS, TEXT_NOTES, deliveryFor } from '@/lib/delivery';
import { awaitingChoice, candidatesFor, chosen } from '@/lib/orderCandidates';
import { revisionsFor } from '@/lib/orderRevisions';
import { avatarsFor } from '@/lib/orderAvatars';
import { draftThread } from '@/lib/orderDrafts';
import {
  CHOICE_STEPS,
  REVISION_LABELS,
  REVISION_NOTES,
  STATUS_LABELS,
  STATUS_NOTES,
  STEPS,
  ago,
  awaitingCustomer,
  choiceStepFor,
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
  // Which rail this order gets, and where it sits on it.
  //
  // An order offering two cuts is told as the client's own steps, because
  // Received and In progress are both finished by the time two cuts are on the
  // screen, and a rail that spends half its width on our side of the work does
  // not tell somebody what to do next. Every other order keeps the four it had.
  const hasCuts = cuts.length > 0;
  // A cut has been preferred and the sign off has not happened yet. The status
  // is still `sample_sent` on both sides of that, so "Your sample is ready" was
  // the headline over a sample they had already watched and picked.
  const signOff = Boolean(picked) && awaitingCustomer(order.status);
  const railSteps = hasCuts ? CHOICE_STEPS : STEPS;
  const rail = hasCuts ? choiceStepFor(order.status, Boolean(picked)) : step;

  const showDownload = order.status === 'delivered' && Boolean(assets?.finalUrl);
  // Only asked for when the buttons are about to render. Every other status
  // would be a query whose answer nothing on the page uses.
  const used = awaitingCustomer(order.status) ? await revisionsUsed(id) : null;

  // The rounds of changes, and the faces this brand was cast from.
  //
  // Both are empty on an order that has neither, and both render nothing in
  // that case, so this ships dark and turns on per order rather than changing
  // what anybody else's page looks like. Skipped entirely for a written
  // deliverable and for an order nothing has been made for yet, on the same
  // reasoning as the candidate lookup above.
  const [rounds, faces] = text || order.status === 'new'
    ? [[], []]
    : await Promise.all([revisionsFor(id), avatarsFor(id)]);

  // Where a round of changes has got to.
  //
  // Told apart by whether the cut on the page is the one that answered the
  // notes, rather than by a status. Asking for changes and delivering the
  // answer are both ordinary rows on the same trail, and the statuses they
  // write, `working` and `sample_sent`, are the same two a first cut writes.
  // Only the trail knows the difference.
  const latest = rounds.length > 0 ? rounds[rounds.length - 1] : null;
  const revisionReady = Boolean(latest?.after && latest.after.url === sampleUrl);
  const revisionPending = Boolean(latest && !latest.after);

  // The trail carries both players side by side, so the standalone one under it
  // would be the same file twice on one page. The two buttons fall through to
  // OrderActions, which is the path a LinkedIn order already takes. What that
  // trades away is pinning a note to a shot, which SampleReview owns: worth it
  // on a second round, where the thing being reviewed is a change somebody
  // already described in words.
  const showSample = !choosing && !revisionReady && Boolean(sampleUrl);

  // The links out of the brief, and the prose around them kept as written. A
  // line reading "Reference video:" is the customer labelling their own link
  // and is worth more than our guess at what sits behind it.
  const refs = parseReferences(order.brief);
  const prose = briefProse(order.brief);
  // Only used to say their brand's name back to them under the lineup. Null
  // there reads as "this brand", so a brief we cannot read costs a word.
  const brandName = brandFromBrief(order.brief);

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
      {/* While there are two cuts and no preference yet, the page is about a
          different question than the status ladder's. "Your sample is ready"
          over two players reads as one sample somebody miscounted, and the
          note under it tells them to approve, which is not this step. */}
      <h1>
        {choosing
          ? 'Two cuts, ready to watch'
          : revisionReady
            ? REVISION_LABELS.ready
            : revisionPending
              ? REVISION_LABELS.working
              : signOff
                ? 'Your turn: approve it, or give feedback'
                : (text && TEXT_LABELS[order.status]) || STATUS_LABELS[order.status]}
      </h1>
      <p className="ord-lede">
        {choosing
          ? 'Watch both, then tell us which one you prefer. That does not lock anything in. You approve it or send notes on the next screen.'
          : revisionReady
            ? REVISION_NOTES.ready
            : revisionPending
              ? REVISION_NOTES.working
              : signOff
                ? 'This is the cut you preferred. Watch it, then approve it or point at the frames you want changed.'
                : (text && TEXT_NOTES[order.status]) || STATUS_NOTES[order.status]}
      </p>

      {rail !== null ? (
        <ol className="ord-rail">
          {railSteps.map((label, i) => (
            <li
              key={label}
              className={
                i < rail
                  ? 'ord-step ord-step-on ord-step-done'
                  : i === rail
                    ? 'ord-step ord-step-on ord-step-now'
                    : 'ord-step'
              }
            >
              <span className="ord-step-n">{String(i + 1).padStart(2, '0')}</span>
              <span className="ord-step-label">{label}</span>
              {/* Lit and finished look identical without this, which is what
                  made the rail decoration rather than a position. */}
              {i === rail && <span className="ord-step-here">You are here</span>}
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

      {/* Directly under the rail, because on a second round this is the page.
          Only rendered once somebody has actually asked for changes, so a
          first-round order is untouched by it. */}
      {!choosing && <RevisionTrail revisions={rounds} />}

      {showSample && (
        <SampleReview
          id={order.id}
          preview={preview}
          sampleUrl={sampleUrl!}
          frames={sampleFrames}
          used={used}
          awaiting={awaitingCustomer(order.status)}
          heading={
            showDownload
              ? 'Your sample'
              : picked
                ? 'The cut you preferred, watermarked'
                : 'Your sample, watermarked'
          }
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

      {/* Last, because it is the answer to a question the cuts raise rather
          than anything somebody has to act on. */}
      {!choosing && <AvatarLineup avatars={faces} brand={brandName} />}

      {/* The brief only renders here when there is no sample above to carry it.
          The moment there is one, it belongs next to the thing it was used to
          make, above the decision rather than under it. */}
      {!showSample && !choosing && brief}
    </main>
  );
}

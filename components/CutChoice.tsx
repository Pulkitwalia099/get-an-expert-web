'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { timecode } from '@/lib/frames';
import type { Candidate } from '@/lib/orderCandidates';

// Two cuts of the same brief, and the one question worth asking about them.
//
// The question is which one they prefer, and the button says exactly that. It
// read "Choose this one" until 30 Aug, which sounded like the decision itself
// and made the note underneath, promising nothing was locked in, read as a
// contradiction. Approving is the decision, and it happens on the next screen.
//
// Rendered only while a candidate is unchosen. The moment somebody picks, the
// server writes that cut in as an ordinary sample and this component is gone:
// the page falls through to SampleReview, which already knows how to take
// feedback against a shot list.
//
// Choosing is deliberately its own step. Both cards carrying a feedback box
// would invite notes on both cuts, and the order pays for one round of changes
// on one direction. The page asks the question the order can actually answer.

/** What the browser needs. The server strips nothing else out of a candidate. */
export type Choice = Pick<
  Candidate,
  'slug' | 'label' | 'title' | 'kind' | 'ledBy' | 'sampleUrl' | 'detail'
>;

type Mode = 'idle' | 'sending';

function Fold({ detail }: { detail: NonNullable<Candidate['detail']> }) {
  return (
    <details className="cc-more">
      <summary>More about this direction</summary>
      <div className="cc-fold">
        {detail.story && (
          <div className="cc-block">
            <span className="ord-sub">The story</span>
            <p>{detail.story}</p>
          </div>
        )}

        {detail.reads.length > 0 && (
          <div className="cc-block">
            {/* Labelled as ours on purpose. The teams never wrote down why they
                chose a direction, and putting our reasoning under a heading
                that reads like theirs would be inventing it on their behalf.
                Same split as `why` and `projected` on a search result. */}
            <span className="ord-sub">Our read of what it is doing</span>
            <ul className="cc-reads">
              {detail.reads.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        {detail.trade && (
          <div className="cc-block">
            <span className="ord-sub">The trade</span>
            <p>{detail.trade}</p>
          </div>
        )}

        {detail.beats.length > 0 && (
          <div className="cc-block">
            <span className="ord-sub">Beat by beat</span>
            <ul className="cc-beats">
              {detail.beats.map((beat) => (
                <li key={`${beat.t}-${beat.d.slice(0, 24)}`}>
                  <span className="cc-t">{timecode(beat.t)}</span>
                  <span className="cc-d">{beat.d}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {detail.built && (
          <div className="cc-block">
            <span className="ord-sub">Built for this direction</span>
            <p>{detail.built}</p>
          </div>
        )}
      </div>
    </details>
  );
}

export default function CutChoice({
  id,
  cuts,
  preview = false,
}: {
  id: string;
  cuts: Choice[];
  /**
   * Operator preview. The button navigates instead of writing.
   *
   * Nothing is posted at all in this mode, rather than posted and ignored by
   * the server. There is no request to get wrong, so no bug in a route can
   * turn a look into a change on somebody's live order.
   */
  preview?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('idle');
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function choose(slug: string) {
    if (mode === 'sending') return;

    // Preview carries the pretend choice in the URL and lets the page render
    // the review screen for real. No fetch, so nothing can be written.
    if (preview) {
      router.push(`/orders/${id}?preview=1&as=${encodeURIComponent(slug)}`);
      return;
    }

    setMode('sending');
    setPending(slug);
    setError('');
    try {
      const res = await fetch(`/api/marketplace/${id}/choose`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      if (res.ok) {
        // The choice lives on the server. Asking the page again rather than
        // patching state here is what keeps this component from disagreeing
        // with the database it came from.
        router.refresh();
        return;
      }
      const parsed: unknown = await res.json().catch(() => null);
      const message =
        res.status < 500 && typeof parsed === 'object' && parsed !== null
          ? (parsed as { error?: unknown }).error
          : null;
      setError(typeof message === 'string' ? message : 'That did not save. Try again.');
      setMode('idle');
      setPending(null);
    } catch {
      setError('That did not save. Check your connection and try again.');
      setMode('idle');
      setPending(null);
    }
  }

  return (
    <section className="cc">
      <h2>Your two cuts, watermarked</h2>

      <div className="cc-grid">
        {cuts.map((cut) => {
          const sending = mode === 'sending' && pending === cut.slug;
          return (
            <article className="cc-card" key={cut.slug}>
              <div className="cc-head">
                {/* The label is what the email calls this cut, so it leads.
                    Falling back to the expert's name alone rather than to the
                    title, which is already the line underneath. */}
                <span className="cc-team">
                  {[cut.label, cut.ledBy].filter(Boolean).join(' · ') || 'One of your cuts'}
                </span>
                <span className="cc-name">{cut.title}</span>
                {cut.kind && <span className="cc-kind">{cut.kind}</span>}
              </div>

              <div className="ord-stage">
                {/* preload="metadata" rather than auto: two cuts on one page is
                    two files, and a phone should not pull both before somebody
                    has pressed anything. */}
                <video src={cut.sampleUrl} controls playsInline preload="metadata" />
              </div>

              <button
                type="button"
                className="oa-btn oa-solid cc-choose"
                onClick={() => choose(cut.slug)}
                disabled={mode === 'sending'}
              >
                {sending ? 'Saving' : 'I prefer this one'}
              </button>

              {cut.detail && <Fold detail={cut.detail} />}
            </article>
          );
        })}
      </div>

      {error && (
        <p className="oa-error" role="alert">
          {error}
        </p>
      )}

      <p className="ord-note">
        {preview
          ? 'Preview: preferring a cut here only changes what this page shows you.'
          : 'Not sure yet? Open "More about this direction" under either cut for the story, the beats, and what each one trades away.'}
      </p>
    </section>
  );
}

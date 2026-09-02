'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BEYOND_REVISIONS, INCLUDED_REVISIONS, MAX_COMMENT } from '@/lib/order-status';

// Approve, or say what is wrong. Nothing else.
//
// The comment box only opens once the second button is pressed, so the default
// view of a finished sample is a single obvious action rather than a form
// somebody has to read before they can say yes.
//
// Two shapes, and the difference is whether a round of changes is still ahead
// of them. On a first cut it is: the second button says Request changes,
// because that is what the price includes and what they are about to spend. On
// the cut that answered those changes it is not, so the pair becomes approve or
// reject and nothing on screen offers a revision we have not agreed to.
//
// Reject ends the order. That is the whole reason this shape exists and it is
// the one thing the box has to say out loud, because it is the only control on
// the page a customer cannot undo from the page.

type Mode = 'idle' | 'commenting' | 'sending' | 'done';

export default function OrderActions({
  id,
  used,
  /**
   * This cut answered a round of changes, so there is no further round to
   * offer. Approve or reject, and no arithmetic about what is included.
   */
  final = false,
  /** A clean file is parked, so approving hands it over rather than promising it. */
  canDownload = false,
}: {
  id: string;
  used: number | null;
  final?: boolean;
  canDownload?: boolean;
}) {
  // Null means the count could not be read. No warning then, rather than a
  // guess: telling somebody they are out of revisions when they are not is
  // worse than saying nothing. Never shown on a final cut: the warning exists
  // to price a revision somebody is about to ask for, and there is none to ask
  // for here.
  const beyond = !final && used !== null && used >= INCLUDED_REVISIONS;
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('idle');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  async function send(action: 'approve' | 'changes') {
    if (mode === 'sending') return;
    setMode('sending');
    setError('');
    try {
      const res = await fetch(`/api/marketplace/${id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, comment: action === 'changes' ? comment : undefined }),
      });
      if (res.ok) {
        setMode('done');
        // The status lives on the server, so the page is asked again rather
        // than patched here. Two copies of "what state is this order in" is
        // how a page ends up disagreeing with the database it came from.
        router.refresh();
        return;
      }
      const parsed: unknown = await res.json().catch(() => null);
      const message =
        res.status < 500 && typeof parsed === 'object' && parsed !== null
          ? (parsed as { error?: unknown }).error
          : null;
      setError(typeof message === 'string' ? message : 'That did not save. Try again.');
      setMode(action === 'changes' ? 'commenting' : 'idle');
    } catch {
      setError('That did not save. Check your connection and try again.');
      setMode(action === 'changes' ? 'commenting' : 'idle');
    }
  }

  if (mode === 'done') {
    return (
      <p className="oa-done" role="status">
        Got it. This page will update in a moment.
      </p>
    );
  }

  return (
    <div className="oa">
      {mode === 'commenting' || mode === 'sending' ? (
        <div className="oa-box">
          <label className="oa-label" htmlFor="oa-comment">
            {final ? 'What is wrong with it?' : 'What should change?'}
          </label>
          {/* Shown before the box, not after the send. A warning that arrives
              once the request is gone is an excuse, not a warning. */}
          {beyond && (
            <p className="oa-warn" role="status">
              {BEYOND_REVISIONS}
            </p>
          )}
          {/* Said before the button, not after it. Rejecting ends the order and
              cannot be taken back from this page, and a consequence somebody
              learns about afterwards is not a warning. */}
          {final && (
            <p className="oa-warn" role="status">
              This closes the order. Nothing is charged, and we will read your notes and
              reply by email.
            </p>
          )}
          <textarea
            id="oa-comment"
            rows={4}
            maxLength={MAX_COMMENT}
            autoFocus
            placeholder={
              final
                ? 'The end card is still in English.'
                : 'The hook is too slow, and please cut the last line.'
            }
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={mode === 'sending'}
          />
          <div className="oa-row">
            <button
              className="oa-btn oa-solid"
              type="button"
              disabled={mode === 'sending' || !comment.trim()}
              onClick={() => send('changes')}
            >
              {mode === 'sending'
                ? 'Sending'
                : final
                  ? 'Reject and close'
                  : beyond
                    ? 'Send them anyway'
                    : 'Send these notes'}
            </button>
            <button
              className="oa-btn"
              type="button"
              disabled={mode === 'sending'}
              onClick={() => {
                setMode('idle');
                setError('');
              }}
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        <div className="oa-row">
          <button className="oa-btn oa-solid" type="button" onClick={() => send('approve')}>
            {/* Only promises the file when the file is actually parked. A
                button reading "and download" followed by nothing to download
                is the one version of this worth avoiding. */}
            {final && canDownload ? 'Approve and download' : 'Approve this ad'}
          </button>
          <button className="oa-btn" type="button" onClick={() => setMode('commenting')}>
            {final ? 'Reject' : 'Request changes'}
          </button>
        </div>
      )}
      {error && (
        <p className="oa-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

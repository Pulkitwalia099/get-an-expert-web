'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MAX_COMMENT } from '@/lib/order-status';

// Approve, or say what to change. Nothing else.
//
// The comment box only opens once Request changes is pressed, so the default
// view of a finished sample is a single obvious action rather than a form
// somebody has to read before they can say yes.

type Mode = 'idle' | 'commenting' | 'sending' | 'done';

export default function OrderActions({ id }: { id: string }) {
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
            What should change?
          </label>
          <textarea
            id="oa-comment"
            rows={4}
            maxLength={MAX_COMMENT}
            autoFocus
            placeholder="The hook is too slow, and please cut the last line."
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
              {mode === 'sending' ? 'Sending' : 'Send these notes'}
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
            Approve this ad
          </button>
          <button className="oa-btn" type="button" onClick={() => setMode('commenting')}>
            Request changes
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

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MAX_DRAFT, byCustomer } from '@/lib/delivery';
import { MAX_COMMENT } from '@/lib/order-status';

// The draft, as the person who ordered it sees it.
//
// Two things they can do that the video flow has no equivalent of. They can
// edit the words, which saves a new version over ours and leaves ours in the
// history, and they can say something about it without changing it. Both are
// deliberately separate from Approve and Request changes, which still sit
// below this and still mean what they meant.
//
// An edit is not a revision. Somebody fixing their own job title should not
// spend the one rewrite included in the price, and it would be a strange way
// to treat a customer who just did our work for us.

type Mode = 'reading' | 'editing' | 'saving';

export interface Version {
  id: number;
  body: string;
  actor: string;
  createdAt: string;
}

export default function OrderDraft({
  id,
  versions,
  comments,
  when,
  final,
}: {
  id: string;
  versions: Version[];
  comments: Version[];
  when: (iso: string) => string;
  /** True once the order is delivered, when the draft is theirs and closed. */
  final: boolean;
}) {
  const router = useRouter();
  const current = versions[0];
  const [mode, setMode] = useState<Mode>('reading');
  const [body, setBody] = useState(current?.body ?? '');
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function post(payload: Record<string, unknown>): Promise<boolean> {
    setError('');
    try {
      const res = await fetch(`/api/marketplace/${id}/draft`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        // The versions live on the server, so the page is asked again rather
        // than patched here. Two copies of "what does the draft say" is how a
        // page ends up disagreeing with the database it came from.
        router.refresh();
        return true;
      }
      const parsed: unknown = await res.json().catch(() => null);
      const message =
        res.status < 500 && typeof parsed === 'object' && parsed !== null
          ? (parsed as { error?: unknown }).error
          : null;
      setError(typeof message === 'string' ? message : 'That did not save. Try again.');
    } catch {
      setError('That did not save. Check your connection and try again.');
    }
    return false;
  }

  if (!current) return null;

  return (
    <section className="ord-draft">
      <h2>{final ? 'Your post' : 'Your draft'}</h2>

      {mode === 'reading' ? (
        <article className="ord-draft-body">{current.body}</article>
      ) : (
        <textarea
          className="ord-draft-edit"
          value={body}
          maxLength={MAX_DRAFT}
          onChange={(e) => setBody(e.target.value)}
          rows={14}
          aria-label="Edit the draft"
          autoFocus
        />
      )}

      <p className="ord-draft-meta">
        {byCustomer(current.actor) ? 'Your edit' : 'Written by us'}, {when(current.createdAt)}
        {versions.length > 1 ? ` · version ${versions.length}` : ''}
      </p>

      {mode === 'reading' ? (
        <div className="ord-draft-row">
          <button className="oa-btn" onClick={() => setMode('editing')}>
            Edit it yourself
          </button>
        </div>
      ) : (
        <div className="ord-draft-row">
          <button
            className="oa-btn oa-solid"
            disabled={mode === 'saving' || !body.trim()}
            onClick={async () => {
              setMode('saving');
              const ok = await post({ action: 'edit', body });
              setMode(ok ? 'reading' : 'editing');
            }}
          >
            {mode === 'saving' ? 'Saving' : 'Save my version'}
          </button>
          <button
            className="oa-btn"
            disabled={mode === 'saving'}
            onClick={() => {
              setBody(current.body);
              setMode('reading');
              setError('');
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {mode === 'editing' && (
        <p className="ord-draft-note">
          Your version is saved on top of ours. Nothing is overwritten, and every version stays
          below.
        </p>
      )}

      {versions.length > 1 && (
        <details className="ord-draft-history">
          <summary>Earlier versions ({versions.length - 1})</summary>
          <ol>
            {versions.slice(1).map((v) => (
              <li key={v.id}>
                <p className="ord-draft-meta">
                  {byCustomer(v.actor) ? 'Your edit' : 'Written by us'}, {when(v.createdAt)}
                </p>
                <article className="ord-draft-body ord-draft-old">{v.body}</article>
              </li>
            ))}
          </ol>
        </details>
      )}

      <div className="ord-draft-talk">
        <h3>Comments</h3>
        {comments.length === 0 ? (
          <p className="ord-draft-note">
            Say anything about the draft here. It does not count as a change request.
          </p>
        ) : (
          <ul>
            {comments.map((c) => (
              <li key={c.id} className={byCustomer(c.actor) ? 'ord-mine' : ''}>
                <p className="ord-draft-meta">
                  {byCustomer(c.actor) ? 'You' : 'Us'}, {when(c.createdAt)}
                </p>
                <p>{c.body}</p>
              </li>
            ))}
          </ul>
        )}

        <textarea
          value={comment}
          maxLength={MAX_COMMENT}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          placeholder="Anything you want to say about it"
          aria-label="Add a comment"
        />
        <div className="ord-draft-row">
          <button
            className="oa-btn"
            disabled={sending || !comment.trim()}
            onClick={async () => {
              setSending(true);
              if (await post({ action: 'comment', body: comment })) setComment('');
              setSending(false);
            }}
          >
            {sending ? 'Sending' : 'Add a comment'}
          </button>
        </div>
      </div>

      {error && <p className="oa-error">{error}</p>}
    </section>
  );
}

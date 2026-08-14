'use client';

import { MAX_DRAFT, byCustomer } from '@/lib/delivery';

// Writing the post, on the operator side.
//
// Split out of app/operator/orders/page.tsx when that page passed 400 lines.
// The box holds the draft being written, and everything under it is history:
// every earlier version including the customer's own edits, and anything they
// have said about it.
//
// Nothing here saves. The page sends the box's contents with the status move,
// so one press writes the version and tells them it is ready, and closing the
// tab halfway through leaves no half saved draft behind.

export interface Version {
  id: number;
  body: string;
  actor: string;
  createdAt: string;
}

export default function OperatorDraft({
  draft,
  onDraft,
  versions,
  comments,
  ago,
}: {
  draft: string;
  onDraft: (value: string) => void;
  versions: Version[];
  comments: Version[];
  ago: (iso: string) => string;
}) {
  const current = versions[0];
  const edited = draft.trim() !== (current?.body.trim() ?? '');

  return (
    <section className="opq-block">
      <h2>Draft</h2>
      <textarea
        className="opq-draft"
        value={draft}
        maxLength={MAX_DRAFT}
        onChange={(e) => onDraft(e.target.value)}
        placeholder="The post, as they will read it."
        rows={12}
      />
      <p className="opq-why">
        {!current
          ? 'Saved as version 1 when you send it.'
          : edited
            ? `Saved as version ${versions.length + 1} when you send it. Nothing is lost.`
            : `Version ${versions.length}, ${
                byCustomer(current.actor) ? 'their edit' : 'ours'
              }, ${ago(current.createdAt)} ago.`}
      </p>

      {versions.length > 1 && (
        <details className="opq-versions">
          <summary>
            {versions.length} versions
            {versions.some((v) => byCustomer(v.actor)) ? ', including theirs' : ''}
          </summary>
          <ul>
            {versions.slice(1).map((v) => (
              <li key={v.id}>
                <span className="opq-trail-m">
                  {byCustomer(v.actor) ? 'Their edit' : 'Ours'} · {ago(v.createdAt)} ago
                </span>
                <p>{v.body}</p>
                {/* Not a revert. It puts the old words back in the box, and
                    sending them writes a new version on top, so the thing that
                    was undone is still there to look at. */}
                <button type="button" className="opq-btn opq-btn-small" onClick={() => onDraft(v.body)}>
                  Put this back in the box
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {comments.length > 0 && (
        <ul className="opq-comments">
          {comments.map((c) => (
            <li key={c.id} className={byCustomer(c.actor) ? 'opq-comment-them' : ''}>
              <span className="opq-trail-m">
                {byCustomer(c.actor) ? 'Them' : 'Us'} · {ago(c.createdAt)} ago
              </span>
              <p>{c.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

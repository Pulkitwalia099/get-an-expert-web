'use client';

import type { ReactNode } from 'react';

// The Mac window chrome: lights, wordmark, an optional action, and the
// privacy link. Static, and the only per-flow part is the small tag beside
// the wordmark.
export default function Titlebar({
  tag,
  action,
}: {
  tag: string | null;
  action?: ReactNode;
}) {
  return (
    <div className="titlebar">
      <div className="lights">
        <i className="r" />
        <i className="y" />
        <i className="g" />
      </div>
      <div className="wordmark">
        <span className="worb">✳︎</span>midsesh
        {tag && <span className="tag">{tag}</span>}
      </div>
      {action}
      <a className="privacy-link" href="/privacy">
        Privacy
      </a>
    </div>
  );
}

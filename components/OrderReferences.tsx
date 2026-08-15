'use client';

import { useState } from 'react';
import type { Reference } from '@/lib/references';

// The links from the brief, as things a customer can open.
//
// The one that plays inline is the point. A reference reel is what the cut was
// made against, and a person deciding whether the cut is right should be able
// to watch both without leaving the page.
//
// Nothing loads until it is tapped. Three Instagram iframes on a phone is a
// slow page and third party tracking nobody asked for, so the card carries its
// own play control and swaps itself for the embed on press.

const INITIALS: Record<Reference['kind'], string> = {
  'instagram-post': 'REEL',
  'instagram-profile': 'IG',
  youtube: 'PLAY',
  tiktok: 'TIKTOK',
  vimeo: 'PLAY',
  site: 'LINK',
};

function tint(kind: Reference['kind']): string {
  return kind === 'site' ? 'ref-thumb-site' : 'ref-thumb-media';
}

export default function OrderReferences({ refs }: { refs: Reference[] }) {
  const [open, setOpen] = useState<string | null>(null);

  if (refs.length === 0) return null;

  return (
    <ul className="ref-list">
      {refs.map((ref) => {
        const playing = open === ref.url;
        return (
          <li key={ref.url} className="ref-item">
            {playing && ref.embed ? (
              <div className="ref-embed">
                <iframe
                  src={ref.embed}
                  title={ref.display}
                  loading="lazy"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
                <button type="button" className="ref-close" onClick={() => setOpen(null)}>
                  Close
                </button>
              </div>
            ) : (
              <div className="ref-card">
                <span className={`ref-thumb ${tint(ref.kind)}`} aria-hidden="true">
                  {INITIALS[ref.kind]}
                </span>
                <span className="ref-body">
                  <span className="ref-kind">{ref.label}</span>
                  <span className="ref-url">{ref.display}</span>
                </span>
                {ref.embed ? (
                  <button type="button" className="ref-go" onClick={() => setOpen(ref.url)}>
                    Play here
                  </button>
                ) : (
                  <a className="ref-go" href={ref.url} target="_blank" rel="noreferrer noopener">
                    Open
                  </a>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

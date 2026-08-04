'use client';

import { useState } from 'react';
import type { Expert } from '@/lib/types';
import { initials } from '@/lib/initials';

// How wide the redaction bar is, per slot. Varied so eight locked cards do not
// look like eight copies of one card, and derived from the slot rather than
// from the real name, because a bar sized to the name would leak its length.
const BAR_WIDTHS = [92, 116, 78, 104, 88, 124, 96, 82];

function barWidth(slot: number): number {
  return BAR_WIDTHS[(slot - 1) % BAR_WIDTHS.length];
}

export default function ExpertCards({
  experts,
  selected,
  locked,
  onToggle,
}: {
  experts: Expert[];
  selected: string[];
  /** The whole list is read-only, e.g. once a request is in. Separate from a
   *  card's own `locked`, which is about whose name is withheld. */
  locked: boolean;
  onToggle: (id: string) => void;
}) {
  const [broken, setBroken] = useState<Record<string, boolean>>({});

  return (
    <div className="cards">
      {experts.map((e, i) => {
        const isSelected = selected.includes(e.id);
        const hidden = e.locked;
        return (
          <div
            key={e.id}
            className={`card${isSelected ? ' selected' : ''}${locked ? ' locked' : ''}${hidden ? ' veiled' : ''}`}
            style={{ animationDelay: `${Math.min(i, 7) * 55}ms` }}
            role="button"
            aria-pressed={isSelected}
            aria-label={
              hidden ? `Hidden profile ${e.slot}${e.country ? `, ${e.country}` : ''}` : e.name || ''
            }
            tabIndex={locked ? -1 : 0}
            onClick={() => !locked && onToggle(e.id)}
            onKeyDown={(ev) => {
              if (!locked && (ev.key === 'Enter' || ev.key === ' ')) {
                ev.preventDefault();
                onToggle(e.id);
              }
            }}
          >
            {hidden ? (
              // No photo arrived in the payload, so there is nothing here to
              // reveal. The disc is generated from the slot number.
              <div className="av av-veiled" aria-hidden="true" />
            ) : e.photo && !broken[e.id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="av"
                src={e.photo}
                alt=""
                onError={() => setBroken((b) => ({ ...b, [e.id]: true }))}
              />
            ) : (
              <div className="av avi">{initials(e.name ?? '')}</div>
            )}
            <div className="c-body">
              <div className="c-top">
                {hidden ? (
                  <span
                    className="c-veil"
                    style={{ width: `${barWidth(e.slot)}px` }}
                    aria-hidden="true"
                  />
                ) : (
                  <span className="c-name">{e.name}</span>
                )}
                {e.country && (
                  <span className="c-loc">
                    {e.flag ? `${e.flag} ` : ''}
                    {e.country}
                  </span>
                )}
                <span className="right">
                  {e.top_match && <span className="badge">Top match</span>}
                  <span className="sel-box" aria-hidden="true">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path
                        d="M2 5.8 4.4 8 9 3.2"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </span>
              </div>
              {e.rating != null && (
                <div className="c-meta">
                  <span className="star">★</span> {e.rating}
                  {e.reviews ? ` · ${e.reviews} reviews` : ''}
                </div>
              )}
              <div className="c-why">{e.why}</div>
              {/* The heading is what keeps this honest. Everything above is
                  taken from the listing; this part is our read of the work,
                  and it says so rather than passing as their record. */}
              {e.projected && (
                <div className="c-proj">
                  <div className="c-proj-label">Why this could fit</div>
                  <p>{e.projected}</p>
                </div>
              )}
              {/* No marketplace name and no outbound link here, on purpose.
                  Naming the source on the card that is doing the persuading
                  reframes the whole set as a list of profiles somebody could
                  have found themselves. The link is the dashboard's job, once
                  they have signed in and asked for the intro. */}
              {e.price && (
                <div className="c-foot">
                  <span className="price">{e.price}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

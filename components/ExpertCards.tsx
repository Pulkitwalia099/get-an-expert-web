'use client';

import { useState } from 'react';
import type { Expert } from '@/lib/types';
import { initials } from '@/lib/initials';

export default function ExpertCards({
  experts,
  selected,
  locked,
  onToggle,
}: {
  experts: Expert[];
  selected: string[];
  locked: boolean;
  onToggle: (id: string) => void;
}) {
  const [broken, setBroken] = useState<Record<string, boolean>>({});

  return (
    <div className="cards">
      {experts.map((e) => {
        const isSelected = selected.includes(e.id);
        return (
          <div
            key={e.id}
            className={`card${isSelected ? ' selected' : ''}${locked ? ' locked' : ''}`}
            role="button"
            aria-pressed={isSelected}
            tabIndex={locked ? -1 : 0}
            onClick={() => !locked && onToggle(e.id)}
            onKeyDown={(ev) => {
              if (!locked && (ev.key === 'Enter' || ev.key === ' ')) {
                ev.preventDefault();
                onToggle(e.id);
              }
            }}
          >
            {e.photo && !broken[e.id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="av"
                src={e.photo}
                alt=""
                onError={() => setBroken((b) => ({ ...b, [e.id]: true }))}
              />
            ) : (
              <div className="av avi">{initials(e.name)}</div>
            )}
            <div className="c-body">
              <div className="c-top">
                <span className="c-name">{e.name}</span>
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

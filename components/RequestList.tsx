'use client';

import { useState } from 'react';
import { initials } from '@/lib/initials';
// From lib/quote-status, never lib/quotes. That module is server-only and
// throws on sight of a browser, which is exactly what this import used to do.
import { STATUS_LABELS, STATUS_NOTES, type QuoteStatus } from '@/lib/quote-status';
import type { Expert } from '@/lib/types';

export interface DashRequest {
  id: string;
  status: QuoteStatus;
  createdAt: string;
  slots: number[];
  title: string;
  experts: Expert[];
}

// How long ago, in the roughest useful unit. Precision past "3 days ago" is
// noise on a page whose whole promise is measured in days.
function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function Person({ expert, asked }: { expert: Expert; asked: boolean }) {
  const [broken, setBroken] = useState(false);
  return (
    <li className={`dash-person${asked ? '' : ' dash-person-quiet'}`}>
      {expert.photo && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="dash-av" src={expert.photo} alt="" onError={() => setBroken(true)} />
      ) : (
        <span className="dash-av dash-avi">{initials(expert.name ?? '')}</span>
      )}
      <span className="dash-person-body">
        <span className="dash-person-top">
          <span className="dash-name">{expert.name}</span>
          {expert.country && (
            <span className="dash-loc">
              {expert.flag ? `${expert.flag} ` : ''}
              {expert.country}
            </span>
          )}
          {expert.rating != null && <span className="dash-rating">★ {expert.rating}</span>}
          {expert.price && <span className="dash-price">{expert.price}</span>}
        </span>
        <span className="dash-why">{expert.why}</span>
      </span>
      {/* The point of the dashboard: the way out to wherever this profile
          actually lives. noreferrer as well as noopener, so an outbound click
          does not tell a marketplace which page sent it. */}
      {expert.link && (
        <a className="dash-out" href={expert.link} target="_blank" rel="noopener noreferrer">
          {expert.source || 'Profile'} ↗
        </a>
      )}
    </li>
  );
}

function Request({ request }: { request: DashRequest }) {
  const [showRest, setShowRest] = useState(false);
  const asked = request.experts.filter((e) => request.slots.includes(e.slot));
  const rest = request.experts.filter((e) => !request.slots.includes(e.slot));

  return (
    <article className="dash-card">
      <header className="dash-card-top">
        <h2 className="dash-title">{request.title}</h2>
        <span className={`dash-pill dash-${request.status}`}>{STATUS_LABELS[request.status]}</span>
      </header>

      <p className="dash-note">
        {STATUS_NOTES[request.status]} <span className="dash-when">{ago(request.createdAt)}</span>
      </p>

      <ul className="dash-people">
        {asked.map((e) => (
          <Person key={e.slot} expert={e} asked />
        ))}
      </ul>

      {/* The ones from the same search they did not pick. Collapsed rather
          than dropped: the account owns the whole set, and somebody whose
          first four go quiet should not have to run the search again. */}
      {rest.length > 0 && (
        <>
          <button
            type="button"
            className="dash-more"
            onClick={() => setShowRest((v) => !v)}
            aria-expanded={showRest}
          >
            {showRest ? 'Hide' : `Show ${rest.length} more from this search`}
          </button>
          {showRest && (
            <ul className="dash-people">
              {rest.map((e) => (
                <Person key={e.slot} expert={e} asked={false} />
              ))}
            </ul>
          )}
        </>
      )}
    </article>
  );
}

export default function RequestList({ requests }: { requests: DashRequest[] }) {
  return (
    <div className="dash-list">
      {requests.map((r) => (
        <Request key={r.id} request={r} />
      ))}
    </div>
  );
}

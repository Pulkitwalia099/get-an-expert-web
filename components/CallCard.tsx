'use client';

import BookingEmbed from '@/components/BookingEmbed';
import CallStage from '@/components/CallStage';
import type { CalPrefill } from '@/lib/calLink';

// Three states, one card. The person shown is always the person who would
// answer, and the tag is always matched to what the visitor asked about.
// Nothing here decides anything: Chat owns the state machine, this file
// only renders it.

export interface OperatorCard {
  id: 'pulkit' | 'rohit';
  name: string;
  role: string;
  photo: string;
  location: string;
  linkedin: string;
  companies: { logo: string; label: string }[];
  rating: number;
  fixes: number;
  tag: string;
}

export type CallState = 'live' | 'ringing' | 'incall' | 'booking';

const LINKEDIN_PATH =
  'M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.22 8.1h4.56V23H.22V8.1zM8.34 8.1h4.37v2.03h.06c.61-1.15 2.1-2.37 4.32-2.37 4.62 0 5.47 3.04 5.47 6.99V23h-4.55v-7.2c0-1.72-.03-3.93-2.4-3.93-2.4 0-2.77 1.87-2.77 3.8V23H8.34V8.1z';

export default function CallCard({
  card,
  state,
  secondsLeft,
  prefill,
  roomUrl,
  onCall,
  onLeave,
  onRemoteJoined,
}: {
  card: OperatorCard;
  state: CallState;
  secondsLeft: number;
  prefill: CalPrefill;
  roomUrl: string | null;
  onCall: () => void;
  onLeave: () => void;
  onRemoteJoined: () => void;
}) {
  return (
    <div className="call-card">
      {(state === 'live' || state === 'incall') && (
        <div className="call-live">
          <i className="call-dot" />
          {state === 'incall' ? 'On the call' : 'Live right now'}
        </div>
      )}

      <div className="call-person">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="call-av" src={card.photo} alt="" width={50} height={50} />
        <div className="call-body">
          <div className="call-top">
            <span className="call-name">{card.name}</span>
            <a
              className="call-li"
              href={card.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${card.name} on LinkedIn`}
            >
              <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
                <path fill="currentColor" d={LINKEDIN_PATH} />
              </svg>
            </a>
            <span className="call-loc">{card.location}</span>
          </div>

          <div className="call-role">{card.role}</div>

          <div className="call-cos">
            {card.companies.map((c, i) => (
              <span className="call-co" key={c.label}>
                {i > 0 && <b className="call-sep">·</b>}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.logo} alt="" width={15} height={15} />
                {c.label}
              </span>
            ))}
          </div>

          <div className="call-bot">
            <span className="call-tag">{card.tag}</span>
            <span className="call-rate">
              <span className="call-star">★</span> {card.rating}
              <b className="call-sep">·</b>
              {card.fixes} fixes delivered
            </span>
          </div>
        </div>
      </div>

      {state === 'live' && (
        <div className="call-foot">
          <button className="call-cta" onClick={onCall}>
            Get connected now
          </button>
          <p className="call-sub">First call is free · audio only · about 15 min · no signup</p>
        </div>
      )}

      {state === 'ringing' && (
        <div className="call-foot">
          <button className="call-cta call-cta-ringing" disabled aria-live="polite">
            Ringing… {secondsLeft}s
            <i className="call-progress" aria-hidden="true" />
          </button>
          <p className="call-sub">You are in the room already. Stay here, they are joining.</p>
        </div>
      )}

      {/* Mounted from the moment it rings, not once someone answers. The
          visitor waits inside the room with their mic live, so whichever
          route the operator takes in, the two are already together. */}
      {(state === 'ringing' || state === 'incall') && roomUrl && (
        <CallStage roomUrl={roomUrl} onLeave={onLeave} onRemoteJoined={onRemoteJoined} />
      )}

      {state === 'booking' && (
        <div className="call-foot">
          <p className="call-sub">
            First call is free · about 15 min · they read your chat first
          </p>
          <BookingEmbed prefill={prefill} />
        </div>
      )}
    </div>
  );
}

'use client';

import ExpertCards from '@/components/ExpertCards';
import IntroForm from '@/components/IntroForm';
import type { Expert } from '@/lib/types';

function plural(n: number): string {
  return n === 1 ? 'person' : 'people';
}

// The main flow ending: the expert cards, the request control, the gate, the
// email form, then the offer of another search once a request is in. The
// parent renders this only in the phases below and owns every action.
export default function MatchStep({
  phase,
  experts,
  selected,
  introCount,
  locked,
  dashboard,
  onToggle,
  onRequest,
  onSignIn,
  onEmailInstead,
  onRefine,
  onSubmit,
  onMore,
}: {
  phase: 'matches' | 'gate' | 'email' | 'done';
  experts: Expert[];
  selected: string[];
  // How many experts the email form is requesting, or 0 for a custom need.
  introCount: number;
  /** True while the names in this set are still withheld. */
  locked: boolean;
  /** True once a request is in and the account has somewhere to read it. */
  dashboard: boolean;
  onToggle: (id: string) => void;
  onRequest: () => void;
  onSignIn: () => void;
  onEmailInstead: () => void;
  onRefine: () => void;
  onSubmit: (name: string, email: string) => Promise<boolean>;
  onMore: () => void;
}) {
  const count = selected.length;

  return (
    <>
      {experts.length > 0 && (
        <ExpertCards
          experts={experts}
          selected={selected}
          locked={phase !== 'matches'}
          onToggle={onToggle}
        />
      )}

      {/* Says what signing in buys, next to the thing it buys it for. Sitting
          under the cards rather than over them, because the cards are the
          offer and this is only the footnote to it. */}
      {phase === 'matches' && locked && (
        <div className="veil-note">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M4 6V4.2a3 3 0 0 1 6 0V6m-7 0h8v6H3V6Z"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>
            Names and profile links are hidden. Pick who you want, then sign in to see them.
          </span>
        </div>
      )}

      {phase === 'matches' && (
        <div className="match-action">
          <button className="cta" disabled={count === 0} onClick={onRequest}>
            {count === 0 ? 'Select who to hear from' : `Get quotes from ${count} ${plural(count)}`}
          </button>
          <button className="linkbtn" onClick={onRefine}>
            Not the right matches? Change my search
          </button>
        </div>
      )}

      {phase === 'gate' && (
        <div className="gate">
          <div className="gate-head">
            Sign in to see who they are and send your request to {count} {plural(count)}.
          </div>
          <ul className="gate-list">
            <li>Names, photos and links to their profiles</li>
            <li>Our agents contact each one and get you a price within 24 hours</li>
            <li>A dashboard that keeps this search and every quote that comes back</li>
          </ul>
          <button className="cta" onClick={onSignIn}>
            Continue with Google
          </button>
          <button className="linkbtn" onClick={onEmailInstead}>
            Rather not? Get the quotes by email instead
          </button>
        </div>
      )}

      {phase === 'email' && <IntroForm count={introCount} onSubmit={onSubmit} />}

      {phase === 'done' && (
        <div className="match-action">
          {dashboard && (
            <a className="cta" href="/dashboard">
              Open your dashboard
            </a>
          )}
          <button className="cta ghost-cta" onClick={onMore}>
            Search for someone else
          </button>
        </div>
      )}
    </>
  );
}

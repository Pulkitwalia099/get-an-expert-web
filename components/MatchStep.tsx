'use client';

import ExpertCards from '@/components/ExpertCards';
import IntroForm from '@/components/IntroForm';
import type { Expert } from '@/lib/types';

// The main flow ending: the expert cards, the request control, the email
// form, then the offer of another search once an intro is out. The parent
// renders this only in the three phases below and owns every action.
export default function MatchStep({
  phase,
  experts,
  selected,
  introCount,
  onToggle,
  onRequest,
  onRefine,
  onSubmit,
  onMore,
}: {
  phase: 'matches' | 'email' | 'done';
  experts: Expert[];
  selected: string[];
  // How many experts the email form is requesting, or 0 for a custom need.
  introCount: number;
  onToggle: (id: string) => void;
  onRequest: () => void;
  onRefine: () => void;
  onSubmit: (name: string, email: string) => Promise<boolean>;
  onMore: () => void;
}) {
  return (
    <>
      {experts.length > 0 && phase !== 'done' && (
        <ExpertCards
          experts={experts}
          selected={selected}
          locked={phase !== 'matches'}
          onToggle={onToggle}
        />
      )}

      {phase === 'matches' && (
        <div className="match-action">
          <button className="cta" disabled={selected.length === 0} onClick={onRequest}>
            {selected.length === 0
              ? 'Select who to meet'
              : `Request ${selected.length} intro${selected.length === 1 ? '' : 's'}`}
          </button>
          <button className="linkbtn" onClick={onRefine}>
            Not the right matches? Change my search
          </button>
        </div>
      )}

      {phase === 'email' && <IntroForm count={introCount} onSubmit={onSubmit} />}

      {phase === 'done' && (
        <div className="match-action">
          <button className="cta ghost-cta" onClick={onMore}>
            Get intros to other experts
          </button>
        </div>
      )}
    </>
  );
}

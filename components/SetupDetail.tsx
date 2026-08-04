'use client';

import Titlebar from '@/components/Titlebar';
import { SALE_ON, currentPrice, type Setup, type SetupCategory } from '@/lib/setups';
import { SIGNUP_CREDIT_CENTS, splitPrice } from '@/lib/credit-math';
import { useMe } from '@/components/useMe';
import st from './SetupDetail.module.css';

// One setup, opened over the homepage. It renders only the window: Overlay owns
// the layer, the scrim, Escape and the back button.
//
// Nothing from the source post appears here. The clip, the play count, the
// handle, the caption and the thumbnail all belong to the creator who made
// them, so the only things on this screen are ours: the name we gave the setup,
// what it costs, how long it takes, and what you end up with.
//
// The same labels the cards use. Kept local rather than imported, because the
// section that owns the grid keeps its own copy and neither is the other's
// source of truth.
const CATEGORY_LABELS: Record<SetupCategory, string> = {
  automation: 'Automation',
  growth: 'Growth',
  video: 'Video',
  other: 'Setup',
};

const Tick = () => (
  <svg viewBox="0 0 16 16" className={st.tick} aria-hidden="true">
    <path
      d="M3 8.5l3.2 3.2L13 5"
      stroke="currentColor"
      strokeWidth={2}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export interface SetupDetailProps {
  setup: Setup;
  // Both take the slug, so a caller that ignores it can pass a no-argument
  // handler and still typecheck. The reverse would not.
  onBook: (slug: string) => void;
  onAsk: (slug: string) => void;
  onClose: () => void;
}

export default function SetupDetail({ setup, onBook, onAsk, onClose }: SetupDetailProps) {
  const headingId = `setup-${setup.slug}-title`;
  // Null until /api/me answers, so the pill settles rather than promising free
  // and taking it back. Signed in it says nothing about credit, because what
  // this person owes depends on a balance this component cannot see.
  const me = useMe();
  const firstFree =
    Boolean(me?.available && !me.signedIn) &&
    splitPrice(currentPrice(setup) * 100, SIGNUP_CREDIT_CENTS).dueCents === 0;

  return (
    <section
      className="window window-overlay"
      data-cat={setup.category}
      aria-labelledby={headingId}
    >
      <Titlebar tag={null} onDismiss={onClose} />

      <div className={st.body}>
        <h2 id={headingId} className={st.title}>
          {setup.title}
        </h2>

        <p className={st.meta}>
          <span className={st.cat}>{CATEGORY_LABELS[setup.category]}</span>
          <span className={st.mins}>{setup.minutes} min</span>
        </p>

        {/* The screen between the card and the calendar, and the one that has
            room to say what the price actually means. "$0 today" only ever
            said the money is deferred; for a visitor without an account it is
            not deferred, it is gone, and that is worth the pill saying so. */}
        <p className={st.price}>
          {SALE_ON ? <s className={st.was}>${setup.price}</s> : null}
          <span className={st.now}>${currentPrice(setup)}</span>
          <span className={st.today}>{firstFree ? 'Free on your first' : '$0 today'}</span>
        </p>

        <h3 className={st.head}>What you end up with</h3>
        <ul className={st.list}>
          {setup.checklist.map((line) => (
            <li key={line} className={st.item}>
              <Tick />
              {line}
            </li>
          ))}
        </ul>

        {/* Picking a slot is the one thing on this screen that asks for
            something back, so the reason for it sits directly above the
            button rather than in a paragraph further up. */}
        <div className={st.why}>
          <h3 className={st.whyHead}>Why there is a time</h3>
          <p className={st.whyBody}>
            It runs on your laptop, so you have to be there. An agent does the work while you
            watch, and you keep it.
          </p>
        </div>
      </div>

      {/* Outside the scrolling body on purpose. The checklist can run long, and
          on a phone the two ways forward have to stay on screen the whole time
          rather than waiting at the bottom of a scroll. */}
      <div className={st.foot}>
        <button type="button" className={st.primary} onClick={() => onBook(setup.slug)}>
          <span className={st.primaryLabel}>Pick a time to get it set up</span>
          <span className={st.primarySub}>
            {firstFree
              ? `${setup.minutes} min, free on your first`
              : `${setup.minutes} min, nothing charged today`}
          </span>
        </button>
        <button type="button" className={st.secondary} onClick={() => onAsk(setup.slug)}>
          Ask a question first
        </button>
      </div>
    </section>
  );
}

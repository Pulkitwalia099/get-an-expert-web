'use client';

import { SALE_ON, currentPrice, playerUrl, type Setup } from '@/lib/setups';
import { useDialog } from './useDialog';
import sh from './sheets.module.css';

interface DetailSheetProps {
  setup: Setup;
  onClose: () => void;
  onBook: (slug: string) => void;
}

// The same shape as POINTS in Included: the copy is the same for every setup,
// so it lives next to the component rather than being threaded through props.
//
// 15 minutes is fixed rather than read from setup.minutes, which still holds
// the 60 and 90 the catalog was written with. The hero on this same page
// already promises a 15 minute call, so this now agrees with it. The booking
// sheet and the Cal notes still say 60 or 90.
const STEPS = [
  'Pick a 15 minute slot that suits you',
  'An agent joins the screen share and sets it up on your laptop',
  'You watch it happen, test, and then you pay',
];

const CheckGlyph = () => (
  <svg viewBox="0 0 16 16" className={sh.check} aria-hidden>
    <path
      d="M3 8.5l3.2 3.2L13 5"
      stroke="currentColor"
      strokeWidth={2}
      fill="none"
      strokeLinecap="round"
    />
  </svg>
);

// The sheet used to open on the video. Anyone who got here has already seen it
// on the card, so it was spending the whole first screen re-showing the one
// thing they had watched. What they have not seen is what the setup includes
// and what it costs, so that comes first now and the clip sits underneath for
// anyone who wants it again.
//
// It still went straight from a checklist to a calendar, which asked for a
// slot without ever saying what the slot was for. The steps below are that
// missing piece, kept to the fewest words that still carry it: who does it,
// where it happens, and when the money changes hands.
export default function DetailSheet({ setup, onClose, onBook }: DetailSheetProps) {
  const ref = useDialog<HTMLDivElement>(onClose);

  return (
    <div className={sh.overlay} onClick={onClose} role="presentation">
      <div
        ref={ref}
        tabIndex={-1}
        className={sh.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={setup.title}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky, so it is still reachable once the sheet has been scrolled. */}
        <button type="button" className={sh.x} onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className={sh.detailBody}>
          <h2>{setup.title}</h2>

          <h3 className={sh.listHead}>What&apos;s included</h3>
          <div className={sh.list}>
            {setup.checklist.map((line) => (
              <div key={line}>
                <CheckGlyph />
                {line}
              </div>
            ))}
          </div>

          <h3 className={sh.listHead}>How it gets installed</h3>
          <div className={sh.steps}>
            {STEPS.map((step, i) => (
              <div key={step}>
                <span className={sh.stepNum} aria-hidden>
                  {i + 1}
                </span>
                {step}
              </div>
            ))}
          </div>

          {/* Was "You pay after the setup is running on your laptop, not
              before." Step three now says that, and the two sat one on top of
              the other. What is left is the part the steps do not cover: how
              much leaves your account right now. */}
          <div className={sh.payNote}>$0 to pay today.</div>

          <div className={sh.detailFoot}>
            <div className={sh.bigPrice}>
              {SALE_ON ? <s>${setup.price}</s> : null} ${currentPrice(setup)}
            </div>
            {/* Was "Book a time", which named the mechanism. The steps above
                end on picking a slot, so the button finishes that sentence
                rather than starting a new one. */}
            <button type="button" className={sh.bigCta} onClick={() => onBook(setup.slug)}>
              Pick your slot
            </button>
          </div>

          <div className={sh.replay}>
            <div className={sh.embedCol}>
              <iframe
                className={sh.embed}
                src={playerUrl(setup.tiktokId)}
                title={`TikTok by ${setup.handle}`}
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

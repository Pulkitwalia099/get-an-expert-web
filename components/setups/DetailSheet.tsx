'use client';

import { SALE_ON, currentPrice, playerUrl, type Setup } from '@/lib/setups';
import { useDialog } from './useDialog';
import sh from './sheets.module.css';

interface DetailSheetProps {
  setup: Setup;
  onClose: () => void;
  onBook: (slug: string) => void;
}

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

          <div className={sh.payNote}>
            You pay after the setup is running on your laptop, not before.
          </div>

          <div className={sh.detailFoot}>
            <div className={sh.bigPrice}>
              {SALE_ON ? <s>${setup.price}</s> : null} ${currentPrice(setup)}
            </div>
            <button type="button" className={sh.bigCta} onClick={() => onBook(setup.slug)}>
              Book a time
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

'use client';

import { SALE_ON, currentPrice, playerUrl, type Setup } from '@/lib/setups';
import { useDialog } from './useDialog';
import sh from './sheets.module.css';

interface DetailSheetProps {
  setup: Setup;
  inCart: boolean;
  onClose: () => void;
  onAdd: (slug: string) => void;
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

export default function DetailSheet({ setup, inCart, onClose, onAdd, onBook }: DetailSheetProps) {
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
        <button type="button" className={sh.x} onClick={onClose} aria-label="Close">
          ✕
        </button>
        <div className={sh.embedCol}>
          {/* TikTok's official player: the real video, autoplaying muted. */}
          <iframe
            className={sh.embed}
            src={playerUrl(setup.tiktokId)}
            title={`TikTok by ${setup.handle}`}
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture"
          />
        </div>
        <div className={sh.detailBody}>
          <h2>{setup.title}</h2>
          <p className={sh.credit}>
            Video by <b>{setup.handle}</b> on TikTok · {setup.views} plays
          </p>
          <div className={sh.list}>
            {setup.checklist.map((line) => (
              <div key={line}>
                <CheckGlyph />
                {line}
              </div>
            ))}
          </div>
          <div className={sh.chips}>
            <span>{setup.minutes} min remote</span>
            <span>Any machine</span>
            <span>7 day guarantee</span>
          </div>
          <div className={sh.consultNote}>
            <b>First consultation is free.</b> 15 minutes on a video call to plan your install
            before you pay anything.
          </div>
          <div className={sh.detailFoot}>
            <div className={sh.bigPrice}>
              {SALE_ON ? <s>${setup.price}</s> : null} ${currentPrice(setup)}
            </div>
            <button type="button" className={sh.btnGhost} onClick={() => onAdd(setup.slug)}>
              {inCart ? 'In your cart' : 'Add to cart'}
            </button>
            <button type="button" className={sh.bigCta} onClick={() => onBook(setup.slug)}>
              Book this setup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

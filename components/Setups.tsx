'use client';

import { useState } from 'react';
import {
  ORDERED_SETUPS,
  SALE_ENDS_LABEL,
  SALE_ON,
  currentPrice,
  type SetupCategory,
} from '@/lib/setups';
import styles from '@/components/Sections.module.css';
import { type OverlayOrigin } from '@/components/Overlay';
import { track } from '@/lib/analytics';

// The proven work, above the broader examples list. Every field here is ours:
// the name we gave the setup, what it costs, how long it takes, and the first
// thing you end up with. Nothing from the source videos appears. The play
// counts in lib/setups.ts are plays on other people's posts, so printing them
// on our own page would read as our reach when it is not.
//
// Order and grouping both come from lib/setups.ts. ORDERED_SETUPS is already
// sorted by category rank, so a setup added there lands here in the right place
// without a second list to keep in step.
//
// Each card is a door. It used to be a read-only <li>, which is why nobody
// opened one: a row of prices with no control on it reads as a price list. The
// row is now a real button carrying a "Get this" pill, painted on rather than
// revealed on hover, because a phone has no hover to reveal it with.
// Worded to match the example filters in components/flows.ts exactly, so the
// site names a category one way rather than two. The keys are untouched: only
// what a visitor reads changes.
//
// 'other' is deliberately empty. Every card in this section is a setup, so a
// SETUP label carried no information and spent a fourth vocabulary saying
// nothing. An empty string renders no label at all.
const LABELS: Record<SetupCategory, string> = {
  automation: 'AI & automation',
  growth: 'Growth & GTM',
  video: 'Video & motion',
  other: '',
};

export interface SetupsProps {
  /** The parent owns what a tap does. `origin` is the centre of the pressed
   *  card in viewport coordinates, which the overlay grows out of. */
  onPick: (slug: string, origin: OverlayOrigin) => void;
}

// The centre of the pressed card, read at the moment of the tap rather than on
// mount: this list sits below a scrolling hero, so a rect cached earlier would
// point at wherever the card used to be.
function originOf(el: HTMLElement): OverlayOrigin {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function Arrow() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 6h7.1" />
      <path d="M6.3 3.2 9.5 6 6.3 8.8" />
    </svg>
  );
}

export default function Setups({ onPick }: SetupsProps) {
  // Which card is held down. Set on pointerdown so the card is already pressed
  // while the thumb is still on it, instead of confirming after release.
  const [pressed, setPressed] = useState<string | null>(null);
  const release = () => setPressed(null);

  return (
    <section className={styles.section} aria-labelledby="setups-title">
      <header className={styles.head}>
        <h2 id="setups-title" className={styles.title}>
          What people come for
        </h2>
        {/* The deadline is the point. Every card shows a struck price, and a
            struck price with no end on it reads as the original being made up. */}
        <p className={styles.sub}>
          Set up for you, start to finish, at a fixed price.
          {SALE_ON && ` Launch price, until ${SALE_ENDS_LABEL}.`}
        </p>
      </header>

      <ul className={styles.cards}>
        {ORDERED_SETUPS.map((setup) => {
          const price = currentPrice(setup);
          return (
            <li key={setup.slug} className={styles.cardItem} data-cat={setup.category}>
              <button
                type="button"
                className={styles.card}
                data-pressed={pressed === setup.slug ? 'true' : undefined}
                // Spelled out so the card does not announce as one run-on
                // string of title, outcome and price. The struck sale price
                // stays out of it: only what you pay is read.
                aria-label={`${setup.title}. ${setup.checklist[0]}. $${price}${SALE_ON ? ', launch price' : ''}. Get this.`}
                onPointerDown={() => setPressed(setup.slug)}
                onPointerUp={release}
                onPointerCancel={release}
                onPointerLeave={release}
                onBlur={release}
                onClick={(event) => {
                  release();
                  track('setup_opened', { slug: setup.slug, category: setup.category });
                  onPick(setup.slug, originOf(event.currentTarget));
                }}
              >
                {LABELS[setup.category] && (
                  <span className={styles.cardCat}>{LABELS[setup.category]}</span>
                )}
                <span className={styles.cardAsk}>{setup.title}</span>
                <span className={styles.cardOut}>{setup.checklist[0]}</span>
                {/* No duration here. A 90 minute session beside an $11 price
                    invites the reader to divide one by the other, and the
                    answer to that sum is not what is being sold. The length is
                    on the card's own page, where it is a fact about the
                    booking rather than a rate.

                    That slot now says what the number actually is. A struck
                    price on its own leaves the reader to guess whether $11 is
                    a discount, a deposit, or the real price. */}
                <span className={styles.cardMeta}>
                  <span className={styles.metaPrice}>
                    {SALE_ON && <s>${setup.price}</s>} ${price}
                  </span>
                  {SALE_ON && (
                    <>
                      <span className={styles.metaDot} aria-hidden="true" />
                      <span className={styles.metaSale}>Launch price</span>
                    </>
                  )}
                  <span className={styles.cardPill}>
                    Get this
                    <Arrow />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { CATEGORIES, type CategoryKey } from '@/components/flows';
import { EXAMPLES } from '@/lib/examples';
import styles from '@/components/Sections.module.css';
import { type OverlayOrigin } from '@/components/Overlay';
import { track } from '@/lib/analytics';

// How many cards a visitor gets before they ask for the rest. A phone should
// not be handed the whole list on arrival.
const BATCH = 8;

type Filter = CategoryKey | 'all';

const LABELS = new Map<CategoryKey, string>(CATEGORIES.map((c) => [c.key, c.label]));

// Where on screen the press happened, so the overlay grows out of the card the
// visitor actually touched instead of appearing from nowhere. The centre of the
// pressed element, in viewport coordinates.
function originOf(el: HTMLElement): OverlayOrigin {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export default function Examples({
  onPick,
}: {
  onPick: (ask: string, origin: OverlayOrigin) => void;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [shown, setShown] = useState(BATCH);
  // Which card is being held down, keyed the way the list is keyed. Written on
  // pointerdown, so the card goes down under the thumb instead of waiting for
  // the release. Cleared on cancel too, which is what a browser sends the
  // moment a touch turns into a scroll, so scrolling past leaves nothing lit.
  const [pressed, setPressed] = useState<string | null>(null);
  const release = () => setPressed(null);

  const list = useMemo(
    () => (filter === 'all' ? EXAMPLES : EXAMPLES.filter((e) => e.category === filter)),
    [filter],
  );

  // A new filter starts a new list, so it starts folded again. The event is
  // what tells us which kinds of work people actually scan for, which is the
  // demand signal the chip order upstairs is currently guessing at.
  function pick(next: Filter) {
    track('example_filtered', { category: next });
    setFilter(next);
    setShown(BATCH);
  }

  const visible = list.slice(0, shown);
  const hidden = list.length - visible.length;

  return (
    <section className={styles.section} aria-labelledby="examples-title">
      <header className={styles.head}>
        <h2 id="examples-title" className={styles.title}>
          What else we cover
        </h2>
        <p className={styles.sub}>
          Ask for anything here. Tap one to start there, or pick a category to narrow it
          down.
        </p>
      </header>

      <div className={styles.filters} role="group" aria-label="Filter examples by category">
        <button
          type="button"
          aria-pressed={filter === 'all'}
          className={filter === 'all' ? `${styles.filter} ${styles.filterOn}` : styles.filter}
          onClick={() => pick('all')}
        >
          All
        </button>
        {CATEGORIES.map((c) => {
          const on = filter === c.key;
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={on}
              data-cat={c.key}
              className={on ? `${styles.filter} ${styles.filterOn}` : styles.filter}
              onClick={() => pick(c.key)}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <ul className={styles.cards}>
        {visible.map((e) => {
          const key = `${e.category}:${e.ask}`;
          return (
            <li key={key} className={styles.cardItem} data-cat={e.category}>
              {/* The ask is both the thing you read and the thing that gets
                  sent, so the card is the control rather than holding one.
                  The arrow carries no label: thirty two of them each saying
                  "Get this" would shout, so the shape says it instead. */}
              <button
                type="button"
                className={`${styles.card} ${styles.cardRow}`}
                data-pressed={pressed === key ? 'true' : undefined}
                // Two sentences and a closing line, so the row does not
                // announce as one run-on string of ask and outcome.
                aria-label={`${e.ask}. ${e.outcome}. Start with this ask.`}
                onPointerDown={() => setPressed(key)}
                onPointerUp={release}
                onPointerCancel={release}
                onPointerLeave={release}
                onBlur={release}
                onClick={(ev) => {
                  release();
                  track('example_tapped', { category: e.category, ask: e.ask });
                  // Verbatim. This line was written in a customer's voice, so
                  // it is already the right thing to open the chat with.
                  onPick(e.ask, originOf(ev.currentTarget));
                }}
              >
                <span className={styles.cardBody}>
                  <span className={styles.cardCat}>{LABELS.get(e.category) ?? e.category}</span>
                  <span className={styles.cardAsk}>{e.ask}</span>
                  <span className={styles.cardOut}>{e.outcome}</span>
                </span>
                <span className={styles.cardGo}>
                  <svg
                    width="12"
                    height="12"
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
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {hidden > 0 && (
        <div className={styles.moreRow}>
          <button type="button" className={styles.more} onClick={() => {
              track('examples_expanded', { category: filter, revealed: hidden });
              setShown(list.length);
            }}>
            Show {hidden} more
          </button>
        </div>
      )}
    </section>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { CATEGORIES, type CategoryKey } from '@/components/flows';
import { EXAMPLES } from '@/lib/examples';
import styles from '@/components/Sections.module.css';
import { track } from '@/lib/analytics';

// How many cards a visitor gets before they ask for the rest. A phone should
// not be handed the whole list on arrival.
const BATCH = 8;

type Filter = CategoryKey | 'all';

const LABELS = new Map<CategoryKey, string>(CATEGORIES.map((c) => [c.key, c.label]));

export default function Examples() {
  const [filter, setFilter] = useState<Filter>('all');
  const [shown, setShown] = useState(BATCH);

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
          Ask for anything here. Pick a category to narrow it down.
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
        {visible.map((e) => (
          <li key={`${e.category}:${e.ask}`} className={styles.card} data-cat={e.category}>
            <span className={styles.cardCat}>{LABELS.get(e.category) ?? e.category}</span>
            <span className={styles.cardAsk}>{e.ask}</span>
            <span className={styles.cardOut}>{e.outcome}</span>
          </li>
        ))}
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

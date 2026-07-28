import { ORDERED_SETUPS, SALE_ON, currentPrice, type SetupCategory } from '@/lib/setups';
import styles from '@/components/Sections.module.css';

// The proven work, above the broader examples list. Every field here is ours:
// the name we gave the setup, what it costs, how long it takes, and the first
// thing you end up with. Nothing from the source videos appears. The play
// counts in lib/setups.ts are plays on other people's posts, so printing them
// on our own page would read as our reach when it is not.
//
// Order and grouping both come from lib/setups.ts. ORDERED_SETUPS is already
// sorted by category rank, so a setup added there lands here in the right place
// without a second list to keep in step.
const LABELS: Record<SetupCategory, string> = {
  automation: 'Automation',
  growth: 'Growth',
  video: 'Video',
  other: 'Setup',
};

export default function Setups() {
  return (
    <section className={styles.section} aria-labelledby="setups-title">
      <header className={styles.head}>
        <h2 id="setups-title" className={styles.title}>
          What people come for
        </h2>
        <p className={styles.sub}>Set up for you, start to finish, at a fixed price.</p>
      </header>

      <ul className={styles.cards}>
        {ORDERED_SETUPS.map((setup) => (
          <li key={setup.slug} className={styles.card} data-cat={setup.category}>
            <span className={styles.cardCat}>{LABELS[setup.category]}</span>
            <span className={styles.cardAsk}>{setup.title}</span>
            <span className={styles.cardOut}>{setup.checklist[0]}</span>
            <span className={styles.cardMeta}>
              <span className={styles.metaPrice}>
                {SALE_ON && <s>${setup.price}</s>} ${currentPrice(setup)}
              </span>
              <span className={styles.metaDot} aria-hidden="true" />
              <span>{setup.minutes} min</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

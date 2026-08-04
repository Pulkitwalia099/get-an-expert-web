import styles from '@/components/Sections.module.css';

// Who is behind the company, directly under who the experts are. Trust arrives
// in that order: a visitor asks who is doing the work first, and who is
// standing behind them second.
//
// Set in type, not logos, for two reasons. The page carries no logos anywhere
// else, so three institutional marks in a row would be the loudest thing on it
// and would read as borrowed credibility. And Harvard's trademarks are tightly
// controlled: describing the affiliation in words is normally fine, while
// reproducing the shield or a lab wordmark on a commercial site generally is
// not without written permission. Words cost nothing and carry no risk.
//
// Names have to be exact. "Rock Venture Catalyst" is the current name of the
// Harvard Business School programme, renamed from Rock Summer Fellows. Getting
// an institution's own programme name wrong is worse than not claiming it.
const BACKERS = [
  {
    name: 'Harvard Innovation Labs',
    body: 'Where the company started.',
  },
  {
    name: 'Rock Venture Catalyst',
    body: 'Funded by the programme at Harvard Business School.',
  },
  {
    name: 'Founders Inc',
    body: 'Built from their incubator in San Francisco.',
  },
];

export default function Backing() {
  return (
    <section className={styles.section} aria-labelledby="backing-title">
      <header className={styles.head}>
        <h2 id="backing-title" className={styles.title}>
          Where we come from
        </h2>
      </header>
      <ul className={styles.backers}>
        {BACKERS.map((b) => (
          <li key={b.name} className={styles.backer}>
            <span className={styles.backerName}>{b.name}</span>
            <span className={styles.backerBody}>{b.body}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

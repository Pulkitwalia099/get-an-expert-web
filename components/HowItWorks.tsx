import styles from '@/components/Sections.module.css';

// Four steps under the hero chat. A visitor who only sees a row of chips has
// no idea what happens after they type, so this is the shape of the whole
// thing: ask, match, quote, work. It is a real sequence, so it is numbered.
const STEPS = [
  {
    num: '01',
    title: 'Say what you need',
    body: 'One sentence in the chat. No forms, no signup.',
  },
  {
    num: '02',
    title: 'We find the person',
    body: 'Vetted, and has done this exact job before.',
  },
  {
    num: '03',
    title: 'You see a name and a price',
    body: 'By email, before any work starts.',
  },
  {
    num: '04',
    title: 'They do the work',
    // "After it is delivered" is the strongest line on this page and it was
    // missing. It answers the money question before it is asked, and it is
    // simply how the business runs, so it costs nothing to say.
    body: 'You pay the expert directly, after it is delivered.',
  },
];

export default function HowItWorks() {
  return (
    <section className={styles.section} aria-labelledby="how-it-works-title">
      <header className={styles.head}>
        <h2 id="how-it-works-title" className={styles.title}>
          How it works
        </h2>
      </header>
      <ol className={styles.steps}>
        {STEPS.map((s) => (
          <li key={s.num} className={styles.step}>
            <span className={styles.stepNum} aria-hidden="true">
              {s.num}
            </span>
            <span className={styles.stepTitle}>{s.title}</span>
            <span className={styles.stepBody}>{s.body}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

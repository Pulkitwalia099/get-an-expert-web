import styles from '@/components/Sections.module.css';

// Four steps under the hero chat. A visitor who only sees a row of chips has
// no idea what happens after they type, so this is the shape of the whole
// thing: ask, match, quote, work. It is a real sequence, so it is numbered.
const STEPS = [
  {
    num: '01',
    title: 'Say what you need',
    // "No signup" came out when the site started offering an account. The
    // sentence sat one screen under a control asking people to sign in, and no
    // button wins an argument with the page's own copy. The promise that
    // mattered is still here: nothing to fill in before you can ask. Signing
    // in stays optional and buys you credit, which is a different offer.
    body: 'One sentence in the chat. No forms to fill in.',
  },
  {
    num: '02',
    // "Expert", not "person". It is the product's own word, step 04 below
    // already uses it, and the founder video directly under this section says
    // the same sentence.
    title: 'We find the expert',
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

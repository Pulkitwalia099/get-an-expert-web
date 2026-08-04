import styles from '@/components/Sections.module.css';

// Sits between the examples and the closing ask, because it answers an
// objection rather than making the offer. Someone who has read this far has
// stopped asking what we do and started asking who they are about to let near
// their work, and that is the only question left before the CTA.
//
// Deliberately not the access story. Nothing on this page gives anyone access
// to anything: the ask here is one sentence and an email address. Sandboxing,
// scopes and revoking belong on /stuck and at the MCP install, where the
// visitor has already accepted that someone will touch their code. Security
// copy on a page with no security risk reads as a confession.
//
// Every line is a real step in the offline vetting process. Nothing here is
// aspirational, and nothing claims a check we do not run. In particular this
// says "identity", never "background check", which means a specific regulated
// thing we do not do.
const CHECKS = [
  {
    title: 'We meet every expert',
    body: 'A video call before they take any work. We confirm who they are and that the accounts they list are actually theirs.',
  },
  {
    title: 'We test the work',
    body: 'A skills interview, plus real samples from jobs they have already delivered.',
  },
  {
    title: 'Everyone signs an NDA',
    body: 'A confidentiality agreement, signed before the first job, covering every client they work with.',
  },
];

export default function Trust() {
  return (
    <section className={styles.section} aria-labelledby="trust-title">
      <header className={styles.head}>
        <h2 id="trust-title" className={styles.title}>
          Before anyone starts
        </h2>
        <p className={styles.sub}>Every expert goes through this before they take a single job.</p>
      </header>
      {/* Not numbered. HowItWorks is numbered because it is a sequence you move
          through; these are three things that are all already true when you
          arrive, so numbering them would invent an order that is not there. */}
      <ul className={styles.checks}>
        {CHECKS.map((c) => (
          <li key={c.title} className={styles.check}>
            <span className={styles.checkTitle}>{c.title}</span>
            <span className={styles.checkBody}>{c.body}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

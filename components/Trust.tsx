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
// Every line is a real step in the vetting process. Bodies are deliberately
// one short clause each, the same rhythm as HowItWorks, because four claims
// about people are read at a glance or not at all.
//
// This says "identity", never "background check". A background check is a
// specific regulated product from a licensed vendor, and we do not run one.
const CHECKS = [
  {
    title: 'A real person, named',
    body: 'From our own roster, never an anonymous bidder.',
  },
  {
    title: 'We meet every expert',
    body: 'A video call, and we check their accounts are really theirs.',
  },
  {
    title: 'We test the work',
    body: 'A skills interview and samples from real jobs.',
  },
  {
    title: 'Everyone signs an NDA',
    body: 'Signed before they take their first job.',
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
          through; these are four things that are all already true when you
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

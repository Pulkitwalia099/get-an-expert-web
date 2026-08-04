import type { ReactNode } from 'react';
import styles from '@/components/Sections.module.css';

// What this section is: the vetting process, stated as the three things we
// actually do. Not a claim about what our experts are like.
//
// It used to open with "A real person, named", which was cut. It asserted a
// quality rather than naming a step, and a visitor has no way to check it, so
// it read as a boast sitting in front of three verifiable facts and made them
// look like boasts too. Everything here is now something we do: a call, a
// test, a signature. Do not add lines of the first kind back.
//
// Deliberately not the access story. Nothing on this page gives anyone access
// to anything: the ask here is one sentence and an email address. Sandboxing,
// scopes and revoking belong on /stuck and at the MCP install, where the
// visitor has already accepted that someone will touch their code. Security
// copy on a page with no security risk reads as a confession.
//
// This says "identity", never "background check". A background check is a
// specific regulated product from a licensed vendor, and we do not run one.

// Drawn here rather than imported from components/setups/icons.tsx, which
// serves the reel cards and has no reason to know about vetting. Same
// construction though: 24 wide, stroked in currentColor, so the two sets look
// like one hand.
const ICONS: Record<string, ReactNode> = {
  // A camera, for the video call.
  call: (
    <>
      <rect x="2.5" y="6.5" width="12" height="11" rx="2.5" />
      <path d="M14.5 10.5l6-3.2v9.4l-6-3.2z" />
    </>
  ),
  // A clipboard with a tick, for the work sample. Deliberately not a page with
  // a tick: at 18px that silhouette is the same as the NDA page beneath it, and
  // two icons that read as one shape are worse than no icons at all. The clip
  // at the top is the whole point of this drawing.
  test: (
    <>
      <path d="M9 4.5H6.5A1.5 1.5 0 0 0 5 6v14.5A1.5 1.5 0 0 0 6.5 22h11a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H15" />
      <rect x="9" y="2.5" width="6" height="4" rx="1.2" />
      <path d="M8.8 14.2l2.2 2.2 4.4-4.4" />
    </>
  ),
  // A page with a signature line, for the NDA.
  nda: (
    <>
      <path d="M6 2.5h8.5L19 7v14.5H6z" />
      <path d="M14 2.5V7h5" />
      <path d="M9 16.8c1.4-3.4 2.3-3.4 2.9-1.5.5 1.6 1.2 1.9 2 .6.6-1 1.3-.9 2.1.3" />
    </>
  ),
};

// Every line is a step in the vetting process, in the order it happens.
// Bodies are one short clause each, the same rhythm as HowItWorks, because
// claims about people are read at a glance or not at all.
const CHECKS = [
  {
    icon: 'call',
    title: 'We meet every expert',
    body: 'A video call, and we check their accounts are really theirs.',
  },
  {
    icon: 'test',
    title: 'We test the work',
    body: 'A skills interview and samples from real jobs.',
  },
  {
    icon: 'nda',
    title: 'Everyone signs an NDA',
    body: 'Signed before their first job, covering anything you share with them.',
  },
];

export default function Trust() {
  return (
    <section className={styles.section} aria-labelledby="trust-title">
      <header className={styles.head}>
        <h2 id="trust-title" className={styles.title}>
          How we vet every expert
        </h2>
        <p className={styles.sub}>Three steps, and nobody takes a job until all three are done.</p>
      </header>
      {/* Not numbered, because the icons already carry the distinction and a
          number next to an icon is two markers doing one job. */}
      <ul className={styles.checks}>
        {CHECKS.map((c) => (
          <li key={c.title} className={styles.check}>
            <svg
              className={styles.checkIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {ICONS[c.icon]}
            </svg>
            <span className={styles.checkTitle}>{c.title}</span>
            <span className={styles.checkBody}>{c.body}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

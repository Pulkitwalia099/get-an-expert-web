import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy · midsesh',
  description: 'What midsesh records, and what it does not.',
};

export default function Privacy() {
  return (
    <main className="legal">
      <Link href="/" className="legal-back">
        Back to midsesh
      </Link>
      <h1>Privacy</h1>
      <p className="lead">
        Short version: we measure how the site is used so we can make it better. We do not record
        what you type, and we do not sell anything.
      </p>

      <h2>What we record</h2>
      <p>
        We use PostHog, an analytics tool, to count visits and see where people get stuck. It tells
        us things like which page you landed on, where you came from, and which step you reached in
        the chat. This helps us fix the parts that are not working.
      </p>

      <h2>What we do not record</h2>
      <p>
        The words you type in the chat, and any email you leave, are never captured by the analytics
        tool. Session recordings are masked, so they show the layout and clicks but not the text on
        screen. Your conversation content stays between you and the intro we set up.
      </p>

      <h2>Your email</h2>
      <p>
        If you ask for an intro, we use your email only to send you that intro and any follow-up
        about it. We do not sell it or add you to unrelated lists.
      </p>

      <h2>Questions</h2>
      <p>
        Email us at{' '}
        <a href="mailto:midsesh.social@gmail.com">midsesh.social@gmail.com</a> and we will sort it
        out.
      </p>
    </main>
  );
}

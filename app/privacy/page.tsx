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
        Short version: we read the chats so we can make them better, we keep your email and your
        name out of that, and we do not sell anything.
      </p>

      <h2>What we record</h2>
      <p>
        We use PostHog, an analytics tool, to count visits and see where people get stuck. It tells
        us things like which page you landed on, where you came from, and which step you reached in
        the chat.
      </p>
      <p>
        It also records the chat itself, including what you write to us and what we write back, as
        part of a replay of your visit. We read these to find the questions that confuse people and
        the moments they give up. A drop-off only tells us something if we can see what was said
        before it.
      </p>

      <h2>What we do not record</h2>
      <p>
        Your email address and your name are left out of those recordings. Those fields are blocked
        at the moment of recording, so what you type into them never reaches the analytics tool at
        all. We do not sell any of it, and we do not hand your conversation to anyone beyond the
        expert you asked us to introduce you to.
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

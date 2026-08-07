'use client';

import { track } from '@/lib/analytics';
import { CONTACT_EMAIL } from '@/lib/contact';

// A mailto, deliberately. A contact form is another thing to build, host and
// monitor, and it puts a step between someone with a question and an answer.
// The click is tracked because a visitor who writes in instead of typing in the
// chat is a signal about what the chat failed to answer.
export default function ContactLink() {
  return (
    <a
      className="contact-link"
      href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Question about midsesh')}`}
      onClick={() => track('contact_clicked', { from: 'sitebar' })}
    >
      Contact
    </a>
  );
}

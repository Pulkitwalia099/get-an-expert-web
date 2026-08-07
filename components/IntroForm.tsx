'use client';

import { useState } from 'react';
import { isValidEmail } from '@/lib/email';
import { NO_CAPTURE } from '@/lib/replay';

// The main-flow email step. Collects an optional name and an email, states
// plainly that intros come by email, and sets expectations before the
// visitor commits. Owns nothing but its inputs; the parent submits.
export default function IntroForm({
  count,
  onSubmit,
}: {
  // How many experts were picked, or 0 for a custom request.
  count: number;
  onSubmit: (name: string, email: string) => Promise<boolean>;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [sending, setSending] = useState(false);

  async function submit() {
    const value = email.trim();
    if (!isValidEmail(value)) {
      setInvalid(true);
      window.setTimeout(() => setInvalid(false), 500);
      return;
    }
    setSending(true);
    const ok = await onSubmit(name.trim(), value);
    setSending(false);
    if (!ok) setEmail(value);
  }

  return (
    <div className="intro-form">
      <div className="intro-fields">
        <input
          className={`intro-input ${NO_CAPTURE}`}
          type="text"
          autoComplete="name"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Your name, optional"
        />
        <div className={`intro-email${invalid ? ' invalid' : ''}`}>
          <input
            className={NO_CAPTURE}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit();
            }}
            aria-label="Your email"
          />
          <button className="go" disabled={sending} onClick={() => void submit()}>
            {sending ? 'Sending…' : count > 0 ? `Get ${count} quote${count === 1 ? '' : 's'}` : 'Send request'}
          </button>
        </div>
      </div>
      <div className="intro-note">
        Our agents contact {count > 0 ? 'the people you picked' : 'the right experts'} with your
        requirements and ask what they would charge. Every price we get back lands in your inbox
        within 24 hours.
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { isValidEmail } from '@/lib/email';

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
          className="intro-input"
          type="text"
          autoComplete="name"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Your name, optional"
        />
        <div className={`intro-email${invalid ? ' invalid' : ''}`}>
          <input
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
            {sending ? 'Sending…' : count > 0 ? `Request ${count} intro${count === 1 ? '' : 's'}` : 'Send request'}
          </button>
        </div>
      </div>
      <div className="intro-note">
        We reach out to {count > 0 ? 'these experts' : 'the right experts'} with your requirements.
        The ones who can take it on, we introduce you to one to one, over email. Usually within a
        day.
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { track } from '@/lib/analytics';
import styles from '@/components/ExpertSignup.module.css';
import type { Flow } from '@/components/flows';
import { isValidEmail } from '@/lib/email';
import { NO_CAPTURE } from '@/lib/replay';

// The intros route trims longer text anyway; stopping here keeps the request
// small and the field honest about how much it wants.
const MAX_NEED_CHARS = 600;

// The freelancer branch. Someone who wants work rather than help gets a short
// application in the same thread instead of a dead end. Owns its API call;
// the parent only reacts to the outcome.
export default function ExpertSignup({
  flow,
  sessionId,
  onSent,
  onFailed,
}: {
  flow: Flow;
  sessionId: string;
  onSent: (email: string) => void;
  onFailed: () => void;
}) {
  const [email, setEmail] = useState('');
  const [need, setNeed] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [sending, setSending] = useState(false);

  async function submit() {
    const address = email.trim();
    const lines = need.trim();
    if (!isValidEmail(address) || lines.length === 0) {
      setInvalid(true);
      window.setTimeout(() => setInvalid(false), 500);
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/intros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'expert',
          email: address,
          need: lines.slice(0, MAX_NEED_CHARS),
          sessionId,
          flow,
        }),
      });
      if (!res.ok) throw new Error(`intros ${res.status}`);
      track('expert_signup_submitted', { flow });
      onSent(address);
    } catch {
      onFailed();
    }
    setSending(false);
  }

  return (
    <div className={styles.card}>
      <div className={styles.title}>Tell us where to reach you</div>
      <div className={`${styles.field}${invalid ? ` ${styles.invalid}` : ''}`}>
        <input
          className={NO_CAPTURE}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Your email"
        />
      </div>
      <textarea
        className={`${styles.lines}${invalid ? ` ${styles.invalid}` : ''}`}
        rows={3}
        maxLength={MAX_NEED_CHARS}
        placeholder="What you do, and who you usually do it for. One or two lines."
        value={need}
        onChange={(e) => setNeed(e.target.value)}
        aria-label="What you do"
      />
      <button
        type="button"
        className={styles.go}
        disabled={sending}
        onClick={() => void submit()}
      >
        {sending ? 'Sending…' : 'Send it'}
      </button>
      <div className={styles.note}>
        If there is a fit, you hear from us by email.
      </div>
    </div>
  );
}

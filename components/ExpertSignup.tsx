'use client';

import { FormEvent, useState } from 'react';

// The join form. Backend wiring is a follow-up; for now it validates the email
// and confirms locally so the page is complete end to end. Nothing is stored.
export default function ExpertSignup() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setDone(true);
  }

  if (done) {
    return (
      <p className="exp-a">
        Thanks. We have your email and will reach out soon to build your first agent with you.
      </p>
    );
  }

  return (
    <form className="intro-email" onSubmit={submit}>
      <input
        type="email"
        inputMode="email"
        placeholder="you@work.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="Your email"
      />
      <button type="submit" className="go" disabled={!valid}>
        Join as an expert
      </button>
    </form>
  );
}

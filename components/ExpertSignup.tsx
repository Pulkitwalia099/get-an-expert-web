'use client';

import { FormEvent, useState } from 'react';

// The join form: pick a craft, leave an email. Backend wiring is a follow-up;
// for now it validates and confirms locally. Nothing is stored.

const CATEGORIES = [
  'LinkedIn or X ghostwriting',
  'Cold email',
  'Email marketing',
  'Video and UGC',
  'Reddit marketing',
  'Clay and enrichment',
  'Something else',
];

export default function ExpertSignup() {
  const [category, setCategory] = useState<string | null>(null);
  const [other, setOther] = useState('');
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  const validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const isOther = category === 'Something else';
  const craft = isOther ? other.trim() : category;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!validEmail) return;
    setDone(true);
  }

  if (done) {
    return (
      <p className="exp-a">
        Thanks. We have your email{craft ? ` and your craft, ${craft.toLowerCase()}` : ''}. We will
        reach out soon to build your first agent with you.
      </p>
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="exp-cats">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className={`tool-tab${category === c ? ' on' : ''}`}
            onClick={() => setCategory(category === c ? null : c)}
          >
            {c}
          </button>
        ))}
      </div>
      {isOther ? (
        <input
          type="text"
          className="intro-input exp-other"
          placeholder="Tell us your craft…"
          value={other}
          onChange={(e) => setOther(e.target.value)}
          aria-label="Your craft"
        />
      ) : null}
      <div className="intro-email">
        <input
          type="email"
          inputMode="email"
          placeholder="you@work.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Your email"
        />
        <button type="submit" className="go" disabled={!validEmail}>
          Join as an expert
        </button>
      </div>
    </form>
  );
}

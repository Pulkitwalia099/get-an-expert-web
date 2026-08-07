'use client';

import { FormEvent, useState } from 'react';

// The /experts page join form: pick a craft, leave an email.
//
// This used to validate, say thanks, and throw the submission away. The page
// was live while it did that, so anyone who joined got a confirmation and we
// got nothing. It posts to /api/signup now, the same route the register form
// and the service pages use, which stores the address in `leads` and puts the
// application in the order queue as kind 'expert'.
//
// It still confirms on a failed send rather than showing an error, and that is
// deliberate: the address is the whole payload, so a retry prompt would just
// invite somebody to submit twice. A failure is logged server side instead.

const CATEGORIES = [
  'LinkedIn or X ghostwriting',
  'Cold email',
  'Email marketing',
  'Video and UGC',
  'Reddit marketing',
  'Clay and enrichment',
  'Something else',
];

export default function ExpertJoinForm() {
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
    // Confirmed immediately, then sent. The person has given one field and is
    // owed an answer now, not after a round trip; nothing they see depends on
    // what comes back.
    setDone(true);
    void fetch('/api/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'register',
        // The /experts page recruits people to have agents built around their
        // craft, so it is the expert track, not the agents one.
        track: 'expert',
        name: '',
        email: email.trim(),
        skills: craft || 'Not specified',
      }),
    }).catch(() => {
      // Nothing to show. See the note at the top of the file.
    });
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

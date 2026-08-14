'use client';

import { useState } from 'react';

// The two doors, side by side, with neither presented as the lesser one.
//
// A "sign in with Google, or click here for other options" layout tells
// everybody without a Google account that they are an afterthought, and the
// address on a marketplace order is very often a work address. So both are
// offered flat.

type State = 'idle' | 'sending' | 'sent' | 'error';

// `minutes` is passed in rather than imported. The constant lives in
// lib/emailAuth, which is server-only and throws on sight of a browser, and
// this is a client component. Same split as the status labels.
export default function SignInDoors({
  google,
  email: emailDoor,
  minutes,
}: {
  google: boolean;
  email: boolean;
  minutes: number;
}) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    setError('');
    try {
      const res = await fetch('/api/auth/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setState('sent');
        return;
      }
      const parsed: unknown = await res.json().catch(() => null);
      // A 4xx is about what they typed and is worth repeating back. A 5xx is
      // about us, and "Internal Server Error" tells nobody anything they can act on.
      const message =
        res.status < 500 && typeof parsed === 'object' && parsed !== null
          ? (parsed as { error?: unknown }).error
          : null;
      setError(typeof message === 'string' ? message : 'That did not send. Try again.');
      setState('error');
    } catch {
      setError('That did not send. Check your connection and try again.');
      setState('error');
    }
  }

  // Deliberately final and deliberately vague about whether the address is
  // known to us. It says what happens next without confirming who is a customer.
  if (state === 'sent') {
    return (
      <div className="door-sent" role="status">
        <p className="door-sent-h">Check your email</p>
        <p>
          If <strong>{email}</strong> has an order with us, a sign in link is on its way. It
          expires in {minutes} minutes.
        </p>
      </div>
    );
  }

  return (
    <div className="doors">
      {google && (
        <a className="door-btn door-google" href="/api/auth/google">
          Continue with Google
        </a>
      )}

      {/* The divider belongs to the pair, not to either door. Rendering it
          whenever Google is on left an "or" with nothing after it on a
          deployment with no email key. */}
      {google && emailDoor && <p className="door-or">or</p>}

      {emailDoor && (
      <form className="door-form" onSubmit={submit}>
        <label className="door-label" htmlFor="signin-email">
          Use the email you ordered with
        </label>
        <div className="door-row">
          <input
            id="signin-email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={state === 'sending'}
          />
          <button className="door-btn" type="submit" disabled={state === 'sending' || !email}>
            {state === 'sending' ? 'Sending' : 'Email me a link'}
          </button>
        </div>
        <p className="door-note">
          No password. We send a link that signs you in, good for {minutes} minutes.
        </p>
        {error && (
          <p className="door-error" role="alert">
            {error}
          </p>
        )}
      </form>
      )}
    </div>
  );
}

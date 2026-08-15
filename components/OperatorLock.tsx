'use client';

import { useState } from 'react';

// The password form.
//
// Moved out of app/operator/orders/page.tsx unchanged, when that page went
// past the 400 line rule. It holds its own field now rather than reaching into
// the page's state, because nothing else on that page ever wanted it: the
// address bar path calls signIn directly.

export default function OperatorLock({
  error,
  onSignIn,
}: {
  error: string;
  onSignIn: (secret: string) => void;
}) {
  const [secret, setSecret] = useState('');

  return (
    <main className="opq">
      <h1>Orders</h1>
      <form
        className="opq-lock"
        onSubmit={(e) => {
          e.preventDefault();
          onSignIn(secret.trim());
        }}
      >
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Admin password"
          autoFocus
        />
        <button className="opq-btn opq-solid" type="submit">
          Open
        </button>
      </form>
      {error && <p className="opq-error">{error}</p>}
    </main>
  );
}

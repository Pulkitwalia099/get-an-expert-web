'use client';

import { useState } from 'react';

// Deleting the account, and the sentences that have to be read before it can
// happen.
//
// Its own file because the copy is the feature here. What goes, what stays,
// why it stays, and the one consequence nobody would guess are the whole
// safeguard: a confirmation nobody can act on is a confirmation that gets
// clicked through.
//
// Two gates, both deliberate. A <details> disclosure, so the control is never
// one tap away from a page load, and a typed word, so it is never one tap at
// all.

const CONFIRM = 'DELETE';

export default function DeleteAccount({
  orderCount,
  creditLabel,
}: {
  /** Null when the order list could not be read, so the copy stays vague. */
  orderCount: number | null;
  /** Null when the balance is unknown. Then the credit line is not printed. */
  creditLabel: string | null;
}) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orders =
    orderCount === null
      ? 'Your orders stay.'
      : orderCount === 1
        ? 'Your 1 order stays.'
        : `Your ${orderCount} orders stay.`;

  async function erase() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: CONFIRM }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? 'That did not work. Try again in a moment.');
        setBusy(false);
        return;
      }
      // The account is gone, so there is nothing on this page left to render.
      // A full navigation rather than a router push, because every cache the
      // browser holds about a signed in person should go with it.
      window.location.href = '/';
    } catch {
      setError('That did not work. Check your connection and try again.');
      setBusy(false);
    }
  }

  return (
    <details className="acct-danger">
      <summary>Delete my data</summary>

      <p className="acct-danger-lede">This cannot be undone. Read what it does first.</p>

      <p className="acct-danger-h">What goes</p>
      <ul className="acct-danger-list">
        <li>Your account, and this page with it.</li>
        <li>Your credit balance and everything in its history.</li>
        <li>Your saved searches and the people we found in them.</li>
        <li>Every request for quotes you have made.</li>
      </ul>

      <p className="acct-danger-h">What stays, and why</p>
      <p>
        {orders} We have to keep a record of work we did and were paid for. Your email address and
        your name come off those rows, so they stop naming you.
      </p>
      <p>
        Any order still in progress cannot be delivered to you afterwards, because we will no
        longer have an address to send it to.
      </p>
      {creditLabel && (
        <p>
          Your <strong>{creditLabel}</strong> in credit goes with the account and cannot be given
          back.
        </p>
      )}

      <label className="acct-field">
        <span className="oa-label">Type {CONFIRM} to confirm</span>
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          disabled={busy}
        />
      </label>

      {error && (
        <p className="oa-error" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        className="oa-btn acct-danger-btn"
        onClick={erase}
        disabled={typed !== CONFIRM || busy}
      >
        {busy ? 'Deleting' : 'Delete my data'}
      </button>
    </details>
  );
}

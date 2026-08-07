'use client';

import { useState } from 'react';
import { track } from '@/lib/analytics';
import { useMe } from '@/components/useMe';

// Sign in, or who you are signed in as, in the site bar.
//
// Renders nothing at all until /api/me answers. A "Sign in" that appears and
// then swaps to an email a moment later is worse than a bar that fills in
// slightly late, because the first one moves the thing you were reaching for.
//
// It also renders nothing when sign in is unconfigured, so a deployment
// without Google credentials shows no dead button.

export default function AccountLink() {
  const me = useMe();
  const [open, setOpen] = useState(false);

  if (!me || !me.available) return null;

  // This used to read "First setup free", naming the outcome rather than the
  // mechanism. That was the right call while the setups catalog was the
  // product being sold from this bar. The marketplace is the front door now,
  // and the sentence advertises a different product to everyone who lands on
  // it, which is worse than plain. So: the mechanism, deliberately.
  if (!me.signedIn) {
    return (
      <a
        className="account-cta"
        href="/api/auth/google"
        onClick={() => track('signin_started', { source: 'sitebar' })}
      >
        Sign in
      </a>
    );
  }

  const label = me.name?.split(' ')[0] || me.email?.split('@')[0] || 'Account';

  return (
    <span className="account-wrap">
      <button
        type="button"
        className="account-link"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {/* The balance is the reason to look up here, so it is the part that
            reads first. An unknown balance says so rather than showing $0,
            which would read as credit that has been spent. */}
        {me.creditKnown ? me.credit : label}
      </button>
      {open && (
        <span className="account-menu" role="status">
          <span className="account-who">{me.email}</span>
          {me.creditKnown ? (
            <span className="account-credit">{me.credit} in credit</span>
          ) : (
            <span className="account-credit">Credit unavailable right now</span>
          )}
          {/* First action in the menu, above signing out. Somebody who opens
              this is far more often checking on a request than leaving. */}
          <a className="account-dash" href="/dashboard">
            Your requests
          </a>
          <button
            type="button"
            className="account-out"
            onClick={() => {
              fetch('/api/auth/signout', { method: 'POST' })
                .then(() => window.location.reload())
                .catch(() => {});
            }}
          >
            Sign out
          </button>
        </span>
      )}
    </span>
  );
}

'use client';

import { useState } from 'react';
import { track } from '@/lib/analytics';
import { useMe } from '@/components/useMe';
import { SIGNUP_CREDIT_CENTS, coversEveryPrice, formatCents } from '@/lib/credit-math';
import { MAIN_SETUPS } from '@/lib/setups';

// Whether every setup in the catalog is covered by the welcome credit. Read
// once at module scope: the catalog is static, so this is a constant that
// happens to be computed rather than something to work out per render.
const FIRST_FREE = coversEveryPrice(MAIN_SETUPS.map((s) => s.price));

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

  // Signed out, this is an offer rather than a chore. "Sign in" describes
  // paperwork and reads as one more nav link beside Contact and Privacy.
  //
  // It names the outcome, not the mechanism. "Get $75 credit" makes a person
  // do arithmetic against a price they have not seen yet; "First setup free"
  // is a thing they can act on. The claim is checked against the catalog
  // rather than typed, so a price rise or a smaller grant changes the words
  // instead of quietly making them a lie.
  if (!me.signedIn) {
    return (
      <a
        className="account-cta"
        href="/api/auth/google"
        onClick={() => track('signin_started', { source: 'sitebar' })}
      >
        {FIRST_FREE ? 'First setup free' : `Get ${formatCents(SIGNUP_CREDIT_CENTS)} credit`}
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

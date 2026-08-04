'use client';

import { useEffect, useState } from 'react';
import { track } from '@/lib/analytics';

// Sign in, or who you are signed in as, in the site bar.
//
// Renders nothing at all until /api/me answers. A "Sign in" that appears and
// then swaps to an email a moment later is worse than a bar that fills in
// slightly late, because the first one moves the thing you were reaching for.
//
// It also renders nothing when sign in is unconfigured, so a deployment
// without Google credentials shows no dead button.

interface Me {
  signedIn: boolean;
  available: boolean;
  email?: string;
  name?: string | null;
  credit?: string;
  creditKnown?: boolean;
}

export default function AccountLink() {
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let live = true;
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Me | null) => {
        if (live && data) setMe(data);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (!me || !me.available) return null;

  // Signed out, this is an offer rather than a chore. "Sign in" describes
  // paperwork and reads as one more nav link beside Contact and Privacy;
  // nobody wants an account, they want the fifty dollars. The pill is tinted
  // rather than filled because the site bar must not out-shout the search bar
  // under it, which is the whole reason Contact is not a button either.
  if (!me.signedIn) {
    return (
      <a
        className="account-cta"
        href="/api/auth/google"
        onClick={() => track('signin_started', { source: 'sitebar' })}
      >
        Get $50 credit
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

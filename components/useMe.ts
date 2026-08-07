'use client';

import { useEffect, useState } from 'react';

// Who the browser is, fetched once per page load and shared.
//
// Two places want this now: the control in the site bar, and the setup cards,
// which only offer the welcome credit to somebody who does not have an account
// yet. Two components calling /api/me independently would ask twice for one
// answer, so the promise is memoised at module scope and every caller awaits
// the same one.

export interface Me {
  signedIn: boolean;
  /** False when Google credentials are unset, so nothing renders at all. */
  available: boolean;
  email?: string;
  name?: string | null;
  credit?: string;
  creditKnown?: boolean;
}

let pending: Promise<Me | null> | null = null;

function load(): Promise<Me | null> {
  // Cached rather than refetched. Nothing on the page changes who you are
  // without a navigation, and signing out reloads.
  pending ??= fetch('/api/me')
    .then((r) => (r.ok ? (r.json() as Promise<Me>) : null))
    .catch(() => null);
  return pending;
}

/**
 * Null until the answer arrives, which callers should render as nothing rather
 * than as a guess. A control that says "Sign in" and then swaps to an email is
 * worse than one that fills in slightly late, because the first one moves the
 * thing you were reaching for.
 */
export function useMe(): Me | null {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let live = true;
    load().then((data) => {
      if (live && data) setMe(data);
    });
    return () => {
      live = false;
    };
  }, []);

  return me;
}

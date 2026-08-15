// What a sign in that did not work says, in one place.
//
// Two pages render these, /signin and /orders, and both are landed on by
// callbacks that pick the key. Written out twice they drifted immediately: the
// same `expired` value was telling one visitor their link was used and another
// that their link had expired, when on the Google door no link exists at all.
//
// Plain strings and no dependencies, so a client component could render them
// too. Anything not listed here renders nothing rather than a shrug.

export type SigninFlash = 'expired' | 'stale' | 'failed' | 'unavailable' | 'elsewhere';

const MESSAGES: Record<SigninFlash, string> = {
  // Not a failure at all. Somebody pressed "sign out everywhere" in their
  // settings and this is the page they land on, so it says what happened
  // rather than leaving them at an unexplained sign in screen.
  elsewhere: 'You signed out everywhere. Sign in again to carry on.',
  // The email door. A token that is past its half hour, or was tampered with.
  expired: 'That link has expired. Ask for a new one below.',
  // The Google door, where there is no link: the state cookie did not survive,
  // usually because the consent screen sat open past its five minutes.
  stale: 'That sign in took too long to finish. Start it again.',
  failed: 'That sign in did not complete. Try again.',
  unavailable: 'Sign in is not available right now. Try again shortly.',
};

/** The sentence for a `?signin=` value, or null when there is nothing to say. */
export function flashFor(value: string | undefined): string | null {
  if (!value) return null;
  return MESSAGES[value as SigninFlash] ?? null;
}

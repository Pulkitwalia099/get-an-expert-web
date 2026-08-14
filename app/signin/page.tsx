import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Mark from '@/components/Mark';
import SignInDoors from '@/components/SignInDoors';
import { inter } from '@/app/fonts';
import { SESSION_COOKIE, authConfigured, safeNext } from '@/lib/auth';
import { currentAccount } from '@/lib/accounts';
import { CONTACT_EMAIL } from '@/lib/contact';
import { hasEmailKey } from '@/lib/email';
import { EMAIL_TOKEN_MAX_AGE, emailAuthConfigured } from '@/lib/emailAuth';
import { flashFor } from '@/lib/signinFlash';

// One door in, for a site that had none.
//
// Both doors already existed on /orders, which is a page you reach only if you
// already knew it was there. Every Sign in control on the site pointed straight
// at Google instead, so somebody without a Google account met a Google screen
// and stopped. This is the same component /orders renders, on an address that
// can be linked to.
//
// It also gives a failed sign in somewhere to land. The Google callback used to
// send failures to `/`, which is rewritten to the marketplace, a different app
// that cannot say what went wrong.

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign in · midsesh',
  description: 'Sign in with Google, or with the email you ordered with.',
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ signin?: string; next?: string }>;
}) {
  const params = await searchParams;
  // Checked before it is rendered into an href, not only when it is spent.
  // Every consumer downstream checks it again.
  const next = safeNext(params.next) ?? undefined;

  // Somebody already signed in does not need this page. They asked to go
  // somewhere, so take them there rather than showing them a door they are
  // already through.
  //
  // currentAccount, not readSession, and this is the call site most likely to
  // be missed. A cookie revoked by "sign out everywhere" is rejected by
  // /dashboard and /orders, which redirect here. Left on the plain read, this
  // page would see a valid signature and redirect straight back, and the two
  // would bounce forever with no way for the person to sign in again.
  const store = await cookies();
  if (await currentAccount(store.get(SESSION_COOKIE)?.value)) redirect(next ?? '/dashboard');

  // Both halves have to be true for the email door to work at all: a secret to
  // sign the link with, and a key to send it through.
  const emailDoor = emailAuthConfigured() && hasEmailKey();
  const googleDoor = authConfigured();
  const flash = flashFor(params.signin);

  return (
    <main className={`ord ${inter.className}`}>
      <div className="paper" aria-hidden="true" />
      <header className="ord-bar">
        <Mark />
      </header>
      <h1>Sign in</h1>
      {/* Above the lede, not below it. The flash is in the markup at first
          paint, so a live region never announces it; being read first is what
          actually gets it heard, and it often contradicts the invitation. */}
      {flash && (
        <p className="ord-flash" role="status">
          {flash}
        </p>
      )}
      {/* The lede describes the doors that are actually rendered. With neither
          configured it would otherwise invite people to use two things that
          are not on the page. */}
      {(googleDoor || emailDoor) && (
        <p className="ord-lede">
          {googleDoor && emailDoor
            ? 'Use Google, or the email you ordered with. Either one gets you to your orders.'
            : googleDoor
              ? 'Sign in with Google and your orders are here, with their status.'
              : 'Sign in with the email you ordered with and your orders are here, with their status.'}
        </p>
      )}
      <SignInDoors
        google={googleDoor}
        email={emailDoor}
        minutes={EMAIL_TOKEN_MAX_AGE / 60}
        next={next}
      />
      {!emailDoor && (
        <p className="ord-note">
          {googleDoor
            ? 'Email sign in is turned off here. Use Google, or write to '
            : 'Sign in is not available here. Write to '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will send your order
          straight to you.
        </p>
      )}
    </main>
  );
}

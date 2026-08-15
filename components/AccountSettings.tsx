'use client';

import { useState } from 'react';
import DeleteAccount from '@/components/DeleteAccount';
// From lib/account-name, never lib/accounts. That module is server-only and
// throws on sight of a browser, the same split lib/credit-math.ts has against
// lib/credits.ts.
import { MAX_NAME } from '@/lib/account-name';

// Four settings, and there are four on purpose.
//
// There is no notification preference, because every email this product sends
// is transactional: your sample is ready, your quotes are in, here is the link
// that signs you in. A switch that turns those off breaks the order it belongs
// to, and a switch that says it turns them off and does not is worse.

type Saving = 'idle' | 'saving' | 'saved';

export default function AccountSettings({
  email,
  name,
  orderCount,
  creditLabel,
}: {
  email: string;
  name: string | null;
  orderCount: number | null;
  creditLabel: string | null;
}) {
  const [value, setValue] = useState(name ?? '');
  const [saved, setSaved] = useState(name ?? '');
  const [state, setState] = useState<Saving>('idle');
  const [error, setError] = useState<string | null>(null);
  // Signing out every device is two presses, not a browser confirm dialog: a
  // confirm() is dismissed by reflex and cannot say what the button does.
  const [confirmAll, setConfirmAll] = useState(false);
  const [allBusy, setAllBusy] = useState(false);

  const dirty = value.trim() !== saved.trim();

  async function saveName() {
    setState('saving');
    setError(null);
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: value }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; name?: string | null };
      if (!res.ok) {
        // The server's own sentence, not a generic one. It knows whether this
        // was a rate limit, a signed out session or a write that did not land.
        setError(body.error ?? 'That did not save. Try again.');
        setState('idle');
        return;
      }
      const stored = body.name ?? '';
      setValue(stored);
      setSaved(stored);
      setState('saved');
    } catch {
      setError('That did not save. Check your connection and try again.');
      setState('idle');
    }
  }

  async function signOutEverywhere() {
    setAllBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/account/sessions', { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? 'That did not work. Try again in a moment.');
        setAllBusy(false);
        setConfirmAll(false);
        return;
      }
      window.location.href = '/signin?signin=elsewhere';
    } catch {
      setError('That did not work. Check your connection and try again.');
      setAllBusy(false);
      setConfirmAll(false);
    }
  }

  return (
    <section className="acct-settings">
      <h2 className="acct-h2">Settings</h2>

      <div className="acct-block">
        <h3 className="acct-h3">Your name</h3>
        <p className="acct-sub">We use your first name when we email you about an order.</p>
        <label className="acct-field">
          <span className="oa-label">Name</span>
          <input
            type="text"
            value={value}
            maxLength={MAX_NAME}
            onChange={(e) => {
              setValue(e.target.value);
              setState('idle');
            }}
            autoComplete="name"
            disabled={state === 'saving'}
          />
        </label>
        <div className="acct-row-actions">
          <button
            type="button"
            className="oa-btn oa-solid"
            onClick={saveName}
            disabled={!dirty || state === 'saving'}
          >
            {state === 'saving' ? 'Saving' : 'Save'}
          </button>
          {state === 'saved' && !dirty && (
            <span className="acct-note" role="status">
              Saved
            </span>
          )}
        </div>
      </div>

      <div className="acct-block">
        <h3 className="acct-h3">Your email</h3>
        {/* Static text, not a disabled input. Nothing here should look like it
            is one click from being editable. */}
        <p className="acct-value">{email}</p>
        <p className="acct-sub">
          Orders are matched on this address. If you ordered with a different one, that order shows
          up when you sign in with that address, not this one. Write to us if you need two
          addresses joined up.
        </p>
      </div>

      <div className="acct-block">
        <h3 className="acct-h3">Signing out</h3>
        <p className="acct-sub">
          Signing out here ends this browser. Signing out everywhere ends every browser and phone
          you are signed in on, which is the one to use if you lost a device.
        </p>
        <div className="acct-row-actions">
          {/* A form, not a fetch. The route is POST only, so no prefetch can
              sign anybody out, and it works with no JavaScript. */}
          <form action="/api/auth/signout" method="post">
            <button className="oa-btn oa-solid" type="submit">
              Sign out
            </button>
          </form>
          <button
            type="button"
            className="oa-btn"
            onClick={() => (confirmAll ? signOutEverywhere() : setConfirmAll(true))}
            disabled={allBusy}
          >
            {allBusy
              ? 'Signing out'
              : confirmAll
                ? 'Yes, sign out everywhere'
                : 'Sign out everywhere'}
          </button>
        </div>
      </div>

      {error && (
        <p className="oa-error" role="alert">
          {error}
        </p>
      )}

      <div className="acct-block">
        <h3 className="acct-h3">Deleting your data</h3>
        <DeleteAccount orderCount={orderCount} creditLabel={creditLabel} />
      </div>
    </section>
  );
}

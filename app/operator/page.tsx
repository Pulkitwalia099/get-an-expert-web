'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';

// Both switches on one screen, because both people share a device.
//
// Sign in once and a session cookie carries it for ninety days, so this page
// is a bookmark rather than a link with a credential in it. A ?secret= in
// the address still works and signs you in on arrival, which makes the old
// link a one time setup step.
//
// This page also rings. It polls for a ringing call every five seconds so
// whoever has it open hears the call even if Telegram is muted.

type Presence = { pulkit: boolean; rohit: boolean };
type Ringing = { callId: string; roomUrl: string };
type Screen = 'checking' | 'locked' | 'ready';

const NAMES: Record<keyof Presence, string> = { pulkit: 'Pulkit', rohit: 'Rohit' };
const POLL_MS = 5_000;

export default function OperatorPage() {
  const [screen, setScreen] = useState<Screen>('checking');
  const [presence, setPresence] = useState<Presence | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ringing, setRinging] = useState<Ringing | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Reads the presence map using whatever session the browser already has.
  const load = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/operator');
      if (!res.ok) return false;
      const data = (await res.json()) as { presence: Presence };
      setPresence(data.presence);
      return true;
    } catch {
      setError('Could not reach the switches.');
      return false;
    }
  }, []);

  const signIn = useCallback(
    async (secret: string): Promise<boolean> => {
      const res = await fetch('/api/operator/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      }).catch(() => null);
      if (!res?.ok) return false;
      return load();
    },
    [load],
  );

  // On arrival: use a ?secret= if one is there, otherwise try the cookie.
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      // Read the raw query rather than URLSearchParams.get, which follows
      // the form encoding rule that a plus sign means a space. A base64
      // secret can contain one and would arrive silently mangled.
      const raw = window.location.search.slice(1).split('&').find((p) => p.startsWith('secret='));
      let fromUrl = '';
      if (raw) {
        try {
          fromUrl = decodeURIComponent(raw.slice('secret='.length));
        } catch {
          fromUrl = '';
        }
      }

      if (fromUrl) {
        // Out of the address bar before anything else touches it.
        const params = new URLSearchParams(window.location.search);
        params.delete('secret');
        const rest = params.toString();
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}${rest ? `?${rest}` : ''}`,
        );
        const ok = await signIn(fromUrl);
        if (!cancelled) setScreen(ok ? 'ready' : 'locked');
        return;
      }

      const ok = await load();
      if (!cancelled) setScreen(ok ? 'ready' : 'locked');
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [load, signIn]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const secret = password.trim();
    if (!secret || busy) return;
    setBusy(true);
    setError('');
    const ok = await signIn(secret);
    setBusy(false);
    if (ok) {
      setPassword('');
      setScreen('ready');
    } else {
      setError('That is not the right secret.');
    }
  }

  async function toggle(id: keyof Presence, online: boolean) {
    // Optimistic, because the switch is the whole point of the page and a
    // round trip makes it feel broken. Reconciled from the response.
    setPresence((prev) => (prev ? { ...prev, [id]: online } : prev));
    try {
      const res = await fetch('/api/operator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorId: id, online }),
      });
      if (!res.ok) {
        setError('Could not change that.');
        void load();
        return;
      }
      setError('');
      setPresence((await res.json()).presence as Presence);
    } catch {
      setError('Could not change that.');
      void load();
    }
  }

  async function signOut() {
    await fetch('/api/operator/login', { method: 'DELETE' }).catch(() => null);
    setPresence(null);
    setScreen('locked');
  }

  // Poll for a ring. Five seconds catches a 60 second ring with room to
  // spare, and costs nothing.
  useEffect(() => {
    if (screen !== 'ready') return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch('/api/operator/ringing');
        if (!res.ok) return;
        const data = (await res.json()) as { call: Ringing | null };
        setRinging(data.call);
        // Autoplay stays blocked until the page has been tapped once. A
        // refused ring is not worth an error: the button is still there.
        if (data.call) void audioRef.current?.play().catch(() => {});
      } catch {
        // A dropped poll is not worth reporting. The next one is 5s away.
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [screen]);

  async function answer() {
    if (!ringing) return;
    try {
      await fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'answer', callId: ringing.callId }),
      });
    } catch {
      setError('Could not pick that up.');
      return;
    }
    window.open(ringing.roomUrl, '_blank', 'noopener,noreferrer');
    setRinging(null);
  }

  if (screen === 'checking') {
    return <main className="op-page" />;
  }

  if (screen === 'locked') {
    return (
      <main className="op-page">
        <h1>Who is on</h1>
        <form className="op-login" onSubmit={onSubmit}>
          <input
            type="password"
            className="op-input"
            placeholder="Operator secret"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
          />
          <button className="op-answer" type="submit" disabled={busy || !password.trim()}>
            {busy ? 'Checking…' : 'Sign in'}
          </button>
        </form>
        {error && <p className="op-error">{error}</p>}
        <p className="op-note">Signing in once keeps you signed in for 90 days on this device.</p>
      </main>
    );
  }

  return (
    <main className="op-page">
      <h1>Who is on</h1>
      {error && <p className="op-error">{error}</p>}

      {presence &&
        (Object.keys(NAMES) as (keyof Presence)[]).map((id) => (
          <button
            key={id}
            className={`op-switch${presence[id] ? ' on' : ''}`}
            onClick={() => void toggle(id, !presence[id])}
            aria-pressed={presence[id]}
          >
            <span>{NAMES[id]}</span>
            <span>{presence[id] ? 'On, 4 hours' : 'Off'}</span>
          </button>
        ))}

      {ringing && (
        <button className="op-answer" onClick={() => void answer()}>
          Answer the call
        </button>
      )}

      <button className="op-signout" onClick={() => void signOut()}>
        Sign out
      </button>

      <audio ref={audioRef} src="/team/ring.mp3" preload="auto" />
    </main>
  );
}

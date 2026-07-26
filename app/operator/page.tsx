'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Both switches on one screen, because both people share a device. The
// secret comes from the query string: /operator?secret=…
//
// This page also rings. It polls for a ringing call every five seconds so
// whoever has it open hears the call even if Telegram is muted.

type Presence = { pulkit: boolean; rohit: boolean };

type Ringing = { callId: string; roomUrl: string };

const NAMES: Record<keyof Presence, string> = { pulkit: 'Pulkit', rohit: 'Rohit' };

const POLL_MS = 5_000;

export default function OperatorPage() {
  const [secret, setSecret] = useState('');
  const [presence, setPresence] = useState<Presence | null>(null);
  const [error, setError] = useState('');
  const [ringing, setRinging] = useState<Ringing | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Read on the client only. The first render has no secret either way, so
  // the instruction below is what a bare /operator shows and there is
  // nothing to mismatch on hydration.
  useEffect(() => {
    setSecret(new URLSearchParams(window.location.search).get('secret') ?? '');
  }, []);

  const load = useCallback(async () => {
    if (!secret) return;
    try {
      const res = await fetch(`/api/operator?secret=${encodeURIComponent(secret)}`);
      if (!res.ok) {
        setError('That link is not valid.');
        return;
      }
      const data = (await res.json()) as { presence: Presence };
      setError('');
      setPresence(data.presence);
    } catch {
      setError('Could not reach the switches.');
    }
  }, [secret]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(id: keyof Presence, online: boolean) {
    try {
      const res = await fetch('/api/operator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, operatorId: id, online }),
      });
      if (!res.ok) {
        setError('Could not change that.');
        return;
      }
      const data = (await res.json()) as { presence: Presence };
      setError('');
      setPresence(data.presence);
    } catch {
      setError('Could not change that.');
    }
  }

  // Poll for a ring. Five seconds is fast enough to catch a 60 second ring
  // with plenty of room, and slow enough to be free.
  useEffect(() => {
    if (!secret) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/operator/ringing?secret=${encodeURIComponent(secret)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { call: Ringing | null };
        setRinging(data.call);
        // Autoplay is blocked until the page has been tapped once. A
        // refused ring is not worth an error: the button is still there.
        if (data.call) void audioRef.current?.play().catch(() => {});
      } catch {
        // A dropped poll is not worth telling anyone about. The next one
        // is five seconds away.
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [secret]);

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
    window.open(ringing.roomUrl, '_blank', 'noopener');
    setRinging(null);
  }

  if (!secret) return <main className="op-page">Add ?secret= to the address.</main>;

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

      <audio ref={audioRef} src="/team/ring.mp3" preload="auto" />
    </main>
  );
}

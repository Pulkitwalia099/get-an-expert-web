'use client';

import { useState } from 'react';
import { track } from '@/lib/analytics';
import { NO_CAPTURE } from '@/lib/replay';
import s from './setups.module.css';

type AskStatus = 'idle' | 'sending' | 'done' | 'error';

// "Seen a setup we're missing?" form, shared by the grid card and the
// Request a setup sheet in the nav.
export default function AskForm() {
  const [link, setLink] = useState('');
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState<AskStatus>('idle');

  // The server parses this with the URL constructor, which throws on anything
  // without a scheme. Share sheets hand over a full https link; an address bar
  // copy or a typed handle does not, and those were being turned away.
  function normalize(value: string): string {
    const trimmed = value.trim();
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }

  async function send() {
    if (status === 'sending' || link.trim().length === 0) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'reel', link: normalize(link), contact }),
      });
      const body = (await res.json()) as { ok?: boolean };
      setStatus(body.ok ? 'done' : 'error');
      // Whether they left a way to reply, never what they left. The address is
      // already stored properly on the server and has no business here.
      if (body.ok) track('setup_requested', { has_contact: contact.trim().length > 0 });
    } catch {
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div className={s.askInner}>
        <div className={s.askPlus}>✓</div>
        <h3>Got it</h3>
        <p>We scope it and reply within a day.</p>
      </div>
    );
  }

  return (
    <div className={s.askInner}>
      <div className={s.askPlus}>＋</div>
      <h3>Seen a setup we&apos;re missing?</h3>
      <p>Drop the link. We scope it and price it within a day.</p>
      <input
        className={s.miniField}
        type="url"
        inputMode="url"
        placeholder="Paste the reel link"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        aria-label="Reel link"
      />
      <input
        className={`${s.miniField} ${NO_CAPTURE}`}
        type="text"
        placeholder="Email or social, optional"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        aria-label="Email or social handle, optional"
      />
      <button type="button" className={s.cta} onClick={send} disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Send it'}
      </button>
      {status === 'error' ? (
        <p className={s.askError}>That does not look like a link. Paste the full address.</p>
      ) : null}
    </div>
  );
}

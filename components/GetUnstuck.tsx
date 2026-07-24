'use client';

import { useState } from 'react';
import { track } from '@/lib/analytics';
import { FLOWS, INSTALL_TARGETS, type Flow } from '@/components/flows';
import { isValidEmail } from '@/lib/email';
import type { Brief } from '@/lib/types';

// The /stuck ending: bring the expert into the coding session via the MCP
// package (command depends on the tool), or fall back to an email intro.
// Owns its API calls; the parent only reacts to the outcome.
export default function GetUnstuck({
  flow,
  brief,
  sessionId,
  onEmailSent,
  onEmailFailed,
}: {
  flow: Flow;
  brief: Brief | null;
  sessionId: string;
  onEmailSent: (email: string) => void;
  onEmailFailed: () => void;
}) {
  const teaserIntro = FLOWS[flow].teaserIntro;
  const [target, setTarget] = useState(INSTALL_TARGETS[0]);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [sending, setSending] = useState(false);

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(target.code);
    } catch {
      // Clipboard can be unavailable; the command stays visible to copy by hand.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
    track('install_clicked', { flow, tool: target.key });
    // The conversion the npm package exists for.
    void fetch('/api/intros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'install', flow, tool: target.key, brief, sessionId }),
    }).catch(() => {});
  }

  async function sendIntroEmail() {
    const value = email.trim();
    if (!isValidEmail(value)) {
      setInvalid(true);
      window.setTimeout(() => setInvalid(false), 500);
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/intros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'intros', flow, email: value, selected: [], brief, sessionId }),
      });
      if (!res.ok) throw new Error(`intros ${res.status}`);
      track('dev_email_submitted', { flow });
      onEmailSent(value);
    } catch {
      onEmailFailed();
    }
    setSending(false);
  }

  return (
    <div className="opts">
      {/* The one-line intro is legible; only the identity (face and name) */}
      {/* stays hidden until the visitor connects. */}
      {teaserIntro && (
        <div className="teaser">
          <div className="teaser-av" aria-hidden="true" />
          <div className="teaser-lines">
            <div className="teaser-name" aria-hidden="true" />
            <div className="teaser-intro">{teaserIntro}</div>
          </div>
          <span className="teaser-tag">Match found</span>
        </div>
      )}

      <div className="opt primary">
        <div className="opt-top">
          <span className="opt-title">Bring them into your session</span>
          <span className="badge">Fastest</span>
        </div>
        <div className="opt-sub">
          One line adds the expert to your AI coding tool as an MCP server. Scoped, consent-based
          access; you approve everything they touch.
        </div>

        <div className="tool-pick" role="tablist" aria-label="Your tool">
          {INSTALL_TARGETS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={t.key === target.key}
              className={`tool-tab${t.key === target.key ? ' on' : ''}`}
              onClick={() => {
                setTarget(t);
                setCopied(false);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={`term${target.kind === 'json' ? ' json' : ''}`}>
          {target.kind === 'command' && <span className="prompt">$</span>}
          <code>{target.code}</code>
          <button className="copy" onClick={() => void copyCommand()}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="term-note">
          {target.note} Then ask for <span className="ok">"an expert"</span>. They join in about 2
          minutes.
        </div>
      </div>

      <div className="divider">or</div>

      <div className="opt">
        <div className="opt-top">
          <span className="opt-title">Get an intro by email</span>
        </div>
        <div className="opt-sub">
          We send you the expert and an exact price. No install, replies within the hour.
        </div>
        <div className={`mini-field${invalid ? ' invalid' : ''}`}>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void sendIntroEmail();
            }}
            aria-label="Email for the intro"
          />
          <button className="go" disabled={sending} onClick={() => void sendIntroEmail()}>
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

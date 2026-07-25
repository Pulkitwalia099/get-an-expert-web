'use client';

import { useState } from 'react';
import { track } from '@/lib/analytics';
import { FLOWS, INSTALL_TARGETS, type Flow } from '@/components/flows';
import { isValidEmail } from '@/lib/email';
import type { Brief, MatchConfidence, PrimaryPath } from '@/lib/types';

// Spelled out rather than derived, so the marker never renders a bare word.
const CONFIDENCE_LABEL: Record<Exclude<MatchConfidence, ''>, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
};

// The /stuck ending: bring the expert into the coding session with a one-line
// addition to the visitor's coding tool, or fall back to an email intro.
// Both routes always render. primaryPath only decides which one leads.
// Owns its API calls; the parent only reacts to the outcome.
export default function GetUnstuck({
  flow,
  brief,
  sessionId,
  matchIntro,
  matchConfidence,
  primaryPath,
  onEmailSent,
  onEmailFailed,
}: {
  flow: Flow;
  brief: Brief | null;
  sessionId: string;
  matchIntro: string;
  matchConfidence: MatchConfidence;
  primaryPath: PrimaryPath;
  onEmailSent: (email: string) => void;
  onEmailFailed: () => void;
}) {
  // The model writes the teaser per visitor. The flow copy is the fallback for
  // the flows and the scripted demo replies that never produce one.
  const teaserIntro = matchIntro || FLOWS[flow].teaserIntro;
  const sessionLeads = primaryPath === 'session';
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
    // Copy intent: the visitor took the install command for their coding tool.
    // Renamed from install_clicked, which never fired in production, so there is
    // no history to keep continuous. The command string is recorded so the event
    // still reads correctly after the install copy changes.
    track('mcp_install_copied', { flow, tool: target.key, command: target.code });
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

  // Both options are built up front and only ordered below, so demoting one
  // never removes it. All the state they read lives in this component, so the
  // swap moves markup, not focus or typed input.
  const sessionOption = (
    <div key="session" className={`opt${sessionLeads ? ' primary' : ''}`}>
      <div className="opt-top">
        <span className="opt-title">Bring them into your session</span>
        {sessionLeads && <span className="badge">Fastest</span>}
      </div>
      {!sessionLeads && (
        <div className="opt-sub opt-note">faster if you use Claude Code or Codex</div>
      )}
      <div className="opt-sub">
        One line connects the expert to your AI coding tool. Scoped, consent-based access; you
        approve everything they touch.
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
  );

  const emailOption = (
    <div key="email" className={`opt${sessionLeads ? '' : ' primary'}`}>
      <div className="opt-top">
        <span className="opt-title">Get an intro by email</span>
        {!sessionLeads && <span className="badge">Recommended</span>}
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
  );

  return (
    <div className="opts">
      {/* The one-line intro is legible; only the identity (face and name) */}
      {/* stays hidden until the visitor connects. */}
      {teaserIntro && (
        <div className="teaser">
          <div className="teaser-av" aria-hidden="true" />
          <div className="teaser-lines">
            <div className="teaser-name" aria-hidden="true" />
            <div className="teaser-intro">
              {teaserIntro}
              {matchConfidence && (
                <span className="teaser-conf"> · {CONFIDENCE_LABEL[matchConfidence]}</span>
              )}
            </div>
          </div>
          <span className="teaser-tag">Match found</span>
        </div>
      )}

      {sessionLeads ? sessionOption : emailOption}

      <div className="divider">or</div>

      {sessionLeads ? emailOption : sessionOption}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { track } from '@/lib/analytics';
import { FLOWS, type Flow } from '@/components/flows';
import type { Phase } from '@/components/phases';
import type { Msg } from '@/components/Thread';
import type { Brief, Expert } from '@/lib/types';

const MIN_SEARCH_MS = 4_200;

function firstNames(names: string[]): string {
  const f = names.map((n) => n.split(' ')[0]).filter(Boolean);
  if (f.length === 0) return 'They';
  if (f.length === 1) return f[0];
  return `${f.slice(0, -1).join(', ')} and ${f[f.length - 1]}`;
}

// Everything that happens once the brief is ready: the search, the sonar
// preview, picking who to meet, and the intro request that ends the visit.
// None of this state exists while the questions are still being asked and the
// conversation never reads it, so it lives here instead of in Chat. The hook
// pushes its own messages and moves the phase, which keeps what it needs back
// from Chat down to the brief and where to send its output.
export function useExpertSearch({
  flow,
  sessionId,
  brief,
  push,
  setPhase,
}: {
  flow: Flow;
  sessionId: string;
  brief: Brief | null;
  push: (m: Omit<Msg, 'id'>) => void;
  setPhase: (phase: Phase) => void;
}) {
  const config = FLOWS[flow];
  const [experts, setExperts] = useState<Expert[]>([]);
  const [preview, setPreview] = useState<Expert[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [customNeed, setCustomNeed] = useState<string | null>(null);

  async function runSearch(b: Brief | null) {
    setPhase('searching');
    setSelected([]);
    setCustomNeed(null);
    setPreview([]);
    if (config.ending === 'choice') {
      // The dev flow matches privately, so the sonar moment is pure pacing:
      // no marketplace search, straight to the install-or-email choice.
      window.setTimeout(() => {
        push({ role: 'ai', text: config.foundText });
        track('choice_shown', { flow });
        setPhase('choice');
      }, MIN_SEARCH_MS);
      return;
    }
    const started = Date.now();
    let found: Expert[] = [];
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: b, sessionId }),
      });
      if (res.ok) {
        found = ((await res.json()) as { experts?: Expert[] }).experts ?? [];
        setPreview(found.slice(0, 3));
      }
    } catch {
      // fall through to the no-match path
    }
    const remaining = Math.max(0, MIN_SEARCH_MS - (Date.now() - started));
    window.setTimeout(() => {
      if (found.length === 0) {
        push({
          role: 'ai',
          text: 'Nothing strong enough yet. Describe the profile you want and we’ll find them.',
        });
        setPhase('refine');
      } else {
        setExperts(found);
        push({ role: 'ai', text: config.foundText });
        track('matches_shown', { flow, result_count: found.length });
        setPhase('matches');
      }
    }, remaining);
  }

  function toggleExpert(id: string) {
    // Track outside the updater: a setState updater must stay pure, or React's
    // StrictMode double-invoke would double-fire the event.
    const turningOn = !selected.includes(id);
    if (turningOn) track('experts_selected', { flow });
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function requestIntros() {
    if (selected.length === 0) return;
    setExperts((prev) => prev.filter((e) => selected.includes(e.id)));
    push({ role: 'ai', text: 'Great. Add your email and we’ll set up the intros.' });
    track('email_shown', { flow, path: 'intros' });
    setPhase('email');
  }

  function submitCustom(text: string) {
    push({ role: 'user', text });
    setCustomNeed(text);
    setExperts([]);
    setSelected([]);
    push({ role: 'ai', text: 'Got it. Add your email and we’ll take it from there.' });
    track('email_shown', { flow, path: 'custom' });
    setPhase('email');
  }

  async function submitIntro(name: string, email: string): Promise<boolean> {
    const isCustom = customNeed !== null;
    const chosen = experts.filter((e) => selected.includes(e.id));
    const names = chosen.map((e) => e.name);
    try {
      const res = await fetch('/api/intros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: isCustom ? 'custom' : 'intros',
          name: name || undefined,
          email,
          selected: names,
          need: customNeed ?? undefined,
          brief,
          sessionId,
        }),
      });
      if (!res.ok) throw new Error(`intros ${res.status}`);
      push({ role: 'user', text: name ? `${name} · ${email}` : email });
      push({
        role: 'ai',
        text: isCustom
          ? 'Got it. We’ll line up the right people and email you intros, usually within a day.'
          : `Got it. We’ll reach out to ${firstNames(names)} with your requirements. Whoever can take it on will introduce themselves by email, usually within a day.`,
        avatars: isCustom ? undefined : chosen.map((e) => ({ name: e.name, photo: e.photo })),
      });
      track('intro_submitted', {
        flow,
        kind: isCustom ? 'custom' : 'intros',
        count: names.length,
      });
      setExperts([]);
      setSelected([]);
      setPhase('done');
      return true;
    } catch {
      push({ role: 'ai', text: 'Hit a snag. Try that again.' });
      return false;
    }
  }

  // Drop the matches so the visitor can say what to change. The need they
  // already described still stands, so it is left alone.
  function clearMatches() {
    setExperts([]);
    setSelected([]);
  }

  // A second intake in the same visible thread: nothing from the last search
  // may follow it across.
  function startOver() {
    setExperts([]);
    setSelected([]);
    setCustomNeed(null);
  }

  return {
    experts,
    preview,
    selected,
    // How many experts the email form is requesting, or 0 for a custom need.
    introCount: customNeed !== null ? 0 : selected.length,
    runSearch,
    toggleExpert,
    requestIntros,
    submitCustom,
    submitIntro,
    clearMatches,
    startOver,
  };
}

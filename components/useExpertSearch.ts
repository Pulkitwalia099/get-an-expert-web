'use client';

import { useState } from 'react';
import { track } from '@/lib/analytics';
import { FLOWS, type Flow } from '@/components/flows';
import type { Phase } from '@/components/phases';
import type { Msg } from '@/components/Thread';
import type { Brief, Expert } from '@/lib/types';

const MIN_SEARCH_MS = 4_200;

function firstNames(names: (string | null)[]): string {
  const f = names.map((n) => n?.split(' ')[0]).filter(Boolean) as string[];
  if (f.length === 0) return 'them';
  if (f.length === 1) return f[0];
  return `${f.slice(0, -1).join(', ')} and ${f[f.length - 1]}`;
}

// Everything that happens once the brief is ready: the search, the sonar
// preview, picking who to meet, the gate, and the request that ends the visit.
// None of this state exists while the questions are still being asked and the
// conversation never reads it, so it lives here instead of in Chat.
//
// The order matters and is the whole design of the gate. Cards arrive with
// their names withheld, the visitor picks anyway, and only then are they asked
// who they are. Somebody who has already chosen four people will sign in;
// somebody staring at a sign in button before they have seen anything will not.
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
  // The handle on the stored set. Null when Supabase could not take the write,
  // which is the one case where there is nothing to sign in and claim, so the
  // gate falls back to asking for an email.
  const [setId, setSetId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState(false);

  const locked = experts.some((e) => e.locked);
  const chosen = experts.filter((e) => selected.includes(e.id));

  async function runSearch(b: Brief | null) {
    setPhase('searching');
    setSelected([]);
    setCustomNeed(null);
    setPreview([]);
    setSetId(null);
    setDashboard(false);
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
    let id: string | null = null;
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: b, sessionId }),
      });
      if (res.ok) {
        const data = (await res.json()) as { experts?: Expert[]; setId?: string | null };
        found = data.experts ?? [];
        id = data.setId ?? null;
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
        setSetId(id);
        push({
          role: 'ai',
          // Written out both ways rather than patched together from parts.
          // "Found 1 person who look right" shipped, because a helper that
          // pluralised the noun left the verb behind.
          text:
            found.length === 1
              ? 'Found one person who looks right. Pick them and we will get you a price.'
              : `Found ${found.length} people who look right. Pick whoever you want prices from.`,
        });
        track('matches_shown', {
          flow,
          result_count: found.length,
          locked: found.some((e) => e.locked),
        });
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

  const slotsOf = (): number[] => chosen.map((e) => e.slot);

  /**
   * The button under the cards.
   *
   * Three endings. Already signed in, the request goes straight in and the
   * names appear. Signed out with a stored set, they meet the gate. No stored
   * set means Supabase could not take the write, so there is nothing to claim
   * and the only honest option left is an address.
   */
  async function requestQuotes() {
    if (selected.length === 0) return;
    if (!setId) {
      track('email_shown', { flow, path: 'no_set' });
      push({ role: 'ai', text: 'Add your email and we’ll send you their prices.' });
      setPhase('email');
      return;
    }
    if (locked) {
      track('gate_shown', { flow, count: selected.length });
      setPhase('gate');
      return;
    }
    await submitQuotes();
  }

  /** Signed in already, so no wall: place it and reveal the names in place. */
  async function submitQuotes(): Promise<boolean> {
    if (!setId) return false;
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setId, slots: slotsOf() }),
      });
      if (!res.ok) throw new Error(`quotes ${res.status}`);
      const data = (await res.json()) as { experts?: Expert[]; dashboard?: boolean };
      finish(data.experts ?? experts, data.dashboard === true);
      return true;
    } catch {
      push({ role: 'ai', text: 'Hit a snag. Try that again.' });
      return false;
    }
  }

  /**
   * Park the selection, then hand the browser to Google.
   *
   * The intent has to be stored before the redirect, because the trip back
   * lands on a fresh page that knows nothing about what was ticked here.
   */
  async function signInToReveal() {
    if (!setId) return;
    track('signin_started', { source: 'gate', count: selected.length });
    try {
      await fetch('/api/quotes/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setId, slots: slotsOf() }),
      });
    } catch {
      // Parking failed, so the callback will find nothing and land them home
      // signed in. Better than refusing to start a sign in they asked for.
    }
    window.location.href = '/api/auth/google';
  }

  /** The way through for somebody who will not use a Google account. */
  function useEmailInstead() {
    track('email_shown', { flow, path: 'gate_fallback' });
    push({ role: 'ai', text: 'No problem. Add your email and we’ll send you their prices.' });
    setPhase('email');
  }

  function submitCustom(text: string) {
    push({ role: 'user', text });
    setCustomNeed(text);
    setExperts([]);
    setSelected([]);
    setSetId(null);
    push({ role: 'ai', text: 'Got it. Add your email and we’ll take it from there.' });
    track('email_shown', { flow, path: 'custom' });
    setPhase('email');
  }

  // Shared ending for both routes in. `revealed` is what the server sent back
  // with the names filled in, so the cards a visitor stares at while reading
  // the confirmation are the real ones.
  function finish(revealed: Expert[], hasDashboard: boolean) {
    setExperts(revealed);
    setDashboard(hasDashboard);
    const names = revealed.filter((e) => selected.includes(e.id)).map((e) => e.name);
    push({
      role: 'ai',
      text: `Done. Our agents are reaching out to ${firstNames(names)} now. Prices land in your inbox within 24 hours.`,
      avatars: revealed
        .filter((e) => selected.includes(e.id))
        .map((e) => ({ name: e.name ?? '', photo: e.photo })),
    });
    track('intro_submitted', { flow, kind: 'quotes', count: names.length });
    setPhase('done');
  }

  async function submitIntro(name: string, email: string): Promise<boolean> {
    const isCustom = customNeed !== null;

    // The custom path never had a set behind it: there are no matches, only a
    // description of who to go and find. It keeps the original endpoint.
    if (isCustom || !setId) {
      try {
        const res = await fetch('/api/intros', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: isCustom ? 'custom' : 'intros',
            name: name || undefined,
            email,
            selected: chosen.map((e) => e.name ?? ''),
            need: customNeed ?? undefined,
            brief,
            sessionId,
          }),
        });
        if (!res.ok) throw new Error(`intros ${res.status}`);
        push({ role: 'user', text: name ? `${name} · ${email}` : email });
        push({
          role: 'ai',
          text: 'Got it. We’ll line up the right people and email you prices, usually within a day.',
        });
        track('intro_submitted', { flow, kind: isCustom ? 'custom' : 'intros', count: 0 });
        setExperts([]);
        setSelected([]);
        setPhase('done');
        return true;
      } catch {
        push({ role: 'ai', text: 'Hit a snag. Try that again.' });
        return false;
      }
    }

    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setId, slots: slotsOf(), email, name: name || undefined }),
      });
      if (!res.ok) throw new Error(`quotes ${res.status}`);
      const data = (await res.json()) as { experts?: Expert[] };
      push({ role: 'user', text: name ? `${name} · ${email}` : email });
      finish(data.experts ?? experts, false);
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
    setSetId(null);
  }

  // A second intake in the same visible thread: nothing from the last search
  // may follow it across.
  function startOver() {
    setExperts([]);
    setSelected([]);
    setCustomNeed(null);
    setSetId(null);
    setDashboard(false);
  }

  return {
    experts,
    preview,
    selected,
    locked,
    dashboard,
    // How many experts the email form is requesting, or 0 for a custom need.
    introCount: customNeed !== null ? 0 : selected.length,
    runSearch,
    toggleExpert,
    requestQuotes,
    signInToReveal,
    useEmailInstead,
    submitCustom,
    submitIntro,
    clearMatches,
    startOver,
  };
}

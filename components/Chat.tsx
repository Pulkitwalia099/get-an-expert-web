'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import type { ApiRole, Brief, ChatReply, Expert } from '@/lib/types';
import Composer from '@/components/Composer';
import ExpertCards from '@/components/ExpertCards';
import { FLOWS, type Flow } from '@/components/flows';
import GetUnstuck from '@/components/GetUnstuck';
import IntroForm from '@/components/IntroForm';
import Sonar from '@/components/Sonar';
import Thread, { type Msg } from '@/components/Thread';

type Phase = 'welcome' | 'chat' | 'searching' | 'matches' | 'refine' | 'email' | 'choice' | 'done';

const MIN_SEARCH_MS = 4_200;
const MAX_API_MESSAGES = 28;

const PLACEHOLDERS: Record<Phase, string> = {
  welcome: "I'm looking for…",
  chat: 'Reply…',
  searching: 'One moment…',
  matches: 'Not right? Tell me…',
  refine: 'Describe who you need…',
  email: 'you@company.com',
  choice: 'Questions? Ask here…',
  done: 'Anything else?',
};

// Anonymous id linking one visit's rows in Supabase. No cookie, no storage:
// a new page load is a new session on purpose.
function newSessionId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.floor(Math.random() * 16);
      const v = c === 'x' ? r : (r % 4) + 8;
      return v.toString(16);
    });
  }
}

function firstNames(names: string[]): string {
  const f = names.map((n) => n.split(' ')[0]).filter(Boolean);
  if (f.length === 0) return 'They';
  if (f.length === 1) return f[0];
  return `${f.slice(0, -1).join(', ')} and ${f[f.length - 1]}`;
}

export default function Chat({ flow = 'main' }: { flow?: Flow }) {
  const config = FLOWS[flow];
  const [phase, setPhase] = useState<Phase>('welcome');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [preview, setPreview] = useState<Expert[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [customNeed, setCustomNeed] = useState<string | null>(null);

  const idRef = useRef(0);
  const sessionIdRef = useRef('');
  if (!sessionIdRef.current) sessionIdRef.current = newSessionId();
  const apiMsgs = useRef<{ role: ApiRole; content: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const push = (m: Omit<Msg, 'id'>) =>
    setMsgs((prev) => [...prev, { ...m, id: ++idRef.current }]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e7, behavior: 'smooth' });
  }, [msgs, typing, phase, experts]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [phase, typing]);

  const busy = typing || phase === 'searching';

  async function sendChat(text: string, retry = false) {
    if (!retry) {
      push({ role: 'user', text });
      apiMsgs.current = [
        ...apiMsgs.current,
        { role: 'user' as const, content: text },
      ].slice(-MAX_API_MESSAGES);
      if (phase === 'welcome' || phase === 'done') setPhase('chat');
    }
    setTyping(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMsgs.current, sessionId: sessionIdRef.current, flow }),
      });
      if (!res.ok) throw new Error(`chat ${res.status}`);
      const data = (await res.json()) as ChatReply;
      apiMsgs.current.push({ role: 'assistant', content: data.reply });
      setTyping(false);
      push({ role: 'ai', text: data.reply, chips: data.chips });
      if (data.done) {
        setBrief(data.brief);
        void runSearch(data.brief);
      }
    } catch {
      setTyping(false);
      push({ role: 'ai', text: 'Hit a snag.', retry: true });
    }
  }

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
        body: JSON.stringify({ brief: b, sessionId: sessionIdRef.current }),
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
        setPhase('matches');
      }
    }, remaining);
  }

  function toggleExpert(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  // "Something else": open the conversation without sending the chip text as
  // the need.
  function pickElse() {
    push({ role: 'ai', text: config.elseOpener });
    setPhase('chat');
  }

  function requestIntros() {
    if (selected.length === 0) return;
    setExperts((prev) => prev.filter((e) => selected.includes(e.id)));
    push({ role: 'ai', text: 'Great. Add your email and we’ll set up the intros.' });
    setPhase('email');
  }

  // Not happy with the matches: fold the request back into the chat so the
  // model can revise the brief and search again. The question is added to the
  // model's history so it knows what it asked.
  function startRefine() {
    const q =
      'What should I change? For example a different budget, more senior, a location, or another specialty.';
    apiMsgs.current = [...apiMsgs.current, { role: 'assistant' as const, content: q }].slice(
      -MAX_API_MESSAGES,
    );
    setExperts([]);
    setSelected([]);
    push({ role: 'ai', text: q });
    setPhase('chat');
  }

  // After an intro is sent: start a fresh intake in the same visible thread.
  function startMore() {
    apiMsgs.current = [];
    setBrief(null);
    setExperts([]);
    setSelected([]);
    setCustomNeed(null);
    push({ role: 'ai', text: 'Happy to. What other kind of expert are you looking for?' });
    setPhase('chat');
  }

  function submitCustom(text: string) {
    push({ role: 'user', text });
    setCustomNeed(text);
    setExperts([]);
    setSelected([]);
    push({ role: 'ai', text: 'Got it. Add your email and we’ll take it from there.' });
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
          sessionId: sessionIdRef.current,
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
      setExperts([]);
      setSelected([]);
      setPhase('done');
      return true;
    } catch {
      push({ role: 'ai', text: 'Hit a snag. Try that again.' });
      return false;
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    if (phase === 'matches' || phase === 'refine' || phase === 'choice') {
      submitCustom(text);
    } else {
      void sendChat(text);
    }
  }

  const showCards = experts.length > 0 && (phase === 'matches' || phase === 'email');
  const introCount = customNeed !== null ? 0 : selected.length;

  return (
    <>
      <div className="bg" />
      <div className="grain" />
      <main className="page">
        <section className="window">
          <div className="titlebar">
            <div className="lights">
              <i className="r" />
              <i className="y" />
              <i className="g" />
            </div>
            <div className="wordmark">
              <span className="worb">✳︎</span>midsesh
              {config.tag && <span className="tag">{config.tag}</span>}
            </div>
          </div>

          <div className="chat" ref={scrollRef}>
            {phase === 'welcome' ? (
              <div className="s1">
                <div className="greet">
                  <div className="orb">✳︎</div>
                  <h1>{config.headline}</h1>
                  {config.sub && <div className="sub">{config.sub}</div>}
                </div>
                <div className="chips">
                  {config.suggestions.map((s) => (
                    <button key={s} className="chip" onClick={() => void sendChat(s)}>
                      {s}
                    </button>
                  ))}
                  {config.elseChip && (
                    <button className="chip ghost" onClick={pickElse}>
                      {config.elseChip}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="thread">
                <Thread
                  msgs={msgs}
                  typing={typing}
                  chipsActive={phase === 'chat' && !typing}
                  onSend={(text, retry) => void sendChat(text, retry)}
                />

                {phase === 'searching' && (
                  <Sonar found={preview} status={config.searchingStatus} />
                )}

                {phase === 'choice' && (
                  <GetUnstuck
                    flow={flow}
                    brief={brief}
                    sessionId={sessionIdRef.current}
                    onEmailSent={(email) => {
                      push({ role: 'user', text: email });
                      push({
                        role: 'ai',
                        text: 'Done. Expert and price land in your inbox within the hour.',
                      });
                      setPhase('done');
                    }}
                    onEmailFailed={() => push({ role: 'ai', text: 'Hit a snag. Send that again.' })}
                  />
                )}

                {showCards && (
                  <ExpertCards
                    experts={experts}
                    selected={selected}
                    locked={phase !== 'matches'}
                    onToggle={toggleExpert}
                  />
                )}

                {phase === 'matches' && (
                  <div className="match-action">
                    <button
                      className="cta"
                      disabled={selected.length === 0}
                      onClick={requestIntros}
                    >
                      {selected.length === 0
                        ? 'Select who to meet'
                        : `Request ${selected.length} intro${selected.length === 1 ? '' : 's'}`}
                    </button>
                    <button className="linkbtn" onClick={startRefine}>
                      Not the right matches? Change my search
                    </button>
                  </div>
                )}

                {phase === 'email' && <IntroForm count={introCount} onSubmit={submitIntro} />}

                {phase === 'done' && (
                  <div className="match-action">
                    <button className="cta ghost-cta" onClick={startMore}>
                      Get intros to other experts
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {phase !== 'email' && (
            <Composer
              inputRef={inputRef}
              value={input}
              placeholder={phase === 'welcome' ? config.welcomePlaceholder : PLACEHOLDERS[phase]}
              disabled={phase === 'searching'}
              canSend={!busy && input.trim().length > 0}
              onChange={setInput}
              onSubmit={onSubmit}
            />
          )}
        </section>
      </main>
    </>
  );
}

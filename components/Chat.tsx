'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import { buildCalPrefill } from '@/lib/calLink';
import { trimHistory } from '@/lib/history';
import { newSessionId } from '@/lib/session';
import type { ApiRole, Brief, ChatReply, MatchConfidence, PrimaryPath } from '@/lib/types';
import CallCard, { type CallState, type OperatorCard } from '@/components/CallCard';
import CallPill from '@/components/CallPill';
import Composer from '@/components/Composer';
import ExpertSignup from '@/components/ExpertSignup';
import { FLOWS, type Flow } from '@/components/flows';
import GetUnstuck from '@/components/GetUnstuck';
import MatchStep from '@/components/MatchStep';
import MultiChips from '@/components/MultiChips';
import { PLACEHOLDERS, type Phase } from '@/components/phases';
import Sonar from '@/components/Sonar';
import Thread, { type Msg } from '@/components/Thread';
import Titlebar from '@/components/Titlebar';
import { useExpertSearch } from '@/components/useExpertSearch';
import WelcomeScreen from '@/components/WelcomeScreen';

// Matches RING_SECONDS in app/api/call/route.ts. Long enough to walk back
// to the desk, short enough that nobody sits watching a dead countdown.
const RING_SECONDS = 60;

export default function Chat({ flow = 'main' }: { flow?: Flow }) {
  const config = FLOWS[flow];
  const [phase, setPhase] = useState<Phase>('welcome');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [brief, setBrief] = useState<Brief | null>(null);
  // Chips the model marked as multi select, and the message they came with.
  const [multi, setMulti] = useState<{ turn: number; chips: string[] } | null>(null);
  const [signup, setSignup] = useState(false);
  const [matchIntro, setMatchIntro] = useState('');
  const [matchConfidence, setMatchConfidence] = useState<MatchConfidence>('');
  const [primaryPath, setPrimaryPath] = useState<PrimaryPath>('session');

  // The call sits beside the conversation. The pill is in the titlebar once
  // they have said something, and the card drops under the thread when they
  // tap it. Null card means they have not asked yet.
  const [card, setCard] = useState<OperatorCard | null>(null);
  const [callState, setCallState] = useState<CallState>('booking');
  const [secondsLeft, setSecondsLeft] = useState(RING_SECONDS);
  const callIdRef = useRef<string | null>(null);
  const lastUserMsg = useRef('');

  const idRef = useRef(0);
  const sessionIdRef = useRef('');
  if (!sessionIdRef.current) sessionIdRef.current = newSessionId();
  const apiMsgs = useRef<{ role: ApiRole; content: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // The id is taken here rather than inside the updater: an updater must stay
  // pure, and callers need the id back to pin things to the message.
  const push = (m: Omit<Msg, 'id'>): number => {
    const id = ++idRef.current;
    setMsgs((prev) => [...prev, { ...m, id }]);
    return id;
  };

  // Anything the interface says on the model's behalf goes into the model's
  // history too, or its next turn has no idea the question was asked.
  const say = (text: string) => {
    apiMsgs.current = trimHistory([...apiMsgs.current, { role: 'assistant', content: text }]);
    push({ role: 'ai', text });
  };

  // The search and the intro request live in their own state machine. This
  // component keeps the conversation and hands over once a brief is ready.
  const search = useExpertSearch({
    flow,
    sessionId: sessionIdRef.current,
    brief,
    push,
    setPhase,
  });

  // One event per visit marking which page (flow) they opened. Pageviews are
  // captured separately by the provider; this adds the flow for segmentation.
  useEffect(() => {
    track('chat_opened', { flow });
  }, [flow]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e7, behavior: 'smooth' });
  }, [msgs, typing, phase, search.experts]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [phase, typing]);

  const busy = typing || phase === 'searching';

  async function sendChat(text: string, retry = false) {
    if (!retry) {
      // First real turn of the visit: the top of the engagement funnel.
      if (apiMsgs.current.length === 0) track('first_message_sent', { flow });
      lastUserMsg.current = text;
      push({ role: 'user', text });
      apiMsgs.current = trimHistory([...apiMsgs.current, { role: 'user', content: text }]);
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
      // Multi select chips are rendered by this component, so they are kept
      // off the message; single select chips stay in the thread as before.
      const pickMany = data.chip_mode === 'multi' && data.chips.length > 0;
      const turn = push({ role: 'ai', text: data.reply, chips: pickMany ? undefined : data.chips });
      // Pinned to this message, so the next turn never shows a stale set.
      setMulti(pickMany ? { turn, chips: data.chips } : null);
      setPrimaryPath(data.primary_path);
      // A freelancer wanting work, not a client. They get the application
      // form instead: no brief, no search.
      setSignup(data.expert_signup);
      if (data.done && !data.expert_signup) {
        setMatchIntro(data.match_intro);
        setMatchConfidence(data.match_confidence);
        setBrief(data.brief);
        void search.runSearch(data.brief);
      }
    } catch {
      setTyping(false);
      push({ role: 'ai', text: 'Hit a snag.', retry: true });
    }
  }

  // "Something else": open the conversation without sending the chip text as
  // the need.
  function pickElse() {
    say(config.elseOpener);
    setPhase('chat');
  }

  // Not happy with the matches: fold the request back into the chat so the
  // model can revise the brief and search again.
  function startRefine() {
    search.clearMatches();
    say(
      'What should I change? For example a different budget, more senior, a location, or another specialty.',
    );
    setPhase('chat');
  }

  // After an intro is sent: start a fresh intake in the same visible thread.
  function startMore() {
    apiMsgs.current = [];
    setBrief(null);
    search.startOver();
    setMulti(null);
    push({ role: 'ai', text: 'Happy to. What other kind of expert are you looking for?' });
    setPhase('chat');
  }

  // One request, made only when they tap. Nothing is polled, so the chat
  // never advertises an empty room.
  async function openCall() {
    try {
      const res = await fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, lastMessage: lastUserMsg.current }),
      });
      if (!res.ok) throw new Error(`presence ${res.status}`);
      const data = (await res.json()) as { online: boolean; card: OperatorCard };
      setCard(data.card);
      setCallState(data.online ? 'live' : 'booking');
      track('call_card_opened', { flow, online: data.online, operator: data.card.id });
    } catch {
      push({ role: 'ai', text: 'Could not check that. Try again in a moment.' });
    }
  }

  async function startRing() {
    if (!card) return;
    setCallState('ringing');
    setSecondsLeft(RING_SECONDS);
    track('call_ring_started', { flow, operator: card.id });
    try {
      const res = await fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ring',
          operatorId: card.id,
          sessionId: sessionIdRef.current,
          brief,
          lastMessage: lastUserMsg.current,
        }),
      });
      if (!res.ok) throw new Error(`ring ${res.status}`);
      callIdRef.current = ((await res.json()) as { callId: string }).callId;
    } catch {
      // Whatever went wrong, the honest answer is the booking picker.
      callIdRef.current = null;
      setCallState('booking');
    }
  }

  // The countdown and the answer poll are one effect: both only run while
  // ringing, and both must stop the moment it resolves either way.
  useEffect(() => {
    if (callState !== 'ringing') return;
    const started = Date.now();
    let stopped = false;

    const timer = setInterval(async () => {
      if (stopped) return;
      const left = RING_SECONDS - Math.floor((Date.now() - started) / 1000);
      setSecondsLeft(left > 0 ? left : 0);

      const id = callIdRef.current;
      if (id) {
        try {
          const res = await fetch(`/api/call?id=${encodeURIComponent(id)}`);
          if (res.ok) {
            const data = (await res.json()) as { status: string; roomUrl: string | null };
            if (data.status === 'answered' && data.roomUrl) {
              stopped = true;
              window.open(data.roomUrl, '_blank', 'noopener,noreferrer');
              setCallState('live');
              track('call_answered', { flow });
              return;
            }
          }
        } catch {
          // A dropped poll costs nothing. The next one is two seconds away,
          // and the countdown still ends this on its own.
        }
      }

      if (left <= 0) {
        stopped = true;
        setCallState('booking');
        track('call_missed', { flow });
        if (id) {
          void fetch('/api/call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'end', callId: id, missed: true }),
          });
        }
      }
    }, 2_000);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [callState, flow]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    if (phase === 'matches' || phase === 'refine' || phase === 'choice') {
      search.submitCustom(text);
    } else {
      void sendChat(text);
    }
  }

  const lastMsgId = msgs.length > 0 ? msgs[msgs.length - 1].id : 0;
  const answering = phase === 'chat' && !typing;
  // The pill waits for one message, so nobody rings with no context. Derived
  // from the thread rather than a ref, so it re-renders when it flips.
  const hasSpoken = msgs.some((m) => m.role === 'user');

  // Memoised because BookingEmbed keys an effect on it. Rebuilt inline it
  // would be a new object every render, which restarts that effect and, in
  // an earlier version, silently cancelled its own fallback timer.
  const prefill = useMemo(
    () => (card ? buildCalPrefill(card.id, brief, lastUserMsg.current, {}) : null),
    [card, brief],
  );

  return (
    <>
      <div className="bg" />
      <div className="grain" />
      <main className="page">
        <section className="window">
          <Titlebar
            tag={config.tag}
            action={hasSpoken ? <CallPill onTap={() => void openCall()} /> : null}
          />

          <div className="chat" ref={scrollRef}>
            {phase === 'welcome' ? (
              <WelcomeScreen config={config} onPick={(t) => void sendChat(t)} onElse={pickElse} />
            ) : (
              <div className="thread">
                <Thread
                  msgs={msgs}
                  typing={typing}
                  chipsActive={answering}
                  onSend={(text, retry) => void sendChat(text, retry)}
                />

                {multi && multi.turn === lastMsgId && answering && (
                  <MultiChips
                    key={multi.turn}
                    chips={multi.chips}
                    onConfirm={(picks) => void sendChat(picks.join(', '))}
                  />
                )}

                {signup && answering && (
                  <ExpertSignup
                    flow={flow}
                    sessionId={sessionIdRef.current}
                    onSent={(email) => {
                      push({ role: 'user', text: email });
                      setSignup(false);
                      say('Got it, thanks. If there is a fit, we will email you.');
                    }}
                    onFailed={() => push({ role: 'ai', text: 'Hit a snag. Send that again.' })}
                  />
                )}

                {phase === 'searching' && (
                  <Sonar found={search.preview} status={config.searchingStatus} />
                )}

                {phase === 'choice' && (
                  <GetUnstuck
                    flow={flow}
                    brief={brief}
                    sessionId={sessionIdRef.current}
                    matchIntro={matchIntro}
                    matchConfidence={matchConfidence}
                    primaryPath={primaryPath}
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

                {(phase === 'matches' || phase === 'email' || phase === 'done') && (
                  <MatchStep
                    phase={phase}
                    experts={search.experts}
                    selected={search.selected}
                    introCount={search.introCount}
                    onToggle={search.toggleExpert}
                    onRequest={search.requestIntros}
                    onRefine={startRefine}
                    onSubmit={search.submitIntro}
                    onMore={startMore}
                  />
                )}

                {card && prefill && (
                  <CallCard
                    card={card}
                    state={callState}
                    secondsLeft={secondsLeft}
                    prefill={prefill}
                    onCall={() => void startRing()}
                  />
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

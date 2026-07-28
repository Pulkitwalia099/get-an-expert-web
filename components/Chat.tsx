'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import { buildCalPrefill } from '@/lib/calLink';
import { trimHistory } from '@/lib/history';
import { shouldOfferHuman } from '@/lib/humanOffer';
import { newSessionId } from '@/lib/session';
import type { ApiRole, Brief, ChatReply, MatchConfidence, PrimaryPath } from '@/lib/types';
import CallCard, { type CallState, type OperatorCard } from '@/components/CallCard';
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
import { useTypedPlaceholder } from '@/components/useTypedPlaceholder';
import { useVisualViewport } from '@/components/useVisualViewport';
import WelcomeScreen from '@/components/WelcomeScreen';

// Matches RING_SECONDS in app/api/call/route.ts. Long enough to walk back
// to the desk, short enough that nobody sits watching a dead countdown.
const RING_SECONDS = 60;

export default function Chat({
  flow = 'main',
  // Overlay mode. Off by default so /chat keeps rendering the window as the
  // whole page. On the homepage the hero is the front door and this becomes
  // the committed state, opened by a tap and closable back to the hero.
  overlay = false,
  onClose,
  // Sent as the opening message the moment the overlay opens. An empty string
  // opens the chat with nothing said yet, which is what tapping the bare
  // search bar does.
  seed = null,
}: {
  flow?: Flow;
  overlay?: boolean;
  onClose?: () => void;
  seed?: string | null;
}) {
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
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  // At most one offer a visit. A second reads as nagging.
  const [offered, setOffered] = useState(false);
  const userTurns = useRef(0);
  const callIdRef = useRef<string | null>(null);
  const lastUserMsg = useRef('');
  // Everything the visitor has said, for matching. The newest message alone
  // is often the least informative: by the third turn they are answering a
  // narrow follow up and the words that identify the work are further back.
  const saidSoFar = useRef<string[]>([]);

  const idRef = useRef(0);
  const sessionIdRef = useRef('');
  if (!sessionIdRef.current) sessionIdRef.current = newSessionId();
  // Bumped by every restart. Work already in flight belongs to a conversation
  // the visitor has walked away from, and neither the chat request nor the
  // search timer can be called back, so both check this number before they
  // put anything on screen.
  const runRef = useRef(0);
  const currentRun = runRef.current;
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
    // The search lands on a timer it owns. These are captured at render, so a
    // search started before a restart carries the old run number and finishes
    // silently instead of dragging the visitor back into the old thread.
    push: (m) => {
      if (currentRun === runRef.current) push(m);
    },
    setPhase: (next) => {
      if (currentRun === runRef.current) setPhase(next);
    },
  });

  // One event per visit marking which page (flow) they opened. Pageviews are
  // captured separately by the provider; this adds the flow for segmentation.
  useEffect(() => {
    track('chat_opened', { flow });
  }, [flow]);

  // The hero hands over whatever the visitor tapped. Runs once on mount: the
  // overlay is remounted on every open, so there is no stale seed to guard
  // against, and an empty seed means they tapped the bare bar and have not
  // said anything yet.
  const seeded = useRef(false);
  useEffect(() => {
    if (!overlay || seeded.current) return;
    seeded.current = true;
    if (seed) void sendChat(seed);
    // sendChat is stable enough for a mount-only send, and listing it would
    // re-fire the opening message on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay, seed]);

  // Every way out goes through here, so the drop-off point is recorded once
  // whichever control they used. The phase is the whole value of the event:
  // leaving on 'welcome' is a different problem from leaving on 'email'.
  const dismiss = useCallback(
    (how: string) => {
      track('ask_chat_closed', { flow, how, phase, turns: userTurns.current });
      onClose?.();
    },
    [flow, phase, onClose],
  );

  // Escape closes the overlay, the same as the scrim. Not bound in page mode,
  // where there is nothing to close back to.
  useEffect(() => {
    if (!overlay || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss('escape');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [overlay, onClose, dismiss]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e7, behavior: 'smooth' });
  }, [msgs, typing, phase, search.experts]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [phase, typing]);

  const busy = typing || phase === 'searching';

  // Only while the overlay is up. On /chat the window IS the page, so there is
  // no fixed layer to pin and nothing to correct.
  useVisualViewport(overlay);

  // The welcome composer types its way through the example asks. Paused once
  // the visitor starts writing, so it never competes with what they are
  // saying, and paused off the welcome screen where each phase has its own
  // prompt. Focus alone does not pause it: the field is autofocused on load,
  // so pausing there would freeze it before the first character.
  const typedPlaceholder = useTypedPlaceholder(config.placeholders, phase !== 'welcome' || input !== '');
  // Ringing or connected. A restart here would drop a call that is actually
  // happening, which is the one thing starting over cannot hand back.
  const callLive = callState === 'ringing' || callState === 'incall';

  async function sendChat(text: string, retry = false) {
    const run = runRef.current;
    if (!retry) {
      // First real turn of the visit: the top of the engagement funnel.
      if (apiMsgs.current.length === 0) track('first_message_sent', { flow });
      lastUserMsg.current = text;
      saidSoFar.current = [...saidSoFar.current, text];
      userTurns.current += 1;
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
      // They restarted while this was in the air. The reply answers a question
      // that no longer exists, so it is dropped rather than pasted into the
      // fresh conversation.
      if (run !== runRef.current) return;
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

      // The offer to talk to a human, made by the agent in the thread rather
      // than parked in the chrome. A finished brief always earns one, because
      // that is the moment someone is choosing how to proceed. Otherwise the
      // trigger is engagement or distress. An expert applying for work never
      // gets it: they are not here to hire anyone.
      const finished = data.done && !data.expert_signup;
      const wanted =
        !data.expert_signup &&
        (finished ||
          shouldOfferHuman({
            text,
            userTurns: userTurns.current,
            alreadyOffered: offered,
          }));

      if (wanted && !offered) {
        setOffered(true);
        say('Want to talk it through with someone who has done this before?');
        void openCall();
      }
    } catch {
      if (run !== runRef.current) return;
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
        body: JSON.stringify({
          brief,
          lastMessage: lastUserMsg.current,
          conversation: saidSoFar.current.join(' \n'),
        }),
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
          conversation: saidSoFar.current.join(' \n'),
        }),
      });
      if (!res.ok) throw new Error(`ring ${res.status}`);
      const data = (await res.json()) as { callId: string; roomUrl: string };
      callIdRef.current = data.callId;
      setRoomUrl(data.roomUrl);
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
              setRoomUrl(data.roomUrl);
              setCallState('incall');
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

  // Daily saw a second person in the room. That is the ground truth for a
  // connected call, and it covers the operator arriving through the Telegram
  // link, which never touches our API. The row is marked answered here so
  // the records match what actually happened.
  // Memoised on purpose. CallStage keys its effect on these, and a new
  // function identity every render would tear the Daily frame down and
  // rejoin it on a loop.
  const remoteJoined = useCallback(() => {
    setCallState((prev) => (prev === 'ringing' ? 'incall' : prev));
    const id = callIdRef.current;
    if (id) {
      void fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'answer', callId: id }),
      });
    }
    track('call_answered', { flow });
  }, [flow]);

  // Either side can end it. Daily reports the visitor leaving; the row is
  // closed so the operator page stops offering a call nobody is in.
  const endCall = useCallback(() => {
    const id = callIdRef.current;
    setCallState('live');
    setRoomUrl(null);
    callIdRef.current = null;
    if (id) {
      void fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end', callId: id }),
      });
    }
    track('call_ended', { flow });
  }, [flow]);

  // The red light in the titlebar. Everything a visit accumulates is cleared
  // in one place, and the session id is replaced so what follows is recorded
  // as its own visit rather than a corrupted continuation of the last one.
  function restart() {
    track('conversation_restarted', { flow, phase });
    // A live call is hung up rather than unmounted. Dropping the card alone
    // would leave the row open and the operator page would keep offering a
    // call nobody is in.
    if (callLive) endCall();

    runRef.current += 1;
    apiMsgs.current = [];
    sessionIdRef.current = newSessionId();
    idRef.current = 0;
    userTurns.current = 0;
    lastUserMsg.current = '';
    saidSoFar.current = [];
    callIdRef.current = null;

    setMsgs([]);
    setInput('');
    setTyping(false);
    setBrief(null);
    setMulti(null);
    setSignup(false);
    setMatchIntro('');
    setMatchConfidence('');
    setPrimaryPath('session');
    setOffered(false);
    setCard(null);
    setCallState('booking');
    setSecondsLeft(RING_SECONDS);
    setRoomUrl(null);
    search.startOver();
    setPhase('welcome');
  }

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

  // Memoised because BookingEmbed keys an effect on it. Rebuilt inline it
  // would be a new object every render, which restarts that effect and, in
  // an earlier version, silently cancelled its own fallback timer.
  const prefill = useMemo(
    () => (card ? buildCalPrefill(card.id, brief, lastUserMsg.current, {}) : null),
    [card, brief],
  );

  return (
    <>
      {/* The aurora and grain are painted by the page itself in overlay mode.
          Drawing a second copy here would double their opacity. */}
      {!overlay && <div className="bg" />}
      {!overlay && <div className="grain" />}
      <main className={overlay ? 'page page-overlay' : 'page'}>
        {overlay && (
          <button
            type="button"
            className="overlay-scrim"
            aria-label="Close the chat"
            onClick={() => dismiss('scrim')}
          />
        )}
        <section className={overlay ? 'window window-overlay' : 'window'}>
          <Titlebar
            tag={config.tag}
            onRestart={restart}
            canRestart={phase !== 'welcome'}
            needsConfirm={callLive}
            onDismiss={overlay ? () => dismiss('close_button') : undefined}
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
                    roomUrl={roomUrl}
                    onCall={() => void startRing()}
                    onLeave={endCall}
                    onRemoteJoined={remoteJoined}
                  />
                )}
              </div>
            )}
          </div>

          {phase !== 'email' && (
            <Composer
              inputRef={inputRef}
              value={input}
              placeholder={
                phase === 'welcome'
                  ? typedPlaceholder || config.welcomePlaceholder
                  : PLACEHOLDERS[phase]
              }
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

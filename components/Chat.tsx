'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import { trimHistory } from '@/lib/history';
import { newSessionId } from '@/lib/session';
import type { ApiRole, Brief, ChatReply, MatchConfidence, PrimaryPath } from '@/lib/types';
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

  return (
    <>
      <div className="bg" />
      <div className="grain" />
      <main className="page">
        <section className="window">
          <Titlebar tag={config.tag} />

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

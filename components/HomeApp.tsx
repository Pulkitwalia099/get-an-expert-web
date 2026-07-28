'use client';

import { useCallback, useEffect, useState } from 'react';
import Chat from '@/components/Chat';
import { FLOWS } from '@/components/flows';
import Hero from '@/components/Hero';
import { track } from '@/lib/analytics';

// The /ask front door. The hero is what a visitor lands on: type, a search bar,
// chips and the four steps, all without a window in the way. Tapping the bar, a
// chip, or the CTA at the bottom is the moment they commit, and only then does
// the full chat open over the top. Closing it puts them back where they were.
//
// The sections arrive as children rather than sitting in the page, because the
// closing CTA has to be able to open the chat and only this component owns that
// state. Passing them through keeps them server components.
export default function HomeApp({ children }: { children?: React.ReactNode }) {
  const config = FLOWS.ask;
  // null means closed. A string, including an empty one, means open with that
  // as the opening message. Empty covers a tap on the bare bar, where they
  // have not said anything yet.
  const [seed, setSeed] = useState<string | null>(null);
  const open = seed !== null;

  // `source` is the point of this event. Which entry earns the commit is the
  // one thing the funnel could not answer before: chat_opened fired identically
  // whether they tapped the bar, a chip, or scrolled all the way to the bottom.
  const openFrom = useCallback((source: string, next: string) => {
    track('ask_chat_opened', { source, label: next || null });
    setSeed(next);
  }, []);

  const onClose = useCallback(() => setSeed(null), []);

  // The hero does not know or care about the event name.
  const onOpen = useCallback(
    (next: string) => openFrom(next ? 'chip' : 'bar', next),
    [openFrom],
  );

  // The page behind an open chat must not scroll under it, or a thumb swipe
  // moves the examples list instead of the conversation.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <Hero config={config} onOpen={onOpen} />
      {children}
      {/* The second ask. Someone who has read to the bottom of the examples has
          just spent a minute learning what we do, and sending them back up to
          the hero to act on it loses most of them. */}
      <section className="closer">
        <h2 className="closer-title">Ready when you are</h2>
        <p className="closer-sub">
          One sentence is enough. No forms, no signup, and nothing to pay until you have a
          name and a price.
        </p>
        <button type="button" className="closer-cta" onClick={() => openFrom('closing_cta', '')}>
          Tell us what you need
        </button>
      </section>
      {/* Mounted fresh each time, so every open starts a clean conversation and
          the seed sends exactly once. */}
      {open && <Chat flow="ask" overlay onClose={onClose} seed={seed} />}
    </>
  );
}

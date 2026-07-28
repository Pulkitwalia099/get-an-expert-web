'use client';

import { useCallback, useEffect, useState } from 'react';
import Chat from '@/components/Chat';
import { FLOWS } from '@/components/flows';
import Hero from '@/components/Hero';

// The homepage front door. The hero is what a visitor lands on: type, a search
// bar, chips and the four steps, all without a window in the way. Tapping the
// bar or a chip is the moment they commit, and only then does the full chat
// open over the top. Closing it puts them back on the hero with the page
// underneath still where they left it.
export default function HomeApp() {
  const config = FLOWS.ask;
  // null means closed. A string, including an empty one, means open with that
  // as the opening message. Empty covers a tap on the bare bar, where they
  // have not said anything yet.
  const [seed, setSeed] = useState<string | null>(null);
  const open = seed !== null;

  const onOpen = useCallback((next: string) => setSeed(next), []);
  const onClose = useCallback(() => setSeed(null), []);

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
      {/* Keyed on nothing: the overlay is mounted fresh each time, so every
          open starts a clean conversation and the seed sends exactly once. */}
      {open && <Chat flow="ask" overlay onClose={onClose} seed={seed} />}
    </>
  );
}

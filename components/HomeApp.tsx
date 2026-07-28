'use client';

import { useCallback, useEffect, useState } from 'react';
import Chat from '@/components/Chat';
import Examples from '@/components/Examples';
import { FLOWS } from '@/components/flows';
import Hero from '@/components/Hero';
import Overlay, { type OverlayOrigin } from '@/components/Overlay';
import SetupBooking from '@/components/SetupBooking';
import SetupDetail from '@/components/SetupDetail';
import Setups from '@/components/Setups';
import { track } from '@/lib/analytics';
import { getSetup } from '@/lib/setups';

// The /ask front door. The hero is what a visitor lands on: type, a search bar,
// chips and the four steps, all without a window in the way. Tapping the bar, a
// chip, a setup card, an example, or the CTA at the bottom is the moment they
// commit, and only then does a layer open over the top. Closing it puts them
// back exactly where they were.
//
// This component owns the whole page below the site bar, sections included,
// because every card in those sections opens something and only the owner of
// that state can be handed the callback.

// One value for four states, not four flags. Flags can disagree: a booking
// sheet and a conversation both reading open is not a state this page has, and
// with booleans it is one missed reset away. There is a single layer, so what
// is inside it is a single answer.
type View =
  | { kind: 'chat'; seed: string; context: string | null; origin: OverlayOrigin | null }
  | { kind: 'setup'; slug: string; origin: OverlayOrigin | null }
  | { kind: 'booking'; slug: string; origin: OverlayOrigin | null };

// Where the layer grows from: the centre of whatever was tapped. Viewport
// pixels, because the overlay is fixed, so a client rect is already in the
// right space and no scroll offset belongs in it.
function originOf(el: Element): OverlayOrigin {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export default function HomeApp() {
  const config = FLOWS.ask;
  // null means nothing is open and the hero is the page.
  const [view, setView] = useState<View | null>(null);

  // Which control opened the layer is deliberately not tracked here. Overlay
  // records the opener on mount and hands focus back on unmount, and because it
  // stays mounted across the setup to booking hand off, its single capture also
  // gets the harder case right: closing out of the booking step returns to the
  // card that started the whole thing, not to the button one step back. A
  // second copy of that bookkeeping in here would fight it, so this component
  // only ever decides which view is open.
  const onClose = useCallback(() => setView(null), []);

  // `source` is the point of this event. Which entry earns the commit is the
  // one thing the funnel could not answer before: chat_opened fired identically
  // whether they tapped the bar, a chip, or scrolled all the way to the bottom.
  const openChat = useCallback(
    (source: string, seed: string, context: string | null, origin: OverlayOrigin | null) => {
      track('ask_chat_opened', { source, label: seed || null });
      setView({ kind: 'chat', seed, context, origin });
    },
    [],
  );

  // The hero does not know or care about the event name. An empty seed covers a
  // tap on the bare bar, where they have not said anything yet, and it opens
  // from the middle of the layer because the bar fills the width of the hero.
  const onOpen = useCallback(
    (next: string) => openChat(next ? 'chip' : 'bar', next, null, null),
    [openChat],
  );

  // A slug that resolves to nothing must not open an empty layer, so the guard
  // is here rather than in the render. State never holds a card we cannot draw.
  const onPickSetup = useCallback((slug: string, origin: OverlayOrigin | null) => {
    if (!getSetup(slug)) return;
    setView({ kind: 'setup', slug, origin });
  }, []);

  // An example card is a sentence someone could have typed, so tapping it is
  // the same commit as typing it. It travels twice: as the opening message and
  // as the context the conversation keeps, so the thread still shows what they
  // came in on after the first reply.
  const onPickExample = useCallback(
    (ask: string, origin: OverlayOrigin | null) => openChat('example', ask, ask, origin),
    [openChat],
  );

  const setup = view && view.kind !== 'chat' ? getSetup(view.slug) : undefined;

  // What goes inside the layer. Exactly one of these, which is the whole reason
  // the state above is a union.
  let body: React.ReactNode = null;
  if (view?.kind === 'chat') {
    // Mounted fresh each time, so every open starts a clean conversation and
    // the seed sends exactly once. Nothing can open a second conversation over
    // the first, because the layer covers every control that would do it.
    body = (
      <Chat flow="ask" overlay onClose={onClose} seed={view.seed} context={view.context} />
    );
  } else if (view && setup) {
    const origin = view.origin;
    body =
      view.kind === 'setup' ? (
        <SetupDetail
          setup={setup}
          onClose={onClose}
          // Same slug, same origin. Booking is a step further into the card
          // they are already looking at, not a new place.
          onBook={() => setView({ kind: 'booking', slug: setup.slug, origin })}
          // Seeded with the setup named, and carrying the title as context, so
          // the conversation opens already knowing what they were reading.
          onAsk={() =>
            openChat(
              'setup_ask',
              `I have a question about ${setup.title}.`,
              setup.title,
              origin,
            )
          }
        />
      ) : (
        <SetupBooking
          setup={setup}
          onClose={onClose}
          // Back, not close. Someone who opened the picker and changed their
          // mind about the date wanted the card again, and dropping them on
          // the page makes them find it a second time.
          onBack={() => setView({ kind: 'setup', slug: setup.slug, origin })}
        />
      );
  }

  // Read off the body rather than off the state, so a lock can never outlive
  // the layer it was taken for.
  const open = body !== null;

  // The page behind an open layer must not scroll under it, or a thumb swipe
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
      <div className="below">
        <Setups onPick={onPickSetup} />
        <Examples onPick={onPickExample} />
      </div>
      {/* The second ask. Someone who has read to the bottom of the examples has
          just spent a minute learning what we do, and sending them back up to
          the hero to act on it loses most of them. */}
      <section className="closer">
        <h2 className="closer-title">Ready when you are</h2>
        <p className="closer-sub">
          One sentence is enough. No forms, no signup, and nothing to pay until you have a
          name and a price.
        </p>
        <button
          type="button"
          className="closer-cta"
          onClick={(e) => openChat('closing_cta', '', null, originOf(e.currentTarget))}
        >
          Tell us what you need
        </button>
      </section>
      {body && (
        <Overlay onClose={onClose} origin={view?.origin ?? null}>
          {body}
        </Overlay>
      )}
    </>
  );
}

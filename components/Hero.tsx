'use client';

import { FormEvent, PointerEvent as ReactPointerEvent, useRef, useState } from 'react';
import type { FlowConfig } from '@/components/flows';
import HowItWorks from '@/components/HowItWorks';
import TryChips from '@/components/TryChips';
import useTypedPlaceholder from '@/components/useTypedPlaceholder';
import s from '@/components/Hero.module.css';

// How long two opens with no text are treated as the same gesture. One tap on
// a touch screen fires pointerdown and then focus, and both mean "open". The
// window only matters for the empty seed; a submitted sentence always goes
// through, because that is the visitor saying something new.
const SAME_GESTURE_MS = 600;

// The top of the page. Not a window: a headline, one search bar, the starter
// chips and the four steps, all readable before anyone scrolls. The chat only
// exists once somebody commits, which is any tap on the bar or a chip, so the
// bar is the loudest thing here and everything else is sized around it.
export default function Hero({
  config,
  onOpen,
}: {
  config: FlowConfig;
  onOpen: (seed: string) => void;
}) {
  const [value, setValue] = useState('');
  // Latched on the first keystroke rather than read off the value, so clearing
  // the field does not restart the typing placeholder underneath the cursor.
  const [typed, setTyped] = useState(false);
  const placeholder = useTypedPlaceholder(config.placeholders, typed);
  const lastEmptyOpen = useRef(0);

  // Open with nothing seeded. Deduped, see SAME_GESTURE_MS.
  function openEmpty() {
    const now = Date.now();
    if (now - lastEmptyOpen.current < SAME_GESTURE_MS) return;
    lastEmptyOpen.current = now;
    onOpen('');
  }

  // Pressing anywhere on the bar is the gesture that opens the chat. The
  // submit button is inside the bar and carries its own meaning, so it is left
  // alone here and handled by the form's submit.
  function onBarPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.target instanceof Element && e.target.closest('button')) return;
    openEmpty();
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const seed = value.trim();
    if (seed) onOpen(seed);
    else openEmpty();
  }

  return (
    <section className={s.hero}>
      <header className={s.head}>
        <h1 className={s.headline}>{config.headline}</h1>
        {config.sub && <p className={s.sub}>{config.sub}</p>}
      </header>

      <form className={s.form} onSubmit={onSubmit}>
        <div className={s.bar} onPointerDown={onBarPointerDown}>
          <input
            className={s.input}
            type="text"
            value={value}
            placeholder={placeholder}
            maxLength={500}
            autoComplete="off"
            aria-label={config.headline}
            onFocus={openEmpty}
            onChange={(e) => {
              setValue(e.target.value);
              setTyped(true);
            }}
          />
          <button className={s.go} type="submit" aria-label="Start">
            <svg width="15" height="15" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M7 11.5v-9M3.2 6.2 7 2.4l3.8 3.8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </form>

      <div className={s.chips}>
        <TryChips
          suggestions={config.suggestions}
          onPick={onOpen}
          elseChip={config.elseChip}
          onElse={() => onOpen('')}
        />
      </div>

      {/* The steps belong in the hero, not under it. Someone who has only seen
          a search bar has no idea what typing into it costs them, and that
          question is answered by the four cards, not by scrolling. The slot
          only tightens the spacing HowItWorks was given as a lower section. */}
      <div className={s.steps}>
        <HowItWorks />
      </div>
    </section>
  );
}

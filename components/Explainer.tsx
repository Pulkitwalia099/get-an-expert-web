'use client';

import { useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import sections from '@/components/Sections.module.css';
import s from '@/components/Explainer.module.css';

// The founder video, sitting between the four steps and the setups. Someone
// who has just read what happens after they type is the right person to hear
// who is behind it, and it lands before the proof rather than after.
//
// It does not repeat the install command the video closes on. The offer on
// this page is a first session by talking to the agent; the MCP is what makes
// the second one better. Putting a terminal command next to the ask bar asks
// a visitor to choose between two front doors on their first visit.

// Three states, not a boolean. The file is 20MB, so on a slow connection there
// is a real gap between the press and the first frame. Unmounting the overlay
// on click left a visitor looking at a still poster with nothing happening and
// no way to tell whether their tap registered, so the overlay stays up until
// the video actually reports playing.
type Phase = 'idle' | 'loading' | 'playing';

// preload="metadata" rather than "none": faststart put the moov atom at the
// front of the file, so this is a small range request that buys the duration
// and the real dimensions before anyone presses. "none" saved a few KB and
// cost the browser a cold start on every play.
export default function Explainer() {
  const ref = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');

  function start() {
    if (phase !== 'idle') return;
    setPhase('loading');
    track('explainer_played');
    void ref.current?.play().catch(() => {
      // A browser can refuse a programmatic play. Drop back to idle so the
      // visitor gets the button again rather than a stuck loading state.
      setPhase('idle');
    });
  }

  return (
    <section className={sections.section} aria-labelledby="explainer-title">
      <header className={sections.head}>
        <h2 id="explainer-title" className={sections.title}>
          What we&rsquo;re building
        </h2>
        <p className={sections.sub}>Rohit and Pulkit, in 84 seconds.</p>
      </header>

      <div className={s.frame}>
        <video
          ref={ref}
          className={s.video}
          src="/explainer.mp4"
          poster="/explainer-poster.jpg"
          preload="metadata"
          playsInline
          controls={phase !== 'idle'}
          onPlaying={() => setPhase('playing')}
          onEnded={() => track('explainer_finished')}
        />
        {phase !== 'playing' && (
          <button
            type="button"
            className={s.play}
            onClick={start}
            disabled={phase === 'loading'}
            aria-label="Play the founder video, 84 seconds"
          >
            <span className={s.badge} aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5.2v13.6a1 1 0 0 0 1.53.85l10.6-6.8a1 1 0 0 0 0-1.7L9.53 4.35A1 1 0 0 0 8 5.2z" />
              </svg>
            </span>
            <span className={s.label}>
              {phase === 'loading' ? 'Starting…' : 'Watch the founders'}
            </span>
          </button>
        )}
      </div>
    </section>
  );
}

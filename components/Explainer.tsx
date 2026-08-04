'use client';

import { useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import sections from '@/components/Sections.module.css';
import s from '@/components/Explainer.module.css';

// The founder video, sitting between the four steps and the setups. Someone
// who has just read what happens after they type is the right person to hear
// who is behind it, and it lands before the proof rather than after.
//
// This used to carry a note about not repeating the install command the video
// closed on, because the offer on this page is a first session by talking to
// the agent and the MCP is what makes the second one better. The video was
// recut on 2026-08-03 and now closes on the free first call and the domain, so
// the two say the same thing and there is nothing left to hold apart.

// Three states, not a boolean. The file is 18MB, so on a slow connection there
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
        {/* Not "Who you are dealing with". That frames the visitor as someone
            who has already been put on guard, and answers a worry nobody had
            yet. This just introduces the video.

            The names are gone too: both founders are captioned on the
            thumbnail directly below, so printing them here says the same thing
            twice and spends the subtitle on something already on screen.

            "How it works" was the other option and is taken: it is the heading
            of the section immediately above this one. */}
        <h2 id="explainer-title" className={sections.title}>
          From the founders
        </h2>
        <p className={sections.sub}>Why we built this, in 77 seconds.</p>
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
            aria-label="Play the founder video, 77 seconds"
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

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { instagramUrl, type PlanFormat } from '@/lib/plans';

// One reel per format, one at a time, in the phone frame the homepage uses.
//
// Only the centre slide plays, muted, and hands over to the next slide when it
// ends. A reference reel is credited under the text with a thumbnail that
// links to the original, so the creator's work is never mistaken for ours.
// Hovering, focusing a control or hiding the tab stops the clock, and anyone
// who asked for less motion gets no autoplay and no auto advance, same as the
// hero.
//
// Built here rather than reused from public/services/coverflow.js because that
// one is vanilla JS over static HTML and fights React for the DOM the moment
// it is mounted inside a component.

export default function PlanCarousel({ formats }: { formats: PlanFormat[] }) {
  const n = formats.length;
  const [i, setI] = useState(0);
  const [held, setHeld] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [muted, setMuted] = useState(true);
  const videos = useRef<Array<HTMLVideoElement | null>>([]);
  const touchX = useRef<number | null>(null);

  const go = useCallback((j: number) => setI(((j % n) + n) % n), [n]);

  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const onVis = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // The centre video plays from the top; every other one is parked.
  useEffect(() => {
    videos.current.forEach((v, k) => {
      if (!v) return;
      if (k === i && !reduce && !hidden) {
        v.currentTime = 0;
        v.muted = muted;
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, [i, reduce, hidden, muted]);

  // Every slide is a video that ends on its own, so the only clock is the
  // one that starts the next one; nothing here needs a timer.
  const paused = held || hidden || reduce;

  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    const from = touchX.current;
    touchX.current = null;
    if (from === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? from) - from;
    if (Math.abs(dx) > 40) go(dx < 0 ? i + 1 : i - 1);
  }

  function toggleSound() {
    const v = videos.current[i];
    const next = !muted;
    setMuted(next);
    if (v) {
      v.muted = next;
      if (v.paused) v.play().catch(() => {});
    }
  }

  return (
    <div
      className="plan-car"
      aria-roledescription="carousel"
      aria-label="The kinds of video we can make"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="plan-track" style={{ transform: `translateX(-${i * 100}%)` }}>
        {formats.map((f, k) => {
          const on = k === i;
          return (
            <div
              key={f.slug}
              className="plan-slide"
              aria-hidden={!on}
              // Off-screen slides are inert so a tab press cannot land on a
              // control nobody can see.
              inert={!on}
            >
              <div className="plan-phone">
                <video
                  ref={(el) => {
                    videos.current[k] = el;
                  }}
                  src={f.media.src}
                  poster={f.media.poster}
                  muted
                  playsInline
                  preload={on ? 'auto' : 'metadata'}
                  onEnded={() => {
                    if (!paused) go(k + 1);
                  }}
                  aria-label={
                    f.media.original ? `${f.title}, a reel by ${f.media.original.by}` : `${f.title}, a video we made`
                  }
                />
                {on && (
                  <button
                    type="button"
                    className="plan-snd"
                    onClick={toggleSound}
                    aria-pressed={!muted}
                    aria-label={muted ? 'Unmute this video' : 'Mute this video'}
                  >
                    {muted ? 'Sound off' : 'Sound on'}
                  </button>
                )}
              </div>
              <div className="plan-slide-txt">
                <h3>{f.title}</h3>
                <p>{f.line}</p>
                <span className="plan-meta">
                  {f.job} · {f.length}
                </span>
                {f.media.original && (
                  <a
                    className="plan-orig"
                    href={instagramUrl(f.media.original.code)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img src={f.media.poster} alt="" />
                    <span>
                      <span className="plan-orig-t">Original reel by {f.media.original.by}</span>
                      <span className="plan-orig-s">Open on Instagram</span>
                    </span>
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="plan-bar">
        <div className="plan-dots" role="tablist" aria-label="Formats">
          {formats.map((f, k) => (
            <button
              key={f.slug}
              type="button"
              role="tab"
              aria-selected={k === i}
              aria-label={f.title}
              className={k === i ? 'plan-dot plan-dot-on' : 'plan-dot'}
              onClick={() => go(k)}
            />
          ))}
        </div>
        <span className="plan-count">
          {i + 1} of {n}
        </span>
        <div className="plan-nav">
          <button type="button" onClick={() => go(i - 1)} aria-label="Previous format">
            &#8249;
          </button>
          <button type="button" onClick={() => go(i + 1)} aria-label="Next format">
            &#8250;
          </button>
        </div>
      </div>
    </div>
  );
}

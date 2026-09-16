'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FORMAT_STATUS_LABELS, instagramEmbed, instagramUrl, type PlanFormat } from '@/lib/plans';

// One reel per format, one at a time, in the phone frame the homepage uses.
//
// Only the centre slide plays. A cut we made autoplays muted and hands over to
// the next slide when it ends; a reel somebody else made sits as a still until
// tapped, then plays through Instagram's own embed with the creator's name on
// it; a format with no sample yet is a typographic card that moves on after a
// few seconds. Hovering, focusing a control or hiding the tab stops the clock,
// and anyone who asked for less motion gets no autoplay and no auto advance,
// same as the hero.
//
// Built here rather than reused from public/services/coverflow.js because that
// one is vanilla JS over static HTML and fights React for the DOM the moment
// it is mounted inside a component.

const DWELL_MS = 7000;

export default function PlanCarousel({ formats }: { formats: PlanFormat[] }) {
  const n = formats.length;
  const [i, setI] = useState(0);
  const [opened, setOpened] = useState<Record<string, boolean>>({});
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

  // The clock for slides that cannot end on their own.
  const paused = held || hidden || reduce;
  useEffect(() => {
    if (paused) return;
    const f = formats[i];
    if (f.media?.kind === 'file') return;
    if (f.media?.kind === 'instagram' && opened[f.slug]) return;
    const t = setTimeout(() => go(i + 1), DWELL_MS);
    return () => clearTimeout(t);
  }, [i, paused, opened, formats, go]);

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
                {f.media?.kind === 'file' && (
                  <>
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
                      aria-label={`${f.title}, a video we made`}
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
                  </>
                )}
                {f.media?.kind === 'instagram' &&
                  (opened[f.slug] ? (
                    <iframe
                      src={instagramEmbed(f.media.code)}
                      title={`${f.title} reference on Instagram`}
                      allow="autoplay; encrypted-media"
                      loading="lazy"
                    />
                  ) : (
                    <button
                      type="button"
                      className="plan-play"
                      onClick={() => setOpened((o) => ({ ...o, [f.slug]: true }))}
                      aria-label={`Play the ${f.title} reference on Instagram`}
                    >
                      <img src={f.media.poster} alt="" />
                      <span className="plan-play-pill">Play on Instagram</span>
                    </button>
                  ))}
                {f.media === null && (
                  <div className="plan-blank">
                    <span>{f.title}</span>
                  </div>
                )}
              </div>
              <div className="plan-slide-txt">
                <span className={`plan-chip plan-chip-${f.status}`}>{FORMAT_STATUS_LABELS[f.status]}</span>
                <h3>{f.title}</h3>
                <p>{f.line}</p>
                <span className="plan-meta">
                  {f.job} · {f.length}
                </span>
                {f.media?.kind === 'instagram' && (
                  <a
                    className="plan-orig"
                    href={instagramUrl(f.media.code)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open the original on Instagram
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

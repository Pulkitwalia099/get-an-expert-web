'use client';

import { useEffect, useRef, useState } from 'react';
import styles from '@/components/HomeHero.module.css';

// The hero the user picked from three rounds of mockups: headline left, the
// three lead services as evidence on the right. The UGC card plays a real ad
// the service made, the LinkedIn card shows the real post as a screenshot, and
// Video Editing stays an abstract timeline because that page refuses to show
// work that is not ours. No prices up here; the tiles below carry them.
//
// A screenshot, not the live post tile, on purpose: the grid one scroll down
// leads with the live tile, and the same animated card twice on one page reads
// as an echo. The number on the chip is the tile's own verified figure.
//
// Client component for one reason: the video chrome. The progress bar tracks
// real playback and the speaker button flips real mute, so nothing in the hero
// is pretending.

export default function HomeHero() {
  const vid = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  // Anyone who has asked for less motion gets the poster frame, not a video
  // they cannot stop. Same rule the post tile's counters follow.
  useEffect(() => {
    const v = vid.current;
    if (!v) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      v.pause();
    }
  }, []);

  function onTime() {
    const v = vid.current;
    if (v && v.duration) setProgress((v.currentTime / v.duration) * 100);
  }

  function toggleSound() {
    const v = vid.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (v.paused) v.play().catch(() => {});
  }

  return (
    <section className={styles.hero}>
      <div className={styles.wrap}>
        <div>
          <span className={styles.badge}>
            <b>HUMAN + AGENT</b> on every service
          </span>
          <h1>
            Work,
            <br />
            delivered<span className={styles.dot}>.</span>
          </h1>
          <p className={styles.sub}>
            Pick a service. An agent does the work, <b>a human expert owns the outcome</b>, and
            you approve before you pay.
          </p>
          <div className={styles.ctas}>
            <a className={styles.primary} href="#services">
              Browse the services
            </a>
            <a className={styles.ghost} href="/experts">
              For experts
            </a>
          </div>
          {/* A door, not an input: typing a need in your own words already
              works on the expert search, so the bar takes you there. */}
          <a className={styles.bar} href="/search-experts" aria-label="Describe what you need done">
            <span className={styles.ph}>Or describe what you need done</span>
            <span className={styles.go} aria-hidden="true">
              &rarr;
            </span>
          </a>
        </div>

        <div className={styles.stage}>
          <article className={`${styles.card} ${styles.c1}`}>
            <div className={styles.chips}>
              <span className={styles.chipHa}>Human + Agent</span>
              <span className={styles.chipSample}>Sample first</span>
            </div>
            <h3>UGC Ads</h3>
            <div className={styles.ugcRow}>
              <div className={styles.phone}>
                <video
                  ref={vid}
                  src="/media/ugc-reel.mp4"
                  poster="/media/ugc-reel-poster.jpg"
                  autoPlay
                  muted
                  loop
                  playsInline
                  onTimeUpdate={onTime}
                  aria-label="A UGC ad this service made"
                />
                <span className={styles.prog}>
                  <i style={{ width: `${progress}%` }} />
                </span>
                <button
                  type="button"
                  className={styles.snd}
                  onClick={toggleSound}
                  aria-pressed={!muted}
                  aria-label={muted ? 'Unmute the sample ad' : 'Mute the sample ad'}
                >
                  {muted ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
                      <path
                        d="M16.5 9.5l5 5m0-5l-5 5"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
                      <path
                        d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
              <div className={styles.ugcTxt}>
                <p className={styles.desc}>
                  A product link and an ad you like go in. A finished ad like this comes back in
                  24 hours.
                </p>
                <div className={styles.made}>
                  <i aria-hidden="true" />
                  Made by the UGC Ads agent
                </div>
              </div>
            </div>
          </article>

          <article className={`${styles.card} ${styles.c2}`}>
            <div className={styles.chips}>
              <span className={styles.chipHa}>Human + Agent</span>
            </div>
            <h3>LinkedIn Marketeer</h3>
            <p className={styles.desc}>Posts, comments and engagement, human reviewed.</p>
            <div className={styles.shot}>
              <img
                src="/media/li-post-1.png"
                alt="A LinkedIn post the service wrote and posted, at 254,950 impressions"
              />
              <span className={styles.imp}>
                <span className={styles.liIn} aria-hidden="true">
                  in
                </span>
                254,950 impressions
              </span>
            </div>
          </article>

          <article className={`${styles.card} ${styles.c3}`}>
            <div className={styles.chips}>
              <span className={styles.chipHa}>Human + Agent</span>
            </div>
            <h3>Video Editing</h3>
            <p className={styles.desc}>Raw footage in. An edited video back, ready to post.</p>
            <div className={styles.tl} aria-hidden="true">
              <span className={`${styles.clip} ${styles.k1}`} />
              <span className={`${styles.clip} ${styles.k2}`} />
              <span className={`${styles.clip} ${styles.k3}`} />
              <span className={`${styles.clip} ${styles.k4}`} />
              <span className={`${styles.clip} ${styles.k5}`} />
              <span className={styles.head} />
            </div>
          </article>

          <aside className={styles.sign}>
            <span className={styles.ok} aria-hidden="true">
              &#10003;
            </span>
            <div>
              <div className={styles.signT}>Expert sign off</div>
              <div className={styles.signS}>before anything ships</div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

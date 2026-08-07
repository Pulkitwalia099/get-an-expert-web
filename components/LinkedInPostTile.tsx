'use client';

import { useEffect, useRef } from 'react';
import styles from '@/app/marketplace.module.css';

// The post that comes out the other side of the LinkedIn service, as the home
// tile. It is the same card as the hero on /services/linkedin, rebuilt at tile
// size rather than screenshotted, so the counters actually run and the text
// stays real text: sharp at any density, readable by a screen reader, and no
// image to go stale when the numbers change.
//
// Real figures from one real post on the founder's own account. Nothing here
// is illustrative, which is the whole reason it can carry a number this large.

const REACTIONS = 1_186;
const COMMENTS = 51;
const REPOSTS = 17;
const IMPRESSIONS = 254_950;

/** One full pass: numbers climb, then sit long enough to be read. */
const COUNT_MS = 4_200;
const HOLD_MS = 1_600;
const CYCLE_MS = COUNT_MS + HOLD_MS;
/* 50ms, not requestAnimationFrame. A digit counter reads the same at 20fps as
   at 60, and an interval keeps ticking where rAF is throttled to nothing. */
const TICK_MS = 50;

const NUMBERS = [REACTIONS, COMMENTS, REPOSTS, IMPRESSIONS];

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function LinkedInPostTile() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const cells = Array.from(el.querySelectorAll<HTMLElement>('[data-count]'));
    const paint = (progress: number) => {
      for (const cell of cells) {
        const target = Number(cell.dataset.count);
        cell.textContent = Math.round(target * progress).toLocaleString('en-US');
      }
    };

    // Anyone who has asked for less motion gets the finished numbers, not a
    // frozen zero. The figures are the content; the climb is decoration.
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (calm.matches) {
      paint(1);
      return;
    }

    // A tile scrolled past is still mounted, and a counter running in a card
    // nobody can see is pure battery, so the observer below pauses it.
    //
    // It starts true, and that matters. IntersectionObserver does not fire at
    // all while the document is hidden, which is the normal state in an
    // embedded webview, a preview pane or a screenshot renderer. Starting
    // false meant the callback that would have enabled the animation was the
    // one thing that never ran, so the numbers sat frozen forever in exactly
    // the places nobody could debug them. Fail open: animate until something
    // actively says the card is off screen.
    let visible = true;
    let epoch = performance.now();
    const seen = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !visible) epoch = performance.now();
        visible = entry.isIntersecting;
      },
      { threshold: 0.2 },
    );
    seen.observe(el);

    const timer = window.setInterval(() => {
      if (!visible) return;
      const elapsed = (performance.now() - epoch) % CYCLE_MS;
      paint(easeOut(Math.min(elapsed / COUNT_MS, 1)));
    }, TICK_MS);

    return () => {
      window.clearInterval(timer);
      seen.disconnect();
    };
  }, []);

  return (
    <div className={styles.liCard} ref={root}>
      <span className={styles.liLive}>LIVE</span>

      <div className={styles.liHead}>
        <img className={styles.liAv} src="/media/rohit.png" alt="" />
        <div className={styles.liId}>
          <div className={styles.liName}>Rohit Jain</div>
          <div className={styles.liSub}>Ex-Amazon | IIT KGP 2019 alum | SDE @ Sq…</div>
          <div className={styles.liTime}>2h · 🌐</div>
        </div>
        <span className={styles.liBug} aria-hidden="true">
          <svg viewBox="0 0 448 512" width="10" height="10" fill="#fff">
            <path d="M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z" />
          </svg>
        </span>
      </div>

      <p className={styles.liText}>
        We interviewed 40 engineers in 30 days. <span className={styles.liMore}>…more</span>
      </p>

      <div className={styles.liSocial}>
        <span className={styles.liReacts}>
          <span className={styles.liEmoji} aria-hidden="true">
            <span>👍</span>
            <span>❤️</span>
            <span>💡</span>
          </span>
          {/* Server-rendered at the final figure so a browser with JavaScript
              off, or one that has not hydrated yet, shows the real number
              rather than a zero that would be a lie about the post. */}
          You and <b data-count={REACTIONS}>{REACTIONS.toLocaleString('en-US')}</b> others
        </span>
        <span>
          <b data-count={COMMENTS}>{COMMENTS}</b> comments ·{' '}
          <b data-count={REPOSTS}>{REPOSTS}</b> reposts
        </span>
      </div>

      <div className={styles.liActions} aria-hidden="true">
        <span>👍 Like</span>
        <span>💬 Comment</span>
        <span>🔁 Repost</span>
        <span>➤ Send</span>
      </div>

      <div className={styles.liImpr}>
        <span className={styles.liImprN}>
          <span className={styles.liBars} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          {/* Explicit, because the counter rewrites this node's sibling text
              and JSX will not keep a bare space next to an expression. */}
          <b data-count={IMPRESSIONS}>{IMPRESSIONS.toLocaleString('en-US')}</b>
          {' impressions'}
        </span>
        <span className={styles.liVa}>View analytics</span>
      </div>
    </div>
  );
}

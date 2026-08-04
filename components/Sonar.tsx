'use client';

import { useEffect, useState } from 'react';
import type { Expert } from '@/lib/types';
import { initials } from '@/lib/initials';

const DEFAULT_STATUS = [
  'Searching for people who do this',
  'Reading their profiles',
  'Checking each one against your brief',
  'Writing up why they fit',
];

// Roughly how long a search takes, measured on production: about 24 seconds,
// most of it the model reading thirty listings and writing two paragraphs
// about each of eight people.
//
// The bar is honest about not knowing. It eases toward 92% over this window
// and waits there, so it never sits full while nothing has arrived, and never
// implies a precision the server has not given us. Arrival snaps it to 100%.
const EXPECTED_MS = 24_000;
const CEILING = 0.92;

// One stage per real phase of the work, held in order rather than cycled.
// The old version looped three lines every two seconds, so across a
// twenty-five second search a visitor read each of them four times, which is
// the strongest possible signal that nothing is happening.
function stageAt(elapsed: number, count: number): number {
  const share = EXPECTED_MS / count;
  return Math.min(count - 1, Math.floor(elapsed / share));
}

// Decelerating, so the first half moves visibly and the tail creeps. A linear
// bar that reaches the end and stops reads as broken; this one is always
// still moving, just less.
function progressAt(elapsed: number): number {
  return CEILING * (1 - Math.exp(-2.2 * (elapsed / EXPECTED_MS)));
}

const DOTS = [
  { left: '22%', top: '62%', delay: '0s' },
  { left: '38%', top: '20%', delay: '.4s' },
  { left: '64%', top: '76%', delay: '.9s' },
  { left: '84%', top: '34%', delay: '1.3s' },
  { left: '12%', top: '30%', delay: '1.7s' },
  { left: '55%', top: '12%', delay: '.6s' },
];

const AVATAR_SPOTS = [
  { left: '29%', top: '36%', delay: '0s' },
  { left: '69%', top: '26%', delay: '.7s' },
  { left: '74%', top: '62%', delay: '1.4s' },
];

export default function Sonar({
  found,
  status = DEFAULT_STATUS,
}: {
  found: Expert[];
  status?: string[];
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const tick = window.setInterval(() => setElapsed(Date.now() - started), 200);
    return () => window.clearInterval(tick);
  }, []);

  const stage = stageAt(elapsed, status.length);
  const progress = progressAt(elapsed);
  // Past the expected window the bar is out of useful things to say, so the
  // line says so plainly rather than inventing a fifth stage. Slower than
  // usual is the truth, and it beats a status that has visibly stalled.
  const overrun = elapsed > EXPECTED_MS * 1.25;

  return (
    <div className="search-panel">
      <div className="sonar">
        <i className="rs rs1" />
        <i className="rs rs2" />
        <i className="rs rs3" />
        <i className="ring" />
        <i className="ring r2" />
        <i className="ring r3" />
        {DOTS.map((d, i) => (
          <span
            key={i}
            className="sdot"
            style={{ left: d.left, top: d.top, animationDelay: d.delay }}
          />
        ))}
        {found.slice(0, AVATAR_SPOTS.length).map((e, i) => {
          const spot = AVATAR_SPOTS[i];
          const style = { left: spot.left, top: spot.top, animationDelay: spot.delay };
          // A locked card carries no photo and no name, so there is nothing to
          // draw here but the same veil the card itself uses.
          if (e.locked) {
            return <div key={e.id} className="sav sav-veiled" style={style} aria-hidden="true" />;
          }
          return e.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={e.id} className="sav" src={e.photo} alt="" style={style} />
          ) : (
            <div key={e.id} className="sav" style={style}>
              {initials(e.name ?? '')}
            </div>
          );
        })}
        <div className="sonar-orb">✳︎</div>
      </div>

      {/* One live region, so a screen reader hears each stage once as it
          changes rather than re-reading the whole panel. */}
      <div className="sstatus" role="status" aria-live="polite">
        {overrun ? 'Taking a little longer than usual' : status[stage]}
      </div>

      <div
        className="sbar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-label="Searching"
      >
        <span className="sbar-fill" style={{ transform: `scaleX(${progress})` }} />
      </div>
    </div>
  );
}

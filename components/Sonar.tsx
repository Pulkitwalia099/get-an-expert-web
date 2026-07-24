'use client';

import { useEffect, useState } from 'react';
import type { Expert } from '@/lib/types';
import { initials } from '@/lib/initials';

const DEFAULT_STATUS = ['Scanning marketplaces…', 'Checking availability…', 'Ranking matches…'];

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
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setStep((s) => (s + 1) % status.length);
        setVisible(true);
      }, 300);
    }, 2_000);
    return () => window.clearInterval(cycle);
  }, [status.length]);

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
          return e.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={e.id} className="sav" src={e.photo} alt="" style={style} />
          ) : (
            <div key={e.id} className="sav" style={style}>
              {initials(e.name)}
            </div>
          );
        })}
        <div className="sonar-orb">✳︎</div>
      </div>
      <div className="sstatus" style={{ opacity: visible ? 1 : 0 }}>
        {status[step]}
      </div>
    </div>
  );
}

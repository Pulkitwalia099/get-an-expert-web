'use client';

import { useState } from 'react';
import { playerUrl, type Setup } from '@/lib/setups';
import { Icon, PlayGlyph } from './icons';
import s from './setups.module.css';

interface ReelCardProps {
  setup: Setup;
  onGet: (slug: string) => void;
}

// One tap plays the video in place: TikTok's official player autoplays
// muted the moment it mounts. Buying lives entirely behind Get This.
export default function ReelCard({ setup, onGet }: ReelCardProps) {
  const [playing, setPlaying] = useState(false);

  return (
    <article className={s.card}>
      {playing ? (
        <div className={s.reelLive}>
          <iframe
            className={s.reelFrame}
            src={playerUrl(setup.tiktokId)}
            title={`TikTok by ${setup.handle}`}
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture"
          />
        </div>
      ) : (
        <button
          type="button"
          className={s.reel}
          onClick={() => setPlaying(true)}
          aria-label={`Play the reel by ${setup.handle}`}
        >
          <img className={s.thumb} src={setup.thumb} alt="" loading="lazy" />
          <span className={s.views}>
            <PlayGlyph className={s.viewsGlyph} />
            {setup.views}
          </span>
          {setup.badge ? <span className={s.badge}>{setup.badge}</span> : null}
          <span className={s.play}>
            <PlayGlyph className={s.playGlyph} />
          </span>
          <span className={s.rail}>
            <Icon name="heart" className={s.railIcon} />
            <Icon name="comment" className={s.railIcon} />
            <Icon name="share" className={s.railIcon} />
          </span>
          <span className={s.cap}>
            <span className={s.handle}>{setup.handle}</span>
            <span className={s.capLine}>{setup.caption}</span>
          </span>
        </button>
      )}
      <div className={s.info}>
        <h3>{setup.title}</h3>
        <div className={s.meta}>
          <div className={s.price}>
            <s>${setup.price}</s> $11
            <small>sale</small>
          </div>
          <div className={s.credit}>
            By <b>{setup.handle}</b>
          </div>
        </div>
        <button type="button" className={s.cta} onClick={() => onGet(setup.slug)}>
          Get This
        </button>
      </div>
    </article>
  );
}

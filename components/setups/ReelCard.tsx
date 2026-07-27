'use client';

import Image from 'next/image';
import { useState } from 'react';
import { SALE_ON, currentPrice, playerUrl, type Setup } from '@/lib/setups';
import { Icon, PlayGlyph } from './icons';
import s from './setups.module.css';

interface ReelCardProps {
  setup: Setup;
  onGet: (slug: string) => void;
  /** Top row only. Those thumbnails are what a visitor stares at while the
      page settles, so they load with the page instead of waiting for scroll. */
  eager?: boolean;
}

// The source files run up to 2160px wide and 2.6MB for a picture that draws at
// roughly 270px. next/image resizes and re-encodes to AVIF or WebP per
// breakpoint, so the browser fetches something close to what it renders.
const THUMB_SIZES = '(min-width: 1000px) 25vw, (min-width: 640px) 33vw, 50vw';

// One tap plays the video in place: TikTok's official player autoplays
// muted the moment it mounts. Buying lives entirely behind Get This.
export default function ReelCard({ setup, onGet, eager = false }: ReelCardProps) {
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
          <Image
            className={s.thumb}
            src={setup.thumb}
            alt=""
            fill
            sizes={THUMB_SIZES}
            priority={eager}
          />
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
          {/* Every price on the page reads from currentPrice, so ending the sale
              moves the card, the cart, and the total together. */}
          <div className={s.price}>
            {SALE_ON ? <s>${setup.price}</s> : null} ${currentPrice(setup)}
            {SALE_ON ? <small>sale</small> : null}
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

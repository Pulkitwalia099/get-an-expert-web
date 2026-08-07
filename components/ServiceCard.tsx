import styles from '@/app/marketplace.module.css';
import type { Service } from '@/lib/services';

// One card shape for both rows. The Launching soon row passes dim, which drops
// the shadow and lightens the ground; everything else about the card is the
// same, because a visitor should not have to learn two card layouts to read one
// grid.
//
// The whole card is the link. A separate "See details" anchor inside a card this
// size gives the pointer a small target inside a large obviously-clickable box,
// which is why the call to action here is a span and not an <a>.
export default function ServiceCard({ service, dim = false }: { service: Service; dim?: boolean }) {
  const badgeClass =
    service.badge === 'Agent + Human QA' ? styles.badgeAg : styles.badgeHa;

  return (
    <a
      className={`${styles.card}${dim ? ` ${styles.dim}` : ''}`}
      href={`/services/${service.slug}`}
    >
      {service.media === 'video' && (
        <div className={`${styles.thumb} ${styles.thumbVideo}`}>
          {/* muted + playsInline or iOS refuses to autoplay and shows a poster
              frame instead. No controls: it is a thumbnail, not a player.

              A 16:10 cut, not the 9:16 reel. The thumb is `aspect-ratio: 16/10`
              with `object-fit: cover`, so a portrait file shows the middle 35%
              of its own height, which on that clip is a torso and a shoe with
              the head cropped off. The landscape cut lays the same equation out
              sideways instead, and matches the box exactly, so cover crops
              nothing. It is rendered from the Tile composition in the
              midsesh-promo project and carries no audio, because this autoplays
              muted and an audio track here is weight nobody hears. */}
          <video src="/media/ugc-tile.mp4" autoPlay muted loop playsInline />
        </div>
      )}

      {service.media === 'post' && (
        <div className={`${styles.thumb} ${styles.thumbPost}`}>
          {/* A real post, and one of ours: this is the founder's own, which is
              why it can be shown at all. The other four in the page carousel
              belong to other people.

              The screenshot is portrait and the box is 16:10, so it is pinned
              to the top rather than centred. Cover from the middle of a post
              is a band of body text that could be anything; the top is the
              avatar, the name and the first line, which reads as LinkedIn at
              a glance. The number the post actually earned is the payoff, so
              it is stated in our own chip rather than left inside a crop that
              would have to be unreadably small to include it. */}
          <img
            className={styles.postShot}
            src="/media/li-tile.png"
            alt="A LinkedIn post from the founder's account"
            /* Not lazy. This card is in the first screen of the grid, so
               deferring it trades a visible empty box for bytes that were
               going to be fetched a moment later anyway. */
            fetchPriority="high"
          />
          <span className={styles.postStat}>254,950 impressions</span>
        </div>
      )}

      {service.media === 'timeline' && (
        // Light on purpose. This tile used to be a dark timeline motif sitting
        // between two bright cards, and it read as a hole in the row. The clip
        // is trimmed to a stretch that never cuts to the dark half of the
        // source, and the box behind it is the clip's own background colour so
        // there is no dark flash before the first frame paints.
        <div className={`${styles.thumb} ${styles.thumbEdit}`}>
          <video src="/media/edit-tile.mp4" autoPlay muted loop playsInline />
        </div>
      )}

      <div className={styles.toprow}>
        <span className={`${styles.badge} ${badgeClass}`}>{service.badge}</span>
        {service.status === 'beta' && (
          <span className={`${styles.badge} ${styles.badgeBeta}`}>New · in beta</span>
        )}
        {service.status === 'soon' && (
          <span className={`${styles.badge} ${styles.badgeSoon}`}>Launching soon</span>
        )}
      </div>

      <h3>{service.name}</h3>
      <p>{service.blurb}</p>

      <div className={styles.cardFoot}>
        <span className={styles.price}>
          <span className={service.priceOpen && !service.priceNote ? styles.priceOpen : undefined}>
            {service.price}
          </span>
          {service.priceNote && (
            <small className={service.priceOpen ? styles.priceOpen : undefined}>
              {service.priceNote}
            </small>
          )}
        </span>
        <span className={styles.cta}>{service.cta} &rarr;</span>
      </div>
    </a>
  );
}

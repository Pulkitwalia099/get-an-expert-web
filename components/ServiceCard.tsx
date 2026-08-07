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
              frame instead. No controls: it is a thumbnail, not a player. */}
          <video src="/media/ugc-sample.mp4" autoPlay muted loop playsInline />
        </div>
      )}

      {service.media === 'post' && (
        <div className={`${styles.thumb} ${styles.thumbPost}`}>
          <span className={styles.tbdTag}>Screenshot TBD</span>
          <div className={styles.pkHead}>
            <div className={styles.pkAv} />
            <div>
              <div className={styles.pkName} />
              <div className={styles.pkSub} />
            </div>
          </div>
          <div className={styles.pkLine} />
          <div className={styles.pkLine} style={{ width: '68%' }} />
          <div className={styles.pkMedia} />
          <div className={styles.pkBar}>
            <span className={styles.pkDot} />
            <span className={styles.pkPill} />
            <span className={styles.pkPill} />
          </div>
        </div>
      )}

      {service.media === 'timeline' && (
        <div className={`${styles.thumb} ${styles.thumbTimeline}`}>
          <span className={styles.tbdTag}>Samples TBD</span>
          <div className={styles.track}>
            <i style={{ width: '38%' }} />
            <i style={{ width: '24%' }} />
            <i style={{ width: '32%' }} />
          </div>
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

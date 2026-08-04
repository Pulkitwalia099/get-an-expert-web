import styles from '@/components/Sections.module.css';

// Who is behind the company, directly under who the experts are. Trust arrives
// in that order: a visitor asks who is doing the work first, and who is
// standing behind them second.
//
// These are the real supplied marks, not redrawings. They are used as shipped
// and nothing is recoloured: a logo tinted to match a page is no longer that
// company's logo.
//
// Every one sits on a white rounded tile of the same size, which solves a
// problem the files create. The shield is 150x177 with no alpha channel, so
// its white background is baked in and would show as a white rectangle against
// the cream page. On a white tile that background disappears, while the two
// full bleed square marks cover their tile entirely and the tile is never
// seen. One rule, three different files, no image editing.
//
// object-fit is contain rather than cover so the shield keeps its proportions:
// cover would crop the point off the bottom of it.
const BACKERS = [
  {
    name: 'Harvard Innovation Labs',
    src: '/backers/hi.jpeg',
    // Natural size, so the browser reserves the right box before the file
    // arrives and the strip does not jump on load.
    w: 300,
    h: 300,
  },
  {
    // Harvard is named in full. "Rock Venture Catalyst" alone reads as an
    // unrelated fund; the school is the part that carries any weight.
    name: 'Harvard Rock Venture Catalyst',
    src: '/backers/harvard-shield.png',
    w: 150,
    h: 177,
  },
  {
    name: 'Founders Inc',
    src: '/backers/founders.png',
    w: 225,
    h: 225,
  },
];

export default function Backing() {
  return (
    <section className={styles.section} aria-labelledby="backing-title">
      <header className={styles.head}>
        <h2 id="backing-title" className={styles.title}>
          Supported and backed by
        </h2>
      </header>
      {/* Three across at every width. The tiles are small enough that a phone
          does not need them stacked, and stacking would turn a strip into a
          list, which is a different claim: a list invites you to read each
          one, a strip is taken in at a glance. */}
      <ul className={styles.backerStrip}>
        {BACKERS.map((b) => (
          <li key={b.name} className={styles.backerCell}>
            {/* Empty alt: the name is right underneath in real text, so a
                screen reader announcing the logo too would say it twice. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.backerMark} src={b.src} alt="" width={b.w} height={b.h} />
            <span className={styles.backerLabel}>{b.name}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

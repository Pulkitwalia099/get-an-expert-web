import styles from '@/components/Sections.module.css';

// Who is behind the company, directly under who the experts are. Trust arrives
// in that order: a visitor asks who is doing the work first, and who is
// standing behind them second.
//
// The marks are redrawn here as SVG rather than dropped in as image files.
// Three reasons: nothing has to be fetched, they stay sharp at any size, and
// each one can be held to a single tile size so the strip reads as one row
// instead of three logos of whatever dimensions they happened to ship in.
// They are approximations of the real marks, close enough to be recognised at
// 36px and no larger. If the official assets turn up, drop them in
// public/backers/ and swap the <svg> for an <img>; the layout does not change.
//
// Brand colours are exact and deliberately not tinted toward the page:
// Harvard crimson #A51C30, Founders Inc black. A logo recoloured to match a
// site is no longer that company's logo.
//
// Names have to be exact. "Rock Venture Catalyst" is the current name of the
// Harvard Business School programme, renamed from Rock Summer Fellows. The
// mark beside it is the HBS tile, because the programme sits inside the
// school and has no separate mark of its own.
const CRIMSON = '#A51C30';
const FOUNDERS = '#111111';

// One tile geometry for all three, so no mark can shout over its neighbours.
function Tile({ fill, children }: { fill: string; children: React.ReactNode }) {
  return (
    <svg className={styles.backerMark} viewBox="0 0 40 40" aria-hidden focusable="false">
      <rect width="40" height="40" rx="3.5" fill={fill} />
      {children}
    </svg>
  );
}

const BACKERS = [
  {
    name: 'Harvard Innovation Labs',
    mark: (
      <Tile fill={CRIMSON}>
        <text
          x="20"
          y="27.5"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="19"
          fontWeight="500"
          fontFamily="ui-sans-serif, -apple-system, 'Helvetica Neue', Arial, sans-serif"
        >
          Hi
        </text>
      </Tile>
    ),
  },
  {
    name: 'Rock Venture Catalyst',
    mark: (
      <Tile fill={CRIMSON}>
        <text
          x="20"
          y="25.5"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="12.5"
          fontWeight="600"
          letterSpacing="0.4"
          fontFamily="ui-sans-serif, -apple-system, 'Helvetica Neue', Arial, sans-serif"
        >
          HBS
        </text>
      </Tile>
    ),
  },
  {
    name: 'Founders Inc',
    mark: (
      <Tile fill={FOUNDERS}>
        <path
          d="M27 10.5 L12.5 20.5 L27 30.5"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="3.1"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        <path d="M19.5 20.5 H27" stroke="#FFFFFF" strokeWidth="3.1" strokeLinecap="square" />
      </Tile>
    ),
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
            {b.mark}
            <span className={styles.backerLabel}>{b.name}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

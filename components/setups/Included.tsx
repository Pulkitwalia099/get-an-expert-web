import s from './setups.module.css';

// The detail sheet says what one setup includes. This says what all of them
// include.
//
// The copy stays on what happens, never on who or what is doing it. The site
// says "agents" throughout and leaves it there, so nothing here claims a
// person and nothing claims software.
const POINTS = [
  'An agent does it live on a screen share, start to finish',
  'Set up on your laptop, with your accounts and your keys',
  'You watch it happen, so you can change it yourself later',
  'You pay after the setup is running on your machine',
];

// The same tick the detail sheet uses, so the two lists read as one idea
// rather than two unrelated bits of styling.
const Tick = () => (
  <span className={s.tick} aria-hidden>
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.4l3 3 6-6.4" />
    </svg>
  </span>
);

export default function Included() {
  return (
    <section className={s.included}>
      <h2>What&apos;s included in every setup</h2>
      <p className={s.includedLead}>Same deal whichever one you pick.</p>
      <ul className={s.points}>
        {POINTS.map((point) => (
          <li key={point}>
            <Tick />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

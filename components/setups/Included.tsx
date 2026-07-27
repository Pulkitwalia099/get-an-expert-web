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

export default function Included() {
  return (
    <section className={s.included}>
      <h2>What&apos;s included in every setup</h2>
      <ul className={s.points}>
        {POINTS.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </section>
  );
}

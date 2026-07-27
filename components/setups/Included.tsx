import Image from 'next/image';
import { OPERATORS } from '@/lib/operators';
import s from './setups.module.css';

// The detail sheet says what one setup includes. This says what all of them
// include, which is the part that answers "who turns up and what happens".
const POINTS = [
  'A real person on a screen share, not a script',
  'Set up on your laptop, with your accounts and your keys',
  'You watch it happen, so you can change it yourself later',
  'You pay after the setup is running on your machine',
];

// The page asks for time on someone's laptop with their accounts and never
// showed a face. The roster already exists for the chat, so it costs nothing
// to put two of them here.
const AGENTS = [OPERATORS.rohit, OPERATORS.pulkit];

export default function Included() {
  return (
    <section className={s.included}>
      <h2>What&apos;s included in every setup</h2>
      <ul className={s.points}>
        {POINTS.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>

      <div className={s.agents}>
        <span className={s.agentsLab}>Who sets it up</span>
        <div className={s.agentRow}>
          {AGENTS.map((agent) => (
            <div className={s.agent} key={agent.id}>
              <Image src={agent.photo} alt="" width={38} height={38} />
              <div>
                <b>{agent.name}</b>
                <span>{agent.role}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

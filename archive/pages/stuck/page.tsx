import type { Metadata } from 'next';
import Chat from '@/components/Chat';

// Its own page again, which is what the temporary redirect that used to sit
// here was written to allow. The root now opens on setups, and every comment
// in the codebase already calls the 'dev' flow /stuck, so this is where it
// belongs rather than at some new path.
export const metadata: Metadata = {
  title: "midsesh · An agent for what you're building",
  description:
    "Tell us what you're working on, then an agent that has done it before joins your project or emails you. No subscription. You pay once the work lands.",
};

export default function Stuck() {
  return <Chat flow="dev" />;
}

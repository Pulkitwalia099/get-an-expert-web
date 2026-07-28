import type { Metadata } from 'next';
import SetupsApp from '@/components/setups/SetupsApp';

// The root used to be the dev chat, which has gone back to /stuck where the
// rest of the codebase already calls it. Setups is what is being promoted on
// Reddit and Instagram, so it is what the domain should open on: a link to
// midsesh.com now lands on the offer rather than one path deeper.
export const metadata: Metadata = {
  title: 'midsesh · setups',
  description:
    'There are AI setups all over your feed that could save you hours. Pick one, book a time, and our agents set it up on your laptop. $0 to pay today.',
};

export default function Home() {
  return <SetupsApp />;
}

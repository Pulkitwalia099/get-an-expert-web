import type { Metadata } from 'next';
import SetupsApp from '@/components/setups/SetupsApp';

// Setups used to be the root. It moved here when the ask page took the front
// door. Every path that pointed at the old location redirects to this one, so
// the links already out on Reddit and Instagram still land on the offer.
export const metadata: Metadata = {
  title: 'midsesh · setups',
  description:
    'There are AI setups all over your feed that could save you hours. Pick one, book a time, and our agents set it up on your laptop. $0 to pay today.',
};

export default function Get() {
  return <SetupsApp />;
}

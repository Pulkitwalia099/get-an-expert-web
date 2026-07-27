import type { Metadata } from 'next';
import SetupsApp from '@/components/setups/SetupsApp';

export const metadata: Metadata = {
  title: 'midsesh · setups',
  description:
    'There are AI setups all over your feed that could save you hours. Pick one, book a time, and our agents set it up on your laptop. $0 to pay today.',
};

export default function SetupsPage() {
  return <SetupsApp />;
}

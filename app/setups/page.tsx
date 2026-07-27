import type { Metadata } from 'next';
import SetupsApp from '@/components/setups/SetupsApp';

export const metadata: Metadata = {
  title: 'midsesh · setups',
  description:
    'The AI setups all over your feed, installed for you. Pick a video, book a free consultation, and a vetted expert sets it up on your machine at a fixed price.',
};

export default function SetupsPage() {
  return <SetupsApp />;
}

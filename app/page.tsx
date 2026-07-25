import type { Metadata } from 'next';
import Chat from '@/components/Chat';

export const metadata: Metadata = {
  title: "midsesh · A human expert for what you're building",
  description:
    "Tell us what you're working on, then a human expert who has done it before joins your project or emails you. No subscription. You pay the expert.",
};

export default function Home() {
  return <Chat flow="dev" />;
}

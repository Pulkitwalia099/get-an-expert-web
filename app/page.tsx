import type { Metadata } from 'next';
import Chat from '@/components/Chat';

export const metadata: Metadata = {
  title: "midsesh · An agent for what you're building",
  description:
    "Tell us what you're working on, then an agent that has done it before joins your project or emails you. No subscription. You pay once the work lands.",
};

export default function Home() {
  return <Chat flow="dev" />;
}

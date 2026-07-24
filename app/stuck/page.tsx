import type { Metadata } from 'next';
import Chat from '@/components/Chat';

export const metadata: Metadata = {
  title: 'midsesh · Stuck in Claude Code or Codex?',
  description:
    'Two questions, then a human expert joins your AI coding session or reaches you by email. For Claude Code, Codex, Cursor and Windsurf.',
};

export default function Stuck() {
  return <Chat flow="dev" />;
}
